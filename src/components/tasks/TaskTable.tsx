import { useState } from 'react';
import type { Task } from '../../types';
import { useUIStore } from '../../store/uiStore';
import { useProjectStore } from '../../store/projectStore';
import { useTaskStore } from '../../store/taskStore';
import { useCurrentUser } from '../../hooks/useConvexUser';
import { canEditTask, canDeleteTask } from '../../lib/permissions';
import { StatusBadge } from '../ui/StatusBadge';
import { PriorityBadge } from '../ui/PriorityBadge';
import { STATUS_OPTIONS, PRIORITY_OPTIONS } from '../../lib/constants';
import { useTagStore } from '../../store/tagStore';
import { useUserStore } from '../../store/userStore';
import { formatDate, isOverdue, cn } from '../../lib/utils';
import { Calendar, Trash2, Edit2, CheckSquare2, Square, Minus, Pin } from 'lucide-react';
import { RoleGuard } from '../auth/RoleGuard';
import toast from 'react-hot-toast';
import { emitTaskUpdate, emitTaskDelete } from '../../lib/collabEmit';

interface TaskTableProps {
  tasks: Task[];
}

export function TaskTable({ tasks }: TaskTableProps) {
  const allUsers = useUserStore(s => s.users);
  const { setSelectedTask, openTaskModal } = useUIStore();
  const { getProjectById } = useProjectStore();
  const { deleteTask, updateTask, togglePin } = useTaskStore();
  const currentUser = useCurrentUser();
  const allTags = useTagStore(s => s.tags);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState('');
  const [bulkAssignee, setBulkAssignee] = useState('');
  const [bulkPriority, setBulkPriority] = useState('');

  const role = currentUser?.role ?? 'viewer';
  const userId = currentUser?._id ?? '';
  const canDel = canDeleteTask(role);

  if (tasks.length === 0) {
    return <p className="text-center text-sm text-slate-600 py-12">No tasks match the current filters.</p>;
  }

  const allSelected = tasks.length > 0 && tasks.every(t => selected.has(t.id));
  const someSelected = !allSelected && tasks.some(t => selected.has(t.id));
  const selectedCount = selected.size;

  const toggleOne = (id: string) =>
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(tasks.map(t => t.id)));

  const handleBulkStatus = () => {
    if (!bulkStatus) return;
    let count = 0;
    selected.forEach(id => {
      const task = tasks.find(t => t.id === id);
      if (task && canEditTask(role, task.assigneeId, userId)) {
        updateTask(id, { status: bulkStatus as Task['status'] });
        emitTaskUpdate(id, { status: bulkStatus as Task['status'] });
        count++;
      }
    });
    toast.success(`Updated ${count} task${count !== 1 ? 's' : ''}`);
    setSelected(new Set());
    setBulkStatus('');
  };

  const handleBulkAssignee = () => {
    if (!bulkAssignee) return;
    let count = 0;
    selected.forEach(id => {
      const task = tasks.find(t => t.id === id);
      if (task && canEditTask(role, task.assigneeId, userId)) {
        updateTask(id, { assigneeId: bulkAssignee });
        emitTaskUpdate(id, { assigneeId: bulkAssignee });
        count++;
      }
    });
    toast.success(`Reassigned ${count} task${count !== 1 ? 's' : ''}`);
    setSelected(new Set());
    setBulkAssignee('');
  };

  const handleBulkPriority = () => {
    if (!bulkPriority) return;
    let count = 0;
    selected.forEach(id => {
      const task = tasks.find(t => t.id === id);
      if (task && canEditTask(role, task.assigneeId, userId)) {
        updateTask(id, { priority: bulkPriority as Task['priority'] });
        emitTaskUpdate(id, { priority: bulkPriority as Task['priority'] });
        count++;
      }
    });
    toast.success(`Updated priority for ${count} task${count !== 1 ? 's' : ''}`);
    setSelected(new Set());
    setBulkPriority('');
  };

  const handleBulkDelete = () => {
    const snapshots = tasks.filter(t => selected.has(t.id)).map(t => ({ ...t }));
    snapshots.forEach(s => { deleteTask(s.id); emitTaskDelete(s.id); });
    setSelected(new Set());
    const count = snapshots.length;
    toast(
      (t) => (
        <div className="flex items-center gap-3">
          <span className="text-sm">Deleted {count} task{count !== 1 ? 's' : ''}</span>
          <button
            onClick={() => {
              snapshots.forEach(s => useTaskStore.getState().restoreTask(s));
              toast.dismiss(t.id);
              toast.success(`Restored ${count} task${count !== 1 ? 's' : ''}`);
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

  return (
    <div className="space-y-2">
      {/* Bulk action bar */}
      {selectedCount > 0 && (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-blue-500/10 border border-blue-500/30 rounded-xl">
          <span className="text-xs text-blue-300 font-medium">{selectedCount} selected</span>
          <div className="flex items-center gap-2 ml-2 flex-wrap">
            <select
              value={bulkStatus}
              onChange={e => setBulkStatus(e.target.value)}
              className="bg-[#0C1526] border border-[#1C3054] rounded-lg px-2 py-1 text-xs text-slate-300 outline-none"
            >
              <option value="">Status…</option>
              {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <button
              onClick={handleBulkStatus}
              disabled={!bulkStatus}
              className="px-2.5 py-1 rounded-lg bg-blue-500 text-white text-xs font-medium hover:bg-blue-600 disabled:opacity-40 transition-colors"
            >
              Apply
            </button>
            <select
              value={bulkAssignee}
              onChange={e => setBulkAssignee(e.target.value)}
              className="bg-[#0C1526] border border-[#1C3054] rounded-lg px-2 py-1 text-xs text-slate-300 outline-none"
            >
              <option value="">Assign to…</option>
              {allUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
            <button
              onClick={handleBulkAssignee}
              disabled={!bulkAssignee}
              className="px-2.5 py-1 rounded-lg bg-blue-500 text-white text-xs font-medium hover:bg-blue-600 disabled:opacity-40 transition-colors"
            >
              Assign
            </button>
            <select
              value={bulkPriority}
              onChange={e => setBulkPriority(e.target.value)}
              className="bg-[#0C1526] border border-[#1C3054] rounded-lg px-2 py-1 text-xs text-slate-300 outline-none"
            >
              <option value="">Priority…</option>
              {PRIORITY_OPTIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
            <button
              onClick={handleBulkPriority}
              disabled={!bulkPriority}
              className="px-2.5 py-1 rounded-lg bg-blue-500 text-white text-xs font-medium hover:bg-blue-600 disabled:opacity-40 transition-colors"
            >
              Set
            </button>
          </div>
          {canDel && (
            <button
              onClick={handleBulkDelete}
              className="ml-auto flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs text-red-400 hover:bg-red-500/10 border border-red-500/20 transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              Delete selected
            </button>
          )}
          <button onClick={() => setSelected(new Set())} className="text-xs text-slate-500 hover:text-slate-300 transition-colors ml-1">
            Clear
          </button>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-[#1C3054]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#1C3054] bg-[#0D1B4B]/60">
              {/* Select all checkbox */}
              <th className="px-3 py-3 w-10" onClick={e => e.stopPropagation()}>
                <button onClick={toggleAll} className="flex items-center justify-center text-slate-500 hover:text-slate-300">
                  {allSelected
                    ? <CheckSquare2 className="w-4 h-4 text-blue-400" />
                    : someSelected
                      ? <Minus className="w-4 h-4 text-blue-400" />
                      : <Square className="w-4 h-4" />}
                </button>
              </th>
              {['Task', 'Status', 'Priority', 'Project', 'Assignee', 'Due Date', 'Tags', ''].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tasks.map((task, i) => {
              const project = getProjectById(task.projectId);
              const assignee = allUsers.find(u => u.id === task.assigneeId);
              const overdue = isOverdue(task.dueDate) && task.status !== 'done';
              const taskTags = task.tags.map(id => allTags.find(t => t.id === id)).filter(Boolean);
              const canEdit = canEditTask(role, task.assigneeId, userId);
              const isSelected = selected.has(task.id);

              return (
                <tr
                  key={task.id}
                  className={cn(
                    'border-b border-[#1C3054] last:border-0 hover:bg-[#122040] transition-colors cursor-pointer group',
                    i % 2 === 0 ? 'bg-[#0C1526]' : 'bg-[#0C1526]/80',
                    isSelected && 'bg-blue-500/5'
                  )}
                  onClick={() => setSelectedTask(task.id)}
                >
                  {/* Row checkbox */}
                  <td className="px-3 py-3 w-10" onClick={e => e.stopPropagation()}>
                    <button onClick={() => toggleOne(task.id)} className="flex items-center justify-center text-slate-500 hover:text-slate-300">
                      {isSelected
                        ? <CheckSquare2 className="w-4 h-4 text-blue-400" />
                        : <Square className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />}
                    </button>
                  </td>

                  {/* Title */}
                  <td className="px-4 py-3 max-w-[220px]">
                    <div className="flex items-center gap-1.5">
                      {task.pinned && <Pin className="w-3 h-3 text-amber-400 fill-amber-400 flex-shrink-0" />}
                      <p className={cn('truncate font-medium', task.status === 'done' ? 'line-through text-slate-500' : 'text-slate-100')}>
                        {task.title}
                      </p>
                    </div>
                  </td>

                  {/* Status — inline change */}
                  <td className="px-4 py-3 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                    {canEdit ? (
                      <select
                        value={task.status}
                        onChange={e => { const s = e.target.value as Task['status']; updateTask(task.id, { status: s }); emitTaskUpdate(task.id, { status: s }); }}
                        className="bg-transparent border-0 outline-none text-xs cursor-pointer"
                        style={{ color: STATUS_OPTIONS.find(s => s.value === task.status)?.colour }}
                      >
                        {STATUS_OPTIONS.map(s => (
                          <option key={s.value} value={s.value} className="bg-[#0C1526] text-slate-200">{s.label}</option>
                        ))}
                      </select>
                    ) : (
                      <StatusBadge status={task.status} />
                    )}
                  </td>

                  {/* Priority — inline change */}
                  <td className="px-4 py-3 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                    {canEdit ? (
                      <select
                        value={task.priority}
                        onChange={e => { const p = e.target.value as Task['priority']; updateTask(task.id, { priority: p }); emitTaskUpdate(task.id, { priority: p }); }}
                        className="bg-transparent border-0 outline-none text-xs cursor-pointer"
                        style={{ color: PRIORITY_OPTIONS.find(p => p.value === task.priority)?.colour }}
                      >
                        {PRIORITY_OPTIONS.map(p => (
                          <option key={p.value} value={p.value} className="bg-[#0C1526] text-slate-200">{p.label}</option>
                        ))}
                      </select>
                    ) : (
                      <PriorityBadge priority={task.priority} />
                    )}
                  </td>

                  {/* Project */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    {project && (
                      <span className="flex items-center gap-1.5 text-xs text-slate-400">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: project.colour }} />
                        <span className="truncate max-w-[100px]">{project.name}</span>
                      </span>
                    )}
                  </td>

                  {/* Assignee */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    {assignee && (
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0" style={{ backgroundColor: assignee.colour }}>
                          {assignee.name.split(' ').map((n: string) => n[0]).join('')}
                        </div>
                        <span className="text-xs text-slate-400 truncate max-w-[80px]">{assignee.name.split(' ')[0]}</span>
                      </div>
                    )}
                  </td>

                  {/* Due date */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    {task.dueDate && (
                      <span className={cn('flex items-center gap-1 text-xs', overdue ? 'text-red-400' : 'text-slate-400')}>
                        <Calendar className="w-3 h-3" />
                        {formatDate(task.dueDate)}
                      </span>
                    )}
                  </td>

                  {/* Tags */}
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {taskTags.slice(0, 2).map(tag => tag && (
                        <span key={tag.id} className="text-[10px] px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap" style={{ backgroundColor: `${tag.colour}22`, color: tag.colour }}>
                          {tag.name}
                        </span>
                      ))}
                      {taskTags.length > 2 && (
                        <span className="text-[10px] text-slate-500">+{taskTags.length - 2}</span>
                      )}
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => togglePin(task.id)}
                        className={cn('p-1 rounded hover:bg-amber-500/10 transition-colors', task.pinned ? 'text-amber-400' : 'text-slate-500 hover:text-amber-400')}
                        title={task.pinned ? 'Unpin' : 'Pin task'}
                      >
                        <Pin className={cn('w-3.5 h-3.5', task.pinned && 'fill-amber-400')} />
                      </button>
                      <RoleGuard allowed={canEdit}>
                        <button
                          onClick={() => openTaskModal(task.id)}
                          className="p-1 rounded hover:bg-blue-500/10 text-slate-500 hover:text-blue-400 transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </RoleGuard>
                      <RoleGuard allowed={canDel}>
                        <button
                          onClick={() => { deleteTask(task.id); emitTaskDelete(task.id); toast.success('Task deleted'); }}
                          className="p-1 rounded hover:bg-red-500/10 text-slate-500 hover:text-red-400 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </RoleGuard>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
