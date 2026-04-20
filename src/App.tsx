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
import { InstallBanner } from './components/ui/InstallBanner';
import { useUIStore } from './store/uiStore';
import { useAuthStore } from './store/authStore';
import { useCurrentUser } from './hooks/useConvexUser';
import { useTaskStore } from './store/taskStore';
import { useProjectStore } from './store/projectStore';
import { useUserStore } from './store/userStore';
import { useConvexSync } from './hooks/useConvexSync';
import { usePresenceHeartbeat } from './hooks/usePresenceHeartbeat';
import { useCollaboration } from './hooks/useCollaboration';
import { useInstallPrompt } from './hooks/useInstallPrompt';
import { SEED_TASKS, SEED_PROJECTS, SEED_USERS } from './lib/sampleData';

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
const RoadmapPage          = lazy(() => import('./pages/RoadmapPage'));
const PublicProjectPage    = lazy(() => import('./pages/PublicProjectPage'));
const WorkspacesPage       = lazy(() => import('./pages/WorkspacesPage'));
const ManualPage           = lazy(() => import('./pages/ManualPage'));

function App() {
  const { selectedTaskId, isFocusModeOpen, closeFocusMode, theme } = useUIStore();
  const { canInstall, promptInstall, dismiss: dismissInstall } = useInstallPrompt();

  // Auth state — currentUser is null/undefined when not logged in (both modes)
  const currentUser = useCurrentUser();
  const localAuth   = useAuthStore();
  const isAuthenticated = CONVEX_MODE ? !!currentUser : localAuth.isAuthenticated;

  // Sync Convex real-time data → Zustand stores (no-op in local mode)
  useConvexSync();

  // Socket.io collaboration — connects socket, wires all real-time events
  useCollaboration();

  // Global presence heartbeat (no-op in local mode)
  usePresenceHeartbeat('global');

  // Local mode — seed sample data on first launch + restore server-side session
  const { tasks, seedTasks } = useTaskStore();
  const { projects, seedProjects } = useProjectStore();
  const { seedUsers } = useUserStore();
  const { restoreSession } = useAuthStore();
  useEffect(() => {
    if (!CONVEX_MODE) {
      // Re-validate the httpOnly cookie server-side on every page load.
      // This is the only way JS can know if the cookie is still valid.
      // In DEV mode without a running API server, this is a no-op (catches network error).
      restoreSession();
      // Seed data
      if (tasks.length === 0) seedTasks(SEED_TASKS);
      if (projects.length === 0) seedProjects(SEED_PROJECTS);
      seedUsers(SEED_USERS);   // idempotent — only seeds if store is empty
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
            <Route path="/manual" element={<ManualPage />} />
            <Route path="/share/:token" element={<PublicProjectPage />} />
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
              <Route path="workspaces" element={<WorkspacesPage />} />
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

          {/* PWA install banner — shown when browser signals installability */}
          {canInstall && (
            <InstallBanner onInstall={promptInstall} onDismiss={dismissInstall} />
          )}
        </Suspense>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
