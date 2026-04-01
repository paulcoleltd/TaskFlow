import { useState, useRef } from 'react';
import { Plus, Settings2, Rows3 } from 'lucide-react';
import type { Task, Status } from '../../types';
import { STATUS_OPTIONS } from '../../lib/constants';
import { TaskCard } from './TaskCard';
import { useTaskStore } from '../../store/taskStore';
import { useProjectStore } from '../../store/projectStore';
import { useUIStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';
import { SEED_USERS } from '../../lib/sampleData';
import { canCreateTask, canMoveTask } from '../../lib/permissions';
import { cn } from '../../lib/utils';
import toast from 'react-hot-toast';
import { emitTaskMove, emitTaskCreate } from '../../lib/collabEmit';

interface TaskBoardProps {
  tasks: Task[];
  projectId?: string;
}

export function TaskBoard({ tasks, projectId }: TaskBoardProps) {
  const { moveTask, reorderTask, addTask } = useTaskStore();
  const { projects } = useProjectStore();
  const { wipLimits, setWipLimit, boardSwimlane, setBoardSwimlane } = useUIStore();
  const { currentUser } = useAuthStore();

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overColumn, setOverColumn] = useState<Status | null>(null);
  const [dropTarget, setDropTarget] = useState<{ taskId: string; half: 'top' | 'bottom' } | null>(null);
  const [quickAddCol, setQuickAddCol] = useState<Status | null>(null);
  const [quickAddTitle, setQuickAddTitle] = useState('');
  const quickAddRef = useRef<HTMLInputElement>(null);
  const [wipEditCol, setWipEditCol] = useState<Status | null>(null);
  const [wipInput, setWipInput] = useState('');

  const role = currentUser?.role ?? 'viewer';
  const userId = currentUser?.id ?? '';

  const getDragTask = () => tasks.find(t => t.id === draggingId);

  const handleDragStart = (e: React.DragEvent, task: Task) => {
    if (!canMoveTask(role, task.assigneeId, userId)) { e.preventDefault(); return; }
    e.dataTransfer.setData('taskId', task.id);
    e.dataTransfer.effectAllowed = 'move';
    setDraggingId(task.id);
  };

  const handleCardDragOver = (e: React.DragEvent, task: Task) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const half = e.clientY < rect.top + rect.height / 2 ? 'top' : 'bottom';
    setDropTarget({ taskId: task.id, half });
    setOverColumn(task.status);
  };

  const handleCardDrop = (e: React.DragEvent, targetTask: Task) => {
    e.preventDefault();
    e.stopPropagation();
    const dragId = e.dataTransfer.getData('taskId');
    if (!dragId || dragId === targetTask.id) { resetDrag(); return; }
    const drag = getDragTask() ?? tasks.find(t => t.id === dragId);
    if (!drag || !canMoveTask(role, drag.assigneeId, userId)) { resetDrag(); return; }
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const position = e.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
    const crossColumn = drag.status !== targetTask.status;
    reorderTask(dragId, targetTask.id, position, targetTask.status);
    if (crossColumn) {
      const label = STATUS_OPTIONS.find(s => s.value === targetTask.status)?.label ?? targetTask.status;
      toast.success(`Moved to ${label}`);
    }
    resetDrag();
  };

  const handleColumnDrop = (e: React.DragEvent, status: Status) => {
    e.preventDefault();
    // If dropped on column (not on a card) — plain status move
    const dragId = e.dataTransfer.getData('taskId');
    if (!dragId) { resetDrag(); return; }
    const drag = getDragTask() ?? tasks.find(t => t.id === dragId);
    if (drag && canMoveTask(role, drag.assigneeId, userId)) {
      if (drag.status !== status) {
        moveTask(dragId, status);
        emitTaskMove(dragId, status);
        const label = STATUS_OPTIONS.find(s => s.value === status)?.label ?? status;
        toast.success(`Moved to ${label}`);
      }
    }
    resetDrag();
  };

  const resetDrag = () => {
    setDraggingId(null);
    setOverColumn(null);
    setDropTarget(null);
  };

  const openQuickAdd = (status: Status) => {
    setQuickAddCol(status);
    setQuickAddTitle('');
    setTimeout(() => quickAddRef.current?.focus(), 50);
  };

  const handleQuickAdd = (status: Status) => {
    const title = quickAddTitle.trim();
    if (!title) { setQuickAddCol(null); return; }
    // Use projectId prop or first available project
    const pid = projectId ?? projects[0]?.id;
    if (!pid) { toast.error('No project available'); return; }
    addTask({
      title,
      status,
      priority: 'medium',
      projectId: pid,
      assigneeId: currentUser?.id,
      tags: [],
      subtasks: [],
      comments: [],
      attachments: [],
      attachmentCount: 0,
    });
    // Emit the newly-created task to other connected clients
    const created = useTaskStore.getState().tasks.at(-1);
    if (created) emitTaskCreate(created);
    toast.success('Task created');
    setQuickAddCol(null);
    setQuickAddTitle('');
  };

  // Build swimlane rows: one per assignee + unassigned
  const swimlaneRows = (() => {
    const assigneeIds = [...new Set(tasks.map(t => t.assigneeId ?? ''))];
    return assigneeIds.map(uid => {
      const user = uid ? SEED_USERS.find(u => u.id === uid) ?? null : null;
      const rowTasks = tasks.filter(t => (t.assigneeId ?? '') === uid);
      return { uid, user, rowTasks };
    }).sort((a, b) => {
      // Current user first, then alphabetically, unassigned last
      if (a.uid === currentUser?.id) return -1;
      if (b.uid === currentUser?.id) return 1;
      if (!a.uid) return 1;
      if (!b.uid) return -1;
      return (a.user?.name ?? '').localeCompare(b.user?.name ?? '');
    });
  })();

  const renderColumn = (status: Status, label: string, colour: string, filteredTasks: Task[]) => {
    const colTasks = filteredTasks.filter(t => t.status === status).sort((a, b) => a.order - b.order);
    const isOver = overColumn === status && !dropTarget;
    const wip = wipLimits[status];
    const wipOver = wip != null && colTasks.length > wip;
    const wipNear = wip != null && !wipOver && colTasks.length >= wip;
    return (
      <div
        key={status}
        className={cn(
          'flex-shrink-0 w-60 flex flex-col rounded-xl border transition-colors',
          isOver ? 'border-blue-500/50 bg-blue-500/5'
            : wipOver ? 'border-red-500/40 bg-red-500/5'
            : wipNear ? 'border-amber-500/40'
            : 'border-[#1F3461] bg-[#0D1B4B]/40'
        )}
        onDragOver={e => { e.preventDefault(); if (!dropTarget) setOverColumn(status); }}
        onDragLeave={e => {
          if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) setOverColumn(null);
        }}
        onDrop={e => handleColumnDrop(e, status)}
      >
        <div className="flex items-center gap-2 px-3 py-2 border-b border-[#1F3461]">
          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: colour }} />
          <span className="text-xs font-semibold text-slate-300">{label}</span>
          <span className="text-[10px] bg-[#1B254B] text-slate-400 px-1 py-0.5 rounded-full ml-auto">{colTasks.length}</span>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-0">
          {colTasks.map(task => {
            const draggable = canMoveTask(role, task.assigneeId, userId);
            const isTarget = dropTarget?.taskId === task.id;
            return (
              <div
                key={task.id}
                draggable={draggable}
                onDragStart={e => handleDragStart(e, task)}
                onDragEnd={resetDrag}
                onDragOver={e => handleCardDragOver(e, task)}
                onDragLeave={() => setDropTarget(null)}
                onDrop={e => handleCardDrop(e, task)}
                className="relative mb-2"
              >
                {isTarget && dropTarget?.half === 'top' && <div className="absolute -top-1 left-0 right-0 h-0.5 bg-blue-500 rounded-full z-10" />}
                <div className={cn('transition-opacity', draggingId === task.id && 'opacity-40')}>
                  <TaskCard task={task} dragging={draggingId === task.id} />
                </div>
                {isTarget && dropTarget?.half === 'bottom' && <div className="absolute -bottom-1 left-0 right-0 h-0.5 bg-blue-500 rounded-full z-10" />}
              </div>
            );
          })}
          {colTasks.length === 0 && <div className="text-center py-4 text-[10px] text-slate-700">Empty</div>}
        </div>
      </div>
    );
  };

  if (boardSwimlane) {
    return (
      <div className="space-y-1">
        {/* Swimlane toggle */}
        <div className="flex items-center gap-2 mb-3">
          <button
            onClick={() => setBoardSwimlane(false)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-blue-400 bg-blue-500/10 border border-blue-500/30 hover:bg-blue-500/20 transition-colors"
          >
            <Rows3 className="w-3.5 h-3.5" />
            Swimlanes: On
          </button>
          <span className="text-[10px] text-slate-600">Grouped by assignee</span>
        </div>

        {/* Column header row */}
        <div className="flex gap-2 pl-40 overflow-x-auto pb-1">
          {STATUS_OPTIONS.map(({ value: status, label, colour }) => (
            <div key={status} className="flex-shrink-0 w-60 flex items-center gap-2 px-3 py-2">
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: colour }} />
              <span className="text-xs font-semibold text-slate-400">{label}</span>
              <span className="text-[10px] text-slate-600 ml-auto">
                {tasks.filter(t => t.status === status).length}
              </span>
            </div>
          ))}
        </div>

        {/* Swimlane rows */}
        {swimlaneRows.map(({ uid, user, rowTasks }) => (
          <div key={uid || 'unassigned'} className="flex gap-2 overflow-x-auto pb-1">
            {/* Row header */}
            <div className="flex-shrink-0 w-36 flex items-start gap-2 pt-3 pr-2">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                style={{ backgroundColor: user?.colour ?? '#475569' }}
              >
                {user ? user.name.split(' ').map(n => n[0]).join('') : '?'}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-300 truncate">{user?.name ?? 'Unassigned'}</p>
                <p className="text-[10px] text-slate-600">{rowTasks.filter(t => t.status !== 'done').length} active</p>
              </div>
            </div>
            {/* Status columns for this row */}
            {STATUS_OPTIONS.map(({ value: status, label, colour }) =>
              renderColumn(status, label, colour, rowTasks)
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      {/* Swimlane toggle */}
      <div className="flex items-center gap-2 mb-3">
        <button
          onClick={() => setBoardSwimlane(true)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-slate-500 border border-[#1F3461] hover:text-slate-300 hover:border-slate-600 transition-colors"
        >
          <Rows3 className="w-3.5 h-3.5" />
          Swimlanes
        </button>
      </div>
    <div className="flex gap-4 overflow-x-auto pb-4 min-h-0">
      {STATUS_OPTIONS.map(({ value: status, label, colour }) => {
        const colTasks = tasks.filter(t => t.status === status).sort((a, b) => a.order - b.order);
        const isOver = overColumn === status && !dropTarget;
        const wip = wipLimits[status];
        const wipOver = wip != null && colTasks.length > wip;
        const wipNear = wip != null && !wipOver && colTasks.length >= wip;
        return (
          <div
            key={status}
            className={cn(
              'flex-shrink-0 w-72 flex flex-col rounded-xl border transition-colors',
              isOver ? 'border-blue-500/50 bg-blue-500/5'
                : wipOver ? 'border-red-500/40 bg-red-500/5'
                : wipNear ? 'border-amber-500/40'
                : 'border-[#1F3461] bg-[#0D1B4B]/40'
            )}
            onDragOver={e => { e.preventDefault(); if (!dropTarget) setOverColumn(status); }}
            onDragLeave={e => {
              if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) {
                setOverColumn(null);
              }
            }}
            onDrop={e => handleColumnDrop(e, status)}
          >
            {/* Column header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#1F3461]">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: colour }} />
                <span className="text-sm font-semibold text-slate-200">{label}</span>
                {wip != null ? (
                  <span className={cn(
                    'text-xs px-1.5 py-0.5 rounded-full font-semibold border',
                    wipOver
                      ? 'bg-red-500/15 text-red-400 border-red-500/30'
                      : wipNear
                        ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                        : 'bg-[#1B254B] text-slate-400 border-transparent'
                  )}>
                    {colTasks.length}/{wip}
                  </span>
                ) : (
                  <span className="text-xs bg-[#1B254B] text-slate-400 px-1.5 py-0.5 rounded-full">{colTasks.length}</span>
                )}
                {wipOver && <span className="text-[10px] text-red-400 font-semibold">WIP exceeded</span>}
              </div>
              <div className="flex items-center gap-1">
                {role === 'admin' && (
                  <button
                    onClick={() => { setWipEditCol(wipEditCol === status ? null : status); setWipInput(wip?.toString() ?? ''); }}
                    className={cn('p-1 rounded-lg transition-colors', wipEditCol === status ? 'bg-[#1B254B] text-blue-400' : 'hover:bg-[#1B254B] text-slate-600 hover:text-slate-400')}
                    title="Set WIP limit"
                  >
                    <Settings2 className="w-3 h-3" />
                  </button>
                )}
                {canCreateTask(role) && (
                  <button
                    onClick={() => openQuickAdd(status)}
                    className="p-1 rounded-lg hover:bg-[#1B254B] text-slate-500 hover:text-slate-300 transition-colors"
                    title="Quick add task"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* WIP limit editor */}
            {wipEditCol === status && role === 'admin' && (
              <div className="px-4 py-2 bg-[#0B1437] border-b border-[#1F3461] flex items-center gap-2">
                <span className="text-[10px] text-slate-500 flex-shrink-0">WIP limit:</span>
                <input
                  autoFocus
                  type="number"
                  value={wipInput}
                  onChange={e => setWipInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      const n = parseInt(wipInput, 10);
                      setWipLimit(status, isNaN(n) || n <= 0 ? null : n);
                      setWipEditCol(null);
                    }
                    if (e.key === 'Escape') setWipEditCol(null);
                  }}
                  placeholder="e.g. 5"
                  min="1"
                  className="w-16 bg-transparent border border-[#1F3461] focus:border-blue-500 rounded px-2 py-0.5 text-xs text-slate-200 outline-none transition-colors"
                />
                <button
                  onClick={() => { const n = parseInt(wipInput, 10); setWipLimit(status, isNaN(n) || n <= 0 ? null : n); setWipEditCol(null); }}
                  className="px-2 py-0.5 rounded bg-blue-500 text-white text-[10px] font-medium hover:bg-blue-600 transition-colors"
                >Set</button>
                {wip != null && (
                  <button
                    onClick={() => { setWipLimit(status, null); setWipEditCol(null); }}
                    className="px-2 py-0.5 rounded bg-[#1B254B] text-slate-400 text-[10px] hover:text-red-400 transition-colors"
                  >Clear</button>
                )}
              </div>
            )}

            {/* Cards */}
            <div className="flex-1 overflow-y-auto p-3 space-y-0">
              {colTasks.length === 0 && quickAddCol !== status ? (
                <div className="text-center py-8 text-xs text-slate-600">No tasks</div>
              ) : (
                colTasks.map(task => {
                  const draggable = canMoveTask(role, task.assigneeId, userId);
                  const isTarget = dropTarget?.taskId === task.id;
                  return (
                    <div
                      key={task.id}
                      draggable={draggable}
                      onDragStart={e => handleDragStart(e, task)}
                      onDragEnd={resetDrag}
                      onDragOver={e => handleCardDragOver(e, task)}
                      onDragLeave={() => setDropTarget(null)}
                      onDrop={e => handleCardDrop(e, task)}
                      className="relative mb-2.5"
                    >
                      {isTarget && dropTarget?.half === 'top' && (
                        <div className="absolute -top-1.5 left-0 right-0 h-0.5 bg-blue-500 rounded-full z-10" />
                      )}
                      <div className={cn('transition-opacity', draggingId === task.id && 'opacity-40')}>
                        <TaskCard task={task} dragging={draggingId === task.id} />
                      </div>
                      {isTarget && dropTarget?.half === 'bottom' && (
                        <div className="absolute -bottom-1.5 left-0 right-0 h-0.5 bg-blue-500 rounded-full z-10" />
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Quick-add input */}
            {canCreateTask(role) && (
              <div className="px-3 pb-3">
                {quickAddCol === status ? (
                  <div className="flex gap-2">
                    <input
                      ref={quickAddRef}
                      value={quickAddTitle}
                      onChange={e => setQuickAddTitle(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleQuickAdd(status);
                        if (e.key === 'Escape') { setQuickAddCol(null); setQuickAddTitle(''); }
                      }}
                      onBlur={() => { if (!quickAddTitle.trim()) setQuickAddCol(null); }}
                      placeholder="Task title… (Enter to add)"
                      maxLength={256}
                      className="flex-1 bg-[#0B1437] border border-[#1F3461] focus:border-blue-500 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-600 outline-none transition-colors"
                    />
                    <button
                      onClick={() => handleQuickAdd(status)}
                      disabled={!quickAddTitle.trim()}
                      className="px-2.5 py-1.5 rounded-lg bg-blue-500 text-white text-xs font-medium hover:bg-blue-600 disabled:opacity-40 transition-colors"
                    >
                      Add
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => openQuickAdd(status)}
                    className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-slate-600 hover:text-slate-400 hover:bg-[#1B254B] transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add task
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
    </div>
  );
}
