import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

const PAGE_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/my-tasks': 'My Tasks',
  '/projects': 'All Projects',
  '/calendar': 'Calendar',
  '/analytics': 'Analytics',
  '/settings': 'Settings',
};

export function AppShell() {
  const { pathname } = useLocation();
  const title = PAGE_TITLES[pathname] ?? 'TaskFlow';
  return (
    <div className="flex h-screen bg-[#0B1437] overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header title={title} />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
