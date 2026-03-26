import { X, Edit2, Trash2, Calendar, User, Tag, Clock, CheckSquare2, MessageCircle } from 'lucide-react';
import { useTaskStore } from '../../store/taskStore';
import { useProjectStore } from '../../store/projectStore';
import { useUIStore } from '../../store/uiStore';
import { StatusBadge } from '../ui/StatusBadge';
import { PriorityBadge } from '../ui/PriorityBadge';
import { ProgressBar } from '../ui/ProgressBar';
import { formatDate, cn } from '../../lib/utils';
import { SEED_USERS } from '../../lib/sampleData';
import toast from 'react-hot-toast';

export function TaskDetail() {
  const { selectedTaskId, setSelectedTask, openTaskModal } = useUIStore();
  const { tasks, updateTask, deleteTask } = useTaskStore();
  const { getProjectById } = useProjectStore();
  const task = tasks.find(t => t.id === selectedTaskId);

  if (!task || !selectedTaskId) return null;

  const project = getProjectById(task.projectId);
  const assignee = SEED_USERS.find(u => u.id === task.assigneeId);
  const completedSubs = task.subtasks.filter(s => s.completed).length;
  const subProgress = task.subtasks.length ? (completedSubs / task.subtasks.length) * 100 : 0;

  const handleDelete = () => {
    deleteTask(task.id);
    setSelectedTask(null);
    toast.success('Task deleted');
  };

  const toggleSub = (subId: string) => {
    const updated = task.subtasks.map(s => s.id === subId ? { ...s, completed: !s.completed } : s);
    updateTask(task.id, { subtasks: updated });
  };

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 z-30 bg-black/30" onClick={() => setSelectedTask(null)} />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-full sm:w-96 bg-[#111C44] border-l border-[#1F3461] z-40 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1F3461]">
          <div className="flex items-center gap-2">
            <button onClick={() => { openTaskModal(task.id); setSelectedTask(null); }} className="p-1.5 rounded-lg hover:bg-[#1B254B] text-slate-400 hover:text-blue-400 transition-colors">
              <Edit2 className="w-4 h-4" />
            </button>
            <button onClick={handleDelete} className="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-colors">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
          <button onClick={() => setSelectedTask(null)} className="p-1.5 rounded-lg hover:bg-[#1B254B] text-slate-400 hover:text-slate-200 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <div>
            <h2 className={cn('text-base font-semibold text-white mb-2', task.status === 'done' && 'line-through text-slate-400')}>{task.title}</h2>
            {task.description && <p className="text-sm text-slate-400 leading-relaxed">{task.description}</p>}
          </div>

          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            <StatusBadge status={task.status} />
            <PriorityBadge priority={task.priority} />
          </div>

          {/* Meta */}
          <div className="space-y-2.5 text-sm">
            {project && (
              <div className="flex items-center gap-3 text-slate-400">
                <Tag className="w-4 h-4 text-slate-500 flex-shrink-0" />
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: project.colour }} />
                  {project.name}
                </div>
              </div>
            )}
            {assignee && (
              <div className="flex items-center gap-3 text-slate-400">
                <User className="w-4 h-4 text-slate-500 flex-shrink-0" />
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white" style={{ backgroundColor: assignee.colour }}>
                    {assignee.name.split(' ').map((n: string) => n[0]).join('')}
                  </div>
                  {assignee.name}
                </div>
              </div>
            )}
            {task.dueDate && (
              <div className="flex items-center gap-3 text-slate-400">
                <Calendar className="w-4 h-4 text-slate-500 flex-shrink-0" />
                {formatDate(task.dueDate)}
              </div>
            )}
            {task.estimatedHours && (
              <div className="flex items-center gap-3 text-slate-400">
                <Clock className="w-4 h-4 text-slate-500 flex-shrink-0" />
                {task.loggedHours ?? 0}h logged / {task.estimatedHours}h estimated
              </div>
            )}
          </div>

          {/* Subtasks */}
          {task.subtasks.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Subtasks</span>
                <span className="text-xs text-slate-500">{completedSubs}/{task.subtasks.length}</span>
              </div>
              <ProgressBar value={subProgress} size="sm" className="mb-3" />
              <div className="space-y-1.5">
                {task.subtasks.map(sub => (
                  <button key={sub.id} onClick={() => toggleSub(sub.id)} className="flex items-center gap-2.5 w-full text-left p-2 rounded-lg hover:bg-[#1B254B] transition-colors group">
                    <CheckSquare2 className={cn('w-4 h-4 flex-shrink-0', sub.completed ? 'text-green-400' : 'text-slate-600 group-hover:text-blue-400')} />
                    <span className={cn('text-sm', sub.completed ? 'line-through text-slate-500' : 'text-slate-300')}>{sub.title}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Comments */}
          {task.comments.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <MessageCircle className="w-4 h-4 text-slate-500" />
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Comments</span>
              </div>
              <div className="space-y-3">
                {task.comments.map(comment => {
                  const author = SEED_USERS.find(u => u.id === comment.userId);
                  return (
                    <div key={comment.id} className="flex gap-2.5">
                      {author && (
                        <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-[9px] font-bold text-white" style={{ backgroundColor: author.colour }}>
                          {author.name.split(' ').map((n: string) => n[0]).join('')}
                        </div>
                      )}
                      <div className="flex-1 bg-[#1B254B] rounded-lg p-2.5">
                        <div className="text-xs font-medium text-slate-300 mb-1">{author?.name}</div>
                        <p className="text-xs text-slate-400">{comment.content}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
