import { useNavigate } from 'react-router-dom';
import { useTaskStore } from '../store/taskStore';
import { useProjectStore } from '../store/projectStore';
import { useAuthStore } from '../store/authStore';
import { RoleGuard } from '../components/auth/RoleGuard';
import { canClearData, canExportData, ROLE_META } from '../lib/permissions';
import { Button } from '../components/ui/Button';
import { Avatar } from '../components/ui/Avatar';
import { SEED_USERS } from '../lib/sampleData';
import toast from 'react-hot-toast';
import { LogOut } from 'lucide-react';

export default function SettingsPage() {
  const { currentUser, logout } = useAuthStore();
  const navigate = useNavigate();
  const role = currentUser?.role ?? 'viewer';
  const roleMeta = ROLE_META[role];

  const handleLogout = () => {
    logout();
    toast.success('Signed out.');
    navigate('/login', { replace: true });
  };

  const handleClearData = () => {
    if (window.confirm('Clear all data? This cannot be undone.')) {
      localStorage.removeItem('taskflow-tasks');
      localStorage.removeItem('taskflow-projects');
      window.location.reload();
    }
  };

  return (
    <div className="max-w-2xl space-y-6 pb-20 md:pb-0">
      {/* Profile */}
      <div className="bg-[#111C44] border border-[#1F3461] rounded-xl p-6">
        <h3 className="text-sm font-semibold text-white mb-4">Profile</h3>
        {currentUser && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Avatar name={currentUser.name} colour={currentUser.colour} size="lg" />
              <div>
                <p className="font-semibold text-white">{currentUser.name}</p>
                <p className="text-sm text-slate-400">{currentUser.email}</p>
              </div>
            </div>
            <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${roleMeta.colour} ${roleMeta.bg}`}>
              {roleMeta.label}
            </span>
          </div>
        )}
      </div>

      {/* Appearance */}
      <div className="bg-[#111C44] border border-[#1F3461] rounded-xl p-6">
        <h3 className="text-sm font-semibold text-white mb-4">Appearance</h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-200">Theme</p>
            <p className="text-xs text-slate-400">Currently using dark mode</p>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/30 text-xs text-blue-400 font-medium">Dark</div>
        </div>
      </div>

      {/* Data Management */}
      <div className="bg-[#111C44] border border-[#1F3461] rounded-xl p-6">
        <h3 className="text-sm font-semibold text-white mb-4">Data Management</h3>
        <div className="space-y-3">
          <RoleGuard
            allowed={canExportData(role)}
            fallback={
              <div className="flex items-center justify-between p-3 bg-[#0B1437] rounded-xl opacity-50">
                <div>
                  <p className="text-sm text-slate-400">Export Data</p>
                  <p className="text-xs text-slate-500">Requires Member or Admin role</p>
                </div>
                <Button variant="secondary" size="sm" disabled>Export</Button>
              </div>
            }
          >
            <div className="flex items-center justify-between p-3 bg-[#0B1437] rounded-xl">
              <div>
                <p className="text-sm text-slate-200">Export Data</p>
                <p className="text-xs text-slate-400">Download all tasks and projects as JSON</p>
              </div>
              <Button variant="secondary" size="sm" onClick={() => {
                const data = {
                  tasks: useTaskStore.getState().tasks,
                  projects: useProjectStore.getState().projects,
                  exportedAt: new Date().toISOString(),
                };
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url; a.download = 'taskflow-export.json'; a.click();
                URL.revokeObjectURL(url);
                toast.success('Data exported!');
              }}>Export</Button>
            </div>
          </RoleGuard>

          <RoleGuard
            allowed={canClearData(role)}
            fallback={
              <div className="flex items-center justify-between p-3 bg-[#0B1437] rounded-xl opacity-50">
                <div>
                  <p className="text-sm text-slate-400">Clear All Data</p>
                  <p className="text-xs text-slate-500">Requires Admin role</p>
                </div>
                <Button variant="danger" size="sm" disabled>Clear</Button>
              </div>
            }
          >
            <div className="flex items-center justify-between p-3 bg-[#0B1437] rounded-xl">
              <div>
                <p className="text-sm text-slate-200">Clear All Data</p>
                <p className="text-xs text-slate-400">Remove all tasks and projects permanently</p>
              </div>
              <Button variant="danger" size="sm" onClick={handleClearData}>Clear</Button>
            </div>
          </RoleGuard>
        </div>
      </div>

      {/* Team */}
      <div className="bg-[#111C44] border border-[#1F3461] rounded-xl p-6">
        <h3 className="text-sm font-semibold text-white mb-4">Team Members</h3>
        <div className="space-y-3">
          {SEED_USERS.map(u => {
            const uRole = u.id === 'user-1' ? 'admin' : u.id === 'user-2' ? 'member' : 'viewer';
            const uMeta = ROLE_META[uRole];
            return (
              <div key={u.id} className="flex items-center gap-3">
                <Avatar name={u.name} colour={u.colour} />
                <div className="flex-1">
                  <p className="text-sm text-slate-200">{u.name}</p>
                  <p className="text-xs text-slate-400">{u.email}</p>
                </div>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${uMeta.colour} ${uMeta.bg}`}>
                  {uMeta.label}
                </span>
                {u.id === currentUser?.id && (
                  <span className="text-xs text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded-full border border-blue-400/20">You</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Sign out */}
      <div className="bg-[#111C44] border border-[#1F3461] rounded-xl p-6">
        <h3 className="text-sm font-semibold text-white mb-4">Session</h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-200">Sign out</p>
            <p className="text-xs text-slate-400">End your current session</p>
          </div>
          <Button variant="danger" size="sm" icon={<LogOut className="w-3.5 h-3.5" />} onClick={handleLogout}>
            Sign out
          </Button>
        </div>
      </div>
    </div>
  );
}
