import { useMemo, useState } from 'react';
import { differenceInCalendarDays, subDays, subMonths, startOfDay } from 'date-fns';
import { useTaskStore } from '../store/taskStore';
import { useProjectStore } from '../store/projectStore';
import { useTagStore } from '../store/tagStore';
import { useSprintStore } from '../store/sprintStore';
import { STATUS_OPTIONS, PRIORITY_OPTIONS } from '../lib/constants';
import { SEED_USERS } from '../lib/sampleData';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line } from 'recharts';
import { cn } from '../lib/utils';

const CHART_STYLE = { backgroundColor: '#111C44', border: '1px solid #1F3461', borderRadius: 8, color: '#E2E8F0', fontSize: 12 };

type DateRange = '7d' | '30d' | '90d' | '6m' | 'all';
const DATE_RANGES: { value: DateRange; label: string }[] = [
  { value: '7d',  label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: '6m',  label: 'Last 6 months' },
  { value: 'all', label: 'All time' },
];

function getRangeStart(range: DateRange): Date | null {
  const now = new Date();
  if (range === '7d')  return startOfDay(subDays(now, 7));
  if (range === '30d') return startOfDay(subDays(now, 30));
  if (range === '90d') return startOfDay(subDays(now, 90));
  if (range === '6m')  return startOfDay(subMonths(now, 6));
  return null; // 'all'
}

