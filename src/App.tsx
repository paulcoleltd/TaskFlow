import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AppShell } from './components/layout/AppShell';
import { MobileNav } from './components/layout/MobileNav';
import { TaskModal } from './components/tasks/TaskModal';
import { TaskDetail } from './components/tasks/TaskDetail';
import { ProjectModal } from './components/projects/ProjectModal';
import { CommandPalette } from './components/layout/CommandPalette';
import { FocusMode } from './components/tasks/FocusMode';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useUIStore } from './store/uiStore';
import { useAuthStore } from './store/authStore';
import { useCurrentUser } from './hooks/useConvexUser';
import { useTaskStore } from './store/taskStore';
import { useProjectStore } from './store/projectStore';
import { useConvexSync } from './hooks/useConvexSync';
import { usePresenceHeartbeat } from './hooks/usePresenceHeartbeat';
import { SEED_TASKS, SEED_PROJECTS } from './lib/sampleData';

const CONVEX_MODE = !!import.meta.env.VITE_CONVEX_URL;

// Lazy-load all pages — each becomes its own JS chunk
const LoginPage       = lazy(() => import('./pages/LoginPage'));
const DashboardPage   = lazy(() => import('./pages/DashboardPage'));
const MyTasksPage     = lazy(() => import('./pages/MyTasksPage'));
const AllProjectsPage = lazy(() => import('./pages/AllProjectsPage'));
const ProjectPage     = lazy(() => import('./pages/ProjectPage'));
const CalendarPage    = lazy(() => import('./pages/CalendarPage'));
const AnalyticsPage   = lazy(() => import('./pages/AnalyticsPage'));
const SettingsPage    = lazy(() => import('./pages/SettingsPage'));
const WorkloadPage    = lazy(() => import('./pages/WorkloadPage'));
const TodayPage       = lazy(() => import('./pages/TodayPage'));
const ActivityPage    = lazy(() => import('./pages/ActivityPage'));
const SearchPage      = lazy(() => import('./pages/SearchPage'));
const TimePage        = lazy(() => import('./pages/TimePage'));
const RoadmapPage     = lazy(() => import('./pages/RoadmapPage'));

function App() {
  const { selectedTaskId, isFocusModeOpen, closeFocusMode, theme } = useUIStore();

  // Auth state — currentUser is null/undefined when not logged in (both modes)
  const currentUser = useCurrentUser();
  const localAuth   = useAuthStore();
  const isAuthenticated = CONVEX_MODE ? !!currentUser : localAuth.isAuthenticated;

  // Sync Convex real-time data → Zustand stores (no-op in local mode)
  useConvexSync();

  // Global presence heartbeat (no-op in local mode)
  usePresenceHeartbeat('global');

  // Local mode — seed sample data on first launch
  const { tasks, seedTasks } = useTaskStore();
  const { projects, seedProjects } = useProjectStore();
  useEffect(() => {
    if (!CONVEX_MODE) {
      // Restore session from localStorage
      try {
        const saved = JSON.parse(localStorage.getItem('taskflow-local-auth') ?? 'null');
        if (saved) useAuthStore.setState({ currentUser: saved, token: 'local', isAuthenticated: true });
      } catch {}
      // Seed data
      if (tasks.length === 0) seedTasks(SEED_TASKS);
      if (projects.length === 0) seedProjects(SEED_PROJECTS);
    }
  }, []);

  // Apply theme
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'light') root.setAttribute('data-theme', 'light');
    else root.removeAttribute('data-theme');
  }, [theme]);

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: { background: '#0C1526', color: '#E2E8F0', border: '1px solid #1C3054', fontSize: 13 },
          }}
        />
        <Suspense fallback={null}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
              <Route index element={<DashboardPage />} />
              <Route path="my-tasks" element={<MyTasksPage />} />
              <Route path="projects" element={<AllProjectsPage />} />
              <Route path="projects/:id" element={<ProjectPage />} />
              <Route path="calendar" element={<CalendarPage />} />
              <Route path="analytics" element={<AnalyticsPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="workload" element={<WorkloadPage />} />
              <Route path="today" element={<TodayPage />} />
              <Route path="activity" element={<ActivityPage />} />
              <Route path="search" element={<SearchPage />} />
              <Route path="time" element={<TimePage />} />
              <Route path="roadmap" element={<RoadmapPage />} />
            </Route>
          </Routes>

          {isAuthenticated && <MobileNav />}
          {isAuthenticated && <TaskModal />}
          {isAuthenticated && selectedTaskId && <TaskDetail />}
          {isAuthenticated && <ProjectModal />}
          {isAuthenticated && <CommandPalette />}
          {isAuthenticated && isFocusModeOpen && selectedTaskId && (
            <FocusMode taskId={selectedTaskId} onClose={closeFocusMode} />
          )}
        </Suspense>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
