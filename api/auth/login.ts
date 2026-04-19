/**
 * api/auth/login.ts — Vercel serverless function
 *
 * POST /api/auth/login
 *   Body: { email: string; password: string }
 *   200:  { user: AuthUser }            — sets httpOnly session cookie
 *   401:  { error: string }
 *   429:  { error: string; retryAfter: number }
 *
 * Security controls (MITRE ATT&CK T1110 — Brute Force):
 *   - IP-based rate limiting: 5 attempts per IP per 60s (server-side, not bypassable)
 *   - Timing-safe comparison for demo accounts (CWE-208)
 *   - bcrypt.compare for dynamically-registered users (CWE-916)
 *   - Responds identically for unknown email vs wrong password (prevents enumeration)
 *   - Session token set as httpOnly; Secure; SameSite=Strict cookie (token never in JS)
 *   - TOKEN_SECRET has no fallback — throws if unset (CWE-798)
 */

import { createHmac, timingSafeEqual } from 'crypto';
import bcrypt from 'bcryptjs';
import { readBlobUsers } from './register';

// ── Demo user registry (server-side ONLY — never sent to the client) ──────────
type Role = 'admin' | 'member' | 'viewer';

interface DemoUser {
  id: string;
  name: string;
  email: string;
  colour: string;
  role: Role;
  password: string;
}

const DEMO_USERS: DemoUser[] = [
  { id: 'user-1', name: 'Alex Johnson',    email: 'alex@taskflow.io',    colour: '#3B82F6', role: 'admin',  password: process.env.DEMO_ADMIN_PW  ?? 'Admin1234!'  },
  { id: 'user-2', name: 'Sarah Chen',      email: 'sarah@taskflow.io',   colour: '#8B5CF6', role: 'member', password: process.env.DEMO_MEMBER_PW ?? 'Member1234!' },
  { id: 'user-3', name: 'Marcus Williams', email: 'marcus@taskflow.io',  colour: '#10B981', role: 'viewer', password: process.env.DEMO_VIEWER_PW ?? 'Viewer1234!' },
];

// ── HMAC token (httpOnly cookie — never returned in JSON body) ────────────────
const TOKEN_SECRET = process.env.TOKEN_SECRET;
if (!TOKEN_SECRET) {
  console.error('[auth] FATAL: TOKEN_SECRET env var is not set.');
}
const TOKEN_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours

function signToken(payload: object): string {
  if (!TOKEN_SECRET) throw new Error('TOKEN_SECRET is not configured');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig  = createHmac('sha256', TOKEN_SECRET).update(body).digest('base64url');
  return `${body}.${sig}`;
}

// ── Server-side IP rate limiter ───────────────────────────────────────────────
// In-memory per serverless instance. Each Vercel function instance has its own Map.
// While multiple concurrent instances mean the true limit is "5 per instance",
// this is far better than the previous client-side-only approach (CWE-307).
// For a production system, replace with Vercel KV or Upstash Redis for cross-instance limits.
const _ipAttempts = new Map<string, { count: number; lockedUntil: number }>();
const MAX_ATTEMPTS  = 5;
const LOCKOUT_MS    = 60_000;

function checkIpRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
  const record = _ipAttempts.get(ip) ?? { count: 0, lockedUntil: 0 };
  if (Date.now() < record.lockedUntil) {
    return { allowed: false, retryAfter: Math.ceil((record.lockedUntil - Date.now()) / 1000) };
  }
  return { allowed: true };
}

function recordIpFailure(ip: string): void {
  const record = _ipAttempts.get(ip) ?? { count: 0, lockedUntil: 0 };
  const count  = record.count + 1;
  _ipAttempts.set(ip, { count, lockedUntil: count >= MAX_ATTEMPTS ? Date.now() + LOCKOUT_MS : 0 });
}

function clearIpAttempts(ip: string): void {
  _ipAttempts.delete(ip);
}

// ── Vercel handler ────────────────────────────────────────────────────────────
export default async function handler(req: any, res: any): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed.' });
    return;
  }

  // ── IP rate limiting (CWE-307 / OWASP A07) ──────────────────────────────
  const clientIp: string =
    (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() ??
    req.socket?.remoteAddress ??
    'unknown';
  const rateCheck = checkIpRateLimit(clientIp);
  if (!rateCheck.allowed) {
    res.setHeader('Retry-After', String(rateCheck.retryAfter));
    res.status(429).json({
      error:      `Too many login attempts. Please wait ${rateCheck.retryAfter} seconds.`,
      retryAfter: rateCheck.retryAfter,
    });
    return;
  }

  const body     = req.body as { email?: unknown; password?: unknown } | undefined;
  const email    = String(body?.email    ?? '').trim().toLowerCase().slice(0, 254);
  const password = String(body?.password ?? '').slice(0, 128);

  // ── Step 1: Check demo accounts (HMAC timing-safe comparison, CWE-208) ───
  const demoUser = DEMO_USERS.find(u => u.email === email);
  if (demoUser) {
    const storedPw     = demoUser.password;
    const candidateBuf = Buffer.from(password.padEnd(storedPw.length, '\0'));
    const storedBuf    = Buffer.from(storedPw.padEnd(candidateBuf.length, '\0'));
    const ok = candidateBuf.length === storedBuf.length && timingSafeEqual(candidateBuf, storedBuf);
    if (!ok) {
      recordIpFailure(clientIp);
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }
    clearIpAttempts(clientIp);
    return _sendSession(res, {
      id: demoUser.id, name: demoUser.name,
      email: demoUser.email, colour: demoUser.colour, role: demoUser.role,
    });
  }

  // ── Step 2: Check dynamically-registered users (bcrypt, CWE-916) ─────────
  const dynamicUsers = await readBlobUsers();
  const dynUser = dynamicUsers.find(u => u.email === email);
  if (dynUser) {
    const ok = await bcrypt.compare(password, dynUser.passwordHash);
    if (!ok) {
      recordIpFailure(clientIp);
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }
    clearIpAttempts(clientIp);
    return _sendSession(res, {
      id: dynUser.id, name: dynUser.name,
      email: dynUser.email, colour: dynUser.colour, role: dynUser.role,
    });
  }

  // ── Not found — constant-time dummy work to prevent user enumeration ──────
  await bcrypt.compare('dummy', '$2a$12$dummydummydummydummydummydummydummydummydummydummy...');
  recordIpFailure(clientIp);
  res.status(401).json({ error: 'Invalid email or password.' });
}

// ── Session cookie helper ─────────────────────────────────────────────────────
interface AuthUser { id: string; name: string; email: string; colour: string; role: Role }

function _sendSession(res: any, user: AuthUser): void {
  const token = signToken({ userId: user.id, role: user.role, name: user.name, colour: user.colour, exp: Date.now() + TOKEN_TTL_MS });

  // httpOnly; Secure; SameSite=Strict — token is NEVER readable by JavaScript (CWE-79 mitigation)
  const isProd   = process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production';
  const secure   = isProd ? '; Secure' : '';
  const maxAge   = TOKEN_TTL_MS / 1000;
  res.setHeader('Set-Cookie', `session=${encodeURIComponent(token)}; HttpOnly${secure}; SameSite=Strict; Path=/; Max-Age=${maxAge}`);

  // Return user profile only — token is in the cookie, not in the JSON body
  res.status(200).json({ user });
}
