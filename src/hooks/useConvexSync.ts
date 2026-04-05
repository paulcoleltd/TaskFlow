/**
 * useConvexSync — Convex → Zustand bridge.
 *
 * Subscribes to Convex real-time queries and syncs the results into the
 * existing Zustand stores. This lets all 14 pages continue reading from
 * Zustand (zero page-level changes needed) while the data source is now
 * Convex instead of localStorage seed data.
 *
 * Mount this once in App.tsx after ConvexAuthProvider. It is a no-op
 * when Convex is not connected or the user is not authenticated.
 */
import { useEffect } from 'react';
import { useQuery, useConvexAuth } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useTaskStore } from '../store/taskStore';
import { useProjectStore } from '../store/projectStore';
import { convexToTask, convexToProject } from '../lib/convexUtils';

export function useConvexSync() {
  const { isAuthenticated } = useConvexAuth();

  // Only run queries when authenticated — returns undefined while loading
  const convexTasks    = useQuery(api.tasks.listAll,    isAuthenticated ? {} : 'skip');
  const convexProjects = useQuery(api.projects.list,    isAuthenticated ? {} : 'skip');

  const { seedTasks }    = useTaskStore();
  const { seedProjects } = useProjectStore();

  // Sync tasks from Convex into Zustand on every change (real-time)
  useEffect(() => {
    if (!convexTasks) return;
    seedTasks(convexTasks.map(convexToTask));
  }, [convexTasks]);

  // Sync projects from Convex into Zustand on every change (real-time)
  useEffect(() => {
    if (!convexProjects) return;
    seedProjects(convexProjects.map(convexToProject));
  }, [convexProjects]);
}
