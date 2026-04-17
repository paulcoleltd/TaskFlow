import { useRef, useState } from 'react';
import { CheckSquare2, Calendar, ArrowRight, ChevronDown, ChevronRight, Pin, CheckCheck, Plus, Square, CheckSquare, Trash2, User, Flag, Edit2, Copy, ExternalLink, GripVertical } from 'lucide-react';
import type { Task } from '../../types';
import { StatusBadge } from '../ui/StatusBadge';
import { PriorityBadge } from '../ui/PriorityBadge';
import { useTaskStore } from '../../store/taskStore';
import { useUIStore } from '../../store/uiStore';
import { useCurrentUser } from '../../hooks/useConvexUser';
import { useProjectStore } from '../../store/projectStore';
import { canEditTask, canCreateTask, canDeleteTask, canMoveTask } from '../../lib/permissions';
import { formatDate, isOverdue, cn } from '../../lib/utils';
import { useUserStore } from '../../store/userStore';
import { STATUS_OPTIONS, PRIORITY_OPTIONS } from '../../lib/constants';
import { ContextMenu } from '../ui/ContextMenu';
import type { ContextMenuItem } from '../ui/ContextMenu';
import toast from 'react-hot-toast';
import { emitTaskDelete, emitTaskMove, emitTaskCreate } from '../../lib/collabEmit';

export type GroupBy = 'status' | 'priority' | 'project' | 'none';

interface TaskListProps {
  tasks: Task[];
  groupBy?: GroupBy;
  projectId?: string;  // when provided, shows inline task creation per status group
}

function buildGroups(tasks: Task[], groupBy: GroupBy, projectName: (id: string) => string) {
  if (groupBy === 'none') return [{ key: 'all', label: null, colour: null, tasks }];

  if (groupBy === 'status') {
    return STATUS_OPTIONS
      .map(s => ({ key: s.value, label: s.label, colour: s.colour, tasks: tasks.filter(t => t.status === s.value) }))
      .filter(g => g.tasks.length > 0);
  }

  if (groupBy === 'priority') {
    return PRIORITY_OPTIONS
      .map(p => ({ key: p.value, label: p.label, colour: p.colour, tasks: tasks.filter(t => t.priority === p.value) }))
      .filter(g => g.tasks.length > 0);
  }

  // project
  const projectIds = [...new Set(tasks.map(t => t.projectId))];
  return projectIds.map(pid => ({
    key: pid,
    label: projectName(pid),
    colour: null,
    tasks: tasks.filter(t => t.projectId === pid),
  }));
}

