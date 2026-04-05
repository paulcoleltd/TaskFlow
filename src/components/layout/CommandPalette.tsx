import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, CheckSquare, FolderOpen, LayoutDashboard, ListTodo, Calendar, BarChart2, Settings, Plus, ArrowRight, Clock, Sun, Users2, Activity, Sparkles } from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import { useTaskStore } from '../../store/taskStore';
import { useProjectStore } from '../../store/projectStore';
import { useCurrentUser } from '../../hooks/useConvexUser';
import { canCreateTask } from '../../lib/permissions';
import { cn } from '../../lib/utils';
import { STATUS_OPTIONS, PRIORITY_OPTIONS } from '../../lib/constants';
import { SEED_USERS } from '../../lib/sampleData';
import { format, addDays } from 'date-fns';
import type { Priority } from '../../types';

// ── Inline task syntax parser ──────────────────────────────────────────────
// Parses: "Fix login bug !high @sarah tomorrow"
// Tokens: !priority · @name · today · tomorrow · next week
function parseInlineTask(raw: string): {
  title: string;
  priority: Priority;
  assigneeId?: string;
  dueDate?: string;
} {
  let text = raw;
  let priority: Priority = 'medium';
  let assigneeId: string | undefined;
  let dueDate: string | undefined;

  // !priority
  text = text.replace(/\s?!(critical|high|medium|low)\b/gi, (_, p) => {
    priority = p.toLowerCase() as Priority;
    return '';
  });

  // @name → match to SEED_USERS by first name
  text = text.replace(/\s?@(\w+)\b/g, (_, name) => {
    const match = SEED_USERS.find(u => u.name.split(' ')[0].toLowerCase() === name.toLowerCase());
    if (match) assigneeId = match.id;
    return '';
  });

  // Date keywords
  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');
  const tomorrowStr = format(addDays(today, 1), 'yyyy-MM-dd');
  const nextWeekStr = format(addDays(today, 7), 'yyyy-MM-dd');

  text = text.replace(/\s?\bnext\s+week\b/gi, () => { dueDate = nextWeekStr; return ''; });
  text = text.replace(/\s?\btomorrow\b/gi,     () => { dueDate = tomorrowStr; return ''; });
  text = text.replace(/\s?\btoday\b/gi,        () => { dueDate = todayStr;    return ''; });

  return { title: text.trim(), priority, assigneeId, dueDate };
}

// ── Types ──────────────────────────────────────────────────────────────────
type ResultKind = 'task' | 'project' | 'action' | 'recent' | 'create';

interface PaletteItem {
  id: string;
  kind: ResultKind;
  label: string;
  sublabel?: string;
  icon: React.ReactNode;
  accent?: string;
  onSelect: () => void;
}

// ── Fuzzy match ────────────────────────────────────────────────────────────
function matches(text: string, query: string): boolean {
  if (!query) return true;
  const t = text.toLowerCase();
  const q = query.toLowerCase();
  let qi = 0;
  for (let i = 0; i < t.length && qi < q.length; i++) {
    if (t[i] === q[qi]) qi++;
  }
  return qi === q.length;
}

// Highlight matching characters
function Highlight({ text, query }: { text: string; query: string }) {
  if (!query) return <span>{text}</span>;
  const q = query.toLowerCase();
  const result: React.ReactNode[] = [];
  let qi = 0;
  for (let i = 0; i < text.length; i++) {
    if (qi < q.length && text[i].toLowerCase() === q[qi]) {
      result.push(<mark key={i} className="bg-transparent text-blue-400 font-semibold">{text[i]}</mark>);
      qi++;
    } else {
      result.push(text[i]);
    }
  }
  return <span>{result}</span>;
}

// ── Pill components for task metadata ─────────────────────────────────────
function StatusDot({ status }: { status: string }) {
  const opt = STATUS_OPTIONS.find(s => s.value === status);
  return opt ? (
    <span className="text-[10px] px-1.5 py-0.5 rounded-full border" style={{ color: opt.colour, borderColor: `${opt.colour}44`, backgroundColor: `${opt.colour}18` }}>
      {opt.label}
    </span>
  ) : null;
}

