import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { addDays, addMonths } from 'date-fns';
import type { Task, Status, ActivityEvent, ActivityVerb } from '../types';
import { generateId, now } from '../lib/utils';
import { sanitiseTasks } from '../lib/storageValidation';

interface TaskStore {
  tasks: Task[];
  activityLog: ActivityEvent[];
  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'order'>) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  /** Re-insert a full Task snapshot (used for undo-delete). Preserves original id and all fields. */
  restoreTask: (task: Task) => void;
  moveTask: (id: string, newStatus: Status) => void;
  reorderTask: (dragId: string, targetId: string, position: 'before' | 'after', newStatus: Status) => void;
  togglePin: (id: string) => void;
  duplicateTask: (id: string) => void;
  logActivity: (taskId: string, userId: string, verb: ActivityVerb, meta?: Record<string, string>) => void;
  getTaskActivity: (taskId: string) => ActivityEvent[];
  getTasksByProject: (projectId: string) => Task[];
  getTasksByAssignee: (userId: string) => Task[];
  getOverdueTasks: () => Task[];
  seedTasks: (tasks: Task[]) => void;
  /** Apply a remotely-created task without re-emitting to the socket (echo prevention). */
  _applyRemoteTaskCreate: (task: Task) => void;
  /** Apply a remote task update without re-emitting to the socket (echo prevention). */
  _applyRemoteTaskUpdate: (taskId: string, updates: Partial<Task>) => void;
  /** Apply a remote task deletion without re-emitting to the socket (echo prevention). */
  _applyRemoteTaskDelete: (taskId: string) => void;
  /** Apply a remote task status move without re-emitting to the socket (echo prevention). */
  _applyRemoteTaskMove: (taskId: string, newStatus: Status) => void;
}

