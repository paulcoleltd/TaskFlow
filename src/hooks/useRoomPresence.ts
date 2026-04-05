/**
 * useRoomPresence — returns [] in local mode.
 */
import { useQuery, useConvexAuth } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useCurrentUser } from './useConvexUser';

const CONVEX_MODE = !!import.meta.env.VITE_CONVEX_URL;

function _useRoomPresenceActive(room: string) {
  const { isAuthenticated } = useConvexAuth();
  const currentUser = useCurrentUser();
  const entries = useQuery(api.presence.listRoom, isAuthenticated && room ? { room } : 'skip');
  return (entries ?? []).filter((e: any) => e.userId !== currentUser?._id);
}

function _useRoomPresenceNoop(_room: string) { return []; }

export const useRoomPresence = CONVEX_MODE ? _useRoomPresenceActive : _useRoomPresenceNoop;
