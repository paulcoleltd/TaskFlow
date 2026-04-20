/**
 * workspaceStore — local-mode workspace persistence.
 *
 * Backs the Workspaces page when VITE_CONVEX_URL is not set.
 * Data is persisted to localStorage under 'taskflow-workspaces'.
 *
 * Schema mirrors the Convex workspaces + memberships tables so
 * useWorkspaces.ts can switch between this and Convex transparently.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { generateId } from '../lib/utils';

export interface LocalWorkspace {
  _id:       string;
  name:      string;
  slug:      string;
  ownerId:   string;
  createdAt: number;
}

export interface LocalMembership {
  _id:         string;
  workspaceId: string;
  userId:      string;
  role:        'owner' | 'admin' | 'member';
  /** Resolved user info — stored inline so we avoid a join */
  user?: { name: string; email: string; colour: string };
}

interface WorkspaceStore {
  workspaces:  LocalWorkspace[];
  memberships: LocalMembership[];

  createWorkspace: (args: { name: string; ownerId: string; ownerName: string; ownerEmail: string; ownerColour: string }) => LocalWorkspace;
  deleteWorkspace: (workspaceId: string) => void;

  addMember: (args: { workspaceId: string; userId: string; role: 'owner' | 'admin' | 'member'; user?: LocalMembership['user'] }) => void;
  removeMember: (args: { workspaceId: string; userId: string }) => void;

  getMemberships: (workspaceId: string) => LocalMembership[];
  getWorkspacesForUser: (userId: string) => LocalWorkspace[];
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'workspace';
}

export const useWorkspaceStore = create<WorkspaceStore>()(
  persist(
    (set, get) => ({
      workspaces:  [],
      memberships: [],

      createWorkspace: ({ name, ownerId, ownerName, ownerEmail, ownerColour }) => {
        const id  = generateId();
        const slug = slugify(name);
        const ws: LocalWorkspace = { _id: id, name, slug, ownerId, createdAt: Date.now() };
        const membership: LocalMembership = {
          _id:         generateId(),
          workspaceId: id,
          userId:      ownerId,
          role:        'owner',
          user:        { name: ownerName, email: ownerEmail, colour: ownerColour },
        };
        set(s => ({
          workspaces:  [...s.workspaces, ws],
          memberships: [...s.memberships, membership],
        }));
        return ws;
      },

      deleteWorkspace: (workspaceId) => {
        set(s => ({
          workspaces:  s.workspaces.filter(w => w._id !== workspaceId),
          memberships: s.memberships.filter(m => m.workspaceId !== workspaceId),
        }));
      },

      addMember: ({ workspaceId, userId, role, user }) => {
        const already = get().memberships.some(m => m.workspaceId === workspaceId && m.userId === userId);
        if (already) return;
        const membership: LocalMembership = { _id: generateId(), workspaceId, userId, role, user };
        set(s => ({ memberships: [...s.memberships, membership] }));
      },

      removeMember: ({ workspaceId, userId }) => {
        set(s => ({
          memberships: s.memberships.filter(m => !(m.workspaceId === workspaceId && m.userId === userId)),
        }));
      },

      getMemberships: (workspaceId) =>
        get().memberships.filter(m => m.workspaceId === workspaceId),

      getWorkspacesForUser: (userId) => {
        const wsIds = new Set(
          get().memberships.filter(m => m.userId === userId).map(m => m.workspaceId)
        );
        return get().workspaces.filter(w => wsIds.has(w._id));
      },
    }),
    { name: 'taskflow-workspaces' }
  )
);
