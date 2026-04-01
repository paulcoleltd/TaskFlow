import { useMemo, useState } from 'react';
import { startOfWeek, startOfMonth, isAfter } from 'date-fns';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
} from 'recharts';
import { Clock, TrendingUp, TrendingDown, Target, Download, Minus, PlusCircle, Check } from 'lucide-react';
import { useTaskStore } from '../store/taskStore';
import { useProjectStore } from '../store/projectStore';
import { useUIStore } from '../store/uiStore';
import { SEED_USERS } from '../lib/sampleData';
import { PriorityBadge } from '../components/ui/PriorityBadge';
import { StatusBadge } from '../components/ui/StatusBadge';
import { cn } from '../lib/utils';
import { emitTaskUpdate } from '../lib/collabEmit';

type Range = 'week' | 'month' | 'all';

const CHART_STYLE = {
  backgroundColor: '#111C44',
  border: '1px solid #1F3461',
  borderRadius: 8,
  color: '#E2E8F0',
  fontSize: 12,
};

function efficiencyColour(pct: number): string {
  if (pct <= 90) return '#10B981';
  if (pct <= 110) return '#3B82F6';
  if (pct <= 130) return '#F59E0B';
  return '#EF4444';
}

function efficiencyLabel(pct: number): string {
  if (pct === 0) return '—';
  if (pct <= 90) return 'Under budget';
  if (pct <= 110) return 'On track';
  if (pct <= 130) return 'Over budget';
  return 'Critical';
}