export const useTaskStore = create<TaskStore>()(
  persist(
    (set, get) => ({
      tasks: [],
      activityLog: [],
      logActivity: (taskId, userId, verb, meta) => {
        const event: ActivityEvent = { id: generateId(), taskId, userId, verb, meta, createdAt: now() };
        set(s => ({ activityLog: [event, ...s.activityLog].slice(0, 500) }));
      },
      getTaskActivity: (taskId) =>
        get().activityLog.filter(e => e.taskId === taskId),
      addTask: (taskData) => {
        const projectTasks = get().tasks.filter(t => t.projectId === taskData.projectId);
        const task: Task = {
          ...taskData,
          attachments: taskData.attachments ?? [],
          id: generateId(),
          createdAt: now(),
          updatedAt: now(),
          order: projectTasks.length + 1,
        };
        set(state => ({ tasks: [...state.tasks, task] }));
      },
      updateTask: (id, updates) => {
        set(state => ({
          tasks: state.tasks.map(t =>
            t.id === id ? { ...t, ...updates, updatedAt: now() } : t
          ),
        }));
      },
      deleteTask: (id) => {
        set(state => ({ tasks: state.tasks.filter(t => t.id !== id) }));
      },
      restoreTask: (task) => {
        // Only restore if a task with this id doesn't already exist (prevents double-undo)
        set(state => {
          if (state.tasks.some(t => t.id === task.id)) return state;
          return { tasks: [...state.tasks, task] };
        });
      },
      moveTask: (id, newStatus) => {
        const task = get().tasks.find(t => t.id === id);
        // Auto-spawn next occurrence when completing a recurring task
        if (newStatus === 'done' && task?.recurrence && task.recurrence !== 'none') {
          const base = task.dueDate ? new Date(task.dueDate) : new Date();
          let nextDue: Date;
          if (task.recurrence === 'daily')   nextDue = addDays(base, 1);
          else if (task.recurrence === 'weekly') nextDue = addDays(base, 7);
          else                               nextDue = addMonths(base, 1);
          const projectTasks = get().tasks.filter(t => t.projectId === task.projectId);
          const nextTask: Task = {
            ...task,
            id: generateId(),
            status: 'todo',
            dueDate: nextDue.toISOString(),
            createdAt: now(),
            updatedAt: now(),
            order: projectTasks.length + 1,
            pinned: false,
            comments: [],
            attachments: [],
            attachmentCount: 0,
            loggedHours: undefined,
            subtasks: task.subtasks.map(s => ({ ...s, id: generateId(), completed: false })),
          };
          set(state => ({
            tasks: [
              ...state.tasks.map(t => t.id === id ? { ...t, status: newStatus, updatedAt: now() } : t),
              nextTask,
            ],
          }));
        } else {
          set(state => ({
            tasks: state.tasks.map(t =>
              t.id === id ? { ...t, status: newStatus, updatedAt: now() } : t
            ),
          }));
        }
      },
      reorderTask: (dragId, targetId, position, newStatus) => {
        set(state => {
          // Pull out column tasks in current order
          const col = state.tasks
            .filter(t => t.status === newStatus)
            .sort((a, b) => a.order - b.order);
          // Remove dragged task from its current position
          const without = col.filter(t => t.id !== dragId);
          const targetIdx = without.findIndex(t => t.id === targetId);
          const insertAt = position === 'before' ? targetIdx : targetIdx + 1;
          const dragged = state.tasks.find(t => t.id === dragId)!;
          without.splice(insertAt < 0 ? without.length : insertAt, 0, dragged);
          // Reassign order values
          const orderMap = new Map(without.map((t, i) => [t.id, i + 1]));
          return {
            tasks: state.tasks.map(t => {
              if (t.id === dragId) return { ...t, status: newStatus, order: orderMap.get(t.id) ?? t.order, updatedAt: now() };
              if (orderMap.has(t.id)) return { ...t, order: orderMap.get(t.id)! };
              return t;
            }),
          };
        });
      },
      togglePin: (id) => {
        set(state => ({
          tasks: state.tasks.map(t =>
            t.id === id ? { ...t, pinned: !t.pinned, updatedAt: now() } : t
          ),
        }));
      },
      duplicateTask: (id) => {
        const original = get().tasks.find(t => t.id === id);
        if (!original) return;
        const projectTasks = get().tasks.filter(t => t.projectId === original.projectId);
        const copy: Task = {
          ...original,
          id: generateId(),
          title: `${original.title} (copy)`,
          createdAt: now(),
          updatedAt: now(),
          order: projectTasks.length + 1,
          status: 'todo',
          pinned: false,
          comments: [],
          attachments: [],
          attachmentCount: 0,
          subtasks: original.subtasks.map(s => ({ ...s, id: generateId(), completed: false })),
        };
        set(state => ({ tasks: [...state.tasks, copy] }));
      },
      getTasksByProject: (projectId) =>
        get().tasks.filter(t => t.projectId === projectId),
      getTasksByAssignee: (userId) =>
        get().tasks.filter(t => t.assigneeId === userId),
      getOverdueTasks: () => {
        const today = new Date();
        return get().tasks.filter(t => {
          if (!t.dueDate || t.status === 'done') return false;
          return new Date(t.dueDate) < today;
        });
      },
      seedTasks: (tasks) => set({ tasks }),

      // ── Remote-apply actions (echo-prevention) ───────────────────────────────
      // These receive changes from other clients via the socket. They mutate local
      // state identically to their counterparts but NEVER emit socket events.

      _applyRemoteTaskCreate: (task) => {
        set(state => {
          if (state.tasks.some(t => t.id === task.id)) return state;
          return { tasks: [...state.tasks, task] };
        });
      },

      _applyRemoteTaskUpdate: (taskId, updates) => {
        set(state => ({
          tasks: state.tasks.map(t =>
            t.id === taskId ? { ...t, ...updates } : t
          ),
        }));
      },

      _applyRemoteTaskDelete: (taskId) => {
        set(state => ({ tasks: state.tasks.filter(t => t.id !== taskId) }));
      },

      _applyRemoteTaskMove: (taskId, newStatus) => {
        set(state => ({
          tasks: state.tasks.map(t =>
            t.id === taskId ? { ...t, status: newStatus } : t
          ),
        }));
      },
    }),
    {
      name: 'taskflow-tasks',
      partialize: (s) => ({ tasks: s.tasks, activityLog: s.activityLog }),
      // OWASP A08: validate data integrity on rehydration from localStorage
      onRehydrateStorage: () => (state) => {
        if (state && Array.isArray(state.tasks)) {
          state.tasks = sanitiseTasks(state.tasks) as Task[];
        }
      },
    }
  )
);
