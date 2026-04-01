import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Calendar, Flag, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { addMonths, subMonths, startOfMonth, endOfMonth, differenceInCalendarDays, format, isBefore, startOfDay } from 'date-fns';
import { useProjectStore } from '../store/projectStore';
import { useTaskStore } from '../store/taskStore';
import { cn } from '../lib/utils';
import type { Project, Milestone } from '../types';

// Number of months visible in the viewport
const VISIBLE_MONTHS = 5;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

interface BarSegment {
  left: number;  // % within viewport
  width: number; // % within viewport
  clippedLeft: boolean;
  clippedRight: boolean;
}

function computeBarSegment(
  projectStart: Date,
  projectEnd: Date,
  viewStart: Date,
  totalDays: number,
): BarSegment | null {
  const barStartDay = differenceInCalendarDays(projectStart, viewStart);
  const barEndDay   = differenceInCalendarDays(projectEnd,   viewStart);

  if (barEndDay < 0 || barStartDay > totalDays) return null;

  const clampedStart = clamp(barStartDay, 0, totalDays);
  const clampedEnd   = clamp(barEndDay,   0, totalDays);

  return {
    left:  (clampedStart / totalDays) * 100,
    width: Math.max(0.5, ((clampedEnd - clampedStart) / totalDays) * 100),
    clippedLeft:  barStartDay < 0,
    clippedRight: barEndDay > totalDays,
  };
}

function MilestoneMarker({
  milestone,
  viewStart,
  totalDays,
}: { milestone: Milestone; viewStart: Date; totalDays: number }) {
  const mDay = differenceInCalendarDays(new Date(milestone.dueDate), viewStart);
  if (mDay < 0 || mDay > totalDays) return null;
  const left = (mDay / totalDays) * 100;
  const overdue = !milestone.completed && isBefore(new Date(milestone.dueDate), startOfDay(new Date()));
  const colour = milestone.completed ? '#10B981' : overdue ? '#EF4444' : '#F59E0B';

  return (
    <div
      className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-20 group/ms"
      style={{ left: `${left}%` }}
    >
      {/* Diamond */}
      <div
        className="w-3 h-3 rotate-45 border-2"
        style={{ backgroundColor: milestone.completed ? colour : 'transparent', borderColor: colour }}
        title={milestone.title}
      />
      {/* Tooltip on hover */}
      <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover/ms:block z-30 pointer-events-none">
        <div className="bg-[#0B1437] border border-[#1F3461] rounded-lg px-2 py-1.5 text-[10px] whitespace-nowrap shadow-xl">
          <p className="text-white font-medium">{milestone.title}</p>
          <p style={{ color: colour }}>{format(new Date(milestone.dueDate), 'd MMM yyyy')}</p>
        </div>
      </div>
    </div>
  );
}

interface ProjectRowProps {
  project: Project;
  viewStart: Date;
  totalDays: number;
  tasksDone: number;
  tasksTotal: number;
  isOverdue: boolean;
}

