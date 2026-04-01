import { useState, useMemo } from 'react';
import { useTaskStore } from '../store/taskStore';
import { useUIStore } from '../store/uiStore';
import { useAuthStore } from '../store/authStore';
import { TaskBoard } from '../components/tasks/TaskBoard';
import { TaskList } from '../components/tasks/TaskList';
import { TaskTable } from '../components/tasks/TaskTable';
import { TaskTimeline } from '../components/tasks/TaskTimeline';
import { TaskMatrix } from '../components/tasks/TaskMatrix';
import { TaskFilters } from '../components/tasks/TaskFilters';
import { EmptyState } from '../components/ui/EmptyState';
import { CheckSquare } from 'lucide-react';
import { DEFAULT_FILTERS, applySort } from '../components/tasks/TaskFilters';
import type { FilterState } from '../components/tasks/TaskFilters';
import type { GroupBy } from '../components/tasks/TaskList';
import { STATUS_OPTIONS } from '../lib/constants';
import { cn, isOverdue } from '../lib/utils';
import { isToday, isThisWeek } from 'date-fns';

const GROUP_OPTIONS: { value: GroupBy; label: string }[] = [
  { value: 'status',   label: 'Status' },
  { value: 'priority', label: 'Priority' },
  { value: 'project',  label: 'Project' },
  { value: 'none',     label: 'None' },
];

