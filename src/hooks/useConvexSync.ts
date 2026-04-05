/**
 * useConvexSync — Convex → Zustand bridge.
 * No-op in local mode (VITE_CONVEX_URL not set).
 */
import { useEffect } from 'react';
import { useQuery, useConvexAuth } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useTaskStore } from '../store/taskStore';
import { useProjectStore } from '../store/projectStore';
import { convexToTask, convexToProject } from '../lib/convexUtils';

const CONVEX_MODE = !!import.meta.env.VITE_CONVEX_URL;

function _useConvexSyncActive() {
  const { isAuthenticated } = useConvexAuth();
  const convexTasks    = useQuery(api.tasks.listAll,  isAuthenticated ? {} : 'skip');
  const convexProjects = useQuery(api.projects.list,  isAuthenticated ? {} : 'skip');
  const { seedTasks }    = useTaskStore();
  const { seedProjects } = useProjectStore();
  useEffect(() => { if (convexTasks)    seedTasks(convexTasks.map(convexToTask));           }, [convexTasks]);
  useEffect(() => { if (convexProjects) seedProjects(convexProjects.map(convexToProject));  }, [convexProjects]);
}

function _useConvexSyncNoop() {
  // Local mode — AppLocal.tsx seeds from SEED_TASKS / SEED_PROJECTS directly.
}

export const useConvexSync = CONVEX_MODE ? _useConvexSyncActive : _useConvexSyncNoop;
