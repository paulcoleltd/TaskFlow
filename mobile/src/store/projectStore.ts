import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Project } from '../types';
import { generateId } from '../lib/utils';
import { SEED_PROJECTS } from '../lib/sampleData';

const STORAGE_KEY = 'taskflow-mobile-projects';

interface ProjectState {
  projects: Project[];
}

interface ProjectActions {
  hydrate:      () => Promise<void>;
  seedIfEmpty:  () => Promise<void>;
  createProject: (data: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => Project;
  updateProject: (id: string, patch: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  _applyRemoteCreate: (project: Project) => void;
  _applyRemoteUpdate: (id: string, patch: Partial<Project>) => void;
  _applyRemoteDelete: (id: string) => void;
}

async function persist(projects: Project[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

export const useProjectStore = create<ProjectState & ProjectActions>((set, get) => ({
  projects: [],

  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) set({ projects: JSON.parse(raw) as Project[] });
    } catch { /* ignore */ }
  },

  seedIfEmpty: async () => {
    if (get().projects.length > 0) return;
    await persist(SEED_PROJECTS);
    set({ projects: SEED_PROJECTS });
  },

  createProject: (data) => {
    const now = new Date().toISOString();
    const project: Project = { ...data, id: generateId(), createdAt: now, updatedAt: now };
    const projects = [...get().projects, project];
    set({ projects });
    void persist(projects);
    return project;
  },

  updateProject: (id, patch) => {
    const projects = get().projects.map(p =>
      p.id === id ? { ...p, ...patch, updatedAt: new Date().toISOString() } : p,
    );
    set({ projects });
    void persist(projects);
  },

  deleteProject: (id) => {
    const projects = get().projects.filter(p => p.id !== id);
    set({ projects });
    void persist(projects);
  },

  _applyRemoteCreate: (project) => {
    if (get().projects.some(p => p.id === project.id)) return;
    set(s => ({ projects: [...s.projects, project] }));
    void persist(get().projects);
  },

  _applyRemoteUpdate: (id, patch) => {
    set(s => ({
      projects: s.projects.map(p =>
        p.id === id ? { ...p, ...patch, updatedAt: new Date().toISOString() } : p,
      ),
    }));
    void persist(get().projects);
  },

  _applyRemoteDelete: (id) => {
    set(s => ({ projects: s.projects.filter(p => p.id !== id) }));
    void persist(get().projects);
  },
}));
