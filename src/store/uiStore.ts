import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ViewMode, Status, Priority } from '../types';
import type { FilterState } from '../components/tasks/TaskFilters';

interface UIStore {
  sidebarCollapsed: boolean;
  currentView: ViewMode;
  selectedTaskId: string | null;
  recentTaskIds: string[];
  isTaskModalOpen: boolean;
  editingTaskId: string | null;
  prefillDueDate: string | null;
  prefillProjectId: string | null;
  prefillTitle: string | null;
  prefillPriority: Priority | null;
  prefillAssigneeId: string | null;
  isProjectModalOpen: boolean;
  isShortcutsOpen: boolean;
  isCommandPaletteOpen: boolean;
  isFocusModeOpen: boolean;
  theme: 'dark' | 'light';
  searchQuery: string;
  boardSwimlane: boolean;
  wipLimits: Partial<Record<Status, number>>;
  savedViews: { name: string; filters: FilterState }[];
  todayFocus: string[];
  notificationsEnabled: boolean;
  /** Ephemeral — never persisted. Cleared on page reload. */
  activeTimer: { taskId: string; startedAt: number; mode: 'free' | 'pomodoro' } | null;
  toggleSidebar: () => void;
  setView: (view: ViewMode) => void;
  openTaskModal: (taskId?: string, dueDate?: string, projectId?: string, title?: string, priority?: Priority, assigneeId?: string) => void;
  closeTaskModal: () => void;
  setSelectedTask: (id: string | null) => void;
  openProjectModal: () => void;
  closeProjectModal: () => void;
  openShortcuts: () => void;
  closeShortcuts: () => void;
  openCommandPalette: () => void;
  closeCommandPalette: () => void;
  openFocusMode: () => void;
  closeFocusMode: () => void;
  setSearchQuery: (q: string) => void;
  setWipLimit: (status: Status, limit: number | null) => void;
  saveView: (name: string, filters: FilterState) => void;
  deleteView: (name: string) => void;
  toggleTodayFocus: (taskId: string) => void;
  setBoardSwimlane: (v: boolean) => void;
  setNotificationsEnabled: (v: boolean) => void;
  setTheme: (t: 'dark' | 'light') => void;
  startTimer: (taskId: string) => void;
  startPomodoro: (taskId: string) => void;
  /** Clears the timer and returns elapsed hours (2 dp), or null if no timer was running. */
  stopTimer: () => { taskId: string; elapsedHours: number } | null;
}

export const useUIStore = create<UIStore>()(
  persist(
    (set, get) => ({
      sidebarCollapsed: false,
      currentView: 'board',
      selectedTaskId: null,
      recentTaskIds: [],
      isTaskModalOpen: false,
      editingTaskId: null,
      prefillDueDate: null,
      prefillProjectId: null,
      prefillTitle: null,
      prefillPriority: null,
      prefillAssigneeId: null,
      isProjectModalOpen: false,
      isShortcutsOpen: false,
      isCommandPaletteOpen: false,
      isFocusModeOpen: false,
      theme: 'dark',
      searchQuery: '',
      boardSwimlane: false,
      wipLimits: {},
      savedViews: [],
      todayFocus: [],
      notificationsEnabled: false,
      activeTimer: null,
      toggleSidebar: () => set(s => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setView: (view) => set({ currentView: view }),
      openTaskModal: (taskId, dueDate, projectId, title, priority, assigneeId) =>
        set({ isTaskModalOpen: true, editingTaskId: taskId ?? null, prefillDueDate: dueDate ?? null, prefillProjectId: projectId ?? null, prefillTitle: title ?? null, prefillPriority: priority ?? null, prefillAssigneeId: assigneeId ?? null }),
      closeTaskModal: () =>
        set({ isTaskModalOpen: false, editingTaskId: null, prefillDueDate: null, prefillProjectId: null, prefillTitle: null, prefillPriority: null, prefillAssigneeId: null }),
      setSelectedTask: (id) => set(s => ({
        selectedTaskId: id,
        recentTaskIds: id
          ? [id, ...s.recentTaskIds.filter(r => r !== id)].slice(0, 6)
          : s.recentTaskIds,
      })),
      openProjectModal: () => set({ isProjectModalOpen: true }),
      closeProjectModal: () => set({ isProjectModalOpen: false }),
      openShortcuts: () => set({ isShortcutsOpen: true }),
      closeShortcuts: () => set({ isShortcutsOpen: false }),
      openCommandPalette: () => set({ isCommandPaletteOpen: true }),
      closeCommandPalette: () => set({ isCommandPaletteOpen: false }),
      openFocusMode: () => set({ isFocusModeOpen: true }),
      closeFocusMode: () => set({ isFocusModeOpen: false }),
      setSearchQuery: (q) => set({ searchQuery: q }),
      setWipLimit: (status, limit) => set(s => {
        const next = { ...s.wipLimits };
        if (limit === null || limit <= 0) delete next[status];
        else next[status] = limit;
        return { wipLimits: next };
      }),
      saveView: (name, filters) => set(s => ({
        savedViews: [
          { name, filters },
          ...s.savedViews.filter(v => v.name !== name),
        ].slice(0, 10),
      })),
      deleteView: (name) => set(s => ({ savedViews: s.savedViews.filter(v => v.name !== name) })),
      toggleTodayFocus: (taskId) => set(s => ({
        todayFocus: s.todayFocus.includes(taskId)
          ? s.todayFocus.filter(id => id !== taskId)
          : s.todayFocus.length < 3 ? [...s.todayFocus, taskId] : s.todayFocus,
      })),
      setBoardSwimlane: (v) => set({ boardSwimlane: v }),
      setNotificationsEnabled: (v) => set({ notificationsEnabled: v }),
      setTheme: (t) => set({ theme: t }),
      startTimer: (taskId) => set({ activeTimer: { taskId, startedAt: Date.now(), mode: 'free' } }),
      startPomodoro: (taskId) => set({ activeTimer: { taskId, startedAt: Date.now(), mode: 'pomodoro' } }),
      stopTimer: () => {
        const timer = get().activeTimer;
        if (!timer) return null;
        const elapsed = (Date.now() - timer.startedAt) / 3_600_000;
        set({ activeTimer: null });
        return { taskId: timer.taskId, elapsedHours: Math.round(elapsed * 100) / 100 };
      },
    }),
    {
      name: 'taskflow-ui',
      partialize: (s) => ({
        sidebarCollapsed: s.sidebarCollapsed,
        currentView: s.currentView,
        recentTaskIds: s.recentTaskIds,
        wipLimits: s.wipLimits,
        savedViews: s.savedViews,
        todayFocus: s.todayFocus,
        notificationsEnabled: s.notificationsEnabled,
        boardSwimlane: s.boardSwimlane,
        theme: s.theme,
      }),
    }
  )
);