export default function AnalyticsPage() {
  const { tasks: allTasks } = useTaskStore();
  const { projects } = useProjectStore();
  const { sprints } = useSprintStore();
  const allTags = useTagStore(s => s.tags);

  // ── Date range filter ──────────────────────────────────────────────────────
  const [dateRange, setDateRange] = useState<DateRange>('all');
  const rangeStart = useMemo(() => getRangeStart(dateRange), [dateRange]);

  // Filter tasks to the selected date range (based on createdAt)
  const tasks = useMemo(() => {
    if (!rangeStart) return allTasks;
    return allTasks.filter(t => new Date(t.createdAt) >= rangeStart);
  }, [allTasks, rangeStart]);

  const statusData = STATUS_OPTIONS.map(s => ({
    name: s.label,
    value: tasks.filter(t => t.status === s.value).length,
    colour: s.colour,
  }));

  const priorityData = PRIORITY_OPTIONS.map(p => ({
    name: p.label,
    value: tasks.filter(t => t.priority === p.value).length,
    colour: p.colour,
  }));

  // Tasks completed per week — last 8 weeks, computed from real updatedAt timestamps
  const weeklyCompleted = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 8 }, (_, i) => {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - 7 * (7 - i));
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 7);
      const completed = tasks.filter(t => {
        if (t.status !== 'done') return false;
        const d = new Date(t.updatedAt);
        return d >= weekStart && d < weekEnd;
      }).length;
      return { week: `W${i + 1}`, completed };
    });
  }, [tasks]);

  // Tasks created per project (for the project breakdown chart)
  const projectData = useMemo(() =>
    projects.map(p => ({
      name: p.name.length > 14 ? p.name.slice(0, 14) + '…' : p.name,
      total: tasks.filter(t => t.projectId === p.id).length,
      done: tasks.filter(t => t.projectId === p.id && t.status === 'done').length,
      colour: p.colour,
    })).filter(p => p.total > 0),
    [tasks, projects]
  );

  // Completion rate per project
  const completionRateData = useMemo(() =>
    projectData.map(p => ({
      name: p.name,
      rate: p.total ? Math.round((p.done / p.total) * 100) : 0,
      colour: p.colour,
    })).sort((a, b) => b.rate - a.rate),
    [projectData]
  );

  // Time tracking — total estimated vs logged across all tasks
  const timeData = useMemo(() => {
    const estimated = tasks.reduce((sum, t) => sum + (t.estimatedHours ?? 0), 0);
    const logged = tasks.reduce((sum, t) => sum + (t.loggedHours ?? 0), 0);
    return estimated > 0 || logged > 0 ? [{ name: 'Hours', estimated: Math.round(estimated * 10) / 10, logged: Math.round(logged * 10) / 10 }] : null;
  }, [tasks]);

  // Cycle time — days from createdAt to completion (updatedAt when done)
  const cycleTimeData = useMemo(() => {
    const completedTasks = tasks.filter(t => t.status === 'done');
    const buckets = [
      { label: 'Same day', min: 0, max: 0, count: 0, colour: '#10B981' },
      { label: '1–3 days', min: 1, max: 3, count: 0, colour: '#3B82F6' },
      { label: '4–7 days', min: 4, max: 7, count: 0, colour: '#8B5CF6' },
      { label: '8–14 d',   min: 8, max: 14, count: 0, colour: '#F59E0B' },
      { label: '15+ days', min: 15, max: Infinity, count: 0, colour: '#EF4444' },
    ];
    for (const t of completedTasks) {
      const days = differenceInCalendarDays(new Date(t.updatedAt), new Date(t.createdAt));
      const bucket = buckets.find(b => days >= b.min && days <= b.max);
      if (bucket) bucket.count++;
    }
    return buckets.filter(b => b.count > 0);
  }, [tasks]);

  const avgCycleTime = useMemo(() => {
    const done = tasks.filter(t => t.status === 'done');
    if (!done.length) return 0;
    const total = done.reduce((sum, t) =>
      sum + differenceInCalendarDays(new Date(t.updatedAt), new Date(t.createdAt)), 0);
    return Math.round((total / done.length) * 10) / 10;
  }, [tasks]);

  // Tag usage — how many tasks use each tag
  const tagUsageData = useMemo(() =>
    allTags
      .map(tag => ({ name: tag.name, value: tasks.filter(t => t.tags.includes(tag.id)).length, colour: tag.colour }))
      .filter(t => t.value > 0)
      .sort((a, b) => b.value - a.value),
    [allTags, tasks]
  );

  // Due date adherence — completed tasks: on time vs late
  const adherenceData = useMemo(() => {
    const withDue = tasks.filter(t => t.status === 'done' && t.dueDate);
    const onTime = withDue.filter(t => new Date(t.updatedAt) <= new Date(t.dueDate!)).length;
    const late = withDue.length - onTime;
    return withDue.length > 0 ? [
      { name: 'On Time', value: onTime, colour: '#10B981' },
      { name: 'Late', value: late, colour: '#EF4444' },
    ] : [];
  }, [tasks]);

  const done = tasks.filter(t => t.status === 'done').length;
  const overdue = tasks.filter(t => { if (!t.dueDate || t.status === 'done') return false; return new Date(t.dueDate) < new Date(); }).length;

  // Velocity: average tasks completed per week over last 8 weeks
  const avgVelocity = useMemo(() => {
    const total = weeklyCompleted.reduce((sum, w) => sum + w.completed, 0);
    return Math.round((total / weeklyCompleted.length) * 10) / 10;
  }, [weeklyCompleted]);

  const teamData = useMemo(() =>
    SEED_USERS.map(u => ({
      name: u.name.split(' ')[0],
      assigned: tasks.filter(t => t.assigneeId === u.id).length,
      completed: tasks.filter(t => t.assigneeId === u.id && t.status === 'done').length,
      inProgress: tasks.filter(t => t.assigneeId === u.id && t.status === 'in-progress').length,
      colour: u.colour,
    })),
    [tasks]
  );

  // Sprint velocity — completed sprints that recorded a velocity during retrospective
  const sprintVelocityData = useMemo(() => {
    return sprints
      .filter(sp => sp.status === 'completed' && sp.velocity !== undefined)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .map(sp => {
        const project = projects.find(p => p.id === sp.projectId);
        return {
          name: sp.name.length > 12 ? sp.name.slice(0, 12) + '…' : sp.name,
          velocity: sp.velocity ?? 0,
          project: project?.name ?? 'Unknown',
          colour: project?.colour ?? '#3B82F6',
        };
      });
  }, [sprints, projects]);

  const avgSprintVelocity = useMemo(() => {
    if (!sprintVelocityData.length) return 0;
    const total = sprintVelocityData.reduce((sum, s) => sum + s.velocity, 0);
    return Math.round((total / sprintVelocityData.length) * 10) / 10;
  }, [sprintVelocityData]);

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      {/* Date range filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-slate-500 font-medium">Period:</span>
        <div className="flex gap-1 flex-wrap">
          {DATE_RANGES.map(r => (
            <button
              key={r.value}
              onClick={() => setDateRange(r.value)}
              className={cn(
                'px-3 py-1 rounded-lg text-xs font-medium border transition-all',
                dateRange === r.value
                  ? 'bg-blue-500 border-blue-500 text-white'
                  : 'border-[#1F3461] text-slate-500 hover:text-slate-300 bg-[#111C44]'
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
        {dateRange !== 'all' && (
          <span className="text-xs text-slate-500">
            Showing {tasks.length} of {allTasks.length} tasks
          </span>
        )}
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        {[
          { label: 'Total Tasks', value: tasks.length, colour: '#3B82F6' },
          { label: 'Completed', value: done, colour: '#10B981' },
          { label: 'Overdue', value: overdue, colour: '#EF4444' },
          { label: 'Completion Rate', value: `${tasks.length ? Math.round((done / tasks.length) * 100) : 0}%`, colour: '#8B5CF6' },
          { label: 'Avg Velocity', value: `${avgVelocity}/wk`, colour: '#F59E0B' },
          { label: 'Sprint Velocity', value: avgSprintVelocity > 0 ? `${avgSprintVelocity} tasks` : '—', colour: '#06B6D4' },
        ].map(({ label, value, colour }) => (
          <div key={label} className="bg-[#111C44] border border-[#1F3461] rounded-xl p-5">
            <p className="text-xs text-slate-400 mb-2 uppercase tracking-wider">{label}</p>
            <p className="text-3xl font-bold" style={{ color: colour }}>{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Completed per week — real data */}
        <div className="bg-[#111C44] border border-[#1F3461] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-1">Completed Per Week</h3>
          <p className="text-xs text-slate-500 mb-4">Tasks marked done over the last 8 weeks</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={weeklyCompleted} barSize={20}>
              <XAxis dataKey="week" tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} width={24} allowDecimals={false} />
              <Tooltip contentStyle={CHART_STYLE} cursor={{ fill: '#1B254B' }} />
              <Bar dataKey="completed" fill="#3B82F6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Status distribution */}
        <div className="bg-[#111C44] border border-[#1F3461] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Status Distribution</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                {statusData.map((e, i) => <Cell key={i} fill={e.colour} />)}
              </Pie>
              <Tooltip contentStyle={CHART_STYLE} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: '#94A3B8' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Priority breakdown */}
        <div className="bg-[#111C44] border border-[#1F3461] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Priority Breakdown</h3>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={priorityData} layout="vertical" barSize={16}>
              <XAxis type="number" tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <YAxis type="category" dataKey="name" tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} width={60} />
              <Tooltip contentStyle={CHART_STYLE} cursor={{ fill: '#1B254B' }} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {priorityData.map((e, i) => <Cell key={i} fill={e.colour} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Completion trend */}
        <div className="bg-[#111C44] border border-[#1F3461] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Completion Trend</h3>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={weeklyCompleted}>
              <XAxis dataKey="week" tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} width={24} allowDecimals={false} />
              <Tooltip contentStyle={CHART_STYLE} />
              <Line type="monotone" dataKey="completed" stroke="#3B82F6" strokeWidth={2} dot={{ fill: '#3B82F6', r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Team performance */}
        <div className="bg-[#111C44] border border-[#1F3461] rounded-xl p-5 lg:col-span-2">
          <h3 className="text-sm font-semibold text-white mb-1">Team Performance</h3>
          <p className="text-xs text-slate-500 mb-4">Tasks assigned, in progress, and completed per team member</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={teamData} barSize={20} barGap={4}>
              <XAxis dataKey="name" tick={{ fill: '#94A3B8', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} width={24} allowDecimals={false} />
              <Tooltip contentStyle={CHART_STYLE} cursor={{ fill: '#1B254B' }} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: '#94A3B8' }} />
              <Bar dataKey="assigned" name="Assigned" fill="#1F3461" radius={[4, 4, 0, 0]} />
              <Bar dataKey="inProgress" name="In Progress" fill="#F59E0B" radius={[4, 4, 0, 0]} />
              <Bar dataKey="completed" name="Completed" fill="#10B981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Sprint velocity */}
        {sprintVelocityData.length > 0 && (
          <div className="bg-[#111C44] border border-[#1F3461] rounded-xl p-5 lg:col-span-2">
            <h3 className="text-sm font-semibold text-white mb-1">Sprint Velocity</h3>
            <p className="text-xs text-slate-500 mb-4">
              Tasks completed per sprint — avg <span className="text-slate-300 font-medium">{avgSprintVelocity} tasks/sprint</span> across {sprintVelocityData.length} sprint{sprintVelocityData.length !== 1 ? 's' : ''}
            </p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={sprintVelocityData} barSize={28}>
                <XAxis dataKey="name" tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} width={24} allowDecimals={false} />
                <Tooltip
                  contentStyle={CHART_STYLE}
                  cursor={{ fill: '#1B254B' }}
                  formatter={(v, _name, props) => [`${v} tasks`, props.payload.project]}
                />
                <Bar dataKey="velocity" name="Velocity" radius={[4, 4, 0, 0]}>
                  {sprintVelocityData.map((e, i) => <Cell key={i} fill={e.colour} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Tasks by project */}
        {projectData.length > 0 && (
          <div className="bg-[#111C44] border border-[#1F3461] rounded-xl p-5 lg:col-span-2">
            <h3 className="text-sm font-semibold text-white mb-4">Tasks by Project</h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={projectData} barSize={24} barGap={4}>
                <XAxis dataKey="name" tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} width={24} allowDecimals={false} />
                <Tooltip contentStyle={CHART_STYLE} cursor={{ fill: '#1B254B' }} />
                <Bar dataKey="total" name="Total" fill="#1F3461" radius={[4, 4, 0, 0]} />
                <Bar dataKey="done" name="Done" radius={[4, 4, 0, 0]}>
                  {projectData.map((e, i) => <Cell key={i} fill={e.colour} />)}
                </Bar>
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: '#94A3B8' }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Completion rate per project */}
        {completionRateData.length > 0 && (
          <div className="bg-[#111C44] border border-[#1F3461] rounded-xl p-5 lg:col-span-2">
            <h3 className="text-sm font-semibold text-white mb-1">Completion Rate by Project</h3>
            <p className="text-xs text-slate-500 mb-4">Percentage of tasks marked done</p>
            <div className="space-y-3">
              {completionRateData.map(p => (
                <div key={p.name}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-300 truncate max-w-[200px]">{p.name}</span>
                    <span className="text-slate-400 font-medium ml-2">{p.rate}%</span>
                  </div>
                  <div className="h-2 bg-[#1B254B] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${p.rate}%`, backgroundColor: p.colour }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Time tracking summary */}
        {timeData && (
          <div className="bg-[#111C44] border border-[#1F3461] rounded-xl p-5 lg:col-span-2">
            <h3 className="text-sm font-semibold text-white mb-1">Time Tracking</h3>
            <p className="text-xs text-slate-500 mb-4">Estimated vs logged hours across all tasks</p>
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={timeData} layout="vertical" barSize={28} barGap={6}>
                <XAxis type="number" tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} unit="h" />
                <YAxis type="category" dataKey="name" hide />
                <Tooltip contentStyle={CHART_STYLE} cursor={{ fill: '#1B254B' }} formatter={(v) => [`${v}h`]} />
                <Bar dataKey="estimated" name="Estimated" fill="#1F3461" radius={[0, 4, 4, 0]} />
                <Bar dataKey="logged" name="Logged" fill="#3B82F6" radius={[0, 4, 4, 0]} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: '#94A3B8' }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Cycle time distribution */}
        {cycleTimeData.length > 0 && (
          <div className="bg-[#111C44] border border-[#1F3461] rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-1">Cycle Time Distribution</h3>
            <p className="text-xs text-slate-500 mb-1">Days from creation to completion — avg <span className="text-slate-300 font-medium">{avgCycleTime}d</span></p>
            <div className="mb-4" />
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={cycleTimeData} barSize={28}>
                <XAxis dataKey="label" tick={{ fill: '#64748B', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} width={24} allowDecimals={false} />
                <Tooltip contentStyle={CHART_STYLE} cursor={{ fill: '#1B254B' }} />
                <Bar dataKey="count" name="Tasks" radius={[4, 4, 0, 0]}>
                  {cycleTimeData.map((e, i) => <Cell key={i} fill={e.colour} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Tag usage */}
        {tagUsageData.length > 0 && (
          <div className="bg-[#111C44] border border-[#1F3461] rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-1">Tag Usage</h3>
            <p className="text-xs text-slate-500 mb-4">Tasks per tag across the workspace</p>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={tagUsageData} layout="vertical" barSize={14}>
                <XAxis type="number" tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} width={64} />
                <Tooltip contentStyle={CHART_STYLE} cursor={{ fill: '#1B254B' }} />
                <Bar dataKey="value" name="Tasks" radius={[0, 4, 4, 0]}>
                  {tagUsageData.map((e, i) => <Cell key={i} fill={e.colour} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Due date adherence */}
        {adherenceData.length > 0 && (
          <div className="bg-[#111C44] border border-[#1F3461] rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-1">Due Date Adherence</h3>
            <p className="text-xs text-slate-500 mb-4">Completed tasks delivered on time vs late</p>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={adherenceData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={4} dataKey="value">
                  {adherenceData.map((e, i) => <Cell key={i} fill={e.colour} />)}
                </Pie>
                <Tooltip contentStyle={CHART_STYLE} formatter={(v, name) => [`${v} tasks`, name]} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: '#94A3B8' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-6 mt-2">
              {adherenceData.map(d => {
                const total = adherenceData.reduce((s, x) => s + x.value, 0);
                return (
                  <div key={d.name} className="text-center">
                    <p className="text-lg font-bold" style={{ color: d.colour }}>{Math.round((d.value / total) * 100)}%</p>
                    <p className="text-[10px] text-slate-500">{d.name}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