function PriorityDot({ priority }: { priority: string }) {
  const opt = PRIORITY_OPTIONS.find(p => p.value === priority);
  return opt ? (
    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: opt.colour }} title={opt.label} />
  ) : null;
}

// ── Main component ─────────────────────────────────────────────────────────
export function CommandPalette() {
  const navigate = useNavigate();
  const { isCommandPaletteOpen, closeCommandPalette, setSelectedTask, openTaskModal, openProjectModal, recentTaskIds } = useUIStore();
  const { tasks } = useTaskStore();
  const { projects } = useProjectStore();
  const currentUser = useCurrentUser();
  const [query, setQuery] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const canCreate = canCreateTask(currentUser?.role ?? 'viewer');

  // Focus input when opened
  useEffect(() => {
    if (isCommandPaletteOpen) {
      setQuery('');
      setActiveIdx(0);
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [isCommandPaletteOpen]);

  const close = () => { closeCommandPalette(); setQuery(''); };

  const go = (fn: () => void) => { close(); fn(); };

  // ── Build result list ──────────────────────────────────────────────────
  const items = useMemo<PaletteItem[]>(() => {
    const q = query.trim();

    // ── Navigation actions (always shown) ─────────────────────────────
    const NAV_ACTIONS: PaletteItem[] = [
      { id: 'nav-dashboard', kind: 'action', label: 'Go to Dashboard', icon: <LayoutDashboard className="w-4 h-4" />, onSelect: () => go(() => navigate('/')) },
      { id: 'nav-today',     kind: 'action', label: 'Go to Today',     icon: <Sun className="w-4 h-4" />,            onSelect: () => go(() => navigate('/today')) },
      { id: 'nav-my-tasks',  kind: 'action', label: 'Go to My Tasks',  icon: <ListTodo className="w-4 h-4" />,       onSelect: () => go(() => navigate('/my-tasks')) },
      { id: 'nav-projects',  kind: 'action', label: 'Go to Projects',  icon: <FolderOpen className="w-4 h-4" />,     onSelect: () => go(() => navigate('/projects')) },
      { id: 'nav-calendar',  kind: 'action', label: 'Go to Calendar',  icon: <Calendar className="w-4 h-4" />,       onSelect: () => go(() => navigate('/calendar')) },
      { id: 'nav-analytics', kind: 'action', label: 'Go to Analytics', icon: <BarChart2 className="w-4 h-4" />,      onSelect: () => go(() => navigate('/analytics')) },
      { id: 'nav-workload',  kind: 'action', label: 'Go to Workload',  icon: <Users2 className="w-4 h-4" />,         onSelect: () => go(() => navigate('/workload')) },
      { id: 'nav-search',   kind: 'action', label: 'Go to Search',       icon: <Search className="w-4 h-4" />,   onSelect: () => go(() => navigate('/search')) },
      { id: 'nav-activity', kind: 'action', label: 'Go to Activity Feed', icon: <Activity className="w-4 h-4" />, onSelect: () => go(() => navigate('/activity')) },
      { id: 'nav-settings',  kind: 'action', label: 'Go to Settings',  icon: <Settings className="w-4 h-4" />,       onSelect: () => go(() => navigate('/settings')) },
      ...(canCreate ? [
        { id: 'action-new-task',    kind: 'action' as ResultKind, label: 'New Task',    icon: <Plus className="w-4 h-4" />, accent: '#4B8CF7', onSelect: () => go(() => openTaskModal()) },
        { id: 'action-new-project', kind: 'action' as ResultKind, label: 'New Project', icon: <Plus className="w-4 h-4" />, accent: '#8B5CF6', onSelect: () => go(() => openProjectModal()) },
      ] : []),
    ];

    if (!q) {
      // Show recent tasks + top nav actions when no query
      const recentItems: PaletteItem[] = recentTaskIds
        .map(id => tasks.find(t => t.id === id))
        .filter(Boolean)
        .map(task => task!) // TypeScript assertion
        .map(task => {
          const project = projects.find(p => p.id === task.projectId);
          return {
            id: `recent-${task.id}`,
            kind: 'recent' as ResultKind,
            label: task.title,
            sublabel: project?.name,
            icon: <Clock className="w-4 h-4 text-slate-500" />,
            onSelect: () => go(() => setSelectedTask(task.id)),
          };
        });
      return [...recentItems, ...NAV_ACTIONS.slice(0, 4)];
    }

    // Filter tasks
    const taskItems: PaletteItem[] = tasks
      .filter(t => matches(t.title, q))
      .slice(0, 8)
      .map(task => {
        const project = projects.find(p => p.id === task.projectId);
        return {
          id: `task-${task.id}`,
          kind: 'task',
          label: task.title,
          sublabel: project?.name,
          icon: <CheckSquare className="w-4 h-4 text-blue-400" />,
          onSelect: () => go(() => setSelectedTask(task.id)),
          _task: task,
        } as PaletteItem & { _task: typeof task };
      });

    // Filter projects
    const projectItems: PaletteItem[] = projects
      .filter(p => matches(p.name, q))
      .slice(0, 5)
      .map(project => ({
        id: `project-${project.id}`,
        kind: 'project',
        label: project.name,
        sublabel: project.description,
        icon: <span className="w-4 h-4 rounded text-xs flex items-center justify-center font-bold flex-shrink-0" style={{ backgroundColor: project.colour + '33', color: project.colour }}>{project.icon}</span>,
        accent: project.colour,
        onSelect: () => go(() => navigate(`/projects/${project.id}`)),
      }));

    // Filter actions
    const actionItems = NAV_ACTIONS.filter(a => matches(a.label, q));

    // Quick-create item — shown when user is typing and can create tasks
    const createItems: PaletteItem[] = [];
    if (canCreate) {
      const parsed = parseInlineTask(q);
      if (parsed.title) {
        const priOpt = PRIORITY_OPTIONS.find(p => p.value === parsed.priority);
        const assignee = parsed.assigneeId ? SEED_USERS.find(u => u.id === parsed.assigneeId) : null;
        const chips: string[] = [];
        if (parsed.priority !== 'medium') chips.push(priOpt?.label ?? parsed.priority);
        if (assignee) chips.push(`@${assignee.name.split(' ')[0]}`);
        if (parsed.dueDate) chips.push(parsed.dueDate === format(new Date(), 'yyyy-MM-dd') ? 'Today' : parsed.dueDate === format(addDays(new Date(), 1), 'yyyy-MM-dd') ? 'Tomorrow' : parsed.dueDate);
        createItems.push({
          id: 'quick-create',
          kind: 'create',
          label: parsed.title,
          sublabel: chips.length ? chips.join(' · ') : 'New task',
          icon: <Sparkles className="w-4 h-4 text-emerald-400" />,
          accent: '#10B981',
          onSelect: () => go(() => openTaskModal(undefined, parsed.dueDate, undefined, parsed.title, parsed.priority, parsed.assigneeId)),
        });
      }
    }

    return [...createItems, ...taskItems, ...projectItems, ...actionItems];
  }, [query, tasks, projects, recentTaskIds, canCreate]);

  // Keep active index in bounds
  useEffect(() => { setActiveIdx(0); }, [items.length]);

  // Scroll active item into view
  useEffect(() => {
    const el = listRef.current?.children[activeIdx] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIdx]);

  if (!isCommandPaletteOpen) return null;

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, items.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); items[activeIdx]?.onSelect(); }
    else if (e.key === 'Escape') { e.preventDefault(); close(); }
  };

  // ── Section label helpers ──────────────────────────────────────────────
  const showRecent  = !query && items.some(i => i.kind === 'recent');
  const showActions = !query && items.some(i => i.kind === 'action');
  const showTasks   = !!query && items.some(i => i.kind === 'task');
  const showProjects = !!query && items.some(i => i.kind === 'project');
  const showActionsQ = !!query && items.some(i => i.kind === 'action');
  const showCreate  = !!query && items.some(i => i.kind === 'create');

  const firstOfKind = (kind: ResultKind) => items.findIndex(i => i.kind === kind);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        onClick={close}
      />

      {/* Palette */}
      <div className="fixed inset-x-0 top-[12vh] z-50 mx-auto w-full max-w-xl px-4">
        <div className="bg-[#0C1526] border border-[#1C3054] rounded-2xl shadow-2xl overflow-hidden">
          {/* Search input */}
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[#1C3054]">
            <Search className="w-4 h-4 text-slate-500 flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Search tasks, projects, actions…"
              className="flex-1 bg-transparent text-sm text-white placeholder:text-slate-600 outline-none"
            />
            {query && (
              <button onClick={() => setQuery('')} className="text-xs text-slate-600 hover:text-slate-400 px-1.5 py-0.5 rounded border border-[#1C3054]">
                Clear
              </button>
            )}
            <kbd className="hidden sm:flex items-center justify-center px-1.5 py-0.5 rounded border border-[#1C3054] text-[10px] text-slate-600 font-mono">Esc</kbd>
          </div>

          {/* Results */}
          <div ref={listRef} className="max-h-[60vh] overflow-y-auto py-2">
            {items.length === 0 && (
              <p className="text-sm text-slate-600 text-center py-10">No results for "{query}"</p>
            )}

            {items.map((item, idx) => {
              const isActive = idx === activeIdx;
              const task = tasks.find(t => `task-${t.id}` === item.id || `recent-${t.id}` === item.id);

              // Section labels
              const sectionLabel =
                (showCreate  && item.kind === 'create'  && idx === firstOfKind('create'))   ? 'Create' :
                (showRecent  && item.kind === 'recent'  && idx === firstOfKind('recent'))   ? 'Recent' :
                (showActions && item.kind === 'action'  && idx === firstOfKind('action'))   ? 'Quick Actions' :
                (showTasks   && item.kind === 'task'    && idx === firstOfKind('task'))     ? 'Tasks' :
                (showProjects && item.kind === 'project' && idx === firstOfKind('project')) ? 'Projects' :
                (showActionsQ && item.kind === 'action' && idx === firstOfKind('action'))   ? 'Actions' :
                null;

              return (
                <div key={item.id}>
                  {sectionLabel && (
                    <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider px-4 pt-3 pb-1.5">
                      {sectionLabel}
                    </p>
                  )}
                  <button
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                      isActive ? 'bg-[#122040]' : 'hover:bg-[#06091A]/50'
                    )}
                    onMouseEnter={() => setActiveIdx(idx)}
                    onClick={item.onSelect}
                  >
                    <span className="flex-shrink-0 text-slate-400">{item.icon}</span>
                    <span className="flex-1 min-w-0">
                      <span className="text-sm text-slate-200 block truncate">
                        <Highlight text={item.label} query={query} />
                      </span>
                      {item.sublabel && (
                        <span className="text-xs text-slate-600 truncate block">{item.sublabel}</span>
                      )}
                    </span>
                    {/* Task metadata chips */}
                    {task && (
                      <span className="flex items-center gap-1.5 flex-shrink-0">
                        <PriorityDot priority={task.priority} />
                        <StatusDot status={task.status} />
                      </span>
                    )}
                    {/* Arrow for active action / create items */}
                    {isActive && (item.kind === 'action' || item.kind === 'create') && (
                      <ArrowRight className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="border-t border-[#1C3054] px-4 py-2 flex items-center gap-4 text-[10px] text-slate-700">
            <span><kbd className="font-mono">↑↓</kbd> navigate</span>
            <span><kbd className="font-mono">↵</kbd> select</span>
            <span><kbd className="font-mono">Esc</kbd> close</span>
            {!query && canCreate && (
              <span className="ml-auto text-slate-600">
                Type a task — use <span className="text-slate-500">!high</span> · <span className="text-slate-500">@name</span> · <span className="text-slate-500">tomorrow</span>
              </span>
            )}
            {query && <span className="ml-auto">{items.length} result{items.length !== 1 ? 's' : ''}</span>}
          </div>
        </div>
      </div>
    </>
  );
}