function ProjectRow({ project, viewStart, totalDays, tasksDone, tasksTotal, isOverdue }: ProjectRowProps) {
  const navigate = useNavigate();
  const projectStart = new Date(project.createdAt);
  const projectEnd   = project.dueDate ? new Date(project.dueDate) : new Date();
  const pct = tasksTotal > 0 ? Math.round((tasksDone / tasksTotal) * 100) : 0;

  const bar = computeBarSegment(projectStart, projectEnd, viewStart, totalDays);

  return (
    <div className="flex items-center border-b border-[#1F3461] last:border-0 group/row hover:bg-[#1B254B]/30 transition-colors">
      {/* Project label column */}
      <div className="flex-shrink-0 w-44 px-3 py-3 flex items-center gap-2 border-r border-[#1F3461]">
        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: project.colour }} />
        <div className="min-w-0">
          <button
            onClick={() => navigate(`/projects/${project.id}`)}
            className="text-xs font-medium text-slate-200 hover:text-blue-300 transition-colors truncate block max-w-[120px] text-left"
          >
            {project.name}
          </button>
          <p className="text-[10px] text-slate-600 mt-0.5">
            {tasksTotal > 0 ? `${pct}%` : 'No tasks'}
            {isOverdue && <span className="text-red-400 ml-1">overdue</span>}
          </p>
        </div>
      </div>

      {/* Timeline track */}
      <div className="flex-1 relative h-12 overflow-hidden">
        {bar && (
          <button
            onClick={() => navigate(`/projects/${project.id}`)}
            className="absolute top-1/2 -translate-y-1/2 h-6 min-w-[6px] rounded group/bar hover:brightness-110 transition-all"
            style={{
              left: `${bar.left}%`,
              width: `${bar.width}%`,
              backgroundColor: project.colour,
              opacity: project.status === 'archived' ? 0.4 : 0.85,
              borderRadius: bar.clippedLeft
                ? '0 6px 6px 0'
                : bar.clippedRight
                ? '6px 0 0 6px'
                : '6px',
            }}
            title={`${project.name} · ${pct}% complete`}
          >
            {/* Progress fill overlay */}
            <div
              className="absolute inset-y-0 left-0 rounded-l opacity-60 transition-all"
              style={{
                width: `${pct}%`,
                backgroundColor: 'rgba(255,255,255,0.25)',
                borderRadius: 'inherit',
              }}
            />
            {/* Label inside bar when wide enough */}
            {bar.width > 8 && (
              <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white/80 pointer-events-none px-1 truncate">
                {pct}%
              </span>
            )}
          </button>
        )}

        {/* Milestone markers */}
        {(project.milestones ?? []).map(m => (
          <MilestoneMarker key={m.id} milestone={m} viewStart={viewStart} totalDays={totalDays} />
        ))}

        {/* Overdue end marker */}
        {isOverdue && bar && (
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-10"
            style={{ left: `${bar.left + bar.width}%` }}
          >
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
          </div>
        )}
      </div>
    </div>
  );
}

