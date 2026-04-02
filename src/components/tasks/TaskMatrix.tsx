import { useMemo } from 'react';
import { differenceInCalendarDays } from 'date-fns';
import type { Task } from '../../types';
import { useUIStore } from '../../store/uiStore';
import { useProjectStore } from '../../store/projectStore';
import { useTagStore } from '../../store/tagStore';
import { SEED_USERS } from '../../lib/sampleData';
import { PRIORITY_OPTIONS } from '../../lib/constants';
import { formatRelativeDate, isOverdue, cn } from '../../lib/utils';
import { Calendar, AlertTriangle } from 'lucide-react';

/* ── Urgency / importance classifiers ─────────────────── */
function isUrgent(task: Task): boolean {
  if (!task.dueDate) return false;
  const due = new Date(task.dueDate);
  if (isOverdue(task.dueDate)) return true;
  return differenceInCalendarDays(due, new Date()) <= 3;
}

function isImportant(task: Task): boolean {
  return task.priority === 'high' || task.priority === 'critical';
}

/* ── Quadrant config ───────────────────────────────────── */
interface Quadrant {
  id: string;
  label: string;
  action: string;
  description: string;
  urgent: boolean;
  important: boolean;
  borderColour: string;
  headerBg: string;
  badgeColour: string;
  emptyText: string;
}

const QUADRANTS: Quadrant[] = [
  {
    id: 'q1',
    label: 'Do First',
    action: 'Urgent + Important',
    description: 'These tasks need immediate attention.',
    urgent: true,
    important: true,
    borderColour: '#EF444440',
    headerBg: '#EF444415',
    badgeColour: '#EF4444',
    emptyText: 'No critical urgent work right now.',
  },
  {
    id: 'q2',
    label: 'Schedule',
    action: 'Not Urgent + Important',
    description: 'Plan time for these — they drive long-term results.',
    urgent: false,
    important: true,
    borderColour: '#4B8CF740',
    headerBg: '#4B8CF715',
    badgeColour: '#4B8CF7',
    emptyText: 'Add strategic tasks here.',
  },
  {
    id: 'q3',
    label: 'Delegate',
    action: 'Urgent + Not Important',
    description: 'Time-sensitive but could be handled by someone else.',
    urgent: true,
    important: false,
    borderColour: '#F59E0B40',
    headerBg: '#F59E0B15',
    badgeColour: '#F59E0B',
    emptyText: 'No urgent low-priority tasks.',
  },
  {
    id: 'q4',
    label: 'Eliminate',
    action: 'Not Urgent + Not Important',
    description: 'Low value — consider deferring or removing these.',
    urgent: false,
    important: false,
    borderColour: '#1C305460',
    headerBg: '#06091A20',
    badgeColour: '#64748B',
    emptyText: 'No low-priority backlog tasks.',
  },
];

/* ── Mini task card for the matrix ───────────────────────── */
function MatrixCard({ task }: { task: Task }) {
  const { setSelectedTask } = useUIStore();
  const { getProjectById } = useProjectStore();
  const tags = useTagStore(s => s.tags);
  const project = getProjectById(task.projectId);
  const assignee = SEED_USERS.find(u => u.id === task.assigneeId);
  const priorityMeta = PRIORITY_OPTIONS.find(p => p.value === task.priority);
  const overdue = isOverdue(task.dueDate) && task.status !== 'done';

  return (
    <div
      onClick={() => setSelectedTask(task.id)}
      className="group bg-[#06091A] border border-[#1C3054] rounded-xl p-3 cursor-pointer hover:border-blue-500/30 hover:bg-[#0C1526] transition-all"
    >
      {/* Priority dot + title */}
      <div className="flex items-start gap-2 mb-2">
        <div
          className="w-2 h-2 rounded-full flex-shrink-0 mt-1"
          style={{ backgroundColor: priorityMeta?.colour ?? '#64748B' }}
        />
        <p className={cn(
          'text-xs font-medium leading-snug line-clamp-2 flex-1',
          task.status === 'done' ? 'line-through text-slate-500' : 'text-slate-200 group-hover:text-white'
        )}>
          {task.title}
        </p>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-2 ml-4">
        <div className="flex items-center gap-2 min-w-0">
          {task.dueDate && (
            <span className={cn('flex items-center gap-0.5 text-[10px]', overdue ? 'text-red-400' : 'text-slate-500')}>
              {overdue && <AlertTriangle className="w-2.5 h-2.5" />}
              <Calendar className="w-2.5 h-2.5" />
              {formatRelativeDate(task.dueDate)}
            </span>
          )}
          {task.tags.slice(0, 1).map(tagId => {
            const tag = tags.find(t => t.id === tagId);
            if (!tag) return null;
            return (
              <span key={tagId} className="text-[9px] font-medium px-1.5 py-0.5 rounded-full" style={{ backgroundColor: `${tag.colour}22`, color: tag.colour }}>
                {tag.name}
              </span>
            );
          })}
        </div>
        {assignee && (
          <div
            className="w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center text-[8px] font-bold text-white"
            style={{ backgroundColor: assignee.colour }}
            title={assignee.name}
          >
            {assignee.name.split(' ').map(n => n[0]).join('')}
          </div>
        )}
      </div>

      {/* Project chip */}
      {project && (
        <div className="ml-4 mt-1.5 flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: project.colour }} />
          <span className="text-[9px] text-slate-600 truncate">{project.name}</span>
        </div>
      )}
    </div>
  );
}

