import { useState, useMemo } from 'react';
import { useTaskStore } from '../store/taskStore';
import { useUIStore } from '../store/uiStore';
import { TaskBoard } from '../components/tasks/TaskBoard';
import { TaskList } from '../components/tasks/TaskList';
import { TaskFilters } from '../components/tasks/TaskFilters';
import { EmptyState } from '../components/ui/EmptyState';
import { CheckSquare } from 'lucide-react';
import { CURRENT_USER_ID } from '../lib/sampleData';
import type { Status, Priority } from '../types';

interface Filters { search: string; status: Status[]; priority: Priority[]; }

export default function MyTasksPage() {
  const { tasks } = useTaskStore();
  const { currentView, setView, openTaskModal } = useUIStore();
  const [filters, setFilters] = useState<Filters>({ search: '', status: [], priority: [] });

  const myTasks = useMemo(() => tasks.filter(t => t.assigneeId === CURRENT_USER_ID), [tasks]);

  const filtered = useMemo(() => myTasks.filter(t => {
    if (filters.search && !t.title.toLowerCase().includes(filters.search.toLowerCase())) return false;
    if (filters.status.length && !filters.status.includes(t.status)) return false;
    if (filters.priority.length && !filters.priority.includes(t.priority)) return false;
    return true;
  }), [myTasks, filters]);

  return (
    <div className="h-full flex flex-col pb-20 md:pb-0">
      <TaskFilters filters={filters} onChange={setFilters} view={currentView} onViewChange={setView} />
      {filtered.length === 0 ? (
        <EmptyState icon={CheckSquare} title="No tasks found" description={filters.search || filters.status.length || filters.priority.length ? "No tasks match your filters." : "You have no tasks yet. Create one to get started!"} action={{ label: 'New Task', onClick: openTaskModal }} />
      ) : currentView === 'board' ? (
        <div className="flex-1 overflow-hidden">
          <TaskBoard tasks={filtered} />
        </div>
      ) : (
        <TaskList tasks={filtered} />
      )}
    </div>
  );
}
