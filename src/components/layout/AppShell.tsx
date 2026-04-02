import { Outlet, useLocation } from 'react-router-dom';
import { Suspense } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { ShortcutsModal } from './ShortcutsModal';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { useNotifications } from '../../hooks/useNotifications';
import { useUIStore } from '../../store/uiStore';

// Inline page-level spinner — only covers the content area, not the whole shell
const PageLoader = () => (
  <div className="flex items-center justify-center h-full min-h-[200px]">
    <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
  </div>
);

const PAGE_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/today': 'Today',
  '/my-tasks': 'My Tasks',
  '/projects': 'All Projects',
  '/calendar': 'Calendar',
  '/analytics': 'Analytics',
  '/workload': 'Workload',
  '/activity': 'Activity Feed',
  '/search': 'Search',
  '/settings': 'Settings',
  '/time': 'Time Tracking',
  '/roadmap': 'Roadmap',
};

export function AppShell() {
  const { pathname } = useLocation();
  const { notificationsEnabled } = useUIStore();
  const title = PAGE_TITLES[pathname] ?? 'TaskFlow';
  useKeyboardShortcuts();
  useNotifications(notificationsEnabled);
  return (
    <div className="flex h-screen bg-[#06091A] overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header title={title} />
        <main className="flex-1 overflow-y-auto p-6">
          <Suspense fallback={<PageLoader />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
      <ShortcutsModal />
    </div>
  );
}
