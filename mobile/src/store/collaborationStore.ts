import { create } from 'zustand';
import type { OnlineUser } from '../types';

interface CollaborationState {
  connected:   boolean;
  onlineUsers: OnlineUser[];
}

interface CollaborationActions {
  setConnected:   (v: boolean) => void;
  setOnlineUsers: (users: OnlineUser[]) => void;
  addOnlineUser:  (user: OnlineUser) => void;
  removeOnlineUser: (userId: string) => void;
}

export const useCollaborationStore = create<CollaborationState & CollaborationActions>((set) => ({
  connected:   false,
  onlineUsers: [],

  setConnected:   (v) => set({ connected: v }),
  setOnlineUsers: (users) => set({ onlineUsers: users }),

  addOnlineUser: (user) =>
    set(s => ({
      onlineUsers: s.onlineUsers.some(u => u.userId === user.userId)
        ? s.onlineUsers.map(u => u.userId === user.userId ? user : u)
        : [...s.onlineUsers, user],
    })),

  removeOnlineUser: (userId) =>
    set(s => ({ onlineUsers: s.onlineUsers.filter(u => u.userId !== userId) })),
}));
