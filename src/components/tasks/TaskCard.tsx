import { Calendar, MessageCircle, Paperclip, CheckSquare, ChevronRight, Pin, CheckCircle2, Circle, Repeat2, ShieldAlert, Zap, Edit2, Copy, Trash2, Timer, ClipboardCopy } from 'lucide-react';
import { useState, useRef, useCallback, useEffect } from 'react';
import type { Task } from '../../types';
import { useProjectStore } from '../../store/projectStore';
import { useTaskStore } from '../../store/taskStore';
import { useUIStore } from '../../store/uiStore';
import { useCurrentUser } from '../../hooks/useConvexUser';
import { PriorityBadge } from '../ui/PriorityBadge';
import { ContextMenu } from '../ui/ContextMenu';
import type { ContextMenuItem } from '../ui/ContextMenu';
import { formatRelativeDate, isOverdue, cn, generateId } from '../../lib/utils';
import { addDays, addMonths, format } from 'date-fns';
import { SEED_USERS } from '../../lib/sampleData';
import { STATUS_OPTIONS, PRIORITY_OPTIONS } from '../../lib/constants';
import { useTagStore } from '../../store/tagStore';
import { canMoveTask, canEditTask, canDeleteTask } from '../../lib/permissions';
import { useSprintStore } from '../../store/sprintStore';
import toast from 'react-hot-toast';
import { emitTaskMove, emitTaskDelete, emitTaskUpdate, emitTaskCreate } from '../../lib/collabEmit';


interface TaskCardProps {
  task: Task;
  dragging?: boolean;
}

