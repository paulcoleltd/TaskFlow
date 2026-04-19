/**
 * api/auth/register.ts — Vercel serverless function
 *
 * Admin-only endpoint to register a new team member.
 * Stores bcrypt-hashed credentials in Vercel Blob so any device can log in.
 *
 * POST /api/auth/register
 *   Header: Cookie: session=<valid-admin-token>
 *   Body:   { name, email, password, colour, role }
 *   201:    { ok: true }
 *   400/401/409/500: { error: string }
 *
 * Security controls:
 *   - Caller must present a valid HMAC session token (admin role)
 *   - Password hashed with bcrypt (cost=12) — proper KDF, not SHA-256
 *   - Blob read/write uses server-side token — never exposed to client
 *   - Email uniqueness enforced before write
 */

import { createHmac } from 'crypto';
import bcrypt from 'bcryptjs';
import { put, head, get } from '@vercel/blob';

// ── Token verification (mirrors api/auth/login.ts) ───────────────────────────
const TOKEN_SECRET = process.env.TOKEN_SECRET;

interface TokenPayload {
  userId: string;
  role:   string;
  name:   string;
  colour: string;
  exp:    number;
}

function verifyToken(raw: string): TokenPayload | null {
  if (!TOKEN_SECRET) return null;
  const parts = raw.split('.');
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  const expected = createHmac('sha256', TOKEN_SECRET).update(body).digest('base64url');
  if (expected !== sig) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString()) as TokenPayload;
    if (Date.now() > payload.exp) return null;
    return payload;
  } catch { return null; }
}

// ── Blob helpers ─────────────────────────────────────────────────────────────
const USERS_BLOB_PATH = 'dynamic-users.json';

export interface BlobUser {
  id:           string;
  name:         string;
  email:        string;
  colour:       string;
  role:         'admin' | 'member' | 'viewer';
  passwordHash: string;  // bcrypt hash (cost 12) — never plaintext
  createdAt:    number;
}

export async function readBlobUsers(): Promise<BlobUser[]> {
  try {
    const info = await head(USERS_BLOB_PATH, { token: process.env.BLOB_READ_WRITE_TOKEN }).catch(() => null);
    if (!info) return [];
    const res = await get(info.url);
    const text = await res.text();
    return JSON.parse(text) as BlobUser[];
  } catch { return []; }
}

async function writeBlobUsers(users: BlobUser[]): Promise<void> {
  await put(USERS_BLOB_PATH, JSON.stringify(users), {
    access:      'public',    // public URL — safe because content is hashed only
    contentType: 'application/json',
    token:       process.env.BLOB_READ_WRITE_TOKEN,
    addRandomSuffix: false,   // deterministic path for read-by-path pattern
  });
}

// ── Zod-lite validation (no extra deps) ──────────────────────────────────────
const VALID_ROLES = new Set(['admin', 'member', 'viewer']);

// ── Vercel handler ────────────────────────────────────────────────────────────
export default async function handler(req: any, res: any): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed.' });
    return;
  }

  // ── 1. Authenticate caller via httpOnly session cookie ────────────────────
  const cookieHeader: string = req.headers['cookie'] ?? '';
  const sessionMatch = cookieHeader.match(/(?:^|;\s*)session=([^;]+)/);
  const sessionToken = sessionMatch?.[1] ?? '';
  const caller = verifyToken(decodeURIComponent(sessionToken));

  if (!caller || caller.role !== 'admin') {
    res.status(401).json({ error: 'Admin privileges required.' });
    return;
  }

  // ── 2. Parse + validate body ───────────────────────────────────────────────
  const body = req.body as { name?: unknown; email?: unknown; password?: unknown; colour?: unknown; role?: unknown } | undefined;
  const name     = String(body?.name     ?? '').trim().slice(0, 100);
  const email    = String(body?.email    ?? '').trim().toLowerCase().slice(0, 254);
  const password = String(body?.password ?? '').slice(0, 128);
  const colour   = String(body?.colour   ?? '').slice(0, 7);
  const role     = String(body?.role     ?? 'member');

  if (name.length < 2)   { res.status(400).json({ error: 'Name must be at least 2 characters.' }); return; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { res.status(400).json({ error: 'Invalid email address.' }); return; }
  if (password.length < 8) { res.status(400).json({ error: 'Password must be at least 8 characters.' }); return; }
  if (!/[A-Z]/.test(password)) { res.status(400).json({ error: 'Password must contain an uppercase letter.' }); return; }
  if (!/[0-9]/.test(password)) { res.status(400).json({ error: 'Password must contain a number.' }); return; }
  if (!VALID_ROLES.has(role))  { res.status(400).json({ error: 'Invalid role.' }); return; }

  // ── 3. Check for duplicate email ──────────────────────────────────────────
  const existing = await readBlobUsers();
  if (existing.some(u => u.email === email)) {
    res.status(409).json({ error: 'A user with that email already exists.' });
    return;
  }

  // ── 4. Hash password with bcrypt (cost=12 ≈ 250ms — proper KDF, CWE-916 fix)
  const passwordHash = await bcrypt.hash(password, 12);

  // ── 5. Write to Vercel Blob ────────────────────────────────────────────────
  const newUser: BlobUser = {
    id:           `user-dyn-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name, email, colour,
    role:         role as BlobUser['role'],
    passwordHash,
    createdAt:    Date.now(),
  };
  await writeBlobUsers([...existing, newUser]);

  res.status(201).json({ ok: true, userId: newUser.id });
}
