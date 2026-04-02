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
import { useTaskStore } from './store/taskStore';
import { useProjectStore } from './store/projectStore';
import { useUIStore } from './store/uiStore';
import { useAuthStore } from './store/authStore';
import { useCollaboration } from './hooks/useCollaboration';
import { SEED_TASKS, SEED_PROJECTS } from './lib/sampleData';

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
  const { tasks, seedTasks } = useTaskStore();
  const { projects, seedProjects } = useProjectStore();
  const { selectedTaskId, isFocusModeOpen, closeFocusMode, theme } = useUIStore();
  const { isAuthenticated } = useAuthStore();

  // Wire real-time collaboration — no-ops when not authenticated
  useCollaboration();

  // Apply theme class to <html> so CSS variables switch
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'light') {
      root.setAttribute('data-theme', 'light');
    } else {
      root.removeAttribute('data-theme');
    }
  }, [theme]);

  // Seed on first launch
  useEffect(() => {
    if (tasks.length === 0) seedTasks(SEED_TASKS);
    if (projects.length === 0) seedProjects(SEED_PROJECTS);
  }, []);

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: { background: '#0C1526', color: '#E2E8F0', border: '1px solid #1C3054', fontSize: 13 },
          }}
        />
        <Routes>
          {/* ── Public route — Suspense here covers only the login chunk ── */}
          <Route path="/login" element={<Suspense fallback={null}><LoginPage /></Suspense>} />

          {/* ── Protected routes — require authentication ── */}
          <Route
            element={
              <ProtectedRoute>
                <AppShell />
              </ProtectedRoute>
            }
          >
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

        {/* Global overlays — gated on authentication so they never appear on /login */}
        {isAuthenticated && <MobileNav />}
        {isAuthenticated && <TaskModal />}
        {isAuthenticated && selectedTaskId && <TaskDetail />}
        {isAuthenticated && <ProjectModal />}
        {isAuthenticated && <CommandPalette />}
        {isAuthenticated && isFocusModeOpen && selectedTaskId && (
          <FocusMode taskId={selectedTaskId} onClose={closeFocusMode} />
        )}
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
