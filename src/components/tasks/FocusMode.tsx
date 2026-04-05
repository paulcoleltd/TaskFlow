import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Play, Pause, RotateCcw, CheckSquare2, Timer, Coffee, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useTaskStore } from '../../store/taskStore';
import { useUIStore } from '../../store/uiStore';
import { useCurrentUser } from '../../hooks/useConvexUser';
import { canEditTask } from '../../lib/permissions';
import { StatusBadge } from '../ui/StatusBadge';
import { PriorityBadge } from '../ui/PriorityBadge';
import { ProgressBar } from '../ui/ProgressBar';
import { cn } from '../../lib/utils';
import toast from 'react-hot-toast';
import { emitTaskUpdate } from '../../lib/collabEmit';

// ── Pomodoro config ──────────────────────────────────────────────────────
const WORK_SECS  = 25 * 60;
const BREAK_SECS = 5  * 60;

function fmt(secs: number) {
  const m = String(Math.floor(secs / 60)).padStart(2, '0');
  const s = String(secs % 60).padStart(2, '0');
  return `${m}:${s}`;
}

// ── Circular progress ring ───────────────────────────────────────────────
function Ring({ pct, phase }: { pct: number; phase: 'work' | 'break' }) {
  const r = 54;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct);
  const colour = phase === 'work' ? '#4B8CF7' : '#10B981';
  return (
    <svg className="w-40 h-40 -rotate-90" viewBox="0 0 120 120">
      <circle cx="60" cy="60" r={r} fill="none" stroke="#1C3054" strokeWidth="8" />
      <circle
        cx="60" cy="60" r={r} fill="none"
        stroke={colour} strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 0.5s linear' }}
      />
    </svg>
  );
}

