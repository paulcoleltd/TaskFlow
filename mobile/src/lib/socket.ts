/**
 * Socket.io singleton — connects to the collaboration server on port 3002.
 *
 * The socket is created lazily on first call to getSocket() and reused for the
 * lifetime of the app. When the user logs out, call disconnectSocket() to
 * cleanly close the connection before the next login.
 */
import { io, type Socket } from 'socket.io-client';
import { SOCKET_URL } from '../constants/api';

let socket: Socket | null = null;

export function getSocket(token?: string): Socket {
  if (socket?.connected) return socket;

  socket = io(SOCKET_URL, {
    auth:           { token: token ?? '' },
    transports:     ['websocket', 'polling'],
    reconnection:   true,
    reconnectionAttempts: 10,
    reconnectionDelay:    1500,
    timeout:        10000,
  });

  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function isSocketConnected(): boolean {
  return socket?.connected ?? false;
}
