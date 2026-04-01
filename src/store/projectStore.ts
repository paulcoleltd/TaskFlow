import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Project } from '../types';
import { generateId, now } from '../lib/utils';
import { sanitiseProjects } from '../lib/storageValidation';

interface ProjectStore {
  projects: Project[];
  addProject: (project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  getProjectById: (id: string) => Project | undefined;
  seedProjects: (projects: Project[]) => void;
  /** Apply a remotely-created project without re-emitting (echo prevention). */
  _applyRemoteProjectCreate: (project: Project) => void;
  /** Apply a remote project update without re-emitting (echo prevention). */
  _applyRemoteProjectUpdate: (projectId: string, updates: Partial<Project>) => void;
  /** Apply a remote project deletion without re-emitting (echo prevention). */
  _applyRemoteProjectDelete: (projectId: string) => void;
}

export const useProjectStore = create<ProjectStore>()(
  persist(
    (set, get) => ({
      projects: [],
      addProject: (data) => {
        const project: Project = {
          ...data,
          id: generateId(),
          createdAt: now(),
          updatedAt: now(),
        };
        set(state => ({ projects: [...state.projects, project] }));
      },
      updateProject: (id, updates) => {
        set(state => ({
          projects: state.projects.map(p =>
            p.id === id ? { ...p, ...updates, updatedAt: now() } : p
          ),
        }));
      },
      deleteProject: (id) =>
        set(state => ({ projects: state.projects.filter(p => p.id !== id) })),
      getProjectById: (id) => get().projects.find(p => p.id === id),
      seedProjects: (projects) => set({ projects }),

      // ── Remote-apply actions (echo-prevention) ───────────────────────────────

      _applyRemoteProjectCreate: (project) => {
        set(state => {
          if (state.projects.some(p => p.id === project.id)) return state;
          return { projects: [...state.projects, project] };
        });
      },

      _applyRemoteProjectUpdate: (projectId, updates) => {
        set(state => ({
          projects: state.projects.map(p =>
            p.id === projectId ? { ...p, ...updates } : p
          ),
        }));
      },

      _applyRemoteProjectDelete: (projectId) => {
        set(state => ({ projects: state.projects.filter(p => p.id !== projectId) }));
      },
    }),
    {
      name: 'taskflow-projects',
      // OWASP A08: validate data integrity on rehydration from localStorage
      onRehydrateStorage: () => (state) => {
        if (state && Array.isArray(state.projects)) {
          state.projects = sanitiseProjects(state.projects) as Project[];
        }
      },
    }
  )
);
