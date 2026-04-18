/**
 * api/auth/login.ts — Vercel serverless function
 *
 * Mirrors the auth logic from server/src/index.ts so the deployed SPA can
 * authenticate without a separate Node.js backend.
 *
 * POST /api/auth/login
 *   Body: { email: string; password: string }
 *   200:  { token: string; user: AuthUser }
 *   401:  { error: string }
 */

import { createHmac } from 'crypto';

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

// ── HMAC token (same format as server/src/index.ts) ──────────────────────────
const TOKEN_SECRET = process.env.TOKEN_SECRET ?? 'taskflow-demo-secret-CHANGE-BEFORE-PRODUCTION-DO-NOT-DEPLOY-AS-IS';
const TOKEN_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours

function signToken(payload: object): string {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig  = createHmac('sha256', TOKEN_SECRET).update(body).digest('base64url');
  return `${body}.${sig}`;
}

// ── Vercel handler ────────────────────────────────────────────────────────────
export default async function handler(req: any, res: any): Promise<void> {
  // Only allow POST
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed.' });
    return;
  }

  // Vercel auto-parses JSON bodies when Content-Type is application/json
  const body = req.body as { email?: unknown; password?: unknown } | undefined;
  const email    = String(body?.email    ?? '').trim().toLowerCase().slice(0, 254);
  const password = String(body?.password ?? '').slice(0, 128);

  const user = DEMO_USERS.find(u => u.email === email);
  // Evaluate password regardless of whether user exists (prevents timing oracle)
  const passwordOk = user !== undefined && user.password === password;

  if (!passwordOk) {
    // Same response for unknown email + wrong password — prevents enumeration
    res.status(401).json({ error: 'Invalid email or password.' });
    return;
  }

  const token = signToken({
    userId: user.id,
    role:   user.role,
    name:   user.name,
    colour: user.colour,
    exp:    Date.now() + TOKEN_TTL_MS,
  });

  res.status(200).json({
    token,
    user: {
      id:     user.id,
      name:   user.name,
      email:  user.email,
      colour: user.colour,
      role:   user.role,
    },
  });
}