/* ── Quadrant cell ─────────────────────────────────────── */
function QuadrantCell({ quadrant, tasks }: { quadrant: Quadrant; tasks: Task[] }) {
  return (
    <div
      className="flex flex-col rounded-2xl border overflow-hidden"
      style={{ borderColor: quadrant.borderColour }}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b flex-shrink-0" style={{ backgroundColor: quadrant.headerBg, borderColor: quadrant.borderColour }}>
        <div className="flex items-center justify-between mb-0.5">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-white">{quadrant.label}</span>
            {tasks.length > 0 && (
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white"
                style={{ backgroundColor: quadrant.badgeColour + '99' }}
              >
                {tasks.length}
              </span>
            )}
          </div>
          <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: quadrant.badgeColour }}>
            {quadrant.action}
          </span>
        </div>
        <p className="text-[10px] text-slate-500 leading-relaxed">{quadrant.description}</p>
      </div>

      {/* Task list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-[#0C1526]/40 min-h-[160px] max-h-[calc(50vh-100px)]">
        {tasks.length === 0 ? (
          <p className="text-[11px] text-slate-600 italic text-center pt-6">{quadrant.emptyText}</p>
        ) : (
          tasks.map(task => (
            <MatrixCard key={task.id} task={task} />
          ))
        )}
      </div>
    </div>
  );
}

/* ── Main export ───────────────────────────────────────── */
interface TaskMatrixProps {
  tasks: Task[];
}

export function TaskMatrix({ tasks }: TaskMatrixProps) {
  const activeTasks = useMemo(() => tasks.filter(t => t.status !== 'done'), [tasks]);

  const byQuadrant = useMemo(() => {
    const result: Record<string, Task[]> = { q1: [], q2: [], q3: [], q4: [] };
    for (const task of activeTasks) {
      const urgent = isUrgent(task);
      const important = isImportant(task);
      if (urgent && important)       result.q1.push(task);
      else if (!urgent && important) result.q2.push(task);
      else if (urgent && !important) result.q3.push(task);
      else                           result.q4.push(task);
    }
    // Within each quadrant, sort pinned first, then by priority
    const PRIORITY_RANK: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
    for (const q of Object.values(result)) {
      q.sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return (PRIORITY_RANK[b.priority] ?? 0) - (PRIORITY_RANK[a.priority] ?? 0);
      });
    }
    return result;
  }, [activeTasks]);

  const doneCount = tasks.length - activeTasks.length;

  return (
    <div className="space-y-3">
      {/* Legend */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-4 text-[10px] text-slate-500">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-400">Urgent</span>
            <span>= overdue or due within 3 days</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-400">Important</span>
            <span>= high or critical priority</span>
          </div>
        </div>
        {doneCount > 0 && (
          <span className="text-[10px] text-slate-600">{doneCount} completed task{doneCount !== 1 ? 's' : ''} hidden</span>
        )}
      </div>

      {/* 2×2 grid */}
      <div className="grid grid-cols-2 gap-3">
        {QUADRANTS.map(q => (
          <QuadrantCell
            key={q.id}
            quadrant={q}
            tasks={byQuadrant[q.id] ?? []}
          />
        ))}
      </div>
    </div>
  );
}
