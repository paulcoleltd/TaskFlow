import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Sprint } from '../types';
import { generateId, now } from '../lib/utils';

interface SprintStore {
  sprints: Sprint[];
  addSprint: (data: Omit<Sprint, 'id' | 'createdAt' | 'status'>) => Sprint;
  updateSprint: (id: string, updates: Partial<Sprint>) => void;
  deleteSprint: (id: string) => void;
  startSprint: (id: string) => void;
  completeSprint: (id: string) => void;
  getProjectSprints: (projectId: string) => Sprint[];
  getActiveSprint: (projectId: string) => Sprint | undefined;
}

export const useSprintStore = create<SprintStore>()(
  persist(
    (set, get) => ({
      sprints: [],

      addSprint: (data) => {
        const sprint: Sprint = {
          ...data,
          id: generateId(),
          status: 'planning',
          createdAt: now(),
        };
        set(s => ({ sprints: [...s.sprints, sprint] }));
        return sprint;
      },

      updateSprint: (id, updates) => {
        set(s => ({
          sprints: s.sprints.map(sp => sp.id === id ? { ...sp, ...updates } : sp),
        }));
      },

      deleteSprint: (id) => {
        set(s => ({ sprints: s.sprints.filter(sp => sp.id !== id) }));
      },

      startSprint: (id) => {
        // Only one active sprint per project
        const sprint = get().sprints.find(sp => sp.id === id);
        if (!sprint) return;
        set(s => ({
          sprints: s.sprints.map(sp => {
            if (sp.id === id) return { ...sp, status: 'active' };
            // Deactivate any other active sprint in the same project
            if (sp.projectId === sprint.projectId && sp.status === 'active') {
              return { ...sp, status: 'planning' };
            }
            return sp;
          }),
        }));
      },

      completeSprint: (id) => {
        set(s => ({
          sprints: s.sprints.map(sp =>
            sp.id === id ? { ...sp, status: 'completed' } : sp
          ),
        }));
      },

      getProjectSprints: (projectId) =>
        get().sprints.filter(sp => sp.projectId === projectId),

      getActiveSprint: (projectId) =>
        get().sprints.find(sp => sp.projectId === projectId && sp.status === 'active'),
    }),
    { name: 'taskflow-sprints' }
  )
);
