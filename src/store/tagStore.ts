import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Tag } from '../types';
import { TAG_OPTIONS } from '../lib/constants';
import { useTaskStore } from './taskStore';

interface TagStore {
  tags: Tag[];
  addTag: (name: string, colour: string) => void;
  updateTag: (id: string, changes: Partial<Omit<Tag, 'id'>>) => void;
  /** Deletes a tag and removes it from every task that references it. */
  deleteTag: (id: string) => void;
}

export const useTagStore = create<TagStore>()(
  persist(
    (set) => ({
      tags: TAG_OPTIONS,
      addTag: (name, colour) =>
        set(s => ({ tags: [...s.tags, { id: `tag-${crypto.randomUUID()}`, name: name.trim(), colour }] })),
      updateTag: (id, changes) =>
        set(s => ({ tags: s.tags.map(t => t.id === id ? { ...t, ...changes } : t) })),
      deleteTag: (id) => {
        // Cascade: strip the tag from every task that references it
        const taskState = useTaskStore.getState();
        const affected = taskState.tasks.filter(t => t.tags.includes(id));
        for (const task of affected) {
          taskState.updateTask(task.id, { tags: task.tags.filter(tid => tid !== id) });
        }
        set(s => ({ tags: s.tags.filter(t => t.id !== id) }));
      },
    }),
    { name: 'taskflow-tags' }
  )
);