export function TaskCard({ task, dragging }: TaskCardProps) {
  const { getProjectById } = useProjectStore();
  const { tasks, moveTask, togglePin, updateTask, deleteTask, duplicateTask, addTask } = useTaskStore();
  const { setSelectedTask, openTaskModal, activeTimer, startTimer, stopTimer } = useUIStore();
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number } | null>(null);
  const [showAssigneeMenu, setShowAssigneeMenu] = useState(false);
  const [showPriorityMenu, setShowPriorityMenu] = useState(false);
  const [showDueDateMenu, setShowDueDateMenu] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const statusMenuRef = useRef<HTMLDivElement>(null);
  const assigneeMenuRef = useRef<HTMLDivElement>(null);
  const priorityMenuRef = useRef<HTMLDivElement>(null);
  const dueDateMenuRef = useRef<HTMLDivElement>(null);
  const currentUser = useCurrentUser();
  const tags = useTagStore(s => s.tags);
  const project = getProjectById(task.projectId);
  const assignee = SEED_USERS.find(u => u.id === task.assigneeId);
  const completedSubs = task.subtasks.filter(s => s.completed).length;
  const overdue = isOverdue(task.dueDate) && task.status !== 'done';

  const role = currentUser?.role ?? 'viewer';
  const userId = currentUser?._id ?? '';
  const canAdvance = canMoveTask(role, task.assigneeId, userId);
  const canEdit = canEditTask(role, task.assigneeId, userId);
  const canDel = canDeleteTask(role);

  const copyAsMarkdown = useCallback(() => {
    const statusLabel = STATUS_OPTIONS.find(s => s.value === task.status)?.label ?? task.status;
    const priorityLabel = PRIORITY_OPTIONS.find(p => p.value === task.priority)?.label ?? task.priority;
    const projectName = project?.name ?? 'No project';
    const lines: string[] = [
      `## ${task.title}`,
      '',
      `**Status:** ${statusLabel}  `,
      `**Priority:** ${priorityLabel}  `,
      `**Project:** ${projectName}  `,
      task.dueDate ? `**Due:** ${task.dueDate}  ` : '',
      assignee ? `**Assignee:** ${assignee.name}  ` : '',
      '',
    ].filter(l => l !== undefined);
    if (task.description) lines.push(task.description, '');
    if (task.subtasks.length > 0) {
      lines.push('**Subtasks:**');
      task.subtasks.forEach(s => lines.push(`- [${s.completed ? 'x' : ' '}] ${s.title}`));
      lines.push('');
    }
    navigator.clipboard.writeText(lines.join('\n')).then(() => toast.success('Copied as Markdown'));
  }, [task, project, assignee]);

  const ctxItems: ContextMenuItem[] = [
    {
      id: 'open', label: 'Open', shortcut: 'Enter',
      icon: <CheckCircle2 className="w-3.5 h-3.5" />,
      onSelect: () => setSelectedTask(task.id),
    },
    ...(canEdit ? [{
      id: 'edit', label: 'Edit', shortcut: 'E',
      icon: <Edit2 className="w-3.5 h-3.5" />,
      onSelect: () => openTaskModal(task.id),
    }] : []),
    {
      id: 'pin', label: task.pinned ? 'Unpin' : 'Pin', shortcut: 'P',
      icon: <Pin className="w-3.5 h-3.5" />,
      separator: true,
      onSelect: () => togglePin(task.id),
    },
    {
      id: 'duplicate', label: 'Duplicate',
      icon: <Copy className="w-3.5 h-3.5" />,
      onSelect: () => { duplicateTask(task.id); toast.success('Task duplicated'); },
    },
    {
      id: 'copy-md', label: 'Copy as Markdown',
      icon: <ClipboardCopy className="w-3.5 h-3.5" />,
      onSelect: copyAsMarkdown,
    },
    {
      id: 'timer',
      label: activeTimer?.taskId === task.id ? 'Stop timer' : 'Start timer',
      shortcut: 'T',
      icon: <Timer className="w-3.5 h-3.5" />,
      onSelect: () => {
        if (activeTimer?.taskId === task.id) {
          const result = stopTimer();
          if (result) {
            const prev = useTaskStore.getState().tasks.find(t => t.id === result.taskId);
            if (prev) {
              useTaskStore.getState().updateTask(result.taskId, {
                loggedHours: Math.round(((prev.loggedHours ?? 0) + result.elapsedHours) * 100) / 100,
              });
              toast.success(`${Math.round(result.elapsedHours * 60)}m logged`);
            }
          }
        } else {
          if (activeTimer) { toast.error('Stop the current timer first'); return; }
          startTimer(task.id);
          toast.success('Timer started');
        }
      },
    },
    // Status sub-items
    ...STATUS_OPTIONS.filter(s => s.value !== task.status).map((s, i) => ({
      id: `status-${s.value}`,
      label: `Move to ${s.label}`,
      separator: i === 0,
      onSelect: () => {
        moveTask(task.id, s.value as any);
        emitTaskMove(task.id, s.value as any);
        toast.success(`Moved to ${s.label}`);
      },
    })),
    ...(canDel ? [{
      id: 'delete', label: 'Delete', danger: true,
      separator: true,
      icon: <Trash2 className="w-3.5 h-3.5" />,
      onSelect: () => {
        deleteTask(task.id);
        emitTaskDelete(task.id);
        toast.success('Task deleted');
      },
    }] : []),
  ];
  const sprint = useSprintStore(s => task.sprintId ? s.sprints.find(sp => sp.id === task.sprintId) : undefined);

  // Close status menu on outside click
  useEffect(() => {
    if (!showStatusMenu) return;
    const handler = (e: MouseEvent) => {
      if (statusMenuRef.current && !statusMenuRef.current.contains(e.target as Node)) {
        setShowStatusMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showStatusMenu]);

  // Close assignee menu on outside click
  useEffect(() => {
    if (!showAssigneeMenu) return;
    const handler = (e: MouseEvent) => {
      if (assigneeMenuRef.current && !assigneeMenuRef.current.contains(e.target as Node)) {
        setShowAssigneeMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showAssigneeMenu]);

  useEffect(() => {
    if (!showPriorityMenu) return;
    const handler = (e: MouseEvent) => {
      if (priorityMenuRef.current && !priorityMenuRef.current.contains(e.target as Node)) setShowPriorityMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showPriorityMenu]);

  useEffect(() => {
    if (!showDueDateMenu) return;
    const handler = (e: MouseEvent) => {
      if (dueDateMenuRef.current && !dueDateMenuRef.current.contains(e.target as Node)) setShowDueDateMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showDueDateMenu]);

  const startEditTitle = useCallback((e: React.MouseEvent) => {
    if (!canEdit) return;
    e.stopPropagation();
    setTitleDraft(task.title);
    setEditingTitle(true);
    setTimeout(() => { titleInputRef.current?.select(); }, 0);
  }, [canEdit, task.title]);

  const commitTitle = () => {
    const trimmed = titleDraft.trim();
    if (trimmed && trimmed !== task.title) { updateTask(task.id, { title: trimmed }); emitTaskUpdate(task.id, { title: trimmed }); }
    setEditingTitle(false);
  };

  const statusMeta = STATUS_OPTIONS.find(s => s.value === task.status);

  const priorityMeta = PRIORITY_OPTIONS.find(p => p.value === task.priority);
  const hasOpenBlockers = (task.blockedBy?.length ?? 0) > 0 &&
    task.blockedBy!.some(id => {
      const blocker = tasks.find(t => t.id === id);
      return blocker && blocker.status !== 'done';
    });

  return (
    <>
    <div
      onClick={() => { if (!editingTitle) setSelectedTask(task.id); }}
      onContextMenu={e => { e.preventDefault(); setCtxMenu({ x: e.clientX, y: e.clientY }); }}
      className={cn(
        'group bg-[#0C1526] border border-[#1C3054] rounded-xl overflow-hidden cursor-pointer',
        'hover:border-blue-500/40 hover:bg-[#122040] transition-all duration-150',
        dragging && 'shadow-card opacity-90 rotate-1 scale-105'
      )}
    >
      {/* Priority accent bar */}
      <div className="h-0.5 w-full" style={{ backgroundColor: priorityMeta?.colour ?? '#1C3054' }} />
      <div className="p-4">
      {/* Priority + Project + quick-advance + pin */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          {/* Priority badge — click to change */}
          <div ref={priorityMenuRef} className="relative">
            <button
              onClick={e => { if (!canEdit) return; e.stopPropagation(); setShowPriorityMenu(v => !v); }}
              className={canEdit ? 'cursor-pointer hover:opacity-80 transition-opacity' : 'cursor-default'}
              title={canEdit ? 'Change priority' : undefined}
            >
              <PriorityBadge priority={task.priority} />
            </button>
            {showPriorityMenu && canEdit && (
              <div className="absolute left-0 top-full mt-1 w-36 bg-[#0C1526] border border-[#1C3054] rounded-xl shadow-xl overflow-hidden z-50">
                <div className="px-3 py-2 border-b border-[#1C3054]">
                  <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Priority</p>
                </div>
                {PRIORITY_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={e => { e.stopPropagation(); updateTask(task.id, { priority: opt.value as Task['priority'] }); emitTaskUpdate(task.id, { priority: opt.value as Task['priority'] }); setShowPriorityMenu(false); }}
                    className={cn(
                      'w-full flex items-center gap-2.5 px-3 py-2 hover:bg-[#122040] transition-colors text-left',
                      task.priority === opt.value && 'bg-blue-500/10'
                    )}
                  >
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: opt.colour }} />
                    <span className="text-xs text-slate-300">{opt.label}</span>
                    {task.priority === opt.value && <span className="text-blue-400 text-[10px] ml-auto">✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
          {task.pinned && <Pin className="w-3 h-3 text-amber-400 fill-amber-400" />}
        </div>
        <div className="flex items-center gap-1.5">
          {project && (
            <span className="flex items-center gap-1 text-xs text-slate-500">
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: project.colour }} />
              {project.name}
            </span>
          )}
          {/* Pin button */}
          <button
            onClick={e => { e.stopPropagation(); togglePin(task.id); }}
            title={task.pinned ? 'Unpin task' : 'Pin task'}
            className={cn(
              'p-0.5 rounded transition-all',
              task.pinned
                ? 'text-amber-400 opacity-100'
                : 'text-slate-600 opacity-0 group-hover:opacity-100 hover:text-amber-400'
            )}
          >
            <Pin className={cn('w-3 h-3', task.pinned && 'fill-amber-400')} />
          </button>
          {/* Status chip — click to open jump menu, shows on hover */}
          {canAdvance && (
            <div ref={statusMenuRef} className="relative opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={e => { e.stopPropagation(); setShowStatusMenu(v => !v); }}
                title="Change status"
                className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-lg text-[10px] font-medium border transition-all hover:border-blue-500/50"
                style={{
                  backgroundColor: `${statusMeta?.colour ?? '#4B8CF7'}18`,
                  borderColor: `${statusMeta?.colour ?? '#4B8CF7'}33`,
                  color: statusMeta?.colour ?? '#94A3B8',
                }}
              >
                <span>{statusMeta?.label ?? task.status}</span>
                <ChevronRight className="w-2.5 h-2.5" />
              </button>
              {showStatusMenu && (
                <div className="absolute right-0 top-full mt-1 w-40 bg-[#0C1526] border border-[#1C3054] rounded-xl shadow-xl overflow-hidden z-50">
                  {STATUS_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={e => {
                        e.stopPropagation();
                        moveTask(task.id, opt.value as any);
                        emitTaskMove(task.id, opt.value as any);
                        setShowStatusMenu(false);
                        if (opt.value === 'done' && task.recurrence && task.recurrence !== 'none') {
                          const nextDue = (() => {
                            if (!task.dueDate) return undefined;
                            const base = new Date(task.dueDate);
                            if (task.recurrence === 'daily')   return format(addDays(base, 1),   'yyyy-MM-dd');
                            if (task.recurrence === 'weekly')  return format(addDays(base, 7),   'yyyy-MM-dd');
                            if (task.recurrence === 'monthly') return format(addMonths(base, 1), 'yyyy-MM-dd');
                            return undefined;
                          })();
                          addTask({
                            title: task.title,
                            description: task.description,
                            status: 'todo',
                            priority: task.priority,
                            projectId: task.projectId,
                            assigneeId: task.assigneeId,
                            dueDate: nextDue,
                            tags: task.tags,
                            subtasks: task.subtasks.map(s => ({ id: generateId(), title: s.title, completed: false })),
                            comments: [],
                            attachments: [],
                            attachmentCount: 0,
                            estimatedHours: task.estimatedHours,
                            recurrence: task.recurrence,
                          });
                          const recurring = useTaskStore.getState().tasks.at(-1);
                          if (recurring) emitTaskCreate(recurring);
                          const dueSuffix = nextDue ? ` — due ${format(new Date(nextDue), 'd MMM')}` : '';
                          toast.success(`Next occurrence created${dueSuffix}`, { duration: 4000, icon: '🔁' });
                        }
                      }}
                      className={cn(
                        'w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors text-left',
                        opt.value === task.status
                          ? 'bg-[#122040] font-semibold'
                          : 'hover:bg-[#122040] text-slate-400 hover:text-slate-200'
                      )}
                    >
                      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: opt.colour }} />
                      {opt.label}
                      {opt.value === task.status && <span className="ml-auto text-slate-500">✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Title with inline done toggle */}
      <div className="flex items-start gap-2 mb-2">
        {canAdvance && (
          <button
            onClick={e => { e.stopPropagation(); const next = task.status === 'done' ? 'todo' : 'done'; moveTask(task.id, next); emitTaskMove(task.id, next as any); }}
            className={cn('flex-shrink-0 mt-0.5 transition-colors', task.status === 'done' ? 'text-green-400' : 'text-slate-600 hover:text-green-400 opacity-0 group-hover:opacity-100')}
            title={task.status === 'done' ? 'Mark as to-do' : 'Mark as done'}
          >
            {task.status === 'done'
              ? <CheckCircle2 className="w-4 h-4" />
              : <Circle className="w-4 h-4" />
            }
          </button>
        )}
        {editingTitle ? (
          <div className="flex items-center gap-1 flex-1" onClick={e => e.stopPropagation()}>
            <input
              ref={titleInputRef}
              value={titleDraft}
              onChange={e => setTitleDraft(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') { e.preventDefault(); commitTitle(); }
                if (e.key === 'Escape') setEditingTitle(false);
              }}
              onBlur={commitTitle}
              maxLength={256}
              className="flex-1 bg-[#06091A] border border-blue-500 rounded-lg px-2 py-0.5 text-sm text-slate-100 outline-none"
            />
          </div>
        ) : (
          <p
            className={cn('text-sm font-medium text-slate-100 line-clamp-2 flex-1', task.status === 'done' && 'line-through text-slate-400')}
            onDoubleClick={startEditTitle}
            title={canEdit ? 'Double-click to edit' : undefined}
          >
            {task.title}
          </p>
        )}
      </div>

      {/* Tags */}
      {task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {task.tags.slice(0, 3).map(tagId => {
            const tag = tags.find(t => t.id === tagId);
            if (!tag) return null;
            return (
              <span key={tagId} className="text-[10px] font-medium px-1.5 py-0.5 rounded-full" style={{ backgroundColor: `${tag.colour}22`, color: tag.colour }}>
                {tag.name}
              </span>
            );
          })}
        </div>
      )}

      {/* Blocked-by indicator */}
      {hasOpenBlockers && (
        <div className="flex items-center gap-1 mb-2 px-1.5 py-1 rounded-lg bg-red-500/10 border border-red-500/20">
          <ShieldAlert className="w-3 h-3 text-red-400 flex-shrink-0" />
          <span className="text-[10px] text-red-400 font-medium">
            Blocked by {task.blockedBy!.filter(id => { const b = tasks.find(t => t.id === id); return b && b.status !== 'done'; }).length} unresolved task{task.blockedBy!.filter(id => { const b = tasks.find(t => t.id === id); return b && b.status !== 'done'; }).length !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* Time tracking bar */}
      {(task.estimatedHours ?? 0) > 0 && (
        <div className="mb-2">
          <div className="flex justify-between text-[10px] text-slate-500 mb-1">
            <span>{task.loggedHours ?? 0}h logged</span>
            <span>{task.estimatedHours}h est.</span>
          </div>
          <div className="h-1 bg-[#122040] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.min(100, ((task.loggedHours ?? 0) / task.estimatedHours!) * 100)}%`,
                backgroundColor: (task.loggedHours ?? 0) > task.estimatedHours! ? '#EF4444' : '#4B8CF7',
              }}
            />
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-3">
          {/* Due date chip — click to reschedule */}
          <div ref={dueDateMenuRef} className="relative">
            <button
              onClick={e => { if (!canEdit) return; e.stopPropagation(); setShowDueDateMenu(v => !v); }}
              className={cn(
                'flex items-center gap-1 transition-opacity',
                task.dueDate
                  ? overdue ? 'text-red-400' : 'text-slate-500'
                  : 'text-slate-600 opacity-0 group-hover:opacity-100',
                canEdit && 'hover:opacity-80 cursor-pointer'
              )}
              title={canEdit ? (task.dueDate ? 'Change due date' : 'Set due date') : undefined}
            >
              <Calendar className="w-3 h-3" />
              {task.dueDate ? formatRelativeDate(task.dueDate) : <span className="text-[10px]">No date</span>}
            </button>
            {showDueDateMenu && canEdit && (
              <div
                className="absolute left-0 bottom-full mb-1 w-52 bg-[#0C1526] border border-[#1C3054] rounded-xl shadow-xl overflow-hidden z-50"
                onClick={e => e.stopPropagation()}
              >
                <div className="px-3 py-2 border-b border-[#1C3054]">
                  <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Due Date</p>
                </div>
                <div className="p-3 space-y-2">
                  <input
                    type="date"
                    defaultValue={task.dueDate ?? ''}
                    onChange={e => { const dueDate = e.target.value || undefined; updateTask(task.id, { dueDate }); emitTaskUpdate(task.id, { dueDate }); setShowDueDateMenu(false); }}
                    className="w-full bg-[#06091A] border border-[#1C3054] rounded-lg px-2 py-1.5 text-xs text-slate-300 outline-none focus:border-blue-500"
                  />
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { label: 'Today',      days: 0 },
                      { label: 'Tomorrow',   days: 1 },
                      { label: 'Next week',  days: 7 },
                      { label: 'In 2 weeks', days: 14 },
                    ].map(({ label, days }) => {
                      const d = new Date(); d.setDate(d.getDate() + days);
                      const iso = d.toISOString().split('T')[0];
                      return (
                        <button
                          key={label}
                          onClick={() => { updateTask(task.id, { dueDate: iso }); emitTaskUpdate(task.id, { dueDate: iso }); setShowDueDateMenu(false); }}
                          className="px-2 py-1 rounded-lg bg-[#122040] hover:bg-[#152645] text-xs text-slate-400 hover:text-slate-200 transition-colors text-left"
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                  {task.dueDate && (
                    <button
                      onClick={() => { updateTask(task.id, { dueDate: undefined }); emitTaskUpdate(task.id, { dueDate: undefined }); setShowDueDateMenu(false); }}
                      className="w-full px-2 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/15 text-xs text-red-400 transition-colors"
                    >
                      Clear date
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
          {task.comments.length > 0 && (
            <span className="flex items-center gap-1">
              <MessageCircle className="w-3 h-3" />
              {task.comments.length}
            </span>
          )}
          {task.subtasks.length > 0 && (
            <span className="flex items-center gap-1">
              <CheckSquare className="w-3 h-3" />
              {completedSubs}/{task.subtasks.length}
            </span>
          )}
          {task.attachmentCount > 0 && (
            <span className="flex items-center gap-1">
              <Paperclip className="w-3 h-3" />
              {task.attachmentCount}
            </span>
          )}
          {task.recurrence && task.recurrence !== 'none' && (
            <span className="flex items-center gap-1 text-blue-400/70" title={`Repeats ${task.recurrence}`}>
              <Repeat2 className="w-3 h-3" />
            </span>
          )}
          {sprint && (
            <span className="flex items-center gap-1 text-green-400/70" title={sprint.name}>
              <Zap className="w-3 h-3" />
            </span>
          )}
        </div>
        {/* Assignee avatar — click to reassign (canEdit only) */}
        <div ref={assigneeMenuRef} className="relative flex-shrink-0">
          <button
            onClick={e => {
              if (!canEdit) return;
              e.stopPropagation();
              setShowAssigneeMenu(v => !v);
            }}
            title={assignee ? `Assigned to ${assignee.name}${canEdit ? ' — click to reassign' : ''}` : canEdit ? 'Assign' : 'Unassigned'}
            className={cn(
              'flex items-center justify-center rounded-full text-[10px] font-bold text-white transition-all',
              assignee ? 'w-6 h-6' : 'w-6 h-6 border border-dashed border-slate-600',
              canEdit && 'hover:ring-2 hover:ring-blue-500/50 cursor-pointer',
              !canEdit && 'cursor-default'
            )}
            style={assignee ? { backgroundColor: assignee.colour } : {}}
          >
            {assignee
              ? assignee.name.split(' ').map(n => n[0]).join('')
              : <span className="text-slate-600 text-[8px]">?</span>
            }
          </button>
          {showAssigneeMenu && canEdit && (
            <div className="absolute bottom-full right-0 mb-1 w-40 bg-[#0C1526] border border-[#1C3054] rounded-xl shadow-xl overflow-hidden z-50">
              <div className="px-3 py-2 border-b border-[#1C3054]">
                <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Assign to</p>
              </div>
              {task.assigneeId && (
                <button
                  onClick={e => {
                    e.stopPropagation();
                    updateTask(task.id, { assigneeId: undefined });
                    emitTaskUpdate(task.id, { assigneeId: undefined });
                    setShowAssigneeMenu(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-[#122040] transition-colors text-left"
                >
                  <div className="w-5 h-5 rounded-full border border-dashed border-slate-600 flex items-center justify-center flex-shrink-0" />
                  <span className="text-xs text-slate-400">Unassign</span>
                </button>
              )}
              {SEED_USERS.map(u => (
                <button
                  key={u.id}
                  onClick={e => {
                    e.stopPropagation();
                    updateTask(task.id, { assigneeId: u.id });
                    emitTaskUpdate(task.id, { assigneeId: u.id });
                    setShowAssigneeMenu(false);
                  }}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-3 py-2 hover:bg-[#122040] transition-colors text-left',
                    task.assigneeId === u.id && 'bg-blue-500/10'
                  )}
                >
                  <div className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white flex-shrink-0" style={{ backgroundColor: u.colour }}>
                    {u.name[0]}
                  </div>
                  <span className="text-xs text-slate-300 truncate flex-1">{u.name.split(' ')[0]}</span>
                  {task.assigneeId === u.id && <span className="text-blue-400 text-[10px]">✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>{/* end p-4 */}
    </div>
    {ctxMenu && (
      <ContextMenu
        x={ctxMenu.x}
        y={ctxMenu.y}
        items={ctxItems}
        onClose={() => setCtxMenu(null)}
      />
    )}
    </>
  );
}
