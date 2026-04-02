import { useMemo, useRef } from 'react';
import { addDays, startOfDay, differenceInDays, format, isToday, isWeekend } from 'date-fns';
import type { Task } from '../../types';
import { useUIStore } from '../../store/uiStore';
import { STATUS_OPTIONS, PRIORITY_OPTIONS } from '../../lib/constants';
import { SEED_USERS } from '../../lib/sampleData';
import { cn } from '../../lib/utils';

const DAY_W   = 32;   // px per day column
const ROW_H   = 40;   // px per task row
const LABEL_W = 240;  // px for the left task-name column
const HEADER_H = 52;  // px for the date header

function statusColour(status: string) {
  return STATUS_OPTIONS.find(s => s.value === status)?.colour ?? '#64748B';
}
function priorityColour(priority: string) {
  return PRIORITY_OPTIONS.find(p => p.value === priority)?.colour ?? '#64748B';
}

interface Props {
  tasks: Task[];
}

export function TaskTimeline({ tasks }: Props) {
  const { setSelectedTask } = useUIStore();
  const scrollRef = useRef<HTMLDivElement>(null);

  // ── Compute date window ────────────────────────────────────────────────
  const today = startOfDay(new Date());

  const { startDate, totalDays } = useMemo(() => {
    const dates: Date[] = [addDays(today, -7), addDays(today, 30)];
    tasks.forEach(t => {
      dates.push(startOfDay(new Date(t.createdAt)));
      if (t.dueDate) dates.push(startOfDay(new Date(t.dueDate)));
    });
    const start = new Date(Math.min(...dates.map(d => d.getTime())));
    const end   = new Date(Math.max(...dates.map(d => d.getTime())));
    return {
      startDate: start,
      totalDays: differenceInDays(addDays(end, 5), start) + 1,
    };
  }, [tasks, today]);

  // Build array of all days
  const days = useMemo(() =>
    Array.from({ length: totalDays }, (_, i) => addDays(startDate, i)),
    [startDate, totalDays]
  );

  // ── Task rows ─────────────────────────────────────────────────────────
  const rows = useMemo(() =>
    tasks.map(task => {
      const taskStart = startOfDay(new Date(task.createdAt));
      const taskEnd   = task.dueDate ? startOfDay(new Date(task.dueDate)) : null;
      const left  = Math.max(0, differenceInDays(taskStart, startDate)) * DAY_W;
      const width = taskEnd
        ? Math.max(DAY_W, (differenceInDays(taskEnd, taskStart) + 1) * DAY_W)
        : DAY_W * 3;  // placeholder width for no-due-date tasks
      const overdue  = task.dueDate && task.status !== 'done' && new Date(task.dueDate) < new Date();
      const assignee  = SEED_USERS.find(u => u.id === task.assigneeId);
      const colour    = overdue ? '#EF4444' : statusColour(task.status);
      return { task, left, width, colour, assignee, hasEnd: !!taskEnd };
    }),
    [tasks, startDate]
  );

  // ── Today offset ──────────────────────────────────────────────────────
  const todayX = differenceInDays(today, startDate) * DAY_W;

  const totalWidth = totalDays * DAY_W;

  if (tasks.length === 0) {
    return (
      <div className="bg-[#0C1526] border border-[#1C3054] rounded-xl p-12 text-center">
        <p className="text-slate-500 text-sm">No tasks to display on timeline.</p>
        <p className="text-slate-600 text-xs mt-1">Add tasks with due dates to see them here.</p>
      </div>
    );
  }

  return (
    <div className="bg-[#0C1526] border border-[#1C3054] rounded-xl overflow-hidden">
      {/* Legend */}
      <div className="flex items-center gap-4 px-4 py-2.5 border-b border-[#1C3054] flex-wrap">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Timeline</span>
        <div className="flex items-center gap-3 ml-auto flex-wrap">
          {STATUS_OPTIONS.map(s => (
            <span key={s.value} className="flex items-center gap-1.5 text-[10px] text-slate-500">
              <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: s.colour }} />
              {s.label}
            </span>
          ))}
          <span className="flex items-center gap-1.5 text-[10px] text-red-400">
            <span className="w-2 h-2 rounded-sm bg-red-400" />
            Overdue
          </span>
        </div>
      </div>

      <div className="flex overflow-hidden">
        {/* Fixed left column — task names */}
        <div className="flex-shrink-0" style={{ width: LABEL_W }}>
          {/* Header spacer */}
          <div style={{ height: HEADER_H }} className="border-b border-r border-[#1C3054] bg-[#06091A]" />
          {/* Task labels */}
          {rows.map(({ task, assignee }, i) => (
            <button
              key={task.id}
              onClick={() => setSelectedTask(task.id)}
              className={cn(
                'flex items-center gap-2 w-full px-3 border-b border-r border-[#1C3054] hover:bg-[#122040] transition-colors text-left',
                i % 2 === 0 ? 'bg-[#0C1526]' : 'bg-[#0E1840]'
              )}
              style={{ height: ROW_H }}
            >
              {/* Priority dot */}
              <span
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: priorityColour(task.priority) }}
              />
              {/* Title */}
              <span className={cn('text-xs truncate flex-1', task.status === 'done' ? 'line-through text-slate-500' : 'text-slate-200')}>
                {task.title}
              </span>
              {/* Assignee avatar */}
              {assignee && (
                <div
                  className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-[8px] font-bold text-white"
                  style={{ backgroundColor: assignee.colour }}
                  title={assignee.name}
                >
                  {assignee.name.split(' ').map((n: string) => n[0]).join('')}
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Scrollable chart area */}
        <div ref={scrollRef} className="flex-1 overflow-x-auto overflow-y-hidden">
          <div style={{ width: totalWidth, minWidth: '100%', position: 'relative' }}>
            {/* ── Date header ───────────────────────────────────────────── */}
            <div
              className="flex border-b border-[#1C3054] bg-[#06091A] sticky top-0 z-10"
              style={{ height: HEADER_H }}
            >
              {/* Month labels row */}
              {(() => {
                const months: { label: string; dayCount: number }[] = [];
                let cur: string | null = null;
                let count = 0;
                days.forEach(d => {
                  const m = format(d, 'MMM yyyy');
                  if (m !== cur) {
                    if (cur) months.push({ label: cur, dayCount: count });
                    cur = m; count = 1;
                  } else count++;
                });
                if (cur) months.push({ label: cur, dayCount: count });
                return (
                  <div className="absolute inset-x-0 top-0 flex" style={{ height: 20 }}>
                    {months.map(({ label, dayCount }) => (
                      <div
                        key={label}
                        className="border-r border-[#1C3054] flex items-center px-2 overflow-hidden"
                        style={{ width: dayCount * DAY_W, height: 20 }}
                      >
                        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                          {label}
                        </span>
                      </div>
                    ))}
                  </div>
                );
              })()}
              {/* Day labels row */}
              <div className="absolute inset-x-0 bottom-0 flex" style={{ height: 32 }}>
                {days.map((d, i) => {
                  const isT = isToday(d);
                  const isWe = isWeekend(d);
                  const showLabel = d.getDate() === 1 || i === 0 || d.getDay() === 1;
                  return (
                    <div
                      key={i}
                      className={cn(
                        'flex items-center justify-center border-r border-[#1C3054] text-[10px] flex-shrink-0',
                        isT ? 'text-blue-400 font-bold' : isWe ? 'text-slate-600' : 'text-slate-500'
                      )}
                      style={{ width: DAY_W, height: 32 }}
                    >
                      {showLabel || isT ? (
                        <span className={cn(isT && 'bg-blue-500 text-white rounded px-1')}>
                          {format(d, 'd')}
                        </span>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── Task rows ─────────────────────────────────────────────── */}
            {rows.map(({ task, left, width, colour, hasEnd }, i) => (
              <div
                key={task.id}
                className={cn(
                  'relative flex items-center border-b border-[#1C3054]',
                  i % 2 === 0 ? 'bg-[#0C1526]' : 'bg-[#0E1840]'
                )}
                style={{ height: ROW_H }}
              >
                {/* Weekend shading */}
                {days.map((d, di) =>
                  isWeekend(d) ? (
                    <div
                      key={di}
                      className="absolute top-0 bottom-0 bg-[#06091A]/40"
                      style={{ left: di * DAY_W, width: DAY_W }}
                    />
                  ) : null
                )}

                {/* Today line */}
                <div
                  className="absolute top-0 bottom-0 w-px bg-blue-500/40 z-10"
                  style={{ left: todayX + DAY_W / 2 }}
                />

                {/* Task bar */}
                <button
                  onClick={() => setSelectedTask(task.id)}
                  className="absolute flex items-center px-2 rounded-md hover:brightness-110 transition-all z-20 cursor-pointer"
                  style={{
                    left: left + 2,
                    width: Math.max(width - 4, 20),
                    height: ROW_H - 12,
                    top: 6,
                    backgroundColor: `${colour}30`,
                    border: `1.5px solid ${colour}`,
                  }}
                  title={task.title}
                >
                  <span className="text-[10px] font-medium truncate" style={{ color: colour }}>
                    {task.title}
                  </span>
                  {!hasEnd && (
                    <span className="ml-auto text-[10px] text-slate-600 flex-shrink-0">→</span>
                  )}
                </button>
              </div>
            ))}

            {/* Today marker label */}
            <div
              className="absolute top-0 z-20 pointer-events-none"
              style={{ left: todayX + DAY_W / 2 - 1 }}
            >
              <div className="w-0.5 bg-blue-500/60" style={{ height: (rows.length + 1) * ROW_H + HEADER_H }} />
            </div>
          </div>
        </div>
      </div>

      {/* Footer: tasks without due dates */}
      {tasks.some(t => !t.dueDate) && (
        <div className="px-4 py-2 border-t border-[#1C3054] flex items-center gap-2">
          <span className="text-[10px] text-slate-600">
            {tasks.filter(t => !t.dueDate).length} task{tasks.filter(t => !t.dueDate).length !== 1 ? 's' : ''} without a due date — shown with 3-day placeholder width
          </span>
        </div>
      )}
    </div>
  );
}
