import { useState } from 'react';
import { Plus } from 'lucide-react';
import type { Task, Status } from '../../types';
import { STATUS_OPTIONS } from '../../lib/constants';
import { TaskCard } from './TaskCard';
import { useTaskStore } from '../../store/taskStore';
import { useUIStore } from '../../store/uiStore';

interface TaskBoardProps {
  tasks: Task[];
}

export function TaskBoard({ tasks }: TaskBoardProps) {
  const { moveTask } = useTaskStore();
  const { openTaskModal } = useUIStore();
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overColumn, setOverColumn] = useState<Status | null>(null);

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('taskId', taskId);
    setDraggingId(taskId);
  };

  const handleDrop = (e: React.DragEvent, status: Status) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    if (taskId) moveTask(taskId, status);
    setDraggingId(null);
    setOverColumn(null);
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 min-h-0">
      {STATUS_OPTIONS.map(({ value: status, label, colour }) => {
        const colTasks = tasks.filter(t => t.status === status).sort((a, b) => a.order - b.order);
        const isOver = overColumn === status;
        return (
          <div
            key={status}
            className={`flex-shrink-0 w-72 flex flex-col rounded-xl border transition-colors ${isOver ? 'border-blue-500/50 bg-blue-500/5' : 'border-[#1F3461] bg-[#0D1B4B]/40'}`}
            onDragOver={e => { e.preventDefault(); setOverColumn(status); }}
            onDragLeave={() => setOverColumn(null)}
            onDrop={e => handleDrop(e, status)}
          >
            {/* Column header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#1F3461]">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: colour }} />
                <span className="text-sm font-semibold text-slate-200">{label}</span>
                <span className="text-xs bg-[#1B254B] text-slate-400 px-1.5 py-0.5 rounded-full">{colTasks.length}</span>
              </div>
              <button
                onClick={() => openTaskModal()}
                className="p-1 rounded-lg hover:bg-[#1B254B] text-slate-500 hover:text-slate-300 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Cards */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
              {colTasks.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-600">No tasks</div>
              ) : (
                colTasks.map(task => (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={e => handleDragStart(e, task.id)}
                    onDragEnd={() => { setDraggingId(null); setOverColumn(null); }}
                  >
                    <TaskCard task={task} dragging={draggingId === task.id} />
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
