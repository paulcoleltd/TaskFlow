import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ViewMode } from '../types';

interface UIStore {
  sidebarCollapsed: boolean;
  currentView: ViewMode;
  selectedTaskId: string | null;
  isTaskModalOpen: boolean;
  editingTaskId: string | null;
  isProjectModalOpen: boolean;
  theme: 'dark';
  searchQuery: string;
  toggleSidebar: () => void;
  setView: (view: ViewMode) => void;
  openTaskModal: (taskId?: string) => void;
  closeTaskModal: () => void;
  setSelectedTask: (id: string | null) => void;
  openProjectModal: () => void;
  closeProjectModal: () => void;
  setSearchQuery: (q: string) => void;
}

export const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      currentView: 'board',
      selectedTaskId: null,
      isTaskModalOpen: false,
      editingTaskId: null,
      isProjectModalOpen: false,
      theme: 'dark',
      searchQuery: '',
      toggleSidebar: () => set(s => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setView: (view) => set({ currentView: view }),
      openTaskModal: (taskId) =>
        set({ isTaskModalOpen: true, editingTaskId: taskId ?? null }),
      closeTaskModal: () =>
        set({ isTaskModalOpen: false, editingTaskId: null }),
      setSelectedTask: (id) => set({ selectedTaskId: id }),
      openProjectModal: () => set({ isProjectModalOpen: true }),
      closeProjectModal: () => set({ isProjectModalOpen: false }),
      setSearchQuery: (q) => set({ searchQuery: q }),
    }),
    {
      name: 'taskflow-ui',
      partialize: (s) => ({
        sidebarCollapsed: s.sidebarCollapsed,
        currentView: s.currentView,
      }),
    }
  )
);