export default function RoadmapPage() {
  const { projects } = useProjectStore();
  const { tasks } = useTaskStore();
  const navigate = useNavigate();

  // Anchor the viewport to the start of a specific month
  const [anchorMonth, setAnchorMonth] = useState(() => startOfMonth(new Date()));

  const viewStart = anchorMonth;
  const viewEnd   = endOfMonth(addMonths(anchorMonth, VISIBLE_MONTHS - 1));
  const totalDays = differenceInCalendarDays(viewEnd, viewStart) + 1;

  // Build month columns for the header
  const months = useMemo(() => {
    return Array.from({ length: VISIBLE_MONTHS }, (_, i) => {
      const m = addMonths(anchorMonth, i);
      const mStart = startOfMonth(m);
      const mEnd   = endOfMonth(m);
      const startDay = Math.max(0, differenceInCalendarDays(mStart, viewStart));
      const endDay   = Math.min(totalDays, differenceInCalendarDays(mEnd, viewStart) + 1);
      return {
        label: format(m, 'MMM yyyy'),
        left:  (startDay / totalDays) * 100,
        width: ((endDay - startDay) / totalDays) * 100,
      };
    });
  }, [anchorMonth, viewStart, totalDays]);

  // Today marker position
  const todayOffset = useMemo(() => {
    const d = differenceInCalendarDays(new Date(), viewStart);
    if (d < 0 || d > totalDays) return null;
    return (d / totalDays) * 100;
  }, [viewStart, totalDays]);

  // Sort projects: active first, then completed, then archived; within each group by dueDate asc
  const sortedProjects = useMemo(() => {
    const order = { active: 0, completed: 1, archived: 2 };
    return [...projects].sort((a, b) => {
      const os = order[a.status] - order[b.status];
      if (os !== 0) return os;
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });
  }, [projects]);

  const projectStats = useMemo(() => {
    return new Map(projects.map(p => {
      const pTasks = tasks.filter(t => t.projectId === p.id);
      const done = pTasks.filter(t => t.status === 'done').length;
      const overdue = p.status === 'active' && p.dueDate && isBefore(new Date(p.dueDate), new Date());
      return [p.id, { total: pTasks.length, done, overdue: !!overdue }];
    }));
  }, [projects, tasks]);

  const totalMilestones = useMemo(() =>
    projects.flatMap(p => p.milestones ?? []).length,
    [projects]
  );

  const completedMilestones = useMemo(() =>
    projects.flatMap(p => p.milestones ?? []).filter(m => m.completed).length,
    [projects]
  );

  return (
    <div className="pb-20 md:pb-0">
      {/* Header controls */}
      <div className="flex items-center gap-4 mb-6 flex-wrap">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAnchorMonth(m => subMonths(m, 1))}
            className="p-1.5 rounded-lg border border-[#1F3461] text-slate-400 hover:text-slate-200 hover:border-slate-600 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setAnchorMonth(startOfMonth(new Date()))}
            className="px-3 py-1.5 rounded-lg border border-[#1F3461] text-xs text-slate-400 hover:text-slate-200 hover:border-slate-600 transition-colors"
          >
            Today
          </button>
          <button
            onClick={() => setAnchorMonth(m => addMonths(m, 1))}
            className="p-1.5 rounded-lg border border-[#1F3461] text-slate-400 hover:text-slate-200 hover:border-slate-600 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Calendar className="w-3.5 h-3.5" />
          <span>
            {format(viewStart, 'd MMM yyyy')} — {format(viewEnd, 'd MMM yyyy')}
          </span>
        </div>

        {/* Summary stats */}
        <div className="ml-auto flex items-center gap-4 text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-green-400" />
            {projects.filter(p => p.status === 'active').length} active
          </span>
          <span className="flex items-center gap-1.5">
            <div className="w-3 h-3 rotate-45 border-2 border-amber-400" />
            {completedMilestones}/{totalMilestones} milestones
          </span>
          {todayOffset !== null && (
            <span className="flex items-center gap-1.5 text-red-400">
              <div className="w-2 h-2 rounded-full bg-red-400" />
              Today: {format(new Date(), 'd MMM')}
            </span>
          )}
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Calendar className="w-10 h-10 text-slate-700" />
          <p className="text-slate-500">No projects yet.</p>
          <button
            onClick={() => navigate('/projects')}
            className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
          >
            Go to All Projects →
          </button>
        </div>
      ) : (
        <div className="bg-[#111C44] border border-[#1F3461] rounded-xl overflow-hidden">
          {/* Month header row */}
          <div className="flex border-b border-[#1F3461]">
            <div className="flex-shrink-0 w-44 border-r border-[#1F3461] px-3 py-2">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Project</span>
            </div>
            <div className="flex-1 relative h-9">
              {months.map((m, i) => (
                <div
                  key={i}
                  className="absolute inset-y-0 flex items-center px-2 border-r border-[#1F3461] last:border-0"
                  style={{ left: `${m.left}%`, width: `${m.width}%` }}
                >
                  <span className="text-[10px] font-semibold text-slate-400 truncate">{m.label}</span>
                </div>
              ))}
              {/* Today line in header */}
              {todayOffset !== null && (
                <div
                  className="absolute inset-y-0 w-px bg-red-500/60 z-10"
                  style={{ left: `${todayOffset}%` }}
                />
              )}
            </div>
          </div>

          {/* Project rows */}
          <div className="relative">
            {/* Month divider lines — positioned within the timeline area (right of 176px label) */}
            {months.slice(1).map((m, i) => (
              <div
                key={i}
                className="absolute inset-y-0 w-px bg-[#1F3461]/60 pointer-events-none z-0"
                style={{ left: `calc(176px + ${m.left / 100} * (100% - 176px))` }}
              />
            ))}

            {/* Today vertical line */}
            {todayOffset !== null && (
              <div
                className="absolute inset-y-0 w-px bg-red-500/40 pointer-events-none z-10"
                style={{ left: `calc(176px + ${todayOffset / 100} * (100% - 176px))` }}
              />
            )}

            {sortedProjects.map(project => {
              const stats = projectStats.get(project.id) ?? { total: 0, done: 0, overdue: false };
              return (
                <ProjectRow
                  key={project.id}
                  project={project}
                  viewStart={viewStart}
                  totalDays={totalDays}
                  tasksDone={stats.done}
                  tasksTotal={stats.total}
                  isOverdue={stats.overdue}
                />
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-6 px-4 py-3 border-t border-[#1F3461] bg-[#0B1437]">
            <span className="text-[10px] text-slate-600 uppercase tracking-wider font-semibold">Legend</span>
            <span className="flex items-center gap-1.5 text-[10px] text-slate-400">
              <div className="w-6 h-2 rounded bg-blue-500/70" />
              Project bar
            </span>
            <span className="flex items-center gap-1.5 text-[10px] text-slate-400">
              <div className="w-3 h-3 rotate-45 border-2 border-amber-400" />
              Milestone
            </span>
            <span className="flex items-center gap-1.5 text-[10px] text-slate-400">
              <div className="w-2.5 h-2.5 rotate-45 border-2 border-green-400 bg-green-400" />
              Milestone done
            </span>
            <span className="flex items-center gap-1.5 text-[10px] text-slate-400">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              Overdue
            </span>
            <span className="flex items-center gap-1.5 text-[10px] text-slate-400">
              <div className="w-px h-3 bg-red-500" />
              Today
            </span>
            <span className="flex items-center gap-1.5 text-[10px] text-slate-400">
              <div className="w-6 h-2 rounded bg-slate-600/50" />
              Progress fill
            </span>
          </div>
        </div>
      )}

      {/* Milestone list (below chart) */}
      {totalMilestones > 0 && (() => {
        const allMilestones = projects
          .flatMap(p => (p.milestones ?? []).map(m => ({ ...m, project: p })))
          .filter(m => {
            const d = new Date(m.dueDate);
            return d >= viewStart && d <= viewEnd;
          })
          .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

        if (allMilestones.length === 0) return null;

        return (
          <div className="mt-6 bg-[#111C44] border border-[#1F3461] rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Flag className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-semibold text-white">Milestones in View</h3>
              <span className="text-[10px] text-slate-500 bg-[#1B254B] px-1.5 py-0.5 rounded-full">
                {allMilestones.length}
              </span>
            </div>
            <div className="space-y-2">
              {allMilestones.map(m => {
                const due = new Date(m.dueDate);
                const overdue = !m.completed && isBefore(due, startOfDay(new Date()));
                const colour = m.completed ? '#10B981' : overdue ? '#EF4444' : '#F59E0B';
                return (
                  <div key={m.id} className="flex items-center gap-3 p-2.5 bg-[#0B1437] rounded-xl">
                    {m.completed
                      ? <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                      : overdue
                        ? <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                        : <div className="w-3 h-3 rotate-45 border-2 flex-shrink-0 ml-0.5" style={{ borderColor: colour }} />
                    }
                    <div className="flex-1 min-w-0">
                      <p className={cn('text-sm truncate', m.completed ? 'text-slate-500 line-through' : 'text-slate-200')}>
                        {m.title}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        <button
                          onClick={() => navigate(`/projects/${m.project.id}`)}
                          className="hover:text-blue-400 transition-colors"
                        >
                          {m.project.name}
                        </button>
                      </p>
                    </div>
                    <span className="text-[10px] font-semibold flex-shrink-0" style={{ color: colour }}>
                      {m.completed ? 'Done' : overdue ? `${Math.abs(differenceInCalendarDays(due, new Date()))}d late` : format(due, 'd MMM')}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
