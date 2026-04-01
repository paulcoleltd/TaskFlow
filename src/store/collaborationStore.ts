import { create } from 'zustand';

export interface OnlineUser {
  userId: string;
  userName: string;
  userColour: string;
}

interface CollaborationStore {
  connected: boolean;
  onlineUsers: OnlineUser[];
  /** projectId → list of viewers currently on that project page */
  projectViewers: Record<string, OnlineUser[]>;
  /** taskId → list of viewers currently in that task detail panel */
  taskViewers: Record<string, OnlineUser[]>;

  setConnected: (v: boolean) => void;
  setOnlineUsers: (users: OnlineUser[]) => void;
  addOnlineUser: (user: OnlineUser) => void;
  removeOnlineUser: (userId: string) => void;
  setProjectViewers: (projectId: string, viewers: OnlineUser[]) => void;
  addProjectViewer: (projectId: string, viewer: OnlineUser) => void;
  removeProjectViewer: (projectId: string, userId: string) => void;
  setTaskViewers: (taskId: string, viewers: OnlineUser[]) => void;
  addTaskViewer: (taskId: string, viewer: OnlineUser) => void;
  removeTaskViewer: (taskId: string, userId: string) => void;
}

export const useCollaborationStore = create<CollaborationStore>()((set) => ({
  connected: false,
  onlineUsers: [],
  projectViewers: {},
  taskViewers: {},

  setConnected: (v) => set({ connected: v }),

  setOnlineUsers: (users) => set({ onlineUsers: users }),

  addOnlineUser: (user) =>
    set((s) => ({
      onlineUsers: s.onlineUsers.some((u) => u.userId === user.userId)
        ? s.onlineUsers.map((u) => (u.userId === user.userId ? user : u))
        : [...s.onlineUsers, user],
    })),

  removeOnlineUser: (userId) =>
    set((s) => ({ onlineUsers: s.onlineUsers.filter((u) => u.userId !== userId) })),

  setProjectViewers: (projectId, viewers) =>
    set((s) => ({ projectViewers: { ...s.projectViewers, [projectId]: viewers } })),

  addProjectViewer: (projectId, viewer) =>
    set((s) => {
      const existing = s.projectViewers[projectId] ?? [];
      const updated = existing.some((v) => v.userId === viewer.userId)
        ? existing
        : [...existing, viewer];
      return { projectViewers: { ...s.projectViewers, [projectId]: updated } };
    }),

  removeProjectViewer: (projectId, userId) =>
    set((s) => ({
      projectViewers: {
        ...s.projectViewers,
        [projectId]: (s.projectViewers[projectId] ?? []).filter((v) => v.userId !== userId),
      },
    })),

  setTaskViewers: (taskId, viewers) =>
    set((s) => ({ taskViewers: { ...s.taskViewers, [taskId]: viewers } })),

  addTaskViewer: (taskId, viewer) =>
    set((s) => {
      const existing = s.taskViewers[taskId] ?? [];
      const updated = existing.some((v) => v.userId === viewer.userId)
        ? existing
        : [...existing, viewer];
      return { taskViewers: { ...s.taskViewers, [taskId]: updated } };
    }),

  removeTaskViewer: (taskId, userId) =>
    set((s) => ({
      taskViewers: {
        ...s.taskViewers,
        [taskId]: (s.taskViewers[taskId] ?? []).filter((v) => v.userId !== userId),
      },
    })),
}));
