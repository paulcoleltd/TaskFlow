import { NavLink } from 'react-router-dom';
import { LayoutDashboard, CheckSquare, Sun, CalendarDays, Plus } from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';
import { useTaskStore } from '../../store/taskStore';
import { canCreateTask } from '../../lib/permissions';
import { cn } from '../../lib/utils';

const NAV = [
  { to: '/', icon: LayoutDashboard, label: 'Home' },
  { to: '/my-tasks', icon: CheckSquare, label: 'Tasks' },
  { to: '/today', icon: Sun, label: 'Today' },
  { to: '/calendar', icon: CalendarDays, label: 'Calendar' },
];

export function MobileNav() {
  const { openTaskModal } = useUIStore();
  const { currentUser } = useAuthStore();
  const { tasks } = useTaskStore();
  const role = currentUser?.role ?? 'viewer';
  const showAdd = canCreateTask(role);
  const myTaskCount = tasks.filter(t => t.assigneeId === currentUser?.id && t.status !== 'done').length;

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 bg-[#0C1526] border-t border-[#1C3054] flex items-center justify-around px-2 py-2 z-40">
      {NAV.slice(0, 2).map(({ to, icon: Icon, label }) => (
        <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) =>
          cn('flex flex-col items-center gap-0.5 px-4 py-1 rounded-xl text-xs font-medium transition-colors relative',
            isActive ? 'text-blue-400' : 'text-slate-500')}>
          {({ isActive }) => (
            <>
              <div className="relative">
                <Icon className="w-5 h-5" />
                {label === 'Tasks' && myTaskCount > 0 && (
                  <span className={cn('absolute -top-1 -right-1 min-w-[14px] h-3.5 px-0.5 rounded-full text-[9px] font-bold flex items-center justify-center text-white', isActive ? 'bg-blue-500' : 'bg-red-500')}>
                    {myTaskCount > 9 ? '9+' : myTaskCount}
                  </span>
                )}
              </div>
              {label}
            </>
          )}
        </NavLink>
      ))}

      {/* Centre FAB — only for admin/member */}
      {showAdd ? (
        <button onClick={() => openTaskModal()} className="flex flex-col items-center">
          <div className="w-12 h-12 -mt-6 rounded-2xl bg-blue-500 flex items-center justify-center shadow-glow">
            <Plus className="w-6 h-6 text-white" />
          </div>
        </button>
      ) : (
        /* Placeholder to preserve nav spacing for viewers */
        <div className="w-12 h-12 -mt-6" />
      )}

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
