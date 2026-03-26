import { NavLink } from 'react-router-dom';
import { LayoutDashboard, CheckSquare, FolderOpen, CalendarDays, Plus } from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import { cn } from '../../lib/utils';

const NAV = [
  { to: '/', icon: LayoutDashboard, label: 'Home' },
  { to: '/my-tasks', icon: CheckSquare, label: 'Tasks' },
  { to: '/projects', icon: FolderOpen, label: 'Projects' },
  { to: '/calendar', icon: CalendarDays, label: 'Calendar' },
];

export function MobileNav() {
  const { openTaskModal } = useUIStore();
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 bg-[#111C44] border-t border-[#1F3461] flex items-center justify-around px-2 py-2 z-40">
      {NAV.slice(0, 2).map(({ to, icon: Icon, label }) => (
        <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) =>
          cn('flex flex-col items-center gap-0.5 px-4 py-1 rounded-xl text-xs font-medium transition-colors',
            isActive ? 'text-blue-400' : 'text-slate-500')}>
          <Icon className="w-5 h-5" />{label}
        </NavLink>
      ))}
      <button onClick={() => openTaskModal()} className="flex flex-col items-center">
        <div className="w-12 h-12 -mt-6 rounded-2xl bg-blue-500 flex items-center justify-center shadow-glow">
          <Plus className="w-6 h-6 text-white" />
        </div>
      </button>
      {NAV.slice(2).map(({ to, icon: Icon, label }) => (
        <NavLink key={to} to={to} className={({ isActive }) =>
          cn('flex flex-col items-center gap-0.5 px-4 py-1 rounded-xl text-xs font-medium transition-colors',
            isActive ? 'text-blue-400' : 'text-slate-500')}>
          <Icon className="w-5 h-5" />{label}
        </NavLink>
      ))}
    </nav>
  );
}
