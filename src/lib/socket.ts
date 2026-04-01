import { io, type Socket } from 'socket.io-client';

let _socket: Socket | null = null;

/**
 * Returns the active socket instance.
 * Throws if connectSocket() has not been called yet.
 */
export function getSocket(): Socket {
  if (!_socket) throw new Error('[socket] Not initialised — call connectSocket() first');
  return _socket;
}

/**
 * Creates (or returns existing) socket connection authenticated with a
 * server-issued session token.  The server's Socket.io middleware verifies
 * the token and extracts the user's identity and role — the client cannot
 * influence those values.
 */
export function connectSocket(token: string): Socket {
  if (_socket?.connected) return _socket;

  // Disconnect stale socket if it exists but is not connected
  _socket?.disconnect();

  _socket = io('/', {
    path: '/socket.io',
    auth: { token },              // server verifies this — no role/id sent raw
    transports: ['websocket'],
    reconnectionAttempts: 5,
    reconnectionDelay: 2000,
    reconnectionDelayMax: 30_000,
    timeout: 5000,
  });

  return _socket;
}

/** Cleanly disconnects the socket and nulls the reference. */
export function disconnectSocket(): void {
  _socket?.disconnect();
  _socket = null;
}
