import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, CheckSquare, FolderOpen, CalendarDays,
  BarChart3, Settings2, ChevronLeft, ChevronRight, Plus, Zap, LogOut, Users2, Sun, Activity, Search, Clock, GitBranch,
} from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import { useProjectStore } from '../../store/projectStore';
import { useTaskStore } from '../../store/taskStore';
import { useAuthStore } from '../../store/authStore';
import { canCreateProject, ROLE_META } from '../../lib/permissions';
import { cn, getInitials } from '../../lib/utils';
import toast from 'react-hot-toast';

const NAV = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/today', icon: Sun, label: 'Today' },
  { to: '/my-tasks', icon: CheckSquare, label: 'My Tasks' },
  { to: '/projects', icon: FolderOpen, label: 'All Projects' },
  { to: '/calendar', icon: CalendarDays, label: 'Calendar' },
  { to: '/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/workload', icon: Users2, label: 'Workload' },
  { to: '/search',   icon: Search,   label: 'Search' },
  { to: '/activity', icon: Activity, label: 'Activity' },
  { to: '/time',     icon: Clock,      label: 'Time' },
  { to: '/roadmap',  icon: GitBranch,  label: 'Roadmap' },
  { to: '/settings', icon: Settings2,  label: 'Settings' },
];

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar, openProjectModal } = useUIStore();
  const { projects } = useProjectStore();
  const { tasks } = useTaskStore();
  const { currentUser, logout } = useAuthStore();
  const navigate = useNavigate();

  const role = currentUser?.role ?? 'viewer';
  const roleMeta = ROLE_META[role];

  const myActiveCount = tasks.filter(
    t => t.assigneeId === currentUser?.id && t.status !== 'done'
  ).length;

  const myOverdueCount = tasks.filter(t => {
    if (!t.dueDate || t.status === 'done' || t.assigneeId !== currentUser?.id) return false;
    return new Date(t.dueDate) < new Date();
  }).length;

  const handleLogout = () => {
    logout();
    toast.success('Signed out.');
  };

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
            {!sidebarCollapsed && <span className="flex-1">{label}</span>}
            {!sidebarCollapsed && label === 'Today' && myOverdueCount > 0 && (
              <span className="ml-auto min-w-[18px] h-[18px] px-1 bg-red-500 rounded-full text-[10px] text-white font-bold flex items-center justify-center" title="Overdue">
                {myOverdueCount > 9 ? '9+' : myOverdueCount}
              </span>
            )}
            {!sidebarCollapsed && label === 'My Tasks' && (
              <div className="ml-auto flex items-center gap-1">
                {myOverdueCount > 0 && (
                  <span className="min-w-[18px] h-[18px] px-1 bg-red-500 rounded-full text-[10px] text-white font-bold flex items-center justify-center" title="Overdue">
                    {myOverdueCount > 9 ? '9+' : myOverdueCount}
                  </span>
                )}
                {myActiveCount > 0 && (
                  <span className="min-w-[18px] h-[18px] px-1 bg-blue-500 rounded-full text-[10px] text-white font-bold flex items-center justify-center">
                    {myActiveCount > 99 ? '99+' : myActiveCount}
                  </span>
                )}
              </div>
            )}
          </NavLink>
        ))}

        {/* Projects list */}
        {!sidebarCollapsed && (
          <div className="pt-4">
            <div className="flex items-center justify-between px-3 mb-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Projects</span>
              {canCreateProject(role) && (
                <button
                  onClick={openProjectModal}
                  className="p-0.5 rounded hover:bg-[#1B254B] text-slate-500 hover:text-slate-300 transition-colors"
                  title="New Project"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            {projects.slice(0, 8).map(p => {
              const pActive = tasks.filter(t => t.projectId === p.id && t.status !== 'done').length;
              const pOverdue = tasks.filter(t => t.projectId === p.id && t.status !== 'done' && t.dueDate && new Date(t.dueDate) < new Date()).length;
              return (
                <button
                  key={p.id}
                  onClick={() => navigate(`/projects/${p.id}`)}
                  className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-sm text-slate-400 hover:text-slate-200 hover:bg-[#1B254B] transition-colors"
                >
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: p.colour }} />
                  <span className="flex-1 truncate text-left">{p.name}</span>
                  {pOverdue > 0 && (
                    <span className="min-w-[16px] h-4 px-0.5 bg-red-500/80 rounded-full text-[9px] text-white font-bold flex items-center justify-center" title={`${pOverdue} overdue`}>
                      {pOverdue > 9 ? '9+' : pOverdue}
                    </span>
                  )}
                  {pActive > 0 && pOverdue === 0 && (
                    <span className="text-[10px] text-slate-600">{pActive}</span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </nav>

      {/* User info + collapse toggle */}
      <div className="border-t border-[#1F3461]">
        {/* User row */}
        {currentUser && !sidebarCollapsed && (
          <div className="flex items-center gap-2.5 px-4 py-3">
            <div
              className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-white"
              style={{ backgroundColor: currentUser.colour }}
            >
              {getInitials(currentUser.name)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-200 truncate">{currentUser.name}</p>
              <span className={`text-[10px] font-medium ${roleMeta.colour}`}>{roleMeta.label}</span>
            </div>
            <button
              onClick={handleLogout}
              title="Sign out"
              className="p-1 rounded-lg hover:bg-[#0B1437] text-slate-500 hover:text-red-400 transition-colors flex-shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Collapse toggle */}
        <div className="px-3 pb-3">
          <button
            onClick={toggleSidebar}
            className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-[#1B254B] text-slate-400 hover:text-slate-200 transition-colors"
            title={sidebarCollapsed ? 'Expand' : 'Collapse'}
          >
            {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </aside>
  );
}
