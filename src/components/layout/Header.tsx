import { Search, Bell, Plus, LogOut } from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import { useTaskStore } from '../../store/taskStore';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../ui/Button';
import { RoleGuard } from '../auth/RoleGuard';
import { canCreateTask, ROLE_META } from '../../lib/permissions';
import { getInitials } from '../../lib/utils';
import { useState } from 'react';
import toast from 'react-hot-toast';

export function Header({ title }: { title?: string }) {
  const { openTaskModal, setSearchQuery, searchQuery } = useUIStore();
  const { getOverdueTasks } = useTaskStore();
  const { currentUser, logout } = useAuthStore();
  const [focused, setFocused] = useState(false);

  const overdueCount = getOverdueTasks().length;
  const role = currentUser?.role ?? 'viewer';
  const roleMeta = ROLE_META[role];

  const handleLogout = () => {
    logout();
    toast.success('Signed out successfully.');
  };

  return (
    <header className="h-14 flex items-center justify-between px-6 bg-[#0B1437] border-b border-[#1F3461] flex-shrink-0">
      <h1 className="text-base font-semibold text-white">{title}</h1>

      <div className="flex items-center gap-3">
        {/* Search */}
        <div className={`relative hidden sm:flex items-center gap-2 rounded-xl bg-[#111C44] border px-3 py-1.5 transition-colors ${focused ? 'border-blue-500' : 'border-[#1F3461]'}`}>
          <Search className="w-3.5 h-3.5 text-slate-500" />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="Search tasks..."
            className="bg-transparent text-sm text-slate-200 placeholder-slate-500 outline-none w-44"
          />
        </div>

        {/* Overdue bell */}
        <div className="relative">
          <button className="p-2 rounded-xl hover:bg-[#111C44] text-slate-400 hover:text-slate-200 transition-colors">
            <Bell className="w-4 h-4" />
          </button>
          {overdueCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center font-bold">
              {overdueCount}
            </span>
          )}
        </div>

        {/* New Task — hidden for viewers */}
        <RoleGuard allowed={canCreateTask(role)}>
          <Button size="sm" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => openTaskModal()}>
            New Task
          </Button>
        </RoleGuard>

        {/* Current user + role */}
        {currentUser && (
          <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-[#1F3461]">
            {/* Avatar */}
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
              style={{ backgroundColor: currentUser.colour }}
            >
              {getInitials(currentUser.name)}
            </div>
            {/* Role badge */}
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${roleMeta.colour} ${roleMeta.bg}`}>
              {roleMeta.label}
            </span>
            {/* Logout */}
            <button
              onClick={handleLogout}
              title="Sign out"
              className="p-1.5 rounded-lg hover:bg-[#111C44] text-slate-500 hover:text-red-400 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
