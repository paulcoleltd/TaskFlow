import { CheckSquare2, Calendar, ArrowRight } from 'lucide-react';
import type { Task } from '../../types';
import { StatusBadge } from '../ui/StatusBadge';
import { PriorityBadge } from '../ui/PriorityBadge';
import { useTaskStore } from '../../store/taskStore';
import { useUIStore } from '../../store/uiStore';
import { formatDate, isOverdue, cn } from '../../lib/utils';
import { SEED_USERS } from '../../lib/sampleData';
import { STATUS_OPTIONS } from '../../lib/constants';

interface TaskListProps {
  tasks: Task[];
}

export function TaskList({ tasks }: TaskListProps) {
  const { updateTask } = useTaskStore();
  const { setSelectedTask } = useUIStore();

  const grouped = STATUS_OPTIONS.map(s => ({
    ...s,
    tasks: tasks.filter(t => t.status === s.value),
  })).filter(g => g.tasks.length > 0);

  return (
    <div className="space-y-6">
      {grouped.map(group => (
        <div key={group.value}>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: group.colour }} />
            <span className="text-sm font-semibold text-slate-300">{group.label}</span>
            <span className="text-xs text-slate-500 bg-[#1B254B] px-1.5 py-0.5 rounded-full">{group.tasks.length}</span>
          </div>
          <div className="space-y-1.5">
            {group.tasks.map(task => {
              const assignee = SEED_USERS.find(u => u.id === task.assigneeId);
              const overdue = isOverdue(task.dueDate) && task.status !== 'done';
              return (
                <div
                  key={task.id}
                  onClick={() => setSelectedTask(task.id)}
                  className="flex items-center gap-4 px-4 py-3 bg-[#111C44] border border-[#1F3461] rounded-xl hover:border-blue-500/40 hover:bg-[#1B254B] cursor-pointer transition-all group"
                >
                  <button
                    onClick={e => { e.stopPropagation(); updateTask(task.id, { status: task.status === 'done' ? 'todo' : 'done' }); }}
                    className="flex-shrink-0"
                  >
                    <CheckSquare2 className={cn('w-4 h-4 transition-colors', task.status === 'done' ? 'text-green-400' : 'text-slate-600 hover:text-blue-400')} />
                  </button>
                  <span className={cn('flex-1 text-sm text-slate-200 truncate', task.status === 'done' && 'line-through text-slate-500')}>
                    {task.title}
                  </span>
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
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors flex-shrink-0" />
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