// ── Main component ───────────────────────────────────────────────────────
export function FocusMode({ taskId, onClose }: { taskId: string; onClose: () => void }) {
  const { tasks, updateTask, logActivity } = useTaskStore();
  const { setSelectedTask } = useUIStore();
  const currentUser = useCurrentUser();

  const task = tasks.find(t => t.id === taskId);

  // Timer state
  const [phase, setPhase]   = useState<'work' | 'break'>('work');
  const [secs, setSecs]     = useState(WORK_SECS);
  const [running, setRunning] = useState(false);
  const [sessions, setSessions] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const total = phase === 'work' ? WORK_SECS : BREAK_SECS;
  const pct   = secs / total;
  const uid   = currentUser?._id ?? '';
  const role  = currentUser?.role ?? 'viewer';
  const canEdit = task ? canEditTask(role, task.assigneeId, uid) : false;

  const completedSubs = task?.subtasks.filter(s => s.completed).length ?? 0;
  const subPct = task?.subtasks.length ? (completedSubs / task.subtasks.length) * 100 : 0;

  // Timer tick
  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      setSecs(s => {
        if (s <= 1) {
          // Phase complete
          if (phase === 'work') {
            setSessions(n => n + 1);
            toast.success('🍅 Pomodoro complete! Take a break.');
            setPhase('break');
            setSecs(BREAK_SECS);
            // Auto-log time
            if (task && canEdit) {
              const h = Math.round((WORK_SECS / 3600) * 10) / 10;
              const loggedHours = Math.round(((task.loggedHours ?? 0) + h) * 10) / 10;
              updateTask(task.id, { loggedHours });
              emitTaskUpdate(task.id, { loggedHours });
            }
          } else {
            toast.success('Break over — back to work!');
            setPhase('work');
            setSecs(WORK_SECS);
          }
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current!);
  }, [running, phase, task, canEdit]);

  // Update document title with timer
  useEffect(() => {
    if (running && task) document.title = `${fmt(secs)} — ${task.title}`;
    return () => { document.title = 'TaskFlow'; };
  }, [secs, running, task]);

  const reset = useCallback(() => {
    setRunning(false);
    clearInterval(intervalRef.current!);
    setSecs(phase === 'work' ? WORK_SECS : BREAK_SECS);
  }, [phase]);

  const toggleSub = (subId: string) => {
    if (!task || !canEdit) return;
    const updated = task.subtasks.map(s => s.id === subId ? { ...s, completed: !s.completed } : s);
    updateTask(task.id, { subtasks: updated });
    emitTaskUpdate(task.id, { subtasks: updated });
    const justCompleted = !task.subtasks.find(s => s.id === subId)?.completed;
    if (justCompleted) logActivity(task.id, uid, 'subtask_completed');
  };

  const markDone = () => {
    if (!task || !canEdit) return;
    const newStatus = task.status === 'done' ? 'todo' : 'done';
    updateTask(task.id, { status: newStatus });
    emitTaskUpdate(task.id, { status: newStatus });
    logActivity(task.id, uid, 'status_changed', { from: task.status, to: newStatus });
    if (newStatus === 'done') {
      toast.success('Task marked done!');
      setRunning(false);
    }
  };

  // Navigate between active tasks
  const activeTasks = tasks.filter(t => t.status !== 'done');
  const idx = activeTasks.findIndex(t => t.id === taskId);
  const prevTask = idx > 0 ? activeTasks[idx - 1] : null;
  const nextTask = idx < activeTasks.length - 1 ? activeTasks[idx + 1] : null;

  const navigateTo = (id: string) => {
    setSelectedTask(id);
    onClose();
    // Reopen focus mode for new task — handled by parent via 'f' key
  };

  if (!task) { onClose(); return null; }

  return (
    <div className="fixed inset-0 z-60 bg-[#06091A] flex flex-col">
      {/* Header bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#1C3054]">
        <div className="flex items-center gap-4">
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-[#0C1526] text-slate-500 hover:text-slate-300 transition-colors"
            title="Exit focus mode (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-blue-400 uppercase tracking-widest">Focus Mode</span>
            {sessions > 0 && (
              <span className="flex items-center gap-1 text-[10px] text-slate-500">
                <span className="text-red-400">🍅</span> ×{sessions}
              </span>
            )}
          </div>
        </div>
        {/* Task navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => prevTask && navigateTo(prevTask.id)}
            disabled={!prevTask}
            className="p-1.5 rounded-lg hover:bg-[#0C1526] text-slate-500 hover:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Previous task (K)"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs text-slate-600">{idx + 1} / {activeTasks.length}</span>
          <button
            onClick={() => nextTask && navigateTo(nextTask.id)}
            disabled={!nextTask}
            className="p-1.5 rounded-lg hover:bg-[#0C1526] text-slate-500 hover:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Next task (J)"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-6 py-10 space-y-10">
          {/* Task header */}
          <div className="text-center space-y-3">
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <PriorityBadge priority={task.priority} />
              <StatusBadge status={task.status} />
              {task.dueDate && (
                <span className="text-xs text-slate-500">
                  Due {formatDistanceToNow(new Date(task.dueDate), { addSuffix: true })}
                </span>
              )}
            </div>
            <h1 className={cn(
              'text-3xl font-bold text-white leading-tight',
              task.status === 'done' && 'line-through text-slate-500'
            )}>
              {task.title}
            </h1>
            {task.description && (
              <p className="text-slate-400 text-sm leading-relaxed max-w-lg mx-auto">{task.description}</p>
            )}
            {task.status === 'blocked' && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                <AlertCircle className="w-3.5 h-3.5" />
                This task is blocked
              </div>
            )}
          </div>

          {/* Pomodoro timer */}
          <div className="flex flex-col items-center gap-6">
            {/* Phase toggle */}
            <div className="flex gap-1 bg-[#0C1526] border border-[#1C3054] rounded-xl p-1">
              {(['work', 'break'] as const).map(p => (
                <button
                  key={p}
                  onClick={() => { setPhase(p); setSecs(p === 'work' ? WORK_SECS : BREAK_SECS); setRunning(false); }}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all',
                    phase === p ? 'bg-blue-500 text-white' : 'text-slate-500 hover:text-slate-300'
                  )}
                >
                  {p === 'work' ? <Timer className="w-3.5 h-3.5" /> : <Coffee className="w-3.5 h-3.5" />}
                  {p === 'work' ? 'Focus (25m)' : 'Break (5m)'}
                </button>
              ))}
            </div>

            {/* Ring + time */}
            <div className="relative flex items-center justify-center">
              <Ring pct={pct} phase={phase} />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={cn('text-4xl font-mono font-bold tabular-nums', phase === 'work' ? 'text-blue-400' : 'text-green-400')}>
                  {fmt(secs)}
                </span>
                <span className="text-[10px] text-slate-600 uppercase tracking-widest mt-1">
                  {phase === 'work' ? 'focus' : 'break'}
                </span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-3">
              <button
                onClick={reset}
                className="p-2.5 rounded-xl bg-[#0C1526] border border-[#1C3054] text-slate-500 hover:text-slate-300 hover:border-[#2A4080] transition-all"
                title="Reset"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={() => setRunning(r => !r)}
                className={cn(
                  'flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-lg',
                  running
                    ? 'bg-[#0C1526] border border-[#1C3054] text-slate-300 hover:border-red-500/50 hover:text-red-400'
                    : 'bg-blue-500 hover:bg-blue-600 text-white shadow-blue-500/25'
                )}
              >
                {running ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                {running ? 'Pause' : 'Start'}
              </button>
            </div>
          </div>

          {/* Subtasks */}
          {task.subtasks.length > 0 && (
            <div className="bg-[#0C1526] border border-[#1C3054] rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-semibold text-slate-300">
                  Subtasks — {completedSubs}/{task.subtasks.length}
                </span>
                <span className="text-xs text-slate-500">{Math.round(subPct)}%</span>
              </div>
              <ProgressBar value={subPct} size="sm" className="mb-4" />
              <div className="space-y-2">
                {task.subtasks.map(sub => (
                  <button
                    key={sub.id}
                    onClick={() => toggleSub(sub.id)}
                    disabled={!canEdit}
                    className={cn(
                      'w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-colors',
                      canEdit ? 'hover:bg-[#122040]' : 'cursor-default'
                    )}
                  >
                    <CheckSquare2 className={cn('w-5 h-5 flex-shrink-0', sub.completed ? 'text-green-400' : 'text-slate-600')} />
                    <span className={cn('text-sm', sub.completed ? 'line-through text-slate-500' : 'text-slate-200')}>
                      {sub.title}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Mark done */}
          {canEdit && (
            <div className="flex justify-center">
              <button
                onClick={markDone}
                className={cn(
                  'flex items-center gap-2 px-8 py-3 rounded-2xl font-semibold text-sm transition-all border',
                  task.status === 'done'
                    ? 'border-[#1C3054] text-slate-400 hover:border-slate-500 hover:text-slate-200'
                    : 'bg-green-500/10 border-green-500/30 text-green-400 hover:bg-green-500/20'
                )}
              >
                <CheckSquare2 className="w-5 h-5" />
                {task.status === 'done' ? 'Reopen Task' : 'Mark as Done'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
