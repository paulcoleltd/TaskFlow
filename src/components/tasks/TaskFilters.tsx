import { Search, X } from 'lucide-react';
import type { Status, Priority, ViewMode } from '../../types';
import { STATUS_OPTIONS, PRIORITY_OPTIONS } from '../../lib/constants';
import { cn } from '../../lib/utils';
import { LayoutGrid, List, Table2 } from 'lucide-react';

interface FilterState {
  search: string;
  status: Status[];
  priority: Priority[];
}

interface TaskFiltersProps {
  filters: FilterState;
  onChange: (f: FilterState) => void;
  view: ViewMode;
  onViewChange: (v: ViewMode) => void;
}

const VIEWS: { value: ViewMode; icon: typeof LayoutGrid }[] = [
  { value: 'board', icon: LayoutGrid },
  { value: 'list', icon: List },
  { value: 'table', icon: Table2 },
];

export function TaskFilters({ filters, onChange, view, onViewChange }: TaskFiltersProps) {
  const toggle = <T extends string>(arr: T[], val: T): T[] =>
    arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val];

  const hasFilters = filters.status.length > 0 || filters.priority.length > 0 || filters.search;

  return (
    <div className="flex flex-wrap items-center gap-3 mb-6">
      {/* Search */}
      <div className="relative flex items-center gap-2 bg-[#111C44] border border-[#1F3461] rounded-xl px-3 py-2">
        <Search className="w-3.5 h-3.5 text-slate-500" />
        <input
          value={filters.search}
          onChange={e => onChange({ ...filters, search: e.target.value })}
          placeholder="Filter tasks..."
          className="bg-transparent text-sm text-slate-200 placeholder-slate-500 outline-none w-36"
        />
        {filters.search && (
          <button onClick={() => onChange({ ...filters, search: '' })}>
            <X className="w-3.5 h-3.5 text-slate-500 hover:text-slate-300" />
          </button>
        )}
      </div>

      {/* Status filter */}
      <div className="flex gap-1.5">
        {STATUS_OPTIONS.map(s => (
          <button
            key={s.value}
            onClick={() => onChange({ ...filters, status: toggle(filters.status, s.value) })}
            className={cn(
              'px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all',
              filters.status.includes(s.value)
                ? 'border-transparent text-white'
                : 'border-[#1F3461] text-slate-500 hover:text-slate-300 bg-[#111C44]'
            )}
            style={filters.status.includes(s.value) ? { backgroundColor: s.colour, borderColor: s.colour } : undefined}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Priority filter */}
      <div className="flex gap-1.5">
        {PRIORITY_OPTIONS.map(p => (
          <button
            key={p.value}
            onClick={() => onChange({ ...filters, priority: toggle(filters.priority, p.value) })}
            className={cn(
              'px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all',
              filters.priority.includes(p.value)
                ? 'border-transparent text-white'
                : 'border-[#1F3461] text-slate-500 hover:text-slate-300 bg-[#111C44]'
            )}
            style={filters.priority.includes(p.value) ? { backgroundColor: p.colour + '33', borderColor: p.colour + '66', color: p.colour } : undefined}
          >
            {p.label}
          </button>
        ))}
      </div>

      {hasFilters && (
        <button onClick={() => onChange({ search: '', status: [], priority: [] })} className="text-xs text-slate-500 hover:text-slate-300 underline transition-colors">
          Clear
        </button>
      )}

      {/* View switcher — pushed to right */}
      <div className="ml-auto flex items-center gap-1 bg-[#111C44] border border-[#1F3461] rounded-xl p-1">
        {VIEWS.map(({ value, icon: Icon }) => (
          <button
            key={value}
            onClick={() => onViewChange(value)}
            className={cn('p-1.5 rounded-lg transition-all', view === value ? 'bg-blue-500 text-white' : 'text-slate-500 hover:text-slate-300')}
          >
            <Icon className="w-3.5 h-3.5" />
          </button>
        ))}
      </div>
    </div>
  );
}
