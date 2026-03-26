import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, CheckSquare, FolderOpen, CalendarDays,
  BarChart3, Settings2, ChevronLeft, ChevronRight, Plus, Zap,
} from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import { useProjectStore } from '../../store/projectStore';
import { cn } from '../../lib/utils';

const NAV = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/my-tasks', icon: CheckSquare, label: 'My Tasks' },
  { to: '/projects', icon: FolderOpen, label: 'All Projects' },
  { to: '/calendar', icon: CalendarDays, label: 'Calendar' },
  { to: '/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/settings', icon: Settings2, label: 'Settings' },
];

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar, openProjectModal } = useUIStore();
  const { projects } = useProjectStore();
  const navigate = useNavigate();

  return (
    <aside className={cn(
      'hidden md:flex flex-col h-screen bg-[#111C44] border-r border-[#1F3461] transition-all duration-300 flex-shrink-0',
      sidebarCollapsed ? 'w-16' : 'w-60'
    )}>
      {/* Logo */}
      <div className={cn('flex items-center gap-3 px-4 py-5 border-b border-[#1F3461]', sidebarCollapsed && 'justify-center px-0')}>
        <div className="w-8 h-8 rounded-xl bg-blue-500 flex items-center justify-center flex-shrink-0">
          <Zap className="w-4 h-4 text-white" />
        </div>
        {!sidebarCollapsed && <span className="text-base font-bold text-white">TaskFlow</span>}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => cn(
              'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150',
              sidebarCollapsed ? 'justify-center px-0 w-10 mx-auto' : '',
              isActive
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#1B254B]'
            )}
            title={sidebarCollapsed ? label : undefined}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            {!sidebarCollapsed && label}
          </NavLink>
        ))}

        {/* Projects list */}
        {!sidebarCollapsed && (
          <div className="pt-4">
            <div className="flex items-center justify-between px-3 mb-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Projects</span>
              <button onClick={openProjectModal} className="p-0.5 rounded hover:bg-[#1B254B] text-slate-500 hover:text-slate-300 transition-colors">
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
            {projects.slice(0, 8).map(p => (
              <button
                key={p.id}
                onClick={() => navigate(`/projects/${p.id}`)}
                className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-sm text-slate-400 hover:text-slate-200 hover:bg-[#1B254B] transition-colors"
              >
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: p.colour }} />
                <span className="truncate">{p.name}</span>
              </button>
            ))}
          </div>
        )}
      </nav>

      {/* Collapse toggle */}
      <div className="p-3 border-t border-[#1F3461]">
        <button
          onClick={toggleSidebar}
          className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-[#1B254B] text-slate-400 hover:text-slate-200 transition-colors"
          title={sidebarCollapsed ? 'Expand' : 'Collapse'}
        >
          {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </aside>
  );
}
