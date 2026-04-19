/**
 * Server connection config.
 *
 * During local development the Expo app runs on the same machine as the
 * Socket.io server. Use the LAN IP so physical devices can reach the server.
 *
 * To use a different host:
 *   1. Find your machine's LAN IP (e.g. ipconfig / ifconfig)
 *   2. Set EXPO_PUBLIC_SERVER_URL in a .env file at mobile/.env
 *
 * Example mobile/.env:
 *   EXPO_PUBLIC_SERVER_URL=http://192.168.1.10:3002
 */
export const SERVER_URL =
  process.env['EXPO_PUBLIC_SERVER_URL'] ?? 'http://localhost:3002';

export const SOCKET_URL = SERVER_URL;

export const API = {
  login:             `${SERVER_URL}/api/auth/login`,
  pushVapidKey:      `${SERVER_URL}/api/push/vapid-key`,
  pushSubscribe:     `${SERVER_URL}/api/push/subscribe`,
  pushUnsubscribe:   `${SERVER_URL}/api/push/subscribe`,
} as const;
