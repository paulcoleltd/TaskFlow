import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTaskStore } from '../store/taskStore';
import { useUIStore } from '../store/uiStore';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isSameDay } from 'date-fns';
import { PRIORITY_OPTIONS } from '../lib/constants';
import { cn } from '../lib/utils';

export default function CalendarPage() {
  const [current, setCurrent] = useState(new Date());
  const { tasks } = useTaskStore();
  const { setSelectedTask } = useUIStore();

  const days = eachDayOfInterval({ start: startOfMonth(current), end: endOfMonth(current) });
  const startPad = startOfMonth(current).getDay();

  const prev = () => setCurrent(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const next = () => setCurrent(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));

  return (
    <div className="pb-20 md:pb-0">
      <div className="bg-[#111C44] border border-[#1F3461] rounded-xl p-5">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-base font-semibold text-white">{format(current, 'MMMM yyyy')}</h2>
          <div className="flex gap-2">
            <button onClick={prev} className="p-2 rounded-lg hover:bg-[#1B254B] text-slate-400 hover:text-slate-200 transition-colors"><ChevronLeft className="w-4 h-4" /></button>
            <button onClick={() => setCurrent(new Date())} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/30 hover:bg-blue-500/20 transition-colors">Today</button>
            <button onClick={next} className="p-2 rounded-lg hover:bg-[#1B254B] text-slate-400 hover:text-slate-200 transition-colors"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
        <div className="grid grid-cols-7 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} className="text-center text-xs font-semibold text-slate-500 py-2">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: startPad }).map((_, i) => <div key={`pad-${i}`} />)}
          {days.map(day => {
            const dayTasks = tasks.filter(t => t.dueDate && isSameDay(new Date(t.dueDate), day) && t.status !== 'done');
            const isCurrentMonth = isSameMonth(day, current);
            return (
              <div
                key={day.toISOString()}
                className={cn(
                  'min-h-[80px] p-2 rounded-xl border transition-colors',
                  isToday(day) ? 'border-blue-500 bg-blue-500/10' : 'border-transparent hover:border-[#1F3461] hover:bg-[#1B254B]',
                  !isCurrentMonth && 'opacity-30'
                )}
              >
                <div className={cn('text-xs font-semibold mb-1.5', isToday(day) ? 'text-blue-400' : 'text-slate-400')}>
                  {format(day, 'd')}
                </div>
                <div className="space-y-0.5">
                  {dayTasks.slice(0, 3).map(task => {
                    const pc = PRIORITY_OPTIONS.find(p => p.value === task.priority);
                    return (
                      <div
                        key={task.id}
                        onClick={() => setSelectedTask(task.id)}
                        className="text-[10px] px-1.5 py-0.5 rounded font-medium truncate cursor-pointer hover:opacity-80 transition-opacity"
                        style={{ backgroundColor: `${pc?.colour}22`, color: pc?.colour }}
                      >
                        {task.title}
                      </div>
                    );
                  })}
                  {dayTasks.length > 3 && <div className="text-[10px] text-slate-500">+{dayTasks.length - 3} more</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
