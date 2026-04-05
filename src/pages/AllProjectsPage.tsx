import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FolderOpen, Trash2, Search, AlertTriangle } from 'lucide-react';
import { useProjectStore } from '../store/projectStore';
import { useTaskStore } from '../store/taskStore';
import type { Project } from '../types';
import { useUIStore } from '../store/uiStore';
import { useCurrentUser } from '../hooks/useConvexUser';
import { RoleGuard } from '../components/auth/RoleGuard';
import { canCreateProject, canDeleteProject } from '../lib/permissions';
import { ProgressBar } from '../components/ui/ProgressBar';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { SEED_USERS } from '../lib/sampleData';
import { formatDate } from '../lib/utils';
import toast from 'react-hot-toast';
import { emitProjectDelete, emitProjectUpdate } from '../lib/collabEmit';

export default function AllProjectsPage() {
  const { projects, deleteProject, updateProject } = useProjectStore();
  const { tasks } = useTaskStore();
  const { openProjectModal } = useUIStore();
  const currentUser = useCurrentUser();
  const navigate = useNavigate();
  const [tab, setTab] = useState<'all' | 'active' | 'completed' | 'archived'>('all');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'updated' | 'completion' | 'deadline'>('updated');
  const role = currentUser?.role ?? 'viewer';

  const filtered = useMemo(() => {
    const base = projects.filter(p => {
      if (tab !== 'all' && p.status !== tab) return false;
      if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
    return [...base].sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'updated') return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      if (sortBy === 'deadline') {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }
      if (sortBy === 'completion') {
        const pctA = (() => { const t = tasks.filter(t => t.projectId === a.id); return t.length ? t.filter(t => t.status === 'done').length / t.length : 0; })();
        const pctB = (() => { const t = tasks.filter(t => t.projectId === b.id); return t.length ? t.filter(t => t.status === 'done').length / t.length : 0; })();
        return pctB - pctA;
      }
      return 0;
    });
  }, [projects, tasks, tab, search, sortBy]);

  const handleDelete = (e: React.MouseEvent, projectId: string, projectName: string) => {
    e.stopPropagation();
    if (!window.confirm(`Delete "${projectName}"? All associated tasks will remain but lose their project link.`)) return;
    deleteProject(projectId);
    emitProjectDelete(projectId);
    toast.success('Project deleted');
  };

  return (
    <div className="pb-20 md:pb-0">
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex gap-1 bg-[#0C1526] border border-[#1C3054] rounded-xl p-1">
          {(['all', 'active', 'completed', 'archived'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${tab === t ? 'bg-blue-500 text-white' : 'text-slate-400 hover:text-slate-200'}`}>{t}</button>
          ))}
        </div>

        {/* Project search */}
        <div className="flex items-center gap-2 bg-[#0C1526] border border-[#1C3054] rounded-xl px-3 py-2">
          <Search className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search projects…"
            className="bg-transparent text-sm text-slate-200 placeholder-slate-500 outline-none w-36"
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-slate-500 hover:text-slate-300">
              <span className="text-xs">✕</span>
            </button>
          )}
        </div>

        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value as typeof sortBy)}
          className="bg-[#0C1526] border border-[#1C3054] rounded-xl px-3 py-2 text-xs text-slate-300 outline-none cursor-pointer"
        >
          <option value="updated">Recently updated</option>
          <option value="name">Name A–Z</option>
          <option value="completion">Completion %</option>
          <option value="deadline">Deadline</option>
        </select>

        <div className="ml-auto">
          <RoleGuard allowed={canCreateProject(role)}>
            <Button icon={<Plus className="w-3.5 h-3.5" />} onClick={openProjectModal}>New Project</Button>
          </RoleGuard>
        </div>
      </div>

      {/* Projects at Risk banner */}
      {(() => {
        const atRisk = projects
          .filter(p => p.status === 'active')
          .map(p => {
            const pTasks = tasks.filter(t => t.projectId === p.id);
            const active = pTasks.filter(t => t.status !== 'done');
            const overdue = active.filter(t => t.dueDate && new Date(t.dueDate) < new Date());
            const pct = active.length ? overdue.length / active.length : 0;
            return { p, overdueCount: overdue.length, pct };
          })
          .filter(({ pct, overdueCount }) => pct >= 0.25 && overdueCount >= 2);

        if (atRisk.length === 0) return null;
        return (
          <div className="flex items-start gap-3 bg-red-500/8 border border-red-500/25 rounded-xl px-4 py-3 mb-6">
            <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-red-300">
                {atRisk.length} project{atRisk.length !== 1 ? 's' : ''} at risk
              </p>
              <div className="flex flex-wrap gap-2 mt-1.5">
                {atRisk.map(({ p, overdueCount }) => (
                  <button
                    key={p.id}
                    onClick={() => navigate(`/projects/${p.id}`)}
                    className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition-colors"
                  >
                    <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: p.colour }} />
                    <span className="text-xs text-red-300 font-medium">{p.name}</span>
                    <span className="text-[10px] text-red-400/70">{overdueCount} overdue</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        );
      })()}

      {filtered.length === 0 ? (
        <EmptyState icon={FolderOpen} title="No projects" description={canCreateProject(role) ? "Create your first project to get organised." : "No projects available."} action={canCreateProject(role) ? { label: 'New Project', onClick: openProjectModal } : undefined} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(project => {
            const pTasks = tasks.filter(t => t.projectId === project.id);
            const done = pTasks.filter(t => t.status === 'done').length;
            const pct = pTasks.length ? Math.round((done / pTasks.length) * 100) : 0;
            const members = SEED_USERS.filter(u => project.memberIds.includes(u.id));
            const overdueCount = pTasks.filter(t => t.status !== 'done' && t.dueDate && new Date(t.dueDate) < new Date()).length;
            return (
              <div
                key={project.id}
                onClick={() => navigate(`/projects/${project.id}`)}
                className="bg-[#0C1526] border border-[#1C3054] rounded-xl overflow-hidden hover:border-blue-500/40 cursor-pointer transition-all group"
              >
                <div className="h-1.5" style={{ backgroundColor: project.colour }} />
                <div className="p-5">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-white group-hover:text-blue-300 transition-colors flex-1 min-w-0 pr-2 truncate">{project.name}</h3>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <select
                        value={project.status}
                        onChange={e => { e.stopPropagation(); const s = e.target.value as Project['status']; updateProject(project.id, { status: s }); emitProjectUpdate(project.id, { status: s }); }}
                        onClick={e => e.stopPropagation()}
                        className={`text-xs px-2 py-0.5 rounded-full font-medium bg-transparent border-0 outline-none cursor-pointer appearance-none ${project.status === 'active' ? 'text-green-400' : project.status === 'completed' ? 'text-blue-400' : 'text-slate-400'}`}
                        style={{ backgroundColor: project.status === 'active' ? 'rgba(52,211,153,0.1)' : project.status === 'completed' ? 'rgba(59,130,246,0.1)' : 'rgba(148,163,184,0.1)' }}
                      >
                        <option value="active" className="bg-[#0C1526] text-slate-200">active</option>
                        <option value="completed" className="bg-[#0C1526] text-slate-200">completed</option>
                        <option value="archived" className="bg-[#0C1526] text-slate-200">archived</option>
                      </select>
                      <RoleGuard allowed={canDeleteProject(role)}>
                        <button
                          onClick={e => handleDelete(e, project.id, project.name)}
                          className="p-1 rounded-lg hover:bg-red-500/10 text-slate-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                          title="Delete project"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </RoleGuard>
                    </div>
                  </div>
                  {project.description && <p className="text-sm text-slate-400 line-clamp-2 mb-3">{project.description}</p>}
                  {overdueCount > 0 && (
                    <div className="flex items-center gap-1.5 mb-3 px-2 py-1 bg-red-500/10 border border-red-500/20 rounded-lg">
                      <AlertTriangle className="w-3 h-3 text-red-400 flex-shrink-0" />
                      <span className="text-xs text-red-400 font-medium">{overdueCount} overdue task{overdueCount !== 1 ? 's' : ''}</span>
                    </div>
                  )}
                  <div className="mb-3">
                    <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                      <span>{done} of {pTasks.length} tasks done</span>
                      <span>{pct}%</span>
                    </div>
                    <ProgressBar value={pct} colour={project.colour} size="sm" />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex -space-x-2">
                      {members.slice(0, 4).map(m => (
                        <div key={m.id} className="w-7 h-7 rounded-full border-2 border-[#0C1526] flex items-center justify-center text-[10px] font-bold text-white" style={{ backgroundColor: m.colour }}>
                          {m.name.split(' ').map((n: string) => n[0]).join('')}
                        </div>
                      ))}
                    </div>
                    {project.dueDate && <span className="text-xs text-slate-500">{formatDate(project.dueDate)}</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
