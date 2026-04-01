import { useMemo } from 'react';
import { CheckSquare, Clock, AlertCircle, TrendingUp, ArrowUp, ArrowDown, Activity, CalendarClock, Pin, Flame, Users } from 'lucide-react';
import { formatDistanceToNow, isToday, isTomorrow, addDays, startOfDay, subDays, format } from 'date-fns';
import { useTaskStore } from '../store/taskStore';
import { useProjectStore } from '../store/projectStore';
import { useAuthStore } from '../store/authStore';
import { ProgressBar } from '../components/ui/ProgressBar';
import { StatusBadge } from '../components/ui/StatusBadge';
import { PriorityBadge } from '../components/ui/PriorityBadge';
import { formatRelativeDate, isOverdue } from '../lib/utils';
import { useUIStore } from '../store/uiStore';
import { SEED_USERS } from '../lib/sampleData';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { STATUS_OPTIONS } from '../lib/constants';

function StatCard({ label, value, icon: Icon, colour, trend, subtitle }: {
  label: string; value: number | string; icon: any; colour: string; trend?: { value: number }; subtitle?: string;
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
      {subtitle && <p className="text-xs text-slate-500 mb-0.5">{subtitle}</p>}
      {trend !== undefined && (
        <p className={`text-xs flex items-center gap-1 ${trend.value >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          {trend.value >= 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
          {Math.abs(trend.value)}% vs last week
        </p>
      )}
    </div>
  );
}

function getGreeting(name: string): string {
  const h = new Date().getHours();
  const part = h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening';
  return `Good ${part}, ${name.split(' ')[0]}`;
}

export default function DashboardPage() {
  const { tasks } = useTaskStore();
  const { projects } = useProjectStore();
  const { setSelectedTask, recentTaskIds } = useUIStore();
  const { currentUser } = useAuthStore();

  const myTasks = useMemo(
    () => tasks.filter(t => t.assigneeId === currentUser?.id),
    [tasks, currentUser]
  );
  const inProgress = useMemo(() => tasks.filter(t => t.status === 'in-progress'), [tasks]);
  const dueToday = useMemo(() => {
    const today = new Date().toDateString();
    return tasks.filter(t => t.dueDate && new Date(t.dueDate).toDateString() === today && t.status !== 'done');
  }, [tasks]);
  const doneTotal = useMemo(() => tasks.filter(t => t.status === 'done'), [tasks]);
  const completedToday = useMemo(() => {
    const today = new Date().toDateString();
    return tasks.filter(t => t.status === 'done' && new Date(t.updatedAt).toDateString() === today).length;
  }, [tasks]);
  const overdue = useMemo(() => {
    const now = new Date();
    return tasks.filter(t => t.dueDate && t.status !== 'done' && new Date(t.dueDate) < now);
  }, [tasks]);

  // Upcoming deadlines — non-done tasks due within the next 3 days
  const upcoming = useMemo(() => {
    const now = new Date();
    const cutoff = addDays(startOfDay(now), 4);
    return tasks
      .filter(t => {
        if (!t.dueDate || t.status === 'done') return false;
        const due = new Date(t.dueDate);
        return due >= startOfDay(now) && due < cutoff;
      })
      .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
      .slice(0, 5);
  }, [tasks]);

  const getDueLabel = (dueDate: string) => {
    const d = new Date(dueDate);
    if (isToday(d)) return { label: 'Today', colour: 'text-amber-400' };
    if (isTomorrow(d)) return { label: 'Tomorrow', colour: 'text-blue-400' };
    return { label: formatDistanceToNow(d, { addSuffix: true }), colour: 'text-slate-400' };
  };

  // Pinned tasks
  const pinnedTasks = useMemo(() => tasks.filter(t => t.pinned && t.status !== 'done'), [tasks]);

  // Completion streak — consecutive days (ending today) where at least 1 task was completed
  const completionStreak = useMemo(() => {
    const doneTasks = tasks.filter(t => t.status === 'done');
    const doneByDay = new Set(doneTasks.map(t => format(new Date(t.updatedAt), 'yyyy-MM-dd')));
    let streak = 0;
    let day = new Date();
    // If nothing completed today, start from yesterday
    if (!doneByDay.has(format(day, 'yyyy-MM-dd'))) day = subDays(day, 1);
    while (doneByDay.has(format(day, 'yyyy-MM-dd'))) {
      streak++;
      day = subDays(day, 1);
      if (streak > 365) break; // safety cap
    }
    return streak;
  }, [tasks]);

  // Team workload
  const teamWorkload = useMemo(() =>
    SEED_USERS.map(u => ({
      ...u,
      active: tasks.filter(t => t.assigneeId === u.id && t.status !== 'done').length,
      done: tasks.filter(t => t.assigneeId === u.id && t.status === 'done').length,
      overdue: tasks.filter(t => t.assigneeId === u.id && t.status !== 'done' && t.dueDate && new Date(t.dueDate) < new Date()).length,
    })).filter(u => u.active + u.done > 0),
    [tasks]
  );

  // Recently viewed tasks (from UIStore history), filtered to still-existing tasks
  const recentlyViewed = useMemo(() =>
    recentTaskIds.map(id => tasks.find(t => t.id === id)).filter(Boolean) as typeof tasks,
    [recentTaskIds, tasks]
  );

  // Recent activity — last 6 tasks sorted by updatedAt desc
  const recentActivity = useMemo(() => {
    return [...tasks]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 6);
  }, [tasks]);

  // Real task creation counts for the last 7 days
  const weeklyData = useMemo(() => {
    const DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const counts: Record<string, number> = {};
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 6);
    cutoff.setHours(0, 0, 0, 0);
    tasks.forEach(t => {
      const d = new Date(t.createdAt);
      if (d >= cutoff) {
        const key = DAY[d.getDay()];
        counts[key] = (counts[key] ?? 0) + 1;
      }
    });
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const key = DAY[d.getDay()];
      return { week: key, tasks: counts[key] ?? 0 };
    });
  }, [tasks]);

  const statusData = STATUS_OPTIONS.map(s => ({
    name: s.label,
    value: tasks.filter(t => t.status === s.value).length,
    colour: s.colour,
  })).filter(d => d.value > 0);

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      {/* Greeting */}
      {currentUser && (
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">{getGreeting(currentUser.name)} 👋</h2>
            <p className="text-sm text-slate-400 mt-0.5">
              You have {myTasks.filter(t => t.status !== 'done').length} active tasks
              {overdue.length > 0 && ` and ${overdue.length} overdue`}.
            </p>
          </div>
          {completionStreak >= 2 && (
            <div className="flex items-center gap-2 px-3 py-2 bg-orange-500/10 border border-orange-500/20 rounded-xl flex-shrink-0">
              <Flame className="w-4 h-4 text-orange-400" />
              <div className="text-right">
                <p className="text-sm font-bold text-orange-400">{completionStreak}-day streak</p>
                <p className="text-[10px] text-orange-300/70">tasks completed daily</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Overdue alert banner */}
      {overdue.length > 0 && (
        <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-300 flex-1">
            You have <span className="font-semibold">{overdue.length} overdue task{overdue.length !== 1 ? 's' : ''}</span> that need attention.
          </p>
          <button
            onClick={() => setSelectedTask(overdue[0].id)}
            className="text-xs text-red-400 hover:text-red-300 font-medium underline flex-shrink-0"
          >
            View first
          </button>
        </div>
      )}

      {/* Pinned tasks */}
      {pinnedTasks.length > 0 && (
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Pin className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Pinned</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {pinnedTasks.map(task => (
              <button
                key={task.id}
                onClick={() => setSelectedTask(task.id)}
                className="flex items-center gap-2 px-3 py-1.5 bg-[#111C44] border border-amber-500/20 hover:border-amber-500/40 rounded-xl text-sm text-slate-200 hover:text-white transition-all"
              >
                <PriorityBadge priority={task.priority} />
                <span className="truncate max-w-[200px]">{task.title}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Tasks" value={tasks.length} icon={CheckSquare} colour="#3B82F6" trend={{ value: 12 }} />
        <StatCard label="In Progress" value={inProgress.length} icon={Clock} colour="#F59E0B" trend={{ value: 5 }} />
        <StatCard label="Due Today" value={dueToday.length + overdue.length} icon={AlertCircle} colour="#EF4444" />
        <StatCard label="Completed" value={doneTotal.length} icon={TrendingUp} colour="#10B981" subtitle={completedToday > 0 ? `+${completedToday} today` : undefined} />
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

          {/* Weekly bar chart — real data */}
          <div className="bg-[#111C44] border border-[#1F3461] rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-1">Tasks Created — Last 7 Days</h3>
            <p className="text-xs text-slate-500 mb-4">Tasks added to the system per day</p>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={weeklyData} barSize={24}>
                <XAxis dataKey="week" tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} width={24} allowDecimals={false} />
                <RTooltip contentStyle={{ backgroundColor: '#111C44', border: '1px solid #1F3461', borderRadius: 8, color: '#E2E8F0', fontSize: 12 }} cursor={{ fill: '#1B254B' }} />
                <Bar dataKey="tasks" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Recent activity */}
          <div className="bg-[#111C44] border border-[#1F3461] rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-4 h-4 text-blue-400" />
              <h3 className="text-sm font-semibold text-white">Recent Activity</h3>
            </div>
            <div className="space-y-0">
              {recentActivity.map((task, i) => (
                <div
                  key={task.id}
                  onClick={() => setSelectedTask(task.id)}
                  className="flex items-start gap-3 py-2.5 cursor-pointer group"
                >
                  {/* Timeline line */}
                  <div className="flex flex-col items-center flex-shrink-0 mt-1">
                    <div className="w-2 h-2 rounded-full bg-blue-500 ring-2 ring-blue-500/20" />
                    {i < recentActivity.length - 1 && <div className="w-px flex-1 bg-[#1F3461] mt-1 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0 pb-1">
                    <p className="text-sm text-slate-300 truncate group-hover:text-white transition-colors">{task.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {formatDistanceToNow(new Date(task.updatedAt), { addSuffix: true })}
                    </p>
                  </div>
                  <StatusBadge status={task.status} />
                </div>
              ))}
            </div>
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

          {/* Upcoming deadlines */}
          {upcoming.length > 0 && (
            <div className="bg-[#111C44] border border-[#1F3461] rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <CalendarClock className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-semibold text-white">Upcoming Deadlines</h3>
              </div>
              <div className="space-y-2">
                {upcoming.map(task => {
                  const { label, colour } = getDueLabel(task.dueDate!);
                  return (
                    <div
                      key={task.id}
                      onClick={() => setSelectedTask(task.id)}
                      className="flex items-center gap-3 p-2 rounded-xl hover:bg-[#1B254B] cursor-pointer transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-200 truncate">{task.title}</p>
                        <p className={`text-xs mt-0.5 font-medium ${colour}`}>{label}</p>
                      </div>
                      <PriorityBadge priority={task.priority} />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Recently viewed */}
          {recentlyViewed.length > 0 && (
            <div className="bg-[#111C44] border border-[#1F3461] rounded-xl p-5">
              <h3 className="text-sm font-semibold text-white mb-3">Recently Viewed</h3>
              <div className="space-y-1">
                {recentlyViewed.map(task => (
                  <button
                    key={task.id}
                    onClick={() => setSelectedTask(task.id)}
                    className="w-full flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-[#1B254B] transition-colors text-left"
                  >
                    <div className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-0.5" style={{ backgroundColor: task.status === 'done' ? '#10B981' : '#3B82F6' }} />
                    <span className={`text-xs text-slate-300 truncate flex-1 ${task.status === 'done' ? 'line-through text-slate-500' : ''}`}>{task.title}</span>
                    <StatusBadge status={task.status} />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Team workload */}
          {teamWorkload.length > 0 && (
            <div className="bg-[#111C44] border border-[#1F3461] rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-4 h-4 text-slate-500" />
                <h3 className="text-sm font-semibold text-white">Team Workload</h3>
              </div>
              <div className="space-y-2">
                {teamWorkload.map(u => {
                  const max = Math.max(...teamWorkload.map(m => m.active), 1);
                  return (
                    <div key={u.id}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0" style={{ backgroundColor: u.colour }}>
                            {u.name.split(' ').map((n: string) => n[0]).join('')}
                          </div>
                          <span className="text-xs text-slate-300 truncate max-w-[80px]">{u.name.split(' ')[0]}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px]">
                          {u.overdue > 0 && <span className="text-red-400 font-medium">{u.overdue} overdue</span>}
                          <span className="text-slate-500">{u.active} active</span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-[#1B254B] rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${(u.active / max) * 100}%`, backgroundColor: u.colour + 'BB' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

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
