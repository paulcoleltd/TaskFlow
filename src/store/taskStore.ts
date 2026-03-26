import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Task, Status } from '../types';
import { generateId, now } from '../lib/utils';
import { sanitiseTasks } from '../lib/storageValidation';

interface TaskStore {
  tasks: Task[];
  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'order'>) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  moveTask: (id: string, newStatus: Status) => void;
  getTasksByProject: (projectId: string) => Task[];
  getTasksByAssignee: (userId: string) => Task[];
  getOverdueTasks: () => Task[];
  seedTasks: (tasks: Task[]) => void;
}

export const useTaskStore = create<TaskStore>()(
  persist(
    (set, get) => ({
      tasks: [],
      addTask: (taskData) => {
        const projectTasks = get().tasks.filter(t => t.projectId === taskData.projectId);
        const task: Task = {
          ...taskData,
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
      moveTask: (id, newStatus) => {
        set(state => ({
          tasks: state.tasks.map(t =>
            t.id === id ? { ...t, status: newStatus, updatedAt: now() } : t
          ),
        }));
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
    }),
    {
      name: 'taskflow-tasks',
      // OWASP A08: validate data integrity on rehydration from localStorage
      onRehydrateStorage: () => (state) => {
        if (state && Array.isArray(state.tasks)) {
          state.tasks = sanitiseTasks(state.tasks) as Task[];
        }
      },
    }
  )
);
