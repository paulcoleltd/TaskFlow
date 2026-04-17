import { useState, useRef } from 'react';
import { Search, X, ArrowUpDown, ArrowUp, ArrowDown, Bookmark, BookmarkPlus, Trash2 } from 'lucide-react';
import type { Status, Priority, ViewMode } from '../../types';
import { STATUS_OPTIONS, PRIORITY_OPTIONS } from '../../lib/constants';
import { useTagStore } from '../../store/tagStore';
import { useUserStore } from '../../store/userStore';
import { cn, getInitials } from '../../lib/utils';
import { useUIStore } from '../../store/uiStore';
import { LayoutGrid, List, Table2, GanttChartSquare, LayoutTemplate } from 'lucide-react';
import { useOnClickOutside } from '../../hooks/useOnClickOutside';

export type SortField = 'dueDate' | 'priority' | 'title' | 'createdAt';
export type SortDir = 'asc' | 'desc';

export interface FilterState {
  search: string;
  status: Status[];
  priority: Priority[];
  tags: string[];
  assignees: string[];
  sortBy: SortField;
  sortDir: SortDir;
}

export const DEFAULT_FILTERS: FilterState = {
  search: '', status: [], priority: [], tags: [], assignees: [],
  sortBy: 'createdAt', sortDir: 'desc',
};

const PRIORITY_RANK: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };

