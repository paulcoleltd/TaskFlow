import { useEffect } from 'react';
import { useUIStore } from '../store/uiStore';
import { useAuthStore } from '../store/authStore';
import { useTaskStore } from '../store/taskStore';
import { canCreateTask, canEditTask } from '../lib/permissions';
import toast from 'react-hot-toast';

/**
 * Global keyboard shortcuts — active only when authenticated.
 *
 * n         → New Task modal (admin/member only, not when typing)
 * Escape    → Close any open panel or modal
 * /         → Focus the header search input
 */
export function useKeyboardShortcuts() {
  const {
    isTaskModalOpen, closeTaskModal,
    isProjectModalOpen, closeProjectModal,
    isShortcutsOpen, openShortcuts, closeShortcuts,
    isCommandPaletteOpen, openCommandPalette, closeCommandPalette,
    isFocusModeOpen, openFocusMode, closeFocusMode,
    selectedTaskId, setSelectedTask,
    openTaskModal, setSearchQuery,
    activeTimer, startTimer, stopTimer,
  } = useUIStore();
  const { currentUser, isAuthenticated } = useAuthStore();
  const { tasks, moveTask, togglePin } = useTaskStore();

  useEffect(() => {
    if (!isAuthenticated) return;

    const isTyping = () => {
      const el = document.activeElement;
      if (!el) return false;
      const tag = el.tagName.toLowerCase();
      return tag === 'input' || tag === 'textarea' || tag === 'select' || (el as HTMLElement).isContentEditable;
    };

    const handler = (e: KeyboardEvent) => {
      // ⌘K / Ctrl+K — command palette
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        isCommandPaletteOpen ? closeCommandPalette() : openCommandPalette();
        return;
      }

      // Escape — close the most recently opened overlay
      if (e.key === 'Escape') {
        if (isFocusModeOpen)      { closeFocusMode(); return; }
        if (isCommandPaletteOpen) { closeCommandPalette(); return; }
        if (isShortcutsOpen)      { closeShortcuts(); return; }
        if (isTaskModalOpen)      { closeTaskModal(); return; }
        if (isProjectModalOpen)   { closeProjectModal(); return; }
        if (selectedTaskId)       { setSelectedTask(null); return; }
        // Clear search
        setSearchQuery('');
        return;
      }

      if (isTyping()) return;

      // n — new task
      if (e.key === 'n' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const role = currentUser?.role ?? 'viewer';
        if (canCreateTask(role)) {
          e.preventDefault();
          openTaskModal();
        }
        return;
      }

      // / — focus search
      if (e.key === '/') {
        e.preventDefault();
        const input = document.querySelector<HTMLInputElement>('header input[placeholder="Search tasks..."]');
        input?.focus();
        return;
      }

      // ? — keyboard shortcuts help
      if (e.key === '?') {
        e.preventDefault();
        isShortcutsOpen ? closeShortcuts() : openShortcuts();
        return;
      }

      // j / k — navigate between tasks (when a task is open)
      if ((e.key === 'j' || e.key === 'k') && selectedTaskId) {
        e.preventDefault();
        const activeTasks = tasks.filter(t => t.status !== 'done');
        const idx = activeTasks.findIndex(t => t.id === selectedTaskId);
        if (idx === -1) return;
        const next = e.key === 'j' ? activeTasks[idx + 1] : activeTasks[idx - 1];
        if (next) setSelectedTask(next.id);
        return;
      }

      // e — edit selected task
      if (e.key === 'e' && selectedTaskId) {
        const task = tasks.find(t => t.id === selectedTaskId);
        if (!task) return;
        const role = currentUser?.role ?? 'viewer';
        if (!canEditTask(role, task.assigneeId, currentUser?.id ?? '')) return;
        e.preventDefault();
        openTaskModal(selectedTaskId);
        setSelectedTask(null);
        return;
      }

      // p — toggle pin on selected task
      if (e.key === 'p' && selectedTaskId) {
        e.preventDefault();
        togglePin(selectedTaskId);
        return;
      }

      // f — open focus mode for selected task
      if (e.key === 'f' && selectedTaskId) {
        e.preventDefault();
        openFocusMode();
        return;
      }

      // d — mark selected task done / todo
      if (e.key === 'd' && selectedTaskId) {
        const task = tasks.find(t => t.id === selectedTaskId);
        if (!task) return;
        const role = currentUser?.role ?? 'viewer';
        if (!canEditTask(role, task.assigneeId, currentUser?.id ?? '')) return;
        e.preventDefault();
        moveTask(task.id, task.status === 'done' ? 'todo' : 'done');
        return;
      }

      // t — start/stop timer on selected task
      if (e.key === 't' && selectedTaskId) {
        e.preventDefault();
        if (activeTimer?.taskId === selectedTaskId) {
          const result = stopTimer();
          if (result) {
            const task = useTaskStore.getState().tasks.find(t => t.id === result.taskId);
            if (task) {
              useTaskStore.getState().updateTask(result.taskId, {
                loggedHours: Math.round(((task.loggedHours ?? 0) + result.elapsedHours) * 100) / 100,
              });
              const mins = Math.round(result.elapsedHours * 60);
              toast.success(`Timer stopped — ${mins < 1 ? '<1' : mins}m logged`);
            }
          }
        } else {
          if (activeTimer) {
            toast.error('Stop the current timer first (press T on that task).');
            return;
          }
          startTimer(selectedTaskId);
          toast.success('Timer started (press T to stop)');
        }
        return;
      }
    };

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [
    isAuthenticated, isTaskModalOpen, isProjectModalOpen, isShortcutsOpen,
    isCommandPaletteOpen, isFocusModeOpen, selectedTaskId,
    currentUser, tasks, closeTaskModal, closeProjectModal, closeShortcuts, openShortcuts,
    openCommandPalette, closeCommandPalette, openFocusMode, closeFocusMode,
    setSelectedTask, openTaskModal, setSearchQuery, moveTask, togglePin,
    activeTimer, startTimer, stopTimer,
  ]);
}
