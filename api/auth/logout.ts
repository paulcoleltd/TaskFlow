/**
 * api/auth/logout.ts — Vercel serverless function
 *
 * POST /api/auth/logout
 *   Clears the httpOnly session cookie by setting Max-Age=0.
 *   No body needed — the cookie is sent automatically by the browser.
 *   200: { ok: true }
 */
export default async function handler(req: any, res: any): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed.' });
    return;
  }

  // Expire the cookie immediately — works whether or not there was a valid session
  res.setHeader('Set-Cookie', 'session=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0');
  res.status(200).json({ ok: true });
}