export function TaskList({ tasks, groupBy = 'status', projectId }: TaskListProps) {
  const allUsers = useUserStore(s => s.users);
  const { updateTask, deleteTask, togglePin, addTask, moveTask, duplicateTask, reorderTask } = useTaskStore();
  const { setSelectedTask, openTaskModal } = useUIStore();
  const currentUser = useCurrentUser();
  const { getProjectById } = useProjectStore();
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [showCompleted, setShowCompleted] = useState(false);
  const [inlineGroup, setInlineGroup] = useState<string | null>(null);
  const [inlineTitle, setInlineTitle] = useState('');
  const inlineRef = useRef<HTMLInputElement>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTaskTitle, setEditingTaskTitle] = useState('');
  const editingTaskRef = useRef<HTMLInputElement>(null);
  const [ctxMenu, setCtxMenu] = useState<{ task: Task; x: number; y: number } | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ taskId: string; half: 'top' | 'bottom' } | null>(null);

  // Bulk selection state
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const role = currentUser?.role ?? 'viewer';
  const userId = currentUser?._id ?? '';
  const canCreate = canCreateTask(role);
  const canDelete = canDeleteTask(role);

  const projectName = (id: string) => getProjectById(id)?.name ?? 'Unknown Project';
  const groups = buildGroups(tasks, groupBy, projectName);

  const toggleGroup = (key: string) =>
    setCollapsed(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const handleInlineCreate = (status: string) => {
    const title = inlineTitle.trim();
    if (!title || !projectId) return;
    addTask({
      title,
      status: status as Task['status'],
      priority: 'medium',
      projectId,
      assigneeId: userId || undefined,
      tags: [],
      subtasks: [],
      comments: [],
      attachments: [],
      attachmentCount: 0,
    });
    const created = useTaskStore.getState().tasks.at(-1);
    if (created) emitTaskCreate(created);
    setInlineTitle('');
    setInlineGroup(null);
  };

  // ── Bulk helpers ──────────────────────────────────────────────────────────
  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectGroup = (groupTasks: Task[]) => {
    const ids = groupTasks.map(t => t.id);
    const allSelected = ids.every(id => selected.has(id));
    setSelected(prev => {
      const next = new Set(prev);
      if (allSelected) ids.forEach(id => next.delete(id));
      else ids.forEach(id => next.add(id));
      return next;
    });
  };

  const clearSelection = () => setSelected(new Set());

  const selectedTasks = tasks.filter(t => selected.has(t.id));

  const bulkMarkDone = () => {
    selectedTasks.forEach(t => {
      if (canEditTask(role, t.assigneeId, userId)) updateTask(t.id, { status: 'done' });
    });
    toast.success(`${selectedTasks.length} task${selectedTasks.length !== 1 ? 's' : ''} marked done`);
    clearSelection();
  };

  const bulkSetPriority = (priority: Task['priority']) => {
    selectedTasks.forEach(t => {
      if (canEditTask(role, t.assigneeId, userId)) updateTask(t.id, { priority });
    });
    const label = PRIORITY_OPTIONS.find(p => p.value === priority)?.label ?? priority;
    toast.success(`Priority set to ${label} for ${selectedTasks.length} task${selectedTasks.length !== 1 ? 's' : ''}`);
    clearSelection();
  };

  const bulkAssign = (assigneeId: string | undefined) => {
    selectedTasks.forEach(t => {
      if (canEditTask(role, t.assigneeId, userId)) updateTask(t.id, { assigneeId });
    });
    const name = assigneeId ? (allUsers.find(u => u.id === assigneeId)?.name ?? 'someone') : 'unassigned';
    toast.success(`${selectedTasks.length} task${selectedTasks.length !== 1 ? 's' : ''} assigned to ${name}`);
    clearSelection();
  };

  const bulkDelete = () => {
    if (!canDelete) return;
    if (!window.confirm(`Delete ${selectedTasks.length} task${selectedTasks.length !== 1 ? 's' : ''}? You can undo within 5 seconds.`)) return;
    const snapshots = selectedTasks.map(t => ({ ...t }));
    selectedTasks.forEach(t => { deleteTask(t.id); emitTaskDelete(t.id); });
    clearSelection();
    const count = snapshots.length;
    toast(
      (t) => (
        <div className="flex items-center gap-3">
          <span className="text-sm">{count} task{count !== 1 ? 's' : ''} deleted</span>
          <button
            onClick={() => {
              const { restoreTask } = useTaskStore.getState();
              snapshots.forEach(s => restoreTask(s));
              toast.dismiss(t.id);
              toast.success(`${count} task${count !== 1 ? 's' : ''} restored`);
            }}
            className="text-blue-400 font-semibold hover:text-blue-300 transition-colors text-sm flex-shrink-0"
          >
            Undo
          </button>
        </div>
      ),
      { duration: 5000, icon: '🗑️' }
    );
  };

  const hasSelection = selected.size > 0;

  return (
    <div className="space-y-5 pb-20">
      {groups.map(group => {
        const isCollapsed = collapsed.has(group.key);
        const groupSelected = group.tasks.filter(t => selected.has(t.id)).length;
        const allGroupSelected = group.tasks.length > 0 && groupSelected === group.tasks.length;
        return (
          <div key={group.key}>
            {/* Group header — clickable to collapse */}
            {group.label !== null && (
              <div className="flex items-center gap-2 mb-2">
                {/* Group-level select checkbox */}
                <button
                  onClick={() => selectGroup(group.tasks)}
                  className="flex-shrink-0 p-0.5 text-slate-600 hover:text-blue-400 transition-colors"
                  title={allGroupSelected ? 'Deselect group' : 'Select group'}
                >
                  {allGroupSelected
                    ? <CheckSquare className="w-3.5 h-3.5 text-blue-400" />
                    : groupSelected > 0
                      ? <CheckSquare className="w-3.5 h-3.5 text-blue-400/50" />
                      : <Square className="w-3.5 h-3.5" />
                  }
                </button>
                <button
                  onClick={() => toggleGroup(group.key)}
                  className="flex items-center gap-2 flex-1 text-left group/header"
                >
                  {isCollapsed
                    ? <ChevronRight className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                    : <ChevronDown className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                  }
                  {group.colour && <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: group.colour }} />}
                  <span className="text-sm font-semibold text-slate-300 group-hover/header:text-slate-100 transition-colors">{group.label}</span>
                  <span className="text-xs text-slate-500 bg-[#122040] px-1.5 py-0.5 rounded-full">{group.tasks.length}</span>
                </button>
                {/* Mark all done — only when canEdit and some tasks are not done */}
                {group.tasks.some(t => t.status !== 'done' && canEditTask(role, t.assigneeId, userId)) && (
                  <button
                    onClick={() => {
                      group.tasks.forEach(t => {
                        if (t.status !== 'done' && canEditTask(role, t.assigneeId, userId)) {
                          updateTask(t.id, { status: 'done' });
                        }
                      });
                    }}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] text-slate-500 hover:text-green-400 hover:bg-green-500/10 border border-transparent hover:border-green-500/20 transition-all"
                    title="Mark all done"
                  >
                    <CheckCheck className="w-3 h-3" />
                    All done
                  </button>
                )}
              </div>
            )}

            {/* Rows */}
            {!isCollapsed && (
              <div className="space-y-1.5">
                {group.tasks.map(task => {
                  const assignee = allUsers.find(u => u.id === task.assigneeId);
                  const overdue = isOverdue(task.dueDate) && task.status !== 'done';
                  const canEdit = canEditTask(role, task.assigneeId, userId);
                  const canMove = canMoveTask(role, task.assigneeId, userId);
                  const isSelected = selected.has(task.id);
                  const isDragging = draggingId === task.id;
                  const isDropTop = dropTarget?.taskId === task.id && dropTarget.half === 'top';
                  const isDropBot = dropTarget?.taskId === task.id && dropTarget.half === 'bottom';
                  return (
                    <div
                      key={task.id}
                      draggable={canMove}
                      onDragStart={e => {
                        if (!canMove) { e.preventDefault(); return; }
                        e.dataTransfer.setData('taskId', task.id);
                        e.dataTransfer.effectAllowed = 'move';
                        setDraggingId(task.id);
                      }}
                      onDragEnd={() => { setDraggingId(null); setDropTarget(null); }}
                      onDragOver={e => {
                        e.preventDefault();
                        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                        const half = e.clientY < rect.top + rect.height / 2 ? 'top' : 'bottom';
                        setDropTarget({ taskId: task.id, half });
                      }}
                      onDragLeave={() => setDropTarget(null)}
                      onDrop={e => {
                        e.preventDefault();
                        const dragId = e.dataTransfer.getData('taskId');
                        if (!dragId || dragId === task.id) { setDraggingId(null); setDropTarget(null); return; }
                        const dragTask = tasks.find(t => t.id === dragId);
                        if (!dragTask) { setDraggingId(null); setDropTarget(null); return; }
                        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                        const position = e.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
                        reorderTask(dragId, task.id, position, task.status);
                        setDraggingId(null);
                        setDropTarget(null);
                      }}
                      onClick={() => !hasSelection ? setSelectedTask(task.id) : undefined}
                      onContextMenu={e => { e.preventDefault(); setCtxMenu({ task, x: e.clientX, y: e.clientY }); }}
                      className={cn(
                        'relative flex items-center gap-4 px-4 py-3 bg-[#0C1526] border rounded-xl transition-all group',
                        isDragging && 'opacity-40 scale-[0.99]',
                        isDropTop && 'border-t-2 border-t-blue-500',
                        isDropBot && 'border-b-2 border-b-blue-500',
                        isSelected
                          ? 'border-blue-500/50 bg-blue-500/5'
                          : 'border-[#1C3054] hover:border-blue-500/40 hover:bg-[#122040] cursor-pointer'
                      )}
                    >
                      {/* Drag handle */}
                      {canMove && (
                        <div
                          className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing text-slate-600 hover:text-slate-400 -ml-2"
                          onMouseDown={e => e.stopPropagation()}
                        >
                          <GripVertical className="w-3.5 h-3.5" />
                        </div>
                      )}
                      {/* Checkbox (always visible when any selection active, otherwise hover) */}
                      <button
                        onClick={e => toggleSelect(task.id, e)}
                        className={cn(
                          'flex-shrink-0 transition-all',
                          hasSelection || isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                        )}
                        title={isSelected ? 'Deselect' : 'Select'}
                      >
                        {isSelected
                          ? <CheckSquare className="w-4 h-4 text-blue-400" />
                          : <Square className="w-4 h-4 text-slate-600 hover:text-blue-400" />
                        }
                      </button>

                      <button
                        onClick={e => {
                          e.stopPropagation();
                          if (canEdit) updateTask(task.id, { status: task.status === 'done' ? 'todo' : 'done' });
                        }}
                        disabled={!canEdit}
                        className={cn('flex-shrink-0', !canEdit && 'opacity-40 cursor-not-allowed')}
                      >
                        <CheckSquare2 className={cn('w-4 h-4 transition-colors', task.status === 'done' ? 'text-green-400' : 'text-slate-600 hover:text-blue-400')} />
                      </button>
                      <div className="flex items-center gap-1.5 flex-1 min-w-0">
                        {task.pinned && <Pin className="w-3 h-3 text-amber-400 fill-amber-400 flex-shrink-0" />}
                        {editingTaskId === task.id ? (
                          <input
                            ref={editingTaskRef}
                            value={editingTaskTitle}
                            onChange={e => setEditingTaskTitle(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                const t = editingTaskTitle.trim();
                                if (t && t !== task.title) updateTask(task.id, { title: t });
                                setEditingTaskId(null);
                              }
                              if (e.key === 'Escape') setEditingTaskId(null);
                            }}
                            onBlur={() => {
                              const t = editingTaskTitle.trim();
                              if (t && t !== task.title) updateTask(task.id, { title: t });
                              setEditingTaskId(null);
                            }}
                            maxLength={256}
                            className="flex-1 bg-[#06091A] border border-blue-500 rounded-lg px-2 py-0.5 text-sm text-slate-100 outline-none min-w-0"
                            onClick={e => e.stopPropagation()}
                          />
                        ) : (
                          <span
                            className={cn('text-sm text-slate-200 truncate cursor-pointer flex-1', task.status === 'done' && 'line-through text-slate-500')}
                            onClick={() => setSelectedTask(task.id)}
                            onDoubleClick={e => {
                              if (!canEdit) return;
                              e.stopPropagation();
                              setEditingTaskId(task.id);
                              setEditingTaskTitle(task.title);
                              setTimeout(() => editingTaskRef.current?.select(), 0);
                            }}
                            title={canEdit ? 'Double-click to rename' : undefined}
                          >
                            {task.title}
                          </span>
                        )}
                      </div>
                      <div className="hidden sm:flex items-center gap-3">
                        <PriorityBadge priority={task.priority} />
                        {task.dueDate && (
                          <span className={cn('flex items-center gap-1 text-xs', overdue ? 'text-red-400' : 'text-slate-500')}>
                            <Calendar className="w-3 h-3" />
                            {formatDate(task.dueDate)}
                          </span>
                        )}
                        {assignee && (
                          <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ backgroundColor: assignee.colour }}>
                            {assignee.name.split(' ').map((n: string) => n[0]).join('')}
                          </div>
                        )}
                        <StatusBadge status={task.status} />
                        <button
                          onClick={e => { e.stopPropagation(); togglePin(task.id); }}
                          className={cn('p-1 rounded transition-all opacity-0 group-hover:opacity-100', task.pinned ? 'text-amber-400 opacity-100' : 'text-slate-600 hover:text-amber-400')}
                          title={task.pinned ? 'Unpin' : 'Pin task'}
                        >
                          <Pin className={cn('w-3.5 h-3.5', task.pinned && 'fill-amber-400')} />
                        </button>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors flex-shrink-0" />
                    </div>
                  );
                })}

                {/* Inline task creation — available when a projectId is provided */}
                {projectId && canCreate && groupBy === 'status' && group.key !== 'done' && (
                  inlineGroup === group.key ? (
                    <div className="flex items-center gap-3 px-4 py-2.5 bg-[#0C1526] border border-blue-500/50 rounded-xl">
                      <Plus className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                      <input
                        ref={inlineRef}
                        autoFocus
                        value={inlineTitle}
                        onChange={e => setInlineTitle(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleInlineCreate(group.key);
                          if (e.key === 'Escape') { setInlineGroup(null); setInlineTitle(''); }
                        }}
                        placeholder="Task title… Enter to save · Esc to cancel"
                        maxLength={256}
                        className="flex-1 bg-transparent text-sm text-slate-200 placeholder-slate-600 outline-none"
                      />
                      <button
                        onClick={() => handleInlineCreate(group.key)}
                        disabled={!inlineTitle.trim()}
                        className="px-2 py-0.5 rounded-lg bg-blue-500 text-white text-xs font-medium hover:bg-blue-600 disabled:opacity-30 transition-colors flex-shrink-0"
                      >
                        Add
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setInlineGroup(group.key); setInlineTitle(''); setTimeout(() => inlineRef.current?.focus(), 30); }}
                      className="flex items-center gap-2 w-full px-4 py-2 rounded-xl text-xs text-slate-600 hover:text-blue-400 hover:bg-[#0C1526] transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add task
                    </button>
                  )
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Completed tasks section — only shown when groupBy ≠ status to avoid duplication */}
      {groupBy !== 'status' && (() => {
        const doneTasks = tasks.filter(t => t.status === 'done');
        if (doneTasks.length === 0) return null;
        return (
          <div>
            <button
              onClick={() => setShowCompleted(v => !v)}
              className="flex items-center gap-2 mb-2 w-full text-left group/header"
            >
              {showCompleted
                ? <ChevronDown className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                : <ChevronRight className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
              }
              <div className="w-2 h-2 rounded-full flex-shrink-0 bg-green-500" />
              <span className="text-sm font-semibold text-slate-500 group-hover/header:text-slate-300 transition-colors">Completed</span>
              <span className="text-xs text-slate-600 bg-[#122040] px-1.5 py-0.5 rounded-full">{doneTasks.length}</span>
            </button>
            {showCompleted && (
              <div className="space-y-1.5 opacity-60">
                {doneTasks.map(task => {
                  const assignee = allUsers.find(u => u.id === task.assigneeId);
                  const canEdit = canEditTask(role, task.assigneeId, userId);
                  return (
                    <div
                      key={task.id}
                      onClick={() => setSelectedTask(task.id)}
                      className="flex items-center gap-4 px-4 py-3 bg-[#0C1526] border border-[#1C3054] rounded-xl hover:border-green-500/20 cursor-pointer transition-all group"
                    >
                      <button
                        onClick={e => { e.stopPropagation(); if (canEdit) updateTask(task.id, { status: 'todo' }); }}
                        disabled={!canEdit}
                        className={cn('flex-shrink-0', !canEdit && 'opacity-40 cursor-not-allowed')}
                      >
                        <CheckSquare2 className="w-4 h-4 text-green-400" />
                      </button>
                      <span className="flex-1 text-sm text-slate-500 line-through truncate">{task.title}</span>
                      <div className="hidden sm:flex items-center gap-2">
                        {assignee && (
                          <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ backgroundColor: assignee.colour }}>
                            {assignee.name.split(' ').map((n: string) => n[0]).join('')}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {/* ── Row context menu ──────────────────────────────────────────────── */}
      {ctxMenu && (() => {
        const t = ctxMenu.task;
        const canEdit = canEditTask(role, t.assigneeId, userId);
        const items: ContextMenuItem[] = [
          {
            id: 'open', label: 'Open',
            icon: <ExternalLink className="w-3.5 h-3.5" />,
            onSelect: () => setSelectedTask(t.id),
          },
          ...(canEdit ? [{
            id: 'edit', label: 'Edit',
            icon: <Edit2 className="w-3.5 h-3.5" />,
            onSelect: () => openTaskModal(t.id),
          }] : []),
          {
            id: 'pin', label: t.pinned ? 'Unpin' : 'Pin',
            icon: <Pin className="w-3.5 h-3.5" />,
            separator: true,
            onSelect: () => togglePin(t.id),
          },
          {
            id: 'duplicate', label: 'Duplicate',
            icon: <Copy className="w-3.5 h-3.5" />,
            onSelect: () => { duplicateTask(t.id); toast.success('Task duplicated'); },
          },
          ...STATUS_OPTIONS.filter(s => s.value !== t.status).map((s, i) => ({
            id: `status-${s.value}`,
            label: `Move to ${s.label}`,
            separator: i === 0,
            onSelect: () => { moveTask(t.id, s.value as Task['status']); emitTaskMove(t.id, s.value as Task['status']); toast.success(`Moved to ${s.label}`); },
          })),
          ...(canDelete ? [{
            id: 'delete', label: 'Delete',
            icon: <Trash2 className="w-3.5 h-3.5" />,
            danger: true,
            separator: true,
            onSelect: () => { deleteTask(t.id); emitTaskDelete(t.id); toast.success('Task deleted'); },
          }] : []),
        ];
        return (
          <ContextMenu
            x={ctxMenu.x}
            y={ctxMenu.y}
            items={items}
            onClose={() => setCtxMenu(null)}
          />
        );
      })()}

      {/* ── Bulk action toolbar — floats at bottom when items selected ─────── */}
      {hasSelection && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-[#0C1526] border border-[#1C3054] rounded-2xl px-4 py-3 shadow-2xl shadow-black/50">
          <span className="text-xs font-semibold text-slate-300 mr-1">
            {selected.size} selected
          </span>
          <div className="w-px h-4 bg-[#1C3054]" />

          {/* Mark done */}
          <button
            onClick={bulkMarkDone}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-green-500/15 border border-green-500/25 text-green-400 hover:bg-green-500/25 text-xs font-medium transition-colors"
            title="Mark all selected as done"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            Done
          </button>

          {/* Priority dropdown */}
          <div className="relative group/prio">
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#122040] border border-[#1C3054] text-slate-300 hover:text-white hover:border-[#2A4080] text-xs font-medium transition-colors">
              <Flag className="w-3.5 h-3.5" />
              Priority
            </button>
            <div className="absolute bottom-full mb-1 left-0 hidden group-hover/prio:flex flex-col bg-[#0C1526] border border-[#1C3054] rounded-xl overflow-hidden shadow-xl z-10 min-w-[110px]">
              {PRIORITY_OPTIONS.map(p => (
                <button
                  key={p.value}
                  onClick={() => bulkSetPriority(p.value as Task['priority'])}
                  className="flex items-center gap-2 px-3 py-2 hover:bg-[#122040] text-xs text-left transition-colors"
                  style={{ color: p.colour }}
                >
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: p.colour }} />
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Assignee dropdown */}
          <div className="relative group/assign">
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#122040] border border-[#1C3054] text-slate-300 hover:text-white hover:border-[#2A4080] text-xs font-medium transition-colors">
              <User className="w-3.5 h-3.5" />
              Assign
            </button>
            <div className="absolute bottom-full mb-1 left-0 hidden group-hover/assign:flex flex-col bg-[#0C1526] border border-[#1C3054] rounded-xl overflow-hidden shadow-xl z-10 min-w-[140px]">
              <button
                onClick={() => bulkAssign(undefined)}
                className="flex items-center gap-2 px-3 py-2 hover:bg-[#122040] text-xs text-slate-500 text-left transition-colors"
              >
                Unassign
              </button>
              {allUsers.map(u => (
                <button
                  key={u.id}
                  onClick={() => bulkAssign(u.id)}
                  className="flex items-center gap-2 px-3 py-2 hover:bg-[#122040] text-xs text-slate-300 text-left transition-colors"
                >
                  <div className="w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center text-[8px] font-bold text-white" style={{ backgroundColor: u.colour }}>
                    {u.name[0]}
                  </div>
                  {u.name}
                </button>
              ))}
            </div>
          </div>

          {/* Delete — admin only */}
          {canDelete && (
            <>
              <div className="w-px h-4 bg-[#1C3054]" />
              <button
                onClick={bulkDelete}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 text-xs font-medium transition-colors"
                title="Delete selected"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </button>
            </>
          )}

          <div className="w-px h-4 bg-[#1C3054]" />
          <button
            onClick={clearSelection}
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors px-1"
          >
            ✕ Clear
          </button>
        </div>
      )}
    </div>
  );
}