export default function TimePage() {
  const { tasks, updateTask } = useTaskStore();
  const { projects } = useProjectStore();
  const { setSelectedTask } = useUIStore();
  const [range, setRange] = useState<Range>('month');
  const [sortBy, setSortBy] = useState<'logged' | 'efficiency' | 'title'>('logged');
  const [logInput, setLogInput] = useState<{ taskId: string; value: string } | null>(null);

  const cutoff = useMemo(() => {
    if (range === 'week')  return startOfWeek(new Date(), { weekStartsOn: 1 });
    if (range === 'month') return startOfMonth(new Date());
    return new Date(0);
  }, [range]);

  // Tasks with any time data, filtered by date range
  const timedTasks = useMemo(() =>
    tasks.filter(t =>
      ((t.loggedHours ?? 0) > 0 || (t.estimatedHours ?? 0) > 0) &&
      (range === 'all' || isAfter(new Date(t.updatedAt), cutoff))
    ),
    [tasks, range, cutoff]
  );

  // Summary stats
  const totalLogged    = timedTasks.reduce((s, t) => s + (t.loggedHours ?? 0), 0);
  const totalEstimated = timedTasks.reduce((s, t) => s + (t.estimatedHours ?? 0), 0);
  const efficiency     = totalEstimated > 0 ? Math.round((totalLogged / totalEstimated) * 100) : 0;
  const trackedCount   = timedTasks.filter(t => (t.loggedHours ?? 0) > 0).length;

  // Per-project data for bar chart
  const projectData = useMemo(() =>
    projects.map(p => {
      const pts = timedTasks.filter(t => t.projectId === p.id);
      const logged    = Math.round(pts.reduce((s, t) => s + (t.loggedHours ?? 0), 0) * 10) / 10;
      const estimated = Math.round(pts.reduce((s, t) => s + (t.estimatedHours ?? 0), 0) * 10) / 10;
      return { name: p.name.length > 14 ? p.name.slice(0, 13) + '…' : p.name, logged, estimated, colour: p.colour };
    }).filter(d => d.logged > 0 || d.estimated > 0),
    [projects, timedTasks]
  );

  // Per-user pie data
  const userData = useMemo(() =>
    SEED_USERS.map(u => {
      const logged = Math.round(timedTasks
        .filter(t => t.assigneeId === u.id)
        .reduce((s, t) => s + (t.loggedHours ?? 0), 0) * 10) / 10;
      return { name: u.name.split(' ')[0], value: logged, colour: u.colour };
    }).filter(d => d.value > 0),
    [timedTasks]
  );

  // Sorted task rows
  const sortedTasks = useMemo(() => {
    const copy = [...timedTasks];
    if (sortBy === 'logged')     copy.sort((a, b) => (b.loggedHours ?? 0) - (a.loggedHours ?? 0));
    if (sortBy === 'efficiency') {
      copy.sort((a, b) => {
        const ea = (a.estimatedHours ?? 0) > 0 ? (a.loggedHours ?? 0) / a.estimatedHours! : 0;
        const eb = (b.estimatedHours ?? 0) > 0 ? (b.loggedHours ?? 0) / b.estimatedHours! : 0;
        return eb - ea;
      });
    }
    if (sortBy === 'title') copy.sort((a, b) => a.title.localeCompare(b.title));
    return copy;
  }, [timedTasks, sortBy]);

  const handleExportCSV = () => {
    const headers = ['Task', 'Project', 'Assignee', 'Status', 'Estimated (h)', 'Logged (h)', 'Efficiency %'];
    const rows = sortedTasks.map(t => {
      const project  = projects.find(p => p.id === t.projectId);
      const assignee = SEED_USERS.find(u => u.id === t.assigneeId);
      const eff      = (t.estimatedHours ?? 0) > 0 ? Math.round(((t.loggedHours ?? 0) / t.estimatedHours!) * 100) : 0;
      const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
      return [
        esc(t.title),
        esc(project?.name ?? ''),
        esc(assignee?.name ?? ''),
        esc(t.status),
        t.estimatedHours ?? 0,
        t.loggedHours ?? 0,
        eff,
      ].join(',');
    });
    const csv  = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `taskflow-time-${range}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 pb-20 md:pb-0">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Time Tracking</h2>
          <p className="text-xs text-slate-500 mt-0.5">Logged vs estimated hours across your workspace</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Range filter */}
          {(['week', 'month', 'all'] as Range[]).map(r => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={cn(
                'px-3 py-1.5 rounded-xl text-xs font-medium transition-all',
                range === r
                  ? 'bg-blue-500 text-white'
                  : 'bg-[#111C44] border border-[#1F3461] text-slate-400 hover:text-slate-200'
              )}
            >
              {r === 'week' ? 'This Week' : r === 'month' ? 'This Month' : 'All Time'}
            </button>
          ))}
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#111C44] border border-[#1F3461] text-slate-400 hover:text-slate-200 text-xs font-medium transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Export
          </button>
        </div>
      </div>

      {/* ── Summary cards ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Total Logged',
            value: `${Math.round(totalLogged * 10) / 10}h`,
            icon: <Clock className="w-4 h-4 text-blue-400" />,
            sub: `${trackedCount} task${trackedCount !== 1 ? 's' : ''} tracked`,
            accent: 'text-blue-400',
          },
          {
            label: 'Total Estimated',
            value: `${Math.round(totalEstimated * 10) / 10}h`,
            icon: <Target className="w-4 h-4 text-slate-400" />,
            sub: 'Across all tasks',
            accent: 'text-slate-300',
          },
          {
            label: 'Efficiency',
            value: totalEstimated > 0 ? `${efficiency}%` : '—',
            icon: efficiency > 110
              ? <TrendingUp className="w-4 h-4 text-red-400" />
              : efficiency < 90
                ? <TrendingDown className="w-4 h-4 text-green-400" />
                : <Minus className="w-4 h-4 text-blue-400" />,
            sub: totalEstimated > 0 ? efficiencyLabel(efficiency) : 'No estimates set',
            accent: totalEstimated > 0 ? efficiencyColour(efficiency) : 'text-slate-500',
          },
          {
            label: 'Untracked Tasks',
            value: `${timedTasks.filter(t => !(t.loggedHours ?? 0)).length}`,
            icon: <Clock className="w-4 h-4 text-amber-400" />,
            sub: 'Have estimates but no log',
            accent: 'text-amber-400',
          },
        ].map(card => (
          <div key={card.label} className="bg-[#111C44] border border-[#1F3461] rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-500">{card.label}</span>
              {card.icon}
            </div>
            <p className={`text-2xl font-bold ${card.accent}`}>{card.value}</p>
            <p className="text-xs text-slate-500 mt-1">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Charts row ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

        {/* Logged vs Estimated per project */}
        <div className="xl:col-span-2 bg-[#111C44] border border-[#1F3461] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Hours by Project</h3>
          {projectData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-xs text-slate-500">
              No time data for this period
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={projectData} barGap={4} barCategoryGap="30%">
                <XAxis dataKey="name" tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} unit="h" width={32} />
                <Tooltip contentStyle={CHART_STYLE} formatter={(v) => [`${v}h`]} />
                <Bar dataKey="estimated" name="Estimated" radius={[4, 4, 0, 0]} maxBarSize={24}>
                  {projectData.map((entry, i) => (
                    <Cell key={i} fill={`${entry.colour}44`} />
                  ))}
                </Bar>
                <Bar dataKey="logged" name="Logged" radius={[4, 4, 0, 0]} maxBarSize={24}>
                  {projectData.map((entry, i) => (
                    <Cell key={i} fill={entry.colour} />
                  ))}
                </Bar>
                <Legend
                  wrapperStyle={{ fontSize: 11, color: '#64748B', paddingTop: 8 }}
                  formatter={v => <span style={{ color: '#94A3B8' }}>{v}</span>}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Hours by user donut */}
        <div className="bg-[#111C44] border border-[#1F3461] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Hours by Person</h3>
          {userData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-xs text-slate-500">
              No logged hours yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={userData}
                  cx="50%"
                  cy="45%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="value"
                  nameKey="name"
                  label={({ name, value }) => `${name} ${value}h`}
                  labelLine={false}
                >
                  {userData.map((entry, i) => (
                    <Cell key={i} fill={entry.colour} />
                  ))}
                </Pie>
                <Tooltip contentStyle={CHART_STYLE} formatter={(v) => [`${v}h`]} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Task time log table ──────────────────────────────────────── */}
      <div className="bg-[#111C44] border border-[#1F3461] rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1F3461]">
          <h3 className="text-sm font-semibold text-white">Task Time Log</h3>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Sort by:</span>
            {([['logged', 'Most logged'], ['efficiency', 'Over budget'], ['title', 'Title']] as const).map(([val, label]) => (
              <button
                key={val}
                onClick={() => setSortBy(val)}
                className={cn(
                  'px-2 py-1 rounded-lg text-xs transition-colors',
                  sortBy === val
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    : 'text-slate-500 hover:text-slate-300'
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {sortedTasks.length === 0 ? (
          <div className="py-12 text-center">
            <Clock className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-sm text-slate-500">No time data for this period.</p>
            <p className="text-xs text-slate-600 mt-1">Log time via the timer in any task, or set estimated hours.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#1F3461]">
                  {['Task', 'Project', 'Assignee', 'Status', 'Estimated', 'Logged', 'Efficiency', ''].map((h, i) => (
                    <th key={i} className="px-4 py-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1F3461]">
                {sortedTasks.map(task => {
                  const project  = projects.find(p => p.id === task.projectId);
                  const assignee = SEED_USERS.find(u => u.id === task.assigneeId);
                  const logged   = task.loggedHours ?? 0;
                  const est      = task.estimatedHours ?? 0;
                  const eff      = est > 0 ? Math.round((logged / est) * 100) : null;
                  const barPct   = est > 0 ? Math.min(100, (logged / est) * 100) : 0;
                  const colour   = eff != null ? efficiencyColour(eff) : '#3B82F6';
                  return (
                    <tr
                      key={task.id}
                      onClick={() => setSelectedTask(task.id)}
                      className="hover:bg-[#1B254B] cursor-pointer transition-colors group"
                    >
                      {/* Task */}
                      <td className="px-4 py-3 max-w-[240px]">
                        <div className="flex items-center gap-2">
                          <PriorityBadge priority={task.priority} />
                          <span className="text-slate-200 truncate group-hover:text-white transition-colors">
                            {task.title}
                          </span>
                        </div>
                      </td>
                      {/* Project */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {project ? (
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: project.colour }} />
                            <span className="text-xs text-slate-400 truncate max-w-[100px]">{project.name}</span>
                          </div>
                        ) : <span className="text-slate-600 text-xs">—</span>}
                      </td>
                      {/* Assignee */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {assignee ? (
                          <div className="flex items-center gap-1.5">
                            <div
                              className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-[8px] font-bold text-white"
                              style={{ backgroundColor: assignee.colour }}
                            >
                              {assignee.name[0]}
                            </div>
                            <span className="text-xs text-slate-400">{assignee.name.split(' ')[0]}</span>
                          </div>
                        ) : <span className="text-slate-600 text-xs">Unassigned</span>}
                      </td>
                      {/* Status */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <StatusBadge status={task.status} />
                      </td>
                      {/* Estimated */}
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-400">
                        {est > 0 ? `${est}h` : <span className="text-slate-600">—</span>}
                      </td>
                      {/* Logged */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={cn('text-xs font-semibold', logged > 0 ? 'text-slate-200' : 'text-slate-600')}>
                          {logged > 0 ? `${logged}h` : '—'}
                        </span>
                      </td>
                      {/* Efficiency */}

                      <td className="px-4 py-3">
                        {eff != null ? (
                          <div className="flex items-center gap-2 min-w-[120px]">
                            <div className="flex-1 h-1.5 bg-[#1B254B] rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{ width: `${barPct}%`, backgroundColor: colour }}
                              />
                            </div>
                            <span className="text-[11px] font-semibold flex-shrink-0" style={{ color: colour }}>
                              {eff}%
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-600">No estimate</span>
                        )}
                      </td>
                      {/* Log Hours action */}
                      <td className="px-3 py-3 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                        {logInput?.taskId === task.id ? (
                          <div className="flex items-center gap-1">
                            <input
                              autoFocus
                              type="number"
                              min="0"
                              max="999"
                              step="0.25"
                              value={logInput.value}
                              onChange={e => setLogInput({ taskId: task.id, value: e.target.value })}
                              onKeyDown={e => {
                                if (e.key === 'Enter') {
                                  const h = parseFloat(logInput.value);
                                  if (!isNaN(h) && h >= 0) {
                                    const loggedHours = Math.round(h * 100) / 100;
                                    updateTask(task.id, { loggedHours });
                                    emitTaskUpdate(task.id, { loggedHours });
                                  }
                                  setLogInput(null);
                                }
                                if (e.key === 'Escape') setLogInput(null);
                              }}
                              placeholder="0"
                              className="w-16 bg-[#0B1437] border border-blue-500/60 rounded-lg px-2 py-1 text-xs text-slate-200 outline-none text-center"
                            />
                            <button
                              onClick={() => {
                                const h = parseFloat(logInput.value);
                                if (!isNaN(h) && h >= 0) {
                                  const loggedHours = Math.round(h * 100) / 100;
                                  updateTask(task.id, { loggedHours });
                                  emitTaskUpdate(task.id, { loggedHours });
                                }
                                setLogInput(null);
                              }}
                              className="p-1 rounded-lg text-green-400 hover:bg-green-500/10 transition-colors"
                            >
                              <Check className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setLogInput({ taskId: task.id, value: String(task.loggedHours ?? '') })}
                            className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-slate-600 hover:text-blue-400 hover:bg-blue-500/10 transition-all opacity-0 group-hover:opacity-100"
                            title="Log hours"
                          >
                            <PlusCircle className="w-3 h-3" />
                            Log
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
