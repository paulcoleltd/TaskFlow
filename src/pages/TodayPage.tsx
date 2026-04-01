import { useMemo, useState } from 'react';
import { isToday, isThisWeek, isYesterday, format } from 'date-fns';
import { Target, AlertCircle, Clock, CheckCircle2, Zap, X, Plus, ClipboardCopy, ChevronDown } from 'lucide-react';
import { useTaskStore } from '../store/taskStore';
import { useUIStore } from '../store/uiStore';
import { useAuthStore } from '../store/authStore';
import { useProjectStore } from '../store/projectStore';
import { isOverdue, cn, formatDate } from '../lib/utils';
import { PriorityBadge } from '../components/ui/PriorityBadge';
import { StatusBadge } from '../components/ui/StatusBadge';
import toast from 'react-hot-toast';
import { emitTaskUpdate } from '../lib/collabEmit';

const MAX_FOCUS = 3;

export default function TodayPage() {
  const [showStandup, setShowStandup] = useState(false);
  const { tasks, updateTask } = useTaskStore();
  const { setSelectedTask, todayFocus, toggleTodayFocus } = useUIStore();
  const { currentUser } = useAuthStore();
  const { getProjectById } = useProjectStore();

  const myTasks = useMemo(() =>
    tasks.filter(t => t.assigneeId === currentUser?.id),
    [tasks, currentUser]
  );

  const dueToday = useMemo(() =>
    myTasks.filter(t => t.dueDate && isToday(new Date(t.dueDate)) && t.status !== 'done')
      .sort((a, b) => {
        const pri = { critical: 4, high: 3, medium: 2, low: 1 };
        return (pri[b.priority] ?? 0) - (pri[a.priority] ?? 0);
      }),
    [myTasks]
  );

  const overdue = useMemo(() =>
    myTasks.filter(t => isOverdue(t.dueDate) && t.status !== 'done')
      .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime()),
    [myTasks]
  );

  const inProgress = useMemo(() =>
    myTasks.filter(t => t.status === 'in-progress' && !isOverdue(t.dueDate)),
    [myTasks]
  );

  const focusTasks = useMemo(() =>
    todayFocus.map(id => tasks.find(t => t.id === id)).filter(Boolean) as typeof tasks,
    [todayFocus, tasks]
  );

  const completedToday = useMemo(() =>
    myTasks.filter(t => t.status === 'done' && isToday(new Date(t.updatedAt))),
    [myTasks]
  );

  const completedYesterday = useMemo(() =>
    myTasks.filter(t => t.status === 'done' && isYesterday(new Date(t.updatedAt))),
    [myTasks]
  );

  const blockedTasks = useMemo(() =>
    myTasks.filter(t => t.status === 'blocked'),
    [myTasks]
  );

  const thisWeek = useMemo(() =>
    myTasks.filter(t => t.dueDate && isThisWeek(new Date(t.dueDate), { weekStartsOn: 1 }) && !isToday(new Date(t.dueDate)) && t.status !== 'done'),
    [myTasks]
  );

  const today = new Date();
  const dateStr = today.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const greeting = (() => {
    const h = today.getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  })();

  const focusDone = focusTasks.filter(t => t.status === 'done').length;
  const focusPct = focusTasks.length ? (focusDone / focusTasks.length) * 100 : 0;

  // Candidate tasks to add to focus (not already in focus, not done)
  const focusCandidates = useMemo(() =>
    [...dueToday, ...overdue, ...inProgress]
      .filter((t, i, arr) => arr.findIndex(x => x.id === t.id) === i) // dedupe
      .filter(t => !todayFocus.includes(t.id)),
    [dueToday, overdue, inProgress, todayFocus]
  );

  const buildStandup = () => {
    const dateLabel = format(new Date(), 'EEEE, MMMM d yyyy');
    const line = (t: typeof tasks[0]) => {
      const p = getProjectById(t.projectId);
      return `- ${t.title}${p ? ` (${p.name})` : ''}`;
    };
    const sections: string[] = [`## Daily Standup — ${dateLabel}`, ''];
    sections.push('### ✅ Done Yesterday');
    sections.push(completedYesterday.length ? completedYesterday.map(line).join('\n') : '_Nothing completed yesterday._');
    sections.push('');
    sections.push('### 🔄 Today');
    const todayItems = [...dueToday, ...inProgress].filter((t, i, a) => a.findIndex(x => x.id === t.id) === i);
    sections.push(todayItems.length ? todayItems.map(line).join('\n') : '_No active work for today._');
    sections.push('');
    sections.push('### 🚫 Blockers');
    sections.push(blockedTasks.length ? blockedTasks.map(line).join('\n') : '_No blockers._');
    return sections.join('\n');
  };

  const copyStandup = async () => {
    try {
      await navigator.clipboard.writeText(buildStandup());
      toast.success('Standup copied to clipboard!');
    } catch {
      toast.error('Could not copy — try selecting and copying manually.');
    }
  };

  const TaskRow = ({ task, showProject = true }: { task: (typeof tasks)[0]; showProject?: boolean }) => {
    const project = showProject ? getProjectById(task.projectId) : null;
    const isFocused = todayFocus.includes(task.id);
    return (
      <div className="flex items-center gap-3 px-4 py-3 bg-[#111C44] border border-[#1F3461] rounded-xl hover:border-blue-500/30 hover:bg-[#1B254B] transition-all group cursor-pointer"
        onClick={() => setSelectedTask(task.id)}>
        <button
          onClick={e => { e.stopPropagation(); const s = task.status === 'done' ? 'todo' : 'done'; updateTask(task.id, { status: s }); emitTaskUpdate(task.id, { status: s }); }}
          className="flex-shrink-0"
          title={task.status === 'done' ? 'Reopen' : 'Mark done'}
        >
          <CheckCircle2 className={cn('w-4 h-4 transition-colors', task.status === 'done' ? 'text-green-400' : 'text-slate-600 hover:text-green-400')} />
        </button>
        <div className="flex-1 min-w-0">
          <p className={cn('text-sm truncate', task.status === 'done' ? 'line-through text-slate-500' : 'text-slate-200')}>{task.title}</p>
          {project && <p className="text-[10px] text-slate-600 truncate">{project.name}</p>}
        </div>
        <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
          <PriorityBadge priority={task.priority} />
          {task.dueDate && (
            <span className={cn('text-[10px]', isOverdue(task.dueDate) && task.status !== 'done' ? 'text-red-400' : 'text-slate-600')}>
              {formatDate(task.dueDate)}
            </span>
          )}
          <StatusBadge status={task.status} />
        </div>
        {todayFocus.length < MAX_FOCUS && !isFocused && task.status !== 'done' && (
          <button
            onClick={e => { e.stopPropagation(); toggleTodayFocus(task.id); }}
            className="opacity-0 group-hover:opacity-100 p-1 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-all flex-shrink-0"
            title="Add to today's focus"
          >
            <Target className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-20 md:pb-6">
      {/* Header */}
      <div>
        <p className="text-xs text-slate-500 mb-1">{dateStr}</p>
        <h1 className="text-2xl font-bold text-white">
          {greeting}{currentUser?.name ? `, ${currentUser.name.split(' ')[0]}` : ''} 👋
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          {overdue.length > 0
            ? `You have ${overdue.length} overdue task${overdue.length !== 1 ? 's' : ''} — let's get them sorted.`
            : dueToday.length > 0
              ? `${dueToday.length} task${dueToday.length !== 1 ? 's' : ''} due today.`
              : 'Looking good — no overdue or due-today tasks!'}
        </p>
      </div>

      {/* Today's Focus — up to 3 tasks */}
      <div className="bg-[#111C44] border border-[#1F3461] rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-semibold text-white">Today's Focus</span>
            <span className="text-[10px] text-slate-500 bg-[#1B254B] px-1.5 py-0.5 rounded-full">max {MAX_FOCUS}</span>
          </div>
          {focusTasks.length > 0 && (
            <span className="text-xs text-slate-500">{focusDone}/{focusTasks.length} done</span>
          )}
        </div>

        {focusTasks.length > 0 && (
          <div className="h-1.5 bg-[#1B254B] rounded-full overflow-hidden mb-4">
            <div
              className="h-full bg-blue-500 rounded-full transition-all"
              style={{ width: `${focusPct}%` }}
            />
          </div>
        )}

        <div className="space-y-2">
          {focusTasks.map(task => (
            <div key={task.id} className="flex items-center gap-3 px-4 py-3 bg-[#0B1437] border border-blue-500/20 rounded-xl cursor-pointer hover:border-blue-500/40 transition-all group"
              onClick={() => setSelectedTask(task.id)}>
              <button
                onClick={e => { e.stopPropagation(); const s = task.status === 'done' ? 'todo' : 'done'; updateTask(task.id, { status: s }); emitTaskUpdate(task.id, { status: s }); }}
                className="flex-shrink-0"
              >
                <CheckCircle2 className={cn('w-4 h-4 transition-colors', task.status === 'done' ? 'text-green-400' : 'text-blue-400/50 hover:text-green-400')} />
              </button>
              <div className="flex-1 min-w-0">
                <p className={cn('text-sm truncate', task.status === 'done' ? 'line-through text-slate-500' : 'text-slate-200')}>{task.title}</p>
              </div>
              <PriorityBadge priority={task.priority} />
              <button
                onClick={e => { e.stopPropagation(); toggleTodayFocus(task.id); }}
                className="opacity-0 group-hover:opacity-100 p-1 rounded text-slate-600 hover:text-red-400 transition-all flex-shrink-0"
                title="Remove from focus"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}

          {focusTasks.length < MAX_FOCUS && focusCandidates.length > 0 && (
            <div className="border border-dashed border-[#1F3461] rounded-xl p-3">
              <p className="text-[10px] text-slate-600 mb-2">Add to focus ({MAX_FOCUS - focusTasks.length} slot{MAX_FOCUS - focusTasks.length !== 1 ? 's' : ''} left)</p>
              <div className="flex flex-wrap gap-2">
                {focusCandidates.slice(0, 5).map(t => (
                  <button
                    key={t.id}
                    onClick={() => toggleTodayFocus(t.id)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#0B1437] border border-[#1F3461] hover:border-blue-500/30 text-xs text-slate-400 hover:text-slate-200 transition-all"
                  >
                    <Plus className="w-3 h-3" />
                    <span className="truncate max-w-[160px]">{t.title}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {focusTasks.length === 0 && focusCandidates.length === 0 && (
            <div className="text-center py-4">
              <Zap className="w-8 h-8 text-slate-700 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No active tasks to focus on</p>
            </div>
          )}
        </div>
      </div>

      {/* Overdue */}
      {overdue.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="w-4 h-4 text-red-400" />
            <span className="text-sm font-semibold text-red-400">Overdue</span>
            <span className="text-xs text-slate-600 bg-red-500/10 px-1.5 py-0.5 rounded-full">{overdue.length}</span>
          </div>
          <div className="space-y-2">
            {overdue.map(t => <TaskRow key={t.id} task={t} />)}
          </div>
        </div>
      )}

      {/* Due today */}
      {dueToday.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-semibold text-amber-400">Due Today</span>
            <span className="text-xs text-slate-600 bg-amber-500/10 px-1.5 py-0.5 rounded-full">{dueToday.length}</span>
          </div>
          <div className="space-y-2">
            {dueToday.map(t => <TaskRow key={t.id} task={t} />)}
          </div>
        </div>
      )}

      {/* In progress */}
      {inProgress.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-semibold text-blue-400">In Progress</span>
            <span className="text-xs text-slate-600 bg-blue-500/10 px-1.5 py-0.5 rounded-full">{inProgress.length}</span>
          </div>
          <div className="space-y-2">
            {inProgress.map(t => <TaskRow key={t.id} task={t} />)}
          </div>
        </div>
      )}

      {/* Coming this week */}
      {thisWeek.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-4 h-4 text-slate-500" />
            <span className="text-sm font-semibold text-slate-400">Coming This Week</span>
            <span className="text-xs text-slate-600 bg-[#1B254B] px-1.5 py-0.5 rounded-full">{thisWeek.length}</span>
          </div>
          <div className="space-y-2">
            {thisWeek.slice(0, 5).map(t => <TaskRow key={t.id} task={t} />)}
            {thisWeek.length > 5 && (
              <p className="text-xs text-slate-600 text-center pt-1">+{thisWeek.length - 5} more this week</p>
            )}
          </div>
        </div>
      )}

      {/* Completed today */}
      {completedToday.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-4 h-4 text-green-400" />
            <span className="text-sm font-semibold text-green-400">Completed Today</span>
            <span className="text-xs text-slate-600 bg-green-500/10 px-1.5 py-0.5 rounded-full">{completedToday.length}</span>
          </div>
          <div className="space-y-2 opacity-70">
            {completedToday.map(t => <TaskRow key={t.id} task={t} />)}
          </div>
        </div>
      )}

      {/* All clear */}
      {overdue.length === 0 && dueToday.length === 0 && inProgress.length === 0 && completedToday.length === 0 && (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">🎉</div>
          <p className="text-lg font-semibold text-white mb-2">You're all caught up!</p>
          <p className="text-sm text-slate-400">No overdue or active tasks. Enjoy the moment.</p>
        </div>
      )}

      {/* Standup Report */}
      <div className="bg-[#111C44] border border-[#1F3461] rounded-xl overflow-hidden">
        <button
          onClick={() => setShowStandup(v => !v)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-[#1B254B] transition-colors"
        >
          <div className="flex items-center gap-2">
            <ClipboardCopy className="w-4 h-4 text-slate-400" />
            <span className="text-sm font-semibold text-white">Standup Report</span>
            <span className="text-[10px] text-slate-600 bg-[#0B1437] px-2 py-0.5 rounded-full border border-[#1F3461]">auto-generated</span>
          </div>
          <ChevronDown className={cn('w-4 h-4 text-slate-500 transition-transform', showStandup && 'rotate-180')} />
        </button>

        {showStandup && (
          <div className="px-5 pb-5 border-t border-[#1F3461]">
            <pre className="mt-4 bg-[#0B1437] border border-[#1F3461] rounded-xl p-4 text-xs text-slate-300 font-mono whitespace-pre-wrap leading-relaxed overflow-x-auto">
              {buildStandup()}
            </pre>
            <div className="flex items-center justify-between mt-3">
              <p className="text-[10px] text-slate-600">Based on tasks assigned to you. Edit before sharing.</p>
              <button
                onClick={copyStandup}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-300 text-xs font-medium hover:bg-blue-500/25 transition-all"
              >
                <ClipboardCopy className="w-3 h-3" />
                Copy to clipboard
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
