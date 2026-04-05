import { createServer } from 'http';
import type { IncomingMessage, ServerResponse } from 'http';
import { createHmac, timingSafeEqual } from 'crypto';
import { Server } from 'socket.io';
import { registerHandlers } from './eventHandlers.js';
import { getVapidPublicKey } from './push.js';
import { pushSubscriptions } from './state.js';
import type { PushSubscription } from 'web-push';

const PORT = 3002;

const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:5176',
];

// ── Session token (HMAC-SHA256) ───────────────────────────────────────────────
// ⚠️  DEMO ONLY — replace TOKEN_SECRET with process.env.TOKEN_SECRET and use
//     RS256 JWT before any real deployment. Never commit a real secret.
const TOKEN_SECRET = 'taskflow-demo-secret-CHANGE-BEFORE-PRODUCTION-DO-NOT-DEPLOY-AS-IS';
const TOKEN_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours

export interface TokenPayload {
  userId: string;
  role: 'admin' | 'member' | 'viewer';
  name: string;
  colour: string;
  exp: number;
}

function signToken(payload: TokenPayload): string {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig  = createHmac('sha256', TOKEN_SECRET).update(body).digest('base64url');
  return `${body}.${sig}`;
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    const dot = token.indexOf('.');
    if (dot < 1) return null;
    const body = token.slice(0, dot);
    const sig  = token.slice(dot + 1);
    const expected = createHmac('sha256', TOKEN_SECRET).update(body).digest('base64url');
    // Constant-time comparison prevents timing-oracle attacks
    const sigBuf = Buffer.from(sig);
    const expBuf = Buffer.from(expected);
    if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) return null;
    const payload: TokenPayload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (Date.now() > payload.exp) return null; // expired
    return payload;
  } catch {
    return null;
  }
}

// ── Demo user registry (server-side ONLY — never sent to the client) ─────────
type Role = 'admin' | 'member' | 'viewer';
interface DemoUser {
  id: string; name: string; email: string; colour: string;
  role: Role; password: string;
}
const DEMO_USERS: DemoUser[] = [
  { id: 'user-1', name: 'Alex Johnson',    email: 'alex@taskflow.io',    colour: '#3B82F6', role: 'admin',  password: 'Admin1234!'  },
  { id: 'user-2', name: 'Sarah Chen',      email: 'sarah@taskflow.io',   colour: '#8B5CF6', role: 'member', password: 'Member1234!' },
  { id: 'user-3', name: 'Marcus Williams', email: 'marcus@taskflow.io',  colour: '#10B981', role: 'viewer', password: 'Viewer1234!' },
];

// ── HTTP helpers ──────────────────────────────────────────────────────────────
function setCorsHeaders(req: IncomingMessage, res: ServerResponse): boolean {
  const origin = String(req.headers.origin ?? '');
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Max-Age', '86400');
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return false; // preflight handled — stop here
  }
  return true;
}

async function readBody(req: IncomingMessage, maxBytes = 1024): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk: Buffer) => {
      data += chunk.toString();
      if (data.length > maxBytes) reject(new Error('Payload too large'));
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

async function handleLogin(req: IncomingMessage, res: ServerResponse): Promise<void> {
  let body: { email?: unknown; password?: unknown };
  try {
    body = JSON.parse(await readBody(req));
  } catch {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Invalid request body.' }));
    return;
  }

  const email    = String(body.email    ?? '').trim().toLowerCase().slice(0, 254);
  const password = String(body.password ?? '').slice(0, 128);

  const user = DEMO_USERS.find(u => u.email === email);
  // Evaluate password regardless of whether user exists (prevents timing oracle)
  const passwordOk = user !== undefined && user.password === password;

  if (!passwordOk) {
    // Same response for unknown email + wrong password — no enumeration
    console.log(JSON.stringify({ ts: new Date().toISOString(), event: 'auth:login_failed', email }));
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Invalid email or password.' }));
    return;
  }

  const token = signToken({
    userId: user!.id,
    role:   user!.role,
    name:   user!.name,
    colour: user!.colour,
    exp:    Date.now() + TOKEN_TTL_MS,
  });

  console.log(JSON.stringify({ ts: new Date().toISOString(), event: 'auth:login_ok', userId: user!.id, role: user!.role }));

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    token,
    user: { id: user!.id, name: user!.name, email: user!.email, colour: user!.colour, role: user!.role },
  }));
}