export default function MyTasksPage() {
  const { tasks } = useTaskStore();
  const { currentView, setView, openTaskModal } = useUIStore();
  const { currentUser } = useAuthStore();
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [groupBy, setGroupBy] = useState<GroupBy>('status');
  const [quickFilter, setQuickFilter] = useState<'none' | 'today' | 'overdue' | 'high' | 'this-week'>('none');

  const myTasks = useMemo(() => tasks.filter(t => t.assigneeId === currentUser?.id), [tasks, currentUser]);

  // Stats — over all my tasks (not just filtered)
  const stats = useMemo(() =>
    STATUS_OPTIONS.map(s => ({ ...s, count: myTasks.filter(t => t.status === s.value).length })),
    [myTasks]
  );

  const filtered = useMemo(() => myTasks.filter(t => {
    if (filters.search && !t.title.toLowerCase().includes(filters.search.toLowerCase())) return false;
    if (filters.status.length && !filters.status.includes(t.status)) return false;
    if (filters.priority.length && !filters.priority.includes(t.priority)) return false;
    if (filters.tags.length && !filters.tags.some(tag => t.tags?.includes(tag))) return false;
    if (filters.assignees.length && !filters.assignees.includes(t.assigneeId ?? '')) return false;
    if (quickFilter === 'today') {
      if (!t.dueDate || t.status === 'done') return false;
      if (!isToday(new Date(t.dueDate))) return false;
    }
    if (quickFilter === 'overdue') {
      if (!isOverdue(t.dueDate) || t.status === 'done') return false;
    }
    if (quickFilter === 'high') {
      if (t.priority !== 'high' && t.priority !== 'critical') return false;
    }
    if (quickFilter === 'this-week') {
      if (!t.dueDate || t.status === 'done') return false;
      if (!isThisWeek(new Date(t.dueDate), { weekStartsOn: 1 })) return false;
    }
    return true;
  }), [myTasks, filters, quickFilter]);

  const sorted = useMemo(() => {
    const base = applySort(filtered, filters.sortBy, filters.sortDir);
    // Pinned tasks always float to the top
    return [...base.filter(t => t.pinned), ...base.filter(t => !t.pinned)];
  }, [filtered, filters.sortBy, filters.sortDir]);

  const hasActiveFilters = !!(filters.search || filters.status.length || filters.priority.length || filters.tags.length || filters.assignees.length);

  const dueTodayCount = myTasks.filter(t => t.dueDate && isToday(new Date(t.dueDate)) && t.status !== 'done').length;
  const overdueCount = myTasks.filter(t => isOverdue(t.dueDate) && t.status !== 'done').length;
  const highPriorityCount = myTasks.filter(t => (t.priority === 'high' || t.priority === 'critical') && t.status !== 'done').length;
  const thisWeekCount = myTasks.filter(t => t.dueDate && t.status !== 'done' && isThisWeek(new Date(t.dueDate), { weekStartsOn: 1 })).length;

  return (
    <div className="h-full flex flex-col pb-20 md:pb-0">
      {/* Quick filters */}
      {(dueTodayCount > 0 || overdueCount > 0 || highPriorityCount > 0 || thisWeekCount > 0) && (
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <span className="text-xs text-slate-500">Quick:</span>
          {dueTodayCount > 0 && (
            <button
              onClick={() => setQuickFilter(q => q === 'today' ? 'none' : 'today')}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all',
                quickFilter === 'today'
                  ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                  : 'border-[#1F3461] text-slate-500 hover:text-slate-300 bg-[#111C44]'
              )}
            >
              Due Today
              <span className={cn('min-w-[16px] h-4 px-1 rounded-full text-[10px] font-bold flex items-center justify-center', quickFilter === 'today' ? 'bg-amber-500/30' : 'bg-[#1B254B]')}>{dueTodayCount}</span>
            </button>
          )}
          {overdueCount > 0 && (
            <button
              onClick={() => setQuickFilter(q => q === 'overdue' ? 'none' : 'overdue')}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all',
                quickFilter === 'overdue'
                  ? 'bg-red-500/15 border-red-500/30 text-red-400'
                  : 'border-[#1F3461] text-slate-500 hover:text-slate-300 bg-[#111C44]'
              )}
            >
              Overdue
              <span className={cn('min-w-[16px] h-4 px-1 rounded-full text-[10px] font-bold flex items-center justify-center', quickFilter === 'overdue' ? 'bg-red-500/30' : 'bg-[#1B254B]')}>{overdueCount}</span>
            </button>
          )}
          {highPriorityCount > 0 && (
            <button
              onClick={() => setQuickFilter(q => q === 'high' ? 'none' : 'high')}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all',
                quickFilter === 'high'
                  ? 'bg-orange-500/15 border-orange-500/30 text-orange-400'
                  : 'border-[#1F3461] text-slate-500 hover:text-slate-300 bg-[#111C44]'
              )}
            >
              High Priority
              <span className={cn('min-w-[16px] h-4 px-1 rounded-full text-[10px] font-bold flex items-center justify-center', quickFilter === 'high' ? 'bg-orange-500/30' : 'bg-[#1B254B]')}>{highPriorityCount}</span>
            </button>
          )}
          {thisWeekCount > 0 && (
            <button
              onClick={() => setQuickFilter(q => q === 'this-week' ? 'none' : 'this-week')}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all',
                quickFilter === 'this-week'
                  ? 'bg-blue-500/15 border-blue-500/30 text-blue-400'
                  : 'border-[#1F3461] text-slate-500 hover:text-slate-300 bg-[#111C44]'
              )}
            >
              This Week
              <span className={cn('min-w-[16px] h-4 px-1 rounded-full text-[10px] font-bold flex items-center justify-center', quickFilter === 'this-week' ? 'bg-blue-500/30' : 'bg-[#1B254B]')}>{thisWeekCount}</span>
            </button>
          )}
          {quickFilter !== 'none' && (
            <button onClick={() => setQuickFilter('none')} className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
              Clear
            </button>
          )}
        </div>
      )}

      {/* Stats bar */}
      <div className="flex items-center gap-3 mb-5 overflow-x-auto pb-1">
        {stats.map(s => (
          <div key={s.value} className="flex items-center gap-2 bg-[#111C44] border border-[#1F3461] rounded-xl px-3 py-2 flex-shrink-0">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.colour }} />
            <span className="text-xs text-slate-400">{s.label}</span>
            <span className="text-sm font-bold text-white">{s.count}</span>
          </div>
        ))}
        <div className="flex-1" />
        <div className="text-xs text-slate-500 flex-shrink-0">
          {myTasks.filter(t => t.status !== 'done').length} active · {myTasks.length} total
        </div>
      </div>

      <TaskFilters filters={filters} onChange={setFilters} view={currentView} onViewChange={setView} showTimeline />

      {/* GroupBy selector — list view only */}
      {currentView === 'list' && (
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs text-slate-500">Group by:</span>
          <div className="flex gap-1">
            {GROUP_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setGroupBy(opt.value)}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-xs font-medium border transition-all',
                  groupBy === opt.value
                    ? 'bg-blue-500 border-blue-500 text-white'
                    : 'border-[#1F3461] text-slate-500 hover:text-slate-300 bg-[#111C44]'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {sorted.length === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title="No tasks found"
          description={hasActiveFilters ? 'No tasks match your filters.' : 'You have no tasks yet. Create one to get started!'}
          action={{ label: 'New Task', onClick: openTaskModal }}
        />
      ) : currentView === 'board' ? (
        <div className="flex-1 overflow-hidden">
          <TaskBoard tasks={sorted} />
        </div>
      ) : currentView === 'table' ? (
        <TaskTable tasks={sorted} />
      ) : currentView === 'timeline' ? (
        <TaskTimeline tasks={sorted} />
      ) : currentView === 'matrix' ? (
        <TaskMatrix tasks={sorted} />
      ) : (
        <TaskList tasks={sorted} groupBy={groupBy} />
      )}
    </div>
  );
}
