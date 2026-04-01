import { useState, useMemo, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Repeat2 } from 'lucide-react';
import { useTaskStore } from '../store/taskStore';
import { useUIStore } from '../store/uiStore';
import { useAuthStore } from '../store/authStore';
import { canCreateTask, canEditTask } from '../lib/permissions';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isSameDay, startOfWeek, endOfWeek, addWeeks, subWeeks, isWithinInterval } from 'date-fns';
import { PRIORITY_OPTIONS } from '../lib/constants';
import { cn } from '../lib/utils';
import toast from 'react-hot-toast';
import { emitTaskUpdate } from '../lib/collabEmit';

type CalView = 'month' | 'week';

export default function CalendarPage() {
  const [current, setCurrent] = useState(new Date());
  const [view, setView] = useState<CalView>('month');
  const [showDone, setShowDone] = useState(false);

  // Drag-to-reschedule state
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);

  const { tasks, updateTask } = useTaskStore();
  const { setSelectedTask, openTaskModal } = useUIStore();
  const { currentUser } = useAuthStore();

  const role = currentUser?.role ?? 'viewer';
  const userId = currentUser?.id ?? '';
  const canCreate = canCreateTask(role);

  const days = eachDayOfInterval({ start: startOfMonth(current), end: endOfMonth(current) });
  const startPad = startOfMonth(current).getDay();

  const weekStart = startOfWeek(current);
  const weekEnd = endOfWeek(current);
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const prev = () => {
    if (view === 'week') setCurrent(d => subWeeks(d, 1));
    else setCurrent(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  };
  const next = () => {
    if (view === 'week') setCurrent(d => addWeeks(d, 1));
    else setCurrent(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  };

  const handleDayClick = (day: Date) => {
    if (!canCreate || draggingTaskId) return;
    openTaskModal(undefined, format(day, 'yyyy-MM-dd'));
  };

  const headerTitle = view === 'week'
    ? `${format(weekStart, 'MMM d')} – ${format(weekEnd, 'MMM d, yyyy')}`
    : format(current, 'MMMM yyyy');

  // ── Drag handlers ──────────────────────────────────────────
  const handleDragStart = useCallback((e: React.DragEvent, taskId: string) => {
    e.stopPropagation();
    setDraggingTaskId(taskId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('taskId', taskId);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, dateKey: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverDate(dateKey);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    // Only clear if leaving the cell entirely (not entering a child)
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverDate(null);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, day: Date) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId') || draggingTaskId;
    if (!taskId) return;

    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    if (!canEditTask(role, task.assigneeId, userId)) {
      toast.error('You do not have permission to reschedule this task.');
      setDraggingTaskId(null);
      setDragOverDate(null);
      return;
    }

    const newDate = new Date(day);
    newDate.setHours(12, 0, 0, 0); // noon to avoid TZ edge cases
    const newIso = newDate.toISOString();

    // Skip if same day
    if (task.dueDate && isSameDay(new Date(task.dueDate), day)) {
      setDraggingTaskId(null);
      setDragOverDate(null);
      return;
    }

    updateTask(taskId, { dueDate: newIso });
    emitTaskUpdate(taskId, { dueDate: newIso });
    toast.success(`Rescheduled to ${format(day, 'MMM d')}`);
    setDraggingTaskId(null);
    setDragOverDate(null);
  }, [draggingTaskId, tasks, role, userId, updateTask]);

  const handleDragEnd = useCallback(() => {
    setDraggingTaskId(null);
    setDragOverDate(null);
  }, []);

  // Period stats
  const periodStats = useMemo(() => {
    const start = view === 'week' ? weekStart : startOfMonth(current);
    const end = view === 'week' ? weekEnd : endOfMonth(current);
    const periodTasks = tasks.filter(t => t.dueDate && isWithinInterval(new Date(t.dueDate), { start, end }));
    return {
      total: periodTasks.length,
      done: periodTasks.filter(t => t.status === 'done').length,
      overdue: periodTasks.filter(t => t.status !== 'done' && new Date(t.dueDate!) < new Date()).length,
    };
  }, [tasks, view, current, weekStart, weekEnd]);

  // ── Task pill renderer ─────────────────────────────────────
  const TaskPill = useCallback(({ task, compact = false }: { task: { id: string; title: string; status: string; priority: string; assigneeId?: string; recurrence?: string }; compact?: boolean }) => {
    const pc = PRIORITY_OPTIONS.find(p => p.value === task.priority);
    const isDone = task.status === 'done';
    const canDrag = canEditTask(role, task.assigneeId, userId);
    const isBeingDragged = draggingTaskId === task.id;
    const isRecurring = !!(task.recurrence && task.recurrence !== 'none');

    return (
      <div
        draggable={canDrag}
        onDragStart={e => handleDragStart(e, task.id)}
        onDragEnd={handleDragEnd}
        onClick={e => { e.stopPropagation(); setSelectedTask(task.id); }}
        title={task.title}
        className={cn(
          'text-[10px] px-1.5 rounded font-medium truncate transition-all select-none flex items-center gap-1',
          compact ? 'py-0.5' : 'py-1',
          isDone && 'line-through opacity-50',
          canDrag && 'cursor-grab active:cursor-grabbing',
          isBeingDragged && 'opacity-30 scale-95',
          !canDrag && 'cursor-pointer',
          'hover:opacity-80'
        )}
        style={{ backgroundColor: `${pc?.colour}22`, color: pc?.colour }}
      >
        {isRecurring && <Repeat2 className="w-2.5 h-2.5 flex-shrink-0 opacity-70" />}
        <span className="truncate">{task.title}</span>
      </div>
    );
  }, [role, userId, draggingTaskId, handleDragStart, handleDragEnd, setSelectedTask]);

  // ── Day cell renderer ──────────────────────────────────────
  const DayCell = useCallback(({
    day, allDayTasks, compact, outOfMonth,
  }: {
    day: Date;
    allDayTasks: typeof tasks;
    compact?: boolean;
    outOfMonth?: boolean;
  }) => {
    const dayTasks = showDone ? allDayTasks : allDayTasks.filter(t => t.status !== 'done');
    const today = isToday(day);
    const dateKey = format(day, 'yyyy-MM-dd');
    const isDragTarget = dragOverDate === dateKey && draggingTaskId !== null;
    const visibleTasks = compact ? dayTasks.slice(0, 3) : dayTasks;
    const overflow = compact ? dayTasks.length - 3 : 0;

    return (
      <div
        key={day.toISOString()}
        onClick={() => handleDayClick(day)}
        onDragOver={e => handleDragOver(e, dateKey)}
        onDragLeave={handleDragLeave}
        onDrop={e => handleDrop(e, day)}
        className={cn(
          'p-2 rounded-xl border transition-all duration-150',
          compact ? 'min-h-[80px]' : 'min-h-[180px]',
          today
            ? 'border-blue-500 bg-blue-500/10'
            : isDragTarget
              ? 'border-blue-400/60 bg-blue-400/10 scale-[1.02]'
              : 'border-transparent hover:border-[#1F3461] hover:bg-[#1B254B]',
          outOfMonth && 'opacity-30',
          canCreate && !draggingTaskId && 'cursor-pointer',
          draggingTaskId && 'cursor-copy'
        )}
      >
        {/* Date label */}
        {compact ? (
          <div className={cn('text-xs font-semibold mb-1.5', today ? 'text-blue-400' : 'text-slate-400')}>
            {format(day, 'd')}
          </div>
        ) : (
          <div className={cn('mb-2', today ? 'text-blue-400' : 'text-slate-400')}>
            <div className="text-xs font-semibold">{format(day, 'EEE')}</div>
            <div className={cn('text-lg font-bold leading-none mt-0.5', today ? 'text-blue-300' : 'text-slate-300')}>
              {format(day, 'd')}
            </div>
          </div>
        )}

        {/* Drop zone hint */}
        {isDragTarget && (
          <div className="text-[10px] text-blue-400 font-semibold mb-1 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            Drop to reschedule
          </div>
        )}

        {/* Task pills */}
        <div className={cn('space-y-0.5', !compact && 'space-y-1')}>
          {visibleTasks.map(task => (
            <TaskPill key={task.id} task={task} compact={compact} />
          ))}
          {overflow > 0 && (
            <div className="text-[10px] text-slate-500">+{overflow} more</div>
          )}
          {dayTasks.length === 0 && canCreate && !outOfMonth && !isDragTarget && (
            <div className="text-[9px] text-slate-700 mt-1">+ add task</div>
          )}
        </div>
      </div>
    );
  }, [showDone, dragOverDate, draggingTaskId, canCreate, handleDayClick, handleDragOver, handleDragLeave, handleDrop, TaskPill]);

  return (
    <div className="pb-20 md:pb-0">
      <div className="bg-[#111C44] border border-[#1F3461] rounded-xl p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-base font-semibold text-white">{headerTitle}</h2>
          <div className="flex items-center gap-2">
            <div className="flex gap-0.5 bg-[#0B1437] border border-[#1F3461] rounded-lg p-0.5">
              {(['month', 'week'] as CalView[]).map(v => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={cn(
                    'px-2.5 py-1 rounded text-xs font-medium capitalize transition-all',
                    view === v ? 'bg-blue-500 text-white' : 'text-slate-500 hover:text-slate-300'
                  )}
                >
                  {v}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowDone(v => !v)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
                showDone ? 'bg-green-500/15 border-green-500/30 text-green-400' : 'border-[#1F3461] text-slate-500 hover:text-slate-300'
              )}
            >
              {showDone ? 'Hiding done' : 'Show done'}
            </button>
            <button onClick={prev} aria-label="Previous" className="p-2 rounded-lg hover:bg-[#1B254B] text-slate-400 hover:text-slate-200 transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrent(new Date())}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/30 hover:bg-blue-500/20 transition-colors"
            >
              Today
            </button>
            <button onClick={next} aria-label="Next" className="p-2 rounded-lg hover:bg-[#1B254B] text-slate-400 hover:text-slate-200 transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Day-of-week headers */}
        <div className="grid grid-cols-7 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} className="text-center text-xs font-semibold text-slate-500 py-2">{d}</div>
          ))}
        </div>

        {view === 'week' ? (
          <div className="grid grid-cols-7 gap-1">
            {weekDays.map(day => {
              const allDayTasks = tasks.filter(t => t.dueDate && isSameDay(new Date(t.dueDate), day));
              return <DayCell key={day.toISOString()} day={day} allDayTasks={allDayTasks} compact={false} />;
            })}
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: startPad }).map((_, i) => <div key={`pad-${i}`} />)}
            {days.map(day => {
              const allDayTasks = tasks.filter(t => t.dueDate && isSameDay(new Date(t.dueDate), day));
              const outOfMonth = !isSameMonth(day, current);
              return <DayCell key={day.toISOString()} day={day} allDayTasks={allDayTasks} compact outOfMonth={outOfMonth} />;
            })}
          </div>
        )}
      </div>

      {/* Period summary */}
      {periodStats.total > 0 && (
        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-[#1F3461]">
          <span className="text-xs text-slate-500">{view === 'week' ? 'This week' : 'This month'}:</span>
          <span className="text-xs text-slate-300"><span className="font-semibold text-white">{periodStats.total}</span> tasks scheduled</span>
          <span className="text-xs text-slate-300"><span className="font-semibold text-green-400">{periodStats.done}</span> completed</span>
          {periodStats.overdue > 0 && <span className="text-xs text-red-400"><span className="font-semibold">{periodStats.overdue}</span> overdue</span>}
        </div>
      )}

      <p className="text-center text-xs text-slate-600 mt-3">
        {canCreate ? 'Click any day to add a task · ' : ''}
        Drag tasks between days to reschedule
      </p>
    </div>
  );
}
