import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Task } from '../types';
import { generateId } from '../lib/utils';
import { SEED_TASKS } from '../lib/sampleData';

const STORAGE_KEY = 'taskflow-mobile-tasks';

interface TaskState {
  tasks: Task[];
}

interface TaskActions {
  hydrate:       () => Promise<void>;
  seedIfEmpty:   () => Promise<void>;
  createTask:    (data: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => Task;
  updateTask:    (id: string, patch: Partial<Task>) => void;
  deleteTask:    (id: string) => void;
  // Remote-applied mutations (from Socket.io) — skip local persist to avoid echo
  _applyRemoteCreate: (task: Task) => void;
  _applyRemoteUpdate: (id: string, patch: Partial<Task>) => void;
  _applyRemoteDelete: (id: string) => void;
}

async function persist(tasks: Task[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

export const useTaskStore = create<TaskState & TaskActions>((set, get) => ({
  tasks: [],

  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) set({ tasks: JSON.parse(raw) as Task[] });
    } catch {
      /* ignore corrupt data */
    }
  },

  seedIfEmpty: async () => {
    if (get().tasks.length > 0) return;
    await persist(SEED_TASKS);
    set({ tasks: SEED_TASKS });
  },

  createTask: (data) => {
    const now  = new Date().toISOString();
    const task: Task = { ...data, id: generateId(), createdAt: now, updatedAt: now };
    const tasks = [...get().tasks, task];
    set({ tasks });
    void persist(tasks);
    return task;
  },

  updateTask: (id, patch) => {
    const tasks = get().tasks.map(t =>
      t.id === id ? { ...t, ...patch, updatedAt: new Date().toISOString() } : t,
    );
    set({ tasks });
    void persist(tasks);
  },

  deleteTask: (id) => {
    const tasks = get().tasks.filter(t => t.id !== id);
    set({ tasks });
    void persist(tasks);
  },

  _applyRemoteCreate: (task) => {
    if (get().tasks.some(t => t.id === task.id)) return; // dedupe
    set(s => ({ tasks: [...s.tasks, task] }));
    void persist(get().tasks);
  },

  _applyRemoteUpdate: (id, patch) => {
    set(s => ({
      tasks: s.tasks.map(t =>
        t.id === id ? { ...t, ...patch, updatedAt: new Date().toISOString() } : t,
      ),
    }));
    void persist(get().tasks);
  },

  _applyRemoteDelete: (id) => {
    set(s => ({ tasks: s.tasks.filter(t => t.id !== id) }));
    void persist(get().tasks);
  },
}));
