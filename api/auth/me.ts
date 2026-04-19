/**
 * api/auth/me.ts — Vercel serverless function
 *
 * GET /api/auth/me
 *   Verifies the httpOnly session cookie and returns the user profile.
 *   Used by the SPA on page load to restore auth state without re-login.
 *
 *   200: { user: AuthUser }
 *   401: { error: 'Not authenticated' }
 *
 * The session cookie is httpOnly — JavaScript cannot read it.
 * This endpoint is the ONLY way the SPA can know if a valid session exists.
 */

import { createHmac } from 'crypto';

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

export default async function handler(req: any, res: any): Promise<void> {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed.' });
    return;
  }

  // No-cache — always re-verify token freshness
  res.setHeader('Cache-Control', 'no-store');

  const cookieHeader: string = req.headers['cookie'] ?? '';
  const sessionMatch = cookieHeader.match(/(?:^|;\s*)session=([^;]+)/);
  const sessionToken = sessionMatch?.[1] ?? '';

  const payload = verifyToken(decodeURIComponent(sessionToken));
  if (!payload) {
    res.status(401).json({ error: 'Not authenticated.' });
    return;
  }

  res.status(200).json({
    user: {
      id:     payload.userId,
      name:   payload.name,
      role:   payload.role,
      colour: payload.colour,
    },
  });
}