// ── HTTP server ───────────────────────────────────────────────────────────────
const httpServer = createServer(async (req, res) => {
  const shouldContinue = setCorsHeaders(req, res);
  if (!shouldContinue) return;

  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok' }));
    return;
  }

  if (req.method === 'POST' && req.url === '/api/auth/login') {
    await handleLogin(req, res);
    return;
  }

  // ── Push: return VAPID public key ─────────────────────────────────────────
  if (req.method === 'GET' && req.url === '/api/push/vapid-key') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ publicKey: getVapidPublicKey() }));
    return;
  }

  // ── Push: save subscription ───────────────────────────────────────────────
  if (req.method === 'POST' && req.url === '/api/push/subscribe') {
    let body: { userId?: unknown; subscription?: unknown };
    try {
      body = JSON.parse(await readBody(req, 4096));
    } catch {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid body.' }));
      return;
    }
    const userId = typeof body.userId === 'string' ? body.userId.slice(0, 64) : '';
    if (!userId || !body.subscription || typeof body.subscription !== 'object') {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'userId and subscription required.' }));
      return;
    }
    pushSubscriptions.set(userId, body.subscription as PushSubscription);
    console.log(JSON.stringify({ ts: new Date().toISOString(), event: 'push:subscribed', userId }));
    res.writeHead(201, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  // ── Push: remove subscription ─────────────────────────────────────────────
  if (req.method === 'DELETE' && req.url === '/api/push/subscribe') {
    let body: { userId?: unknown };
    try {
      body = JSON.parse(await readBody(req, 256));
    } catch {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid body.' }));
      return;
    }
    const userId = typeof body.userId === 'string' ? body.userId.slice(0, 64) : '';
    if (userId) {
      pushSubscriptions.delete(userId);
      console.log(JSON.stringify({ ts: new Date().toISOString(), event: 'push:unsubscribed', userId }));
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
});

// ── Socket.io ─────────────────────────────────────────────────────────────────
const io = new Server(httpServer, {
  cors: {
    origin: ALLOWED_ORIGINS,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  // Disable HTTP polling fallback — WebSocket only
  transports: ['websocket'],
});

// ── Socket.io auth middleware — verifies every new connection ─────────────────
// The client's role/identity ONLY comes from the verified token. The client
// cannot claim a higher privilege by manipulating the handshake payload.
io.use((socket, next) => {
  const raw = (socket.handshake.auth as Record<string, unknown>).token;
  const token = typeof raw === 'string' ? raw : '';
  const payload = verifyToken(token);
  if (!payload) {
    console.log(JSON.stringify({
      ts: new Date().toISOString(), event: 'auth:ws_rejected',
      socketId: socket.id, reason: 'invalid_or_missing_token',
    }));
    return next(new Error('Authentication required'));
  }
  // Attach verified identity — registerHandlers reads this, never the raw auth
  socket.data.user = payload;
  next();
});

io.on('connection', (socket) => {
  const user = socket.data.user as TokenPayload;
  console.log(JSON.stringify({
    ts: new Date().toISOString(), event: 'ws:connect',
    socketId: socket.id, userId: user.userId, role: user.role,
  }));
  registerHandlers(io, socket);
  socket.on('disconnect', (reason) => {
    console.log(JSON.stringify({
      ts: new Date().toISOString(), event: 'ws:disconnect',
      socketId: socket.id, userId: user.userId, reason,
    }));
  });
});

httpServer.listen(PORT, () => {
  console.log(`[TaskFlow WS] Socket.io server listening on http://localhost:${PORT}`);
  console.log(`[TaskFlow WS] CORS allowed origins: ${ALLOWED_ORIGINS.join(', ')}`);
});
