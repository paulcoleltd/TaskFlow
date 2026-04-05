/**
 * useRoomPresence — subscribe to live presence for a given room.
 *
 * Returns the list of other users currently in the room (excluding self).
 * Convex delivers updates in real-time as users join/leave.
 *
 * Usage:
 *   const viewers = useRoomPresence(`project:${id}`)
 */
import { useQuery, useConvexAuth } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useCurrentUser } from './useConvexUser';

export function useRoomPresence(room: string) {
  const { isAuthenticated } = useConvexAuth();
  const currentUser = useCurrentUser();

  const entries = useQuery(
    api.presence.listRoom,
    isAuthenticated && room ? { room } : 'skip'
  );

  // Filter out the current user — they don't need to see themselves
  return (entries ?? []).filter(
    (e: any) => e.userId !== currentUser?._id
  );
}
