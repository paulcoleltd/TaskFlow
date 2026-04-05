/**
 * usePresenceHeartbeat — no-op in local mode.
 */
import { useEffect } from 'react';
import { useMutation, useConvexAuth } from 'convex/react';
import { api } from '../../convex/_generated/api';

const CONVEX_MODE = !!import.meta.env.VITE_CONVEX_URL;
const HEARTBEAT_MS = 20_000;

function _usePresenceHeartbeatActive(room: string) {
  const { isAuthenticated } = useConvexAuth();
  const heartbeat = useMutation(api.presence.heartbeat);
  const leave     = useMutation(api.presence.leave);
  useEffect(() => {
    if (!isAuthenticated || !room) return;
    heartbeat({ room }).catch(() => {});
    const id = setInterval(() => heartbeat({ room }).catch(() => {}), HEARTBEAT_MS);
    return () => { clearInterval(id); leave({ room }).catch(() => {}); };
  }, [room, isAuthenticated]);
}

function _usePresenceHeartbeatNoop(_room: string) {}

export const usePresenceHeartbeat = CONVEX_MODE
  ? _usePresenceHeartbeatActive
  : _usePresenceHeartbeatNoop;
