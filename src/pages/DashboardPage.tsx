import { useMemo } from 'react';
import { CheckSquare, Clock, AlertCircle, TrendingUp, ArrowUp, ArrowDown } from 'lucide-react';
import { useTaskStore } from '../store/taskStore';
import { useProjectStore } from '../store/projectStore';
import { CURRENT_USER_ID } from '../lib/sampleData';
import { ProgressBar } from '../components/ui/ProgressBar';
import { StatusBadge } from '../components/ui/StatusBadge';
import { PriorityBadge } from '../components/ui/PriorityBadge';
import { formatRelativeDate, isOverdue } from '../lib/utils';
import { useUIStore } from '../store/uiStore';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { STATUS_OPTIONS } from '../lib/constants';

function StatCard({ label, value, icon: Icon, colour, trend }: {
  label: string; value: number | string; icon: any; colour: string; trend?: { value: number };
}) {
  return (
    <div className="bg-[#111C44] border border-[#1F3461] rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{label}</p>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${colour}22` }}>
          <Icon className="w-4 h-4" style={{ color: colour }} />
        </div>
      </div>
      <p className="text-3xl font-bold text-white mb-1">{value}</p>
      {trend !== undefined && (
        <p className={`text-xs flex items-center gap-1 ${trend.value >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          {trend.value >= 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
          {Math.abs(trend.value)}% vs last week
        </p>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const { tasks } = useTaskStore();
  const { projects } = useProjectStore();
  const { setSelectedTask } = useUIStore();

  const myTasks = useMemo(() => tasks.filter(t => t.assigneeId === CURRENT_USER_ID), [tasks]);
  const inProgress = useMemo(() => tasks.filter(t => t.status === 'in-progress'), [tasks]);
  const dueToday = useMemo(() => {
    const today = new Date().toDateString();
    return tasks.filter(t => t.dueDate && new Date(t.dueDate).toDateString() === today && t.status !== 'done');
  }, [tasks]);
  const doneThisWeek = useMemo(() => tasks.filter(t => t.status === 'done'), [tasks]);
  const overdue = useMemo(() => {
    const now = new Date();
    return tasks.filter(t => t.dueDate && t.status !== 'done' && new Date(t.dueDate) < now);
  }, [tasks]);

  const statusData = STATUS_OPTIONS.map(s => ({
    name: s.label,
    value: tasks.filter(t => t.status === s.value).length,
    colour: s.colour,
  })).filter(d => d.value > 0);

  const weeklyData = [
    { week: 'Mon', tasks: 3 }, { week: 'Tue', tasks: 5 }, { week: 'Wed', tasks: 4 },
    { week: 'Thu', tasks: 7 }, { week: 'Fri', tasks: 6 }, { week: 'Sat', tasks: 2 }, { week: 'Sun', tasks: 1 },
  ];

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Tasks" value={tasks.length} icon={CheckSquare} colour="#3B82F6" trend={{ value: 12 }} />
        <StatCard label="In Progress" value={inProgress.length} icon={Clock} colour="#F59E0B" trend={{ value: 5 }} />
        <StatCard label="Due Today" value={dueToday.length + overdue.length} icon={AlertCircle} colour="#EF4444" />
        <StatCard label="Completed" value={doneThisWeek.length} icon={TrendingUp} colour="#10B981" trend={{ value: 8 }} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* My Tasks */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#111C44] border border-[#1F3461] rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4">My Active Tasks</h3>
            <div className="space-y-2">
              {myTasks.filter(t => t.status !== 'done').slice(0, 6).map(task => (
                <div
                  key={task.id}
                  onClick={() => setSelectedTask(task.id)}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-[#1B254B] cursor-pointer transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-200 truncate">{task.title}</p>
                    {task.dueDate && (
                      <p className={`text-xs mt-0.5 ${isOverdue(task.dueDate) ? 'text-red-400' : 'text-slate-500'}`}>
                        {formatRelativeDate(task.dueDate)}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <PriorityBadge priority={task.priority} />
                    <StatusBadge status={task.status} />
                  </div>
                </div>
              ))}
              {myTasks.filter(t => t.status !== 'done').length === 0 && (
                <p className="text-sm text-slate-500 text-center py-4">No active tasks — great work!</p>
              )}
            </div>
          </div>

          {/* Weekly bar chart */}
          <div className="bg-[#111C44] border border-[#1F3461] rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Tasks This Week</h3>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={weeklyData} barSize={24}>
                <XAxis dataKey="week" tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} width={24} />
                <RTooltip contentStyle={{ backgroundColor: '#111C44', border: '1px solid #1F3461', borderRadius: 8, color: '#E2E8F0', fontSize: 12 }} cursor={{ fill: '#1B254B' }} />
                <Bar dataKey="tasks" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Status donut */}
          <div className="bg-[#111C44] border border-[#1F3461] rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4">By Status</h3>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                  {statusData.map((entry, i) => <Cell key={i} fill={entry.colour} />)}
                </Pie>
                <RTooltip contentStyle={{ backgroundColor: '#111C44', border: '1px solid #1F3461', borderRadius: 8, fontSize: 12, color: '#E2E8F0' }} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: '#94A3B8' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Projects overview */}
          <div className="bg-[#111C44] border border-[#1F3461] rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Projects</h3>
            <div className="space-y-3">
              {projects.map(p => {
                const pTasks = tasks.filter(t => t.projectId === p.id);
                const done = pTasks.filter(t => t.status === 'done').length;
                const pct = pTasks.length ? Math.round((done / pTasks.length) * 100) : 0;
                return (
                  <div key={p.id}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.colour }} />
                        <span className="text-xs text-slate-300 truncate max-w-[120px]">{p.name}</span>
                      </div>
                      <span className="text-xs text-slate-500">{done}/{pTasks.length}</span>
                    </div>
                    <ProgressBar value={pct} colour={p.colour} size="sm" />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
