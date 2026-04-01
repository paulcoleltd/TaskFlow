import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Priority } from '../types';

export interface UserTemplate {
  id: string;
  name: string;
  icon: string;
  description: string;
  priority: Priority;
  subtasks: string[];
  tags: string[];
  estimatedHours?: number;
  createdAt: string;
}

interface TemplateStore {
  templates: UserTemplate[];
  addTemplate: (tpl: Omit<UserTemplate, 'id' | 'createdAt'>) => void;
  updateTemplate: (id: string, changes: Partial<Omit<UserTemplate, 'id' | 'createdAt'>>) => void;
  deleteTemplate: (id: string) => void;
}

export const useTemplateStore = create<TemplateStore>()(
  persist(
    (set) => ({
      templates: [],
      addTemplate: (tpl) =>
        set(s => ({
          templates: [
            ...s.templates,
            {
              ...tpl,
              id: `utpl-${crypto.randomUUID()}`,
              createdAt: new Date().toISOString(),
            },
          ],
        })),
      updateTemplate: (id, changes) =>
        set(s => ({ templates: s.templates.map(t => t.id === id ? { ...t, ...changes } : t) })),
      deleteTemplate: (id) =>
        set(s => ({ templates: s.templates.filter(t => t.id !== id) })),
    }),
    { name: 'taskflow-templates' }
  )
);
