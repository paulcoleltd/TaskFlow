import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FolderOpen } from 'lucide-react';
import { useProjectStore } from '../store/projectStore';
import { useTaskStore } from '../store/taskStore';
import { useUIStore } from '../store/uiStore';
import { useAuthStore } from '../store/authStore';
import { RoleGuard } from '../components/auth/RoleGuard';
import { canCreateProject } from '../lib/permissions';
import { ProgressBar } from '../components/ui/ProgressBar';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { SEED_USERS } from '../lib/sampleData';
import { formatDate } from '../lib/utils';

export default function AllProjectsPage() {
  const { projects } = useProjectStore();
  const { tasks } = useTaskStore();
  const { openProjectModal } = useUIStore();
  const { currentUser } = useAuthStore();
  const navigate = useNavigate();
  const [tab, setTab] = useState<'all' | 'active' | 'completed' | 'archived'>('all');
  const role = currentUser?.role ?? 'viewer';

  const filtered = projects.filter(p => tab === 'all' || p.status === tab);

  return (
    <div className="pb-20 md:pb-0">
      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-1 bg-[#111C44] border border-[#1F3461] rounded-xl p-1">
          {(['all', 'active', 'completed', 'archived'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${tab === t ? 'bg-blue-500 text-white' : 'text-slate-400 hover:text-slate-200'}`}>{t}</button>
          ))}
        </div>
        <RoleGuard allowed={canCreateProject(role)}>
          <Button icon={<Plus className="w-3.5 h-3.5" />} onClick={openProjectModal}>New Project</Button>
        </RoleGuard>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={FolderOpen} title="No projects" description={canCreateProject(role) ? "Create your first project to get organised." : "No projects available."} action={canCreateProject(role) ? { label: 'New Project', onClick: openProjectModal } : undefined} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(project => {
            const pTasks = tasks.filter(t => t.projectId === project.id);
            const done = pTasks.filter(t => t.status === 'done').length;
            const pct = pTasks.length ? Math.round((done / pTasks.length) * 100) : 0;
            const members = SEED_USERS.filter(u => project.memberIds.includes(u.id));
            return (
              <div
                key={project.id}
                onClick={() => navigate(`/projects/${project.id}`)}
                className="bg-[#111C44] border border-[#1F3461] rounded-xl overflow-hidden hover:border-blue-500/40 cursor-pointer transition-all group"
              >
                <div className="h-1.5" style={{ backgroundColor: project.colour }} />
                <div className="p-5">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-white group-hover:text-blue-300 transition-colors">{project.name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${project.status === 'active' ? 'text-green-400 bg-green-400/10' : 'text-slate-400 bg-slate-400/10'}`}>
                      {project.status}
                    </span>
                  </div>
                  {project.description && <p className="text-sm text-slate-400 line-clamp-2 mb-4">{project.description}</p>}
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
                        <div key={m.id} className="w-7 h-7 rounded-full border-2 border-[#111C44] flex items-center justify-center text-[10px] font-bold text-white" style={{ backgroundColor: m.colour }}>
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