export function applySort(tasks: any[], sortBy: SortField, sortDir: SortDir): any[] {
  return [...tasks].sort((a, b) => {
    let cmp = 0;
    if (sortBy === 'dueDate') {
      const da = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
      const db = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
      cmp = da - db;
    } else if (sortBy === 'priority') {
      cmp = (PRIORITY_RANK[b.priority] ?? 0) - (PRIORITY_RANK[a.priority] ?? 0);
    } else if (sortBy === 'title') {
      cmp = a.title.localeCompare(b.title);
    } else {
      cmp = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    return sortDir === 'asc' ? cmp : -cmp;
  });
}

const SORT_OPTIONS: { value: SortField; label: string }[] = [
  { value: 'createdAt', label: 'Created' },
  { value: 'dueDate',   label: 'Due Date' },
  { value: 'priority',  label: 'Priority' },
  { value: 'title',     label: 'Title' },
];

interface TaskFiltersProps {
  filters: FilterState;
  onChange: (f: FilterState) => void;
  view: ViewMode;
  onViewChange: (v: ViewMode) => void;
  showTimeline?: boolean;
}

const BASE_VIEWS: { value: ViewMode; icon: typeof LayoutGrid; title: string }[] = [
  { value: 'board',    icon: LayoutGrid,        title: 'Board' },
  { value: 'list',     icon: List,              title: 'List' },
  { value: 'table',    icon: Table2,            title: 'Table' },
  { value: 'timeline', icon: GanttChartSquare,  title: 'Timeline' },
  { value: 'matrix',   icon: LayoutTemplate,    title: 'Priority Matrix' },
];

export function TaskFilters({ filters, onChange, view, onViewChange, showTimeline = false }: TaskFiltersProps) {
  const allUsers = useUserStore(s => s.users);
  const VIEWS = showTimeline ? BASE_VIEWS : BASE_VIEWS.filter(v => v.value !== 'timeline');
  const toggle = <T extends string>(arr: T[], val: T): T[] =>
    arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val];

  const hasFilters =
    filters.status.length > 0 || filters.priority.length > 0 ||
    filters.tags.length > 0 || filters.assignees.length > 0 || !!filters.search;

  const DirIcon = filters.sortDir === 'asc' ? ArrowUp : ArrowDown;

  const { savedViews, saveView, deleteView } = useUIStore();
  const tags = useTagStore(s => s.tags);
  const [showViewsPanel, setShowViewsPanel] = useState(false);
  const [saveViewName, setSaveViewName] = useState('');
  const viewsPanelRef = useRef<HTMLDivElement>(null);
  useOnClickOutside(viewsPanelRef, () => setShowViewsPanel(false));

  return (
    <div className="flex flex-wrap items-center gap-3 mb-6">
      {/* Search */}
      <div className="relative flex items-center gap-2 bg-[#0C1526] border border-[#1C3054] rounded-xl px-3 py-2">
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
                : 'border-[#1C3054] text-slate-500 hover:text-slate-300 bg-[#0C1526]'
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
                : 'border-[#1C3054] text-slate-500 hover:text-slate-300 bg-[#0C1526]'
            )}
            style={filters.priority.includes(p.value) ? { backgroundColor: p.colour + '33', borderColor: p.colour + '66', color: p.colour } : undefined}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Tag filter */}
      <div className="flex gap-1.5">
        {tags.map(tag => (
          <button
            key={tag.id}
            onClick={() => onChange({ ...filters, tags: toggle(filters.tags, tag.id) })}
            className={cn(
              'px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all',
              filters.tags.includes(tag.id)
                ? 'border-transparent'
                : 'border-[#1C3054] text-slate-500 hover:text-slate-300 bg-[#0C1526]'
            )}
            style={filters.tags.includes(tag.id) ? { backgroundColor: tag.colour + '22', borderColor: tag.colour + '44', color: tag.colour } : undefined}
          >
            {tag.name}
          </button>
        ))}
      </div>

      {/* Assignee filter — avatar toggles */}
      <div className="flex items-center gap-1.5">
        {allUsers.map(user => {
          const active = filters.assignees.includes(user.id);
          return (
            <button
              key={user.id}
              onClick={() => onChange({ ...filters, assignees: toggle(filters.assignees, user.id) })}
              title={user.name}
              className={cn(
                'w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white transition-all ring-2',
                active ? 'ring-offset-1 ring-offset-[#06091A] scale-110' : 'ring-transparent opacity-50 hover:opacity-100'
              )}
              style={{
                backgroundColor: user.colour,
                ringColor: active ? user.colour : undefined,
              } as React.CSSProperties}
            >
              {getInitials(user.name)}
            </button>
          );
        })}
      </div>

      {/* Sort */}
      <div className="flex items-center gap-1 bg-[#0C1526] border border-[#1C3054] rounded-xl px-2 py-1.5">
        <ArrowUpDown className="w-3 h-3 text-slate-500 flex-shrink-0" />
        <select
          value={filters.sortBy}
          onChange={e => onChange({ ...filters, sortBy: e.target.value as SortField })}
          className="bg-transparent text-xs text-slate-400 outline-none cursor-pointer"
        >
          {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <button
          onClick={() => onChange({ ...filters, sortDir: filters.sortDir === 'asc' ? 'desc' : 'asc' })}
          className="ml-0.5 text-slate-500 hover:text-slate-300 transition-colors"
          title={filters.sortDir === 'asc' ? 'Ascending' : 'Descending'}
        >
          <DirIcon className="w-3 h-3" />
        </button>
      </div>

      {hasFilters && (
        <button onClick={() => onChange(DEFAULT_FILTERS)} className="text-xs text-slate-500 hover:text-slate-300 underline transition-colors">
          Clear
        </button>
      )}

      {/* Saved views */}
      <div className="relative" ref={viewsPanelRef}>
        <button
          onClick={() => setShowViewsPanel(v => !v)}
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs transition-all',
            showViewsPanel
              ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
              : 'bg-[#0C1526] border-[#1C3054] text-slate-500 hover:text-slate-300'
          )}
          title="Saved views"
        >
          <Bookmark className="w-3.5 h-3.5" />
          {savedViews.length > 0 && <span className="text-[10px] font-bold">{savedViews.length}</span>}
        </button>

        {showViewsPanel && (
          <div className="absolute top-full mt-2 left-0 w-64 bg-[#0C1526] border border-[#1C3054] rounded-2xl shadow-2xl z-50 overflow-hidden">
            <div className="px-4 py-3 border-b border-[#1C3054]">
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Save current filters as view</p>
              <div className="flex gap-2">
                <input
                  autoFocus
                  value={saveViewName}
                  onChange={e => setSaveViewName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && saveViewName.trim()) {
                      saveView(saveViewName.trim(), filters);
                      setSaveViewName('');
                    }
                    if (e.key === 'Escape') setShowViewsPanel(false);
                  }}
                  placeholder="View name…"
                  maxLength={32}
                  className="flex-1 bg-[#06091A] border border-[#1C3054] focus:border-blue-500 rounded-lg px-2 py-1 text-xs text-slate-200 placeholder-slate-600 outline-none transition-colors"
                />
                <button
                  onClick={() => { if (saveViewName.trim()) { saveView(saveViewName.trim(), filters); setSaveViewName(''); } }}
                  disabled={!saveViewName.trim()}
                  className="p-1.5 rounded-lg bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-40 transition-colors"
                  title="Save view"
                >
                  <BookmarkPlus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            {savedViews.length === 0 ? (
              <p className="text-xs text-slate-600 italic text-center py-4">No saved views yet</p>
            ) : (
              <div className="max-h-48 overflow-y-auto">
                {savedViews.map(sv => (
                  <div key={sv.name} className="flex items-center gap-2 px-4 py-2 hover:bg-[#122040] transition-colors group">
                    <button
                      onClick={() => { onChange(sv.filters); setShowViewsPanel(false); }}
                      className="flex-1 text-left text-sm text-slate-300 hover:text-white truncate"
                    >
                      {sv.name}
                    </button>
                    <button
                      onClick={() => deleteView(sv.name)}
                      className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-slate-600 hover:text-red-400 transition-all"
                      title="Delete saved view"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* View switcher — pushed to right */}
      <div className="ml-auto flex items-center gap-1 bg-[#0C1526] border border-[#1C3054] rounded-xl p-1">
        {VIEWS.map(({ value, icon: Icon, title }) => (
          <button
            key={value}
            onClick={() => onViewChange(value)}
            title={title}
            className={cn('p-1.5 rounded-lg transition-all', view === value ? 'bg-blue-500 text-white' : 'text-slate-500 hover:text-slate-300')}
          >
            <Icon className="w-3.5 h-3.5" />
          </button>
        ))}
      </div>
    </div>
  );
}
