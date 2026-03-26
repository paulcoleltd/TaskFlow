import { Calendar, MessageCircle, Paperclip, CheckSquare } from 'lucide-react';
import type { Task } from '../../types';
import { useProjectStore } from '../../store/projectStore';
import { useUIStore } from '../../store/uiStore';
import { PriorityBadge } from '../ui/PriorityBadge';
import { formatRelativeDate, isOverdue, cn } from '../../lib/utils';
import { SEED_USERS } from '../../lib/sampleData';

interface TaskCardProps {
  task: Task;
  dragging?: boolean;
}

export function TaskCard({ task, dragging }: TaskCardProps) {
  const { getProjectById } = useProjectStore();
  const { setSelectedTask } = useUIStore();
  const project = getProjectById(task.projectId);
  const assignee = SEED_USERS.find(u => u.id === task.assigneeId);
  const completedSubs = task.subtasks.filter(s => s.completed).length;
  const overdue = isOverdue(task.dueDate) && task.status !== 'done';

  return (
    <div
      onClick={() => setSelectedTask(task.id)}
      className={cn(
        'bg-[#111C44] border border-[#1F3461] rounded-xl p-4 cursor-pointer',
        'hover:border-blue-500/40 hover:bg-[#1B254B] transition-all duration-150',
        dragging && 'shadow-card opacity-90 rotate-1 scale-105'
      )}
    >
      {/* Priority + Project */}
      <div className="flex items-center justify-between mb-2">
        <PriorityBadge priority={task.priority} />
        {project && (
          <span className="flex items-center gap-1 text-xs text-slate-500">
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: project.colour }} />
            {project.name}
          </span>
        )}
      </div>

      {/* Title */}
      <p className={cn('text-sm font-medium text-slate-100 mb-3 line-clamp-2', task.status === 'done' && 'line-through text-slate-400')}>
        {task.title}
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-3">
          {task.dueDate && (
            <span className={cn('flex items-center gap-1', overdue && 'text-red-400')}>
              <Calendar className="w-3 h-3" />
              {formatRelativeDate(task.dueDate)}
            </span>
          )}
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
        </div>
        {assignee && (
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
            style={{ backgroundColor: assignee.colour }}
            title={assignee.name}
          >
            {assignee.name.split(' ').map(n => n[0]).join('')}
          </div>
        )}
      </div>
    </div>
  );
}
