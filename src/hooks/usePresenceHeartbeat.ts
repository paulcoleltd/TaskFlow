/**
 * usePresenceHeartbeat
 *
 * Sends a heartbeat to the Convex `presence` table every 20 seconds.
 * The presence table has a 30-second TTL, so this keeps the user
 * "online" in a room as long as they have the page open.
 *
 * Call this with the current room name:
 *   usePresenceHeartbeat('global')
 *   usePresenceHeartbeat(`project:${id}`)
 *   usePresenceHeartbeat(`task:${id}`)
 */
import { useEffect } from 'react';
import { useMutation, useConvexAuth } from 'convex/react';
import { api } from '../../convex/_generated/api';

const HEARTBEAT_INTERVAL_MS = 20_000;

export function usePresenceHeartbeat(room: string) {
  const { isAuthenticated } = useConvexAuth();
  const heartbeat = useMutation(api.presence.heartbeat);
  const leave    = useMutation(api.presence.leave);

  useEffect(() => {
    if (!isAuthenticated || !room) return;

    // Send immediately on mount
    heartbeat({ room }).catch(() => {});

    const id = setInterval(() => {
      heartbeat({ room }).catch(() => {});
    }, HEARTBEAT_INTERVAL_MS);

    return () => {
      clearInterval(id);
      // Send leave on unmount (best-effort)
      leave({ room }).catch(() => {});
    };
  }, [room, isAuthenticated]);
}
