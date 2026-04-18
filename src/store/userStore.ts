/**
 * userStore — Zustand persist store for the team member list.
 *
 * Replaces the static SEED_USERS constant so admins can add/remove users
 * at runtime without a code change.  The store is seeded on first launch
 * (users.length === 0) from SEED_USERS in App.tsx, identical to how
 * taskStore and projectStore are seeded.
 *
 * All components should import { useUsers } or { useUserStore } from here
 * instead of importing SEED_USERS directly from sampleData.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Role } from '../types';
import { generateId } from '../lib/utils';

// Colour palette cycled when creating a new user without an explicit colour
const PALETTE = [
  '#4B8CF7', '#8B5CF6', '#10B981', '#F59E0B',
  '#EF4444', '#06B6D4', '#EC4899', '#84CC16',
];

interface UserState {
  users: User[];

  // Seed (called once on first launch)
  seedUsers: (initial: User[]) => void;

  // CRUD
  addUser:    (u: Omit<User, 'id' | 'colour'> & { colour?: string; role?: Role }) => User;
  updateUser: (id: string, patch: Partial<Omit<User, 'id'>>) => void;
  removeUser: (id: string) => void;

  // Helpers
  getUserById: (id: string) => User | undefined;
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      users: [],

      seedUsers: (initial) => {
        if (get().users.length === 0) set({ users: initial });
      },

      addUser: (input) => {
        const usedColours = get().users.map(u => u.colour);
        const colour =
          input.colour ??
          (PALETTE.find(c => !usedColours.includes(c)) ?? PALETTE[get().users.length % PALETTE.length]);

        const newUser: User = {
          id:     generateId(),
          name:   input.name.trim(),
          email:  input.email.trim().toLowerCase(),
          colour,
          role:   input.role ?? 'member',
          ...(input.avatar ? { avatar: input.avatar } : {}),
        };
        set(s => ({ users: [...s.users, newUser] }));
        return newUser;
      },

      updateUser: (id, patch) =>
        set(s => ({
          users: s.users.map(u => (u.id === id ? { ...u, ...patch } : u)),
        })),

      removeUser: (id) => {
        // Security: prevent removal of the last admin account (T1531)
        const { users } = get();
        const target = users.find(u => u.id === id);
        if (target?.role === 'admin') {
          const remainingAdmins = users.filter(u => u.role === 'admin' && u.id !== id);
          if (remainingAdmins.length === 0) {
            console.warn('[userStore] removeUser blocked — cannot remove the last admin account');
            return; // silently block; caller should surface an error message
          }
        }
        set(s => ({ users: s.users.filter(u => u.id !== id) }));
      },

      getUserById: (id) => get().users.find(u => u.id === id),
    }),
    {
      name: 'taskflow-users',
      // Rehydration sanitiser — strip unexpected fields to prevent stored XSS
      // from a manually crafted localStorage entry (OWASP A08).
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        state.users = (state.users ?? [])
          .filter((u): u is User => !!u && typeof u.id === 'string')
          .map(u => {
            const VALID_ROLES: Role[] = ['admin', 'member', 'viewer'];
            return {
              id:     String(u.id).slice(0, 64),
              name:   String(u.name  ?? '').slice(0, 100),
              email:  String(u.email ?? '').slice(0, 200),
              colour: /^#[0-9a-fA-F]{6}$/.test(u.colour ?? '') ? u.colour : '#4B8CF7',
              role:   (u.role && VALID_ROLES.includes(u.role as Role) ? u.role : 'member') as Role,
              ...(u.avatar ? { avatar: String(u.avatar).slice(0, 500) } : {}),
            };
          });
      },
    }
  )
);

/** Convenience hook — returns the live user array. */
export const useUsers = () => useUserStore(s => s.users);
