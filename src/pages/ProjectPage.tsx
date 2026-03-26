import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useProjectStore } from '../store/projectStore';
import { useTaskStore } from '../store/taskStore';
import { useUIStore } from '../store/uiStore';
import { useAuthStore } from '../store/authStore';
import { RoleGuard } from '../components/auth/RoleGuard';
import { canCreateTask } from '../lib/permissions';
import { TaskBoard } from '../components/tasks/TaskBoard';
import { TaskList } from '../components/tasks/TaskList';
import { TaskFilters } from '../components/tasks/TaskFilters';
import { ProgressBar } from '../components/ui/ProgressBar';
import { Button } from '../components/ui/Button';
import { Plus, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SEED_USERS } from '../lib/sampleData';
import type { Status, Priority } from '../types';

interface Filters { search: string; status: Status[]; priority: Priority[]; }

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>();
  const { getProjectById } = useProjectStore();
  const { tasks } = useTaskStore();
  const { openTaskModal, currentView, setView } = useUIStore();
  const navigate = useNavigate();
  const [filters, setFilters] = useState<Filters>({ search: '', status: [], priority: [] });

  const { currentUser } = useAuthStore();
  const role = currentUser?.role ?? 'viewer';

  const project = getProjectById(id!);
  if (!project) return <div className="text-slate-400 p-8">Project not found.</div>;

  const pTasks = tasks.filter(t => t.projectId === id);
  const done = pTasks.filter(t => t.status === 'done').length;
  const pct = pTasks.length ? Math.round((done / pTasks.length) * 100) : 0;
  const members = SEED_USERS.filter(u => project.memberIds.includes(u.id));

  const filtered = useMemo(() => pTasks.filter(t => {
    if (filters.search && !t.title.toLowerCase().includes(filters.search.toLowerCase())) return false;
    if (filters.status.length && !filters.status.includes(t.status)) return false;
    if (filters.priority.length && !filters.priority.includes(t.priority)) return false;
    return true;
  }), [pTasks, filters]);

  return (
    <div className="pb-20 md:pb-0">
      <button onClick={() => navigate('/projects')} className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 mb-5 transition-colors">
        <ArrowLeft className="w-4 h-4" /> All Projects
      </button>
      <div className="bg-[#111C44] border border-[#1F3461] rounded-xl p-5 mb-6">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: project.colour }} />
              <h2 className="text-lg font-bold text-white">{project.name}</h2>
            </div>
            {project.description && <p className="text-sm text-slate-400 ml-6">{project.description}</p>}
          </div>
          <RoleGuard allowed={canCreateTask(role)}>
            <Button size="sm" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => openTaskModal()}>Add Task</Button>
          </RoleGuard>
        </div>
        <div className="grid grid-cols-4 gap-4 text-center mb-4">
          {[['Total', pTasks.length], ['Done', done], ['Active', pTasks.filter(t => t.status === 'in-progress').length], ['Members', members.length]].map(([l, v]) => (
            <div key={l} className="bg-[#0B1437] rounded-xl p-3">
              <p className="text-xl font-bold text-white">{v}</p>
              <p className="text-xs text-slate-500">{l}</p>
            </div>
          ))}
        </div>
        <ProgressBar value={pct} colour={project.colour} showLabel />
      </div>
      <TaskFilters filters={filters} onChange={setFilters} view={currentView} onViewChange={setView} />
      {currentView === 'board' ? <TaskBoard tasks={filtered} /> : <TaskList tasks={filtered} />}
    </div>
  );
}
