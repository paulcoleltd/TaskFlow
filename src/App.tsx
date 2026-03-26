import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AppShell } from './components/layout/AppShell';
import { MobileNav } from './components/layout/MobileNav';
import { TaskModal } from './components/tasks/TaskModal';
import { TaskDetail } from './components/tasks/TaskDetail';
import { ProjectModal } from './components/projects/ProjectModal';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { useTaskStore } from './store/taskStore';
import { useProjectStore } from './store/projectStore';
import { useUIStore } from './store/uiStore';
import { SEED_TASKS, SEED_PROJECTS } from './lib/sampleData';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import MyTasksPage from './pages/MyTasksPage';
import AllProjectsPage from './pages/AllProjectsPage';
import ProjectPage from './pages/ProjectPage';
import CalendarPage from './pages/CalendarPage';
import AnalyticsPage from './pages/AnalyticsPage';
import SettingsPage from './pages/SettingsPage';

function App() {
  const { tasks, seedTasks } = useTaskStore();
  const { projects, seedProjects } = useProjectStore();
  const { selectedTaskId } = useUIStore();

  // Seed on first launch
  useEffect(() => {
    if (tasks.length === 0) seedTasks(SEED_TASKS);
    if (projects.length === 0) seedProjects(SEED_PROJECTS);
  }, []);

  return (
    <BrowserRouter>
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: { background: '#111C44', color: '#E2E8F0', border: '1px solid #1F3461', fontSize: 13 },
        }}
      />
      <Routes>
        {/* ── Public route ── */}
        <Route path="/login" element={<LoginPage />} />

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
        </Route>
      </Routes>

      {/* Global overlays — only rendered when authenticated */}
      <MobileNav />
      <TaskModal />
      {selectedTaskId && <TaskDetail />}
      <ProjectModal />
    </BrowserRouter>
  );
}

export default App;
