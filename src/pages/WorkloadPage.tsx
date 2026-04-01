import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Clock3, Loader2 } from 'lucide-react';
import { useTaskStore } from '../store/taskStore';
import { useProjectStore } from '../store/projectStore';
import { useUIStore } from '../store/uiStore';
import { SEED_USERS } from '../lib/sampleData';
import { PRIORITY_OPTIONS, STATUS_OPTIONS } from '../lib/constants';
import { cn } from '../lib/utils';
import { isOverdue } from '../lib/utils';

// ── Workload score: weight by priority & status ─────────────────────────
const PRIORITY_W: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
const STATUS_W: Record<string, number>   = { 'in-progress': 1.5, review: 1.2, todo: 1, blocked: 1.3 };

function workloadScore(tasks: { priority: string; status: string }[]): number {
  return tasks.reduce((s, t) => s + (PRIORITY_W[t.priority] ?? 1) * (STATUS_W[t.status] ?? 1), 0);
}

const CAPACITY_HIGH = 20;   // score at which bar turns red
const CAPACITY_MED  = 12;   // score at which bar turns amber

export default function WorkloadPage() {
  const { tasks } = useTaskStore();
  const { projects } = useProjectStore();
  const { setSelectedTask } = useUIStore();
  const navigate = useNavigate();

  // Per-user stats
  const userStats = useMemo(() =>
    SEED_USERS.map(user => {
      const assigned  = tasks.filter(t => t.assigneeId === user.id);
      const active    = assigned.filter(t => t.status !== 'done');
      const done      = assigned.filter(t => t.status === 'done');
      const overdue   = active.filter(t => t.dueDate && isOverdue(t.dueDate));
      const inProgress= active.filter(t => t.status === 'in-progress');
      const blocked   = active.filter(t => t.status === 'blocked');
      const score     = workloadScore(active);

      // Group active tasks by project
      const byProject = projects
        .map(p => ({ project: p, tasks: active.filter(t => t.projectId === p.id) }))
        .filter(g => g.tasks.length > 0);

      return { user, assigned, active, done, overdue, inProgress, blocked, score, byProject };
    }),
    [tasks, projects]
  );

  const maxScore = Math.max(...userStats.map(u => u.score), 1);

  // Team-level summary
  const totalActive   = tasks.filter(t => t.status !== 'done').length;
  const totalOverdue  = tasks.filter(t => t.dueDate && t.status !== 'done' && isOverdue(t.dueDate)).length;
  const totalBlocked  = tasks.filter(t => t.status === 'blocked').length;
  const unassigned    = tasks.filter(t => !t.assigneeId && t.status !== 'done');

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      {/* Team summary strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Active Tasks',    value: totalActive,  colour: '#3B82F6', icon: Loader2 },
          { label: 'Overdue',         value: totalOverdue, colour: '#EF4444', icon: AlertTriangle },
          { label: 'Blocked',         value: totalBlocked, colour: '#F59E0B', icon: Clock3 },
          { label: 'Unassigned',      value: unassigned.length, colour: '#64748B', icon: CheckCircle2 },
        ].map(({ label, value, colour, icon: Icon }) => (
          <div key={label} className="bg-[#111C44] border border-[#1F3461] rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">{label}</p>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${colour}22` }}>
                <Icon className="w-4 h-4" style={{ color: colour }} />
              </div>
            </div>
            <p className="text-3xl font-bold text-white">{value}</p>
          </div>
        ))}
      </div>

      {/* Per-member cards */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Team Workload</h2>
        {userStats.map(({ user, active, done, overdue, inProgress, blocked, score, byProject }) => {
          const barPct    = Math.min(100, (score / Math.max(maxScore, CAPACITY_HIGH)) * 100);
          const barColour = score >= CAPACITY_HIGH ? '#EF4444' : score >= CAPACITY_MED ? '#F59E0B' : '#10B981';
          const level     = score >= CAPACITY_HIGH ? 'Overloaded' : score >= CAPACITY_MED ? 'Busy' : 'Balanced';

          return (
            <div key={user.id} className="bg-[#111C44] border border-[#1F3461] rounded-xl p-5">
              {/* Header */}
              <div className="flex items-center gap-4 mb-4">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                  style={{ backgroundColor: user.colour }}
                >
                  {user.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-white">{user.name}</p>
                    <span
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full border"
                      style={{ color: barColour, borderColor: `${barColour}40`, backgroundColor: `${barColour}15` }}
                    >
                      {level}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">{user.email}</p>
                </div>
                {/* Quick stats */}
                <div className="hidden sm:flex items-center gap-4 text-center flex-shrink-0">
                  {[
                    { label: 'Active',      value: active.length,     colour: 'text-white' },
                    { label: 'Done',        value: done.length,       colour: 'text-green-400' },
                    { label: 'Overdue',     value: overdue.length,    colour: overdue.length > 0 ? 'text-red-400' : 'text-slate-500' },
                    { label: 'In Progress', value: inProgress.length, colour: 'text-blue-400' },
                  ].map(({ label, value, colour }) => (
                    <div key={label}>
                      <p className={cn('text-xl font-bold tabular-nums', colour)}>{value}</p>
                      <p className="text-[10px] text-slate-500">{label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Workload bar */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-slate-500">Workload score: {score.toFixed(1)}</span>
                  <span className="text-[10px]" style={{ color: barColour }}>{level}</span>
                </div>
                <div className="h-2 bg-[#0B1437] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${barPct}%`, backgroundColor: barColour }}
                  />
                </div>
              </div>

              {/* Blocked banner */}
              {blocked.length > 0 && (
                <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                  <p className="text-xs text-amber-300">{blocked.length} blocked task{blocked.length !== 1 ? 's' : ''} need attention</p>
                </div>
              )}

              {/* Tasks by project */}
              {byProject.length > 0 ? (
                <div className="space-y-3">
                  {byProject.map(({ project, tasks: ptasks }) => (
                    <div key={project.id}>
                      <button
                        onClick={() => navigate(`/projects/${project.id}`)}
                        className="flex items-center gap-2 mb-1.5 hover:opacity-80 transition-opacity"
                      >
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: project.colour }} />
                        <span className="text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors">{project.name}</span>
                        <span className="text-[10px] text-slate-600">({ptasks.length})</span>
                      </button>
                      <div className="space-y-1 pl-4">
                        {ptasks.slice(0, 4).map(task => {
                          const statusOpt   = STATUS_OPTIONS.find(s => s.value === task.status);
                          const priorityOpt = PRIORITY_OPTIONS.find(p => p.value === task.priority);
                          const od = task.dueDate && isOverdue(task.dueDate);
                          return (
                            <button
                              key={task.id}
                              onClick={() => setSelectedTask(task.id)}
                              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-[#1B254B] transition-colors text-left"
                            >
                              <span
                                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                                style={{ backgroundColor: priorityOpt?.colour ?? '#64748B' }}
                              />
                              <span className={cn('text-xs flex-1 truncate', task.status === 'done' ? 'line-through text-slate-500' : 'text-slate-300')}>
                                {task.title}
                              </span>
                              {od && <AlertTriangle className="w-3 h-3 text-red-400 flex-shrink-0" />}
                              <span
                                className="text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0"
                                style={{ color: statusOpt?.colour, backgroundColor: `${statusOpt?.colour}20` }}
                              >
                                {statusOpt?.label}
                              </span>
                            </button>
                          );
                        })}
                        {ptasks.length > 4 && (
                          <p className="text-[10px] text-slate-600 pl-2">+{ptasks.length - 4} more</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-600 italic">No active tasks assigned.</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Unassigned tasks */}
      {unassigned.length > 0 && (
        <div className="bg-[#111C44] border border-[#1F3461] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-slate-400 mb-3 uppercase tracking-wider">
            Unassigned ({unassigned.length})
          </h3>
          <div className="space-y-1">
            {unassigned.slice(0, 10).map(task => {
              const priorityOpt = PRIORITY_OPTIONS.find(p => p.value === task.priority);
              const project = projects.find(p => p.id === task.projectId);
              return (
                <button
                  key={task.id}
                  onClick={() => setSelectedTask(task.id)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-[#1B254B] transition-colors text-left"
                >
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: priorityOpt?.colour }} />
                  <span className="text-xs text-slate-300 flex-1 truncate">{task.title}</span>
                  {project && (
                    <span className="text-[10px] text-slate-500 flex-shrink-0">{project.name}</span>
                  )}
                </button>
              );
            })}
            {unassigned.length > 10 && (
              <p className="text-xs text-slate-600 px-3">+{unassigned.length - 10} more unassigned</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
