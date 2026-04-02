import { useState, useMemo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
  Activity, CheckCircle2, ArrowRightLeft, AlertTriangle, UserCheck,
  MessageSquare, ListPlus, ListChecks, Pin, Copy, X, ChevronDown,
} from 'lucide-react';
import { useTaskStore } from '../store/taskStore';
import { useProjectStore } from '../store/projectStore';
import { useUIStore } from '../store/uiStore';
import { SEED_USERS } from '../lib/sampleData';
import { getInitials, cn } from '../lib/utils';
import type { ActivityVerb } from '../types';

/* ── Verb metadata ─────────────────────────────────────── */
const VERB_META: Record<ActivityVerb, { label: string; colour: string; Icon: typeof CheckCircle2 }> = {
  created:           { label: 'Created',           colour: '#10B981', Icon: CheckCircle2    },
  status_changed:    { label: 'Status changed',    colour: '#4B8CF7', Icon: ArrowRightLeft  },
  priority_changed:  { label: 'Priority changed',  colour: '#F59E0B', Icon: AlertTriangle   },
  assigned:          { label: 'Assigned',          colour: '#8B5CF6', Icon: UserCheck       },
  commented:         { label: 'Commented',         colour: '#64748B', Icon: MessageSquare   },
  subtask_added:     { label: 'Subtask added',     colour: '#06B6D4', Icon: ListPlus        },
  subtask_completed: { label: 'Subtask completed', colour: '#14B8A6', Icon: ListChecks      },
  pinned:            { label: 'Pinned',            colour: '#F59E0B', Icon: Pin             },
  duplicated:        { label: 'Duplicated',        colour: '#6366F1', Icon: Copy            },
};

/* ── Event sentence builder ────────────────────────────── */
function buildSentence(verb: ActivityVerb, meta?: Record<string, string>): { pre: string; post: string } {
  switch (verb) {
    case 'created':          return { pre: 'created', post: '' };
    case 'status_changed':   return { pre: 'moved', post: meta ? `from ${meta.from} → ${meta.to}` : '' };
    case 'priority_changed': return { pre: 'changed priority of', post: meta ? `${meta.from} → ${meta.to}` : '' };
    case 'assigned':         return { pre: 'assigned', post: meta?.to ? `to ${SEED_USERS.find(u => u.id === meta.to)?.name ?? meta.to}` : '' };
    case 'commented':        return { pre: 'commented on', post: '' };
    case 'subtask_added':    return { pre: 'added subtask to', post: meta?.title ? `"${meta.title}"` : '' };
    case 'subtask_completed':return { pre: 'completed a subtask in', post: meta?.title ? `"${meta.title}"` : '' };
    case 'pinned':           return { pre: 'pinned', post: '' };
    case 'duplicated':       return { pre: 'duplicated', post: '' };
    default:                 return { pre: verb, post: '' };
  }
}

/* ── Filter pill ───────────────────────────────────────── */
function FilterPill({
  active, label, colour, onClick,
}: { active: boolean; label: string; colour?: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium border transition-all',
        active
          ? 'border-transparent text-white'
          : 'border-[#1C3054] text-slate-500 hover:text-slate-300 bg-[#0C1526]'
      )}
      style={active && colour ? { backgroundColor: colour + '22', borderColor: colour + '55', color: colour } : undefined}
    >
      {label}
    </button>
  );
}

/* ── Page ──────────────────────────────────────────────── */
const PAGE_SIZE = 40;

export default function ActivityPage() {
  const { activityLog, tasks } = useTaskStore();
  const { projects } = useProjectStore();
  const { setSelectedTask } = useUIStore();

  const [verbFilters, setVerbFilters] = useState<ActivityVerb[]>([]);
  const [userFilters, setUserFilters] = useState<string[]>([]);
  const [projectFilter, setProjectFilter] = useState('');
  const [page, setPage] = useState(1);

  const toggleVerb = (v: ActivityVerb) =>
    setVerbFilters(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]);

  const toggleUser = (id: string) =>
    setUserFilters(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  /* Project filter — derive task IDs in that project */
  const projectTaskIds = useMemo(() => {
    if (!projectFilter) return null;
    return new Set(tasks.filter(t => t.projectId === projectFilter).map(t => t.id));
  }, [projectFilter, tasks]);

  const filtered = useMemo(() => {
    return activityLog.filter(e => {
      if (verbFilters.length > 0 && !verbFilters.includes(e.verb)) return false;
      if (userFilters.length > 0 && !userFilters.includes(e.userId)) return false;
      if (projectTaskIds !== null && !projectTaskIds.has(e.taskId)) return false;
      return true;
    });
  }, [activityLog, verbFilters, userFilters, projectTaskIds]);

  const visible = filtered.slice(0, page * PAGE_SIZE);
  const hasMore = visible.length < filtered.length;

  const hasAnyFilter = verbFilters.length > 0 || userFilters.length > 0 || !!projectFilter;

  const clearAll = () => {
    setVerbFilters([]);
    setUserFilters([]);
    setProjectFilter('');
    setPage(1);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-400" />
            Activity Feed
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {filtered.length} event{filtered.length !== 1 ? 's' : ''}
            {activityLog.length !== filtered.length && ` of ${activityLog.length}`}
          </p>
        </div>
        {hasAnyFilter && (
          <button onClick={clearAll} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors">
            <X className="w-3.5 h-3.5" /> Clear filters
          </button>
        )}
      </div>

      {/* Filter bar */}
      <div className="bg-[#0C1526] border border-[#1C3054] rounded-2xl p-4 space-y-3">
        {/* Event type filters */}
        <div>
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Event type</p>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(VERB_META) as ActivityVerb[]).map(v => {
              const meta = VERB_META[v];
              const count = activityLog.filter(e => e.verb === v).length;
              if (count === 0) return null;
              return (
                <FilterPill
                  key={v}
                  active={verbFilters.includes(v)}
                  label={`${meta.label} (${count})`}
                  colour={meta.colour}
                  onClick={() => { toggleVerb(v); setPage(1); }}
                />
              );
            })}
          </div>
        </div>

        {/* User filters */}
        <div>
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">User</p>
          <div className="flex flex-wrap gap-2">
            {SEED_USERS.map(user => {
              const count = activityLog.filter(e => e.userId === user.id).length;
              if (count === 0) return null;
              const active = userFilters.includes(user.id);
              return (
                <button
                  key={user.id}
                  onClick={() => { toggleUser(user.id); setPage(1); }}
                  className={cn(
                    'flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium border transition-all',
                    active
                      ? 'border-transparent text-white'
                      : 'border-[#1C3054] text-slate-500 hover:text-slate-300 bg-[#06091A]'
                  )}
                  style={active ? { backgroundColor: user.colour + '22', borderColor: user.colour + '55', color: user.colour } : undefined}
                >
                  <div
                    className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white flex-shrink-0"
                    style={{ backgroundColor: user.colour }}
                  >
                    {getInitials(user.name)}
                  </div>
                  {user.name.split(' ')[0]} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Project filter */}
        <div>
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Project</p>
          <div className="flex flex-wrap gap-2">
            {projects.map(p => {
              const pTaskIds = new Set(tasks.filter(t => t.projectId === p.id).map(t => t.id));
              const count = activityLog.filter(e => pTaskIds.has(e.taskId)).length;
              if (count === 0) return null;
              const active = projectFilter === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => { setProjectFilter(active ? '' : p.id); setPage(1); }}
                  className={cn(
                    'flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium border transition-all',
                    active
                      ? 'border-transparent text-white'
                      : 'border-[#1C3054] text-slate-500 hover:text-slate-300 bg-[#06091A]'
                  )}
                  style={active ? { backgroundColor: p.colour + '22', borderColor: p.colour + '55', color: p.colour } : undefined}
                >
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: p.colour }} />
                  {p.name} ({count})
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Feed */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 text-slate-600">
          <Activity className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No activity events match the current filters.</p>
        </div>
      ) : (
        <div className="relative">
          {/* Vertical timeline line */}
          <div className="absolute left-5 top-0 bottom-0 w-px bg-[#1C3054]" />

          <div className="space-y-1">
            {visible.map((event, i) => {
              const task = tasks.find(t => t.id === event.taskId);
              const user = SEED_USERS.find(u => u.id === event.userId);
              const verbMeta = VERB_META[event.verb] ?? VERB_META.created;
              const { pre, post } = buildSentence(event.verb, event.meta);
              const timeAgo = (() => {
                try { return formatDistanceToNow(new Date(event.createdAt), { addSuffix: true }); }
                catch { return ''; }
              })();

              /* Date separator */
              const eventDate = new Date(event.createdAt).toDateString();
              const prevDate = i > 0 ? new Date(visible[i - 1].createdAt).toDateString() : null;
              const showDateSep = eventDate !== prevDate;

              return (
                <div key={event.id}>
                  {showDateSep && (
                    <div className="flex items-center gap-3 py-3 pl-14">
                      <span className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider">
                        {new Date(event.createdAt).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  )}

                  <div className="flex items-start gap-4 py-2.5 px-2 rounded-xl hover:bg-[#0C1526]/60 transition-colors group">
                    {/* Timeline dot with verb icon */}
                    <div
                      className="relative z-10 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ backgroundColor: verbMeta.colour + '22', border: `1.5px solid ${verbMeta.colour}55` }}
                    >
                      <verbMeta.Icon className="w-3 h-3" style={{ color: verbMeta.colour }} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-1.5 flex-wrap">
                        {/* User avatar + name */}
                        {user && (
                          <span className="flex items-center gap-1.5 flex-shrink-0">
                            <div
                              className="w-4.5 h-4.5 w-[18px] h-[18px] rounded-full flex items-center justify-center text-[8px] font-bold text-white flex-shrink-0"
                              style={{ backgroundColor: user.colour }}
                            >
                              {getInitials(user.name)}
                            </div>
                            <span className="text-xs font-semibold text-slate-300">{user.name.split(' ')[0]}</span>
                          </span>
                        )}

                        <span className="text-xs text-slate-500">{pre}</span>

                        {/* Task name — clickable */}
                        {task ? (
                          <button
                            onClick={() => setSelectedTask(task.id)}
                            className="text-xs font-medium text-slate-200 hover:text-blue-400 transition-colors truncate max-w-[200px]"
                            title={task.title}
                          >
                            {task.title}
                          </button>
                        ) : (
                          <span className="text-xs text-slate-600 italic">[deleted task]</span>
                        )}

                        {post && <span className="text-xs text-slate-500">{post}</span>}
                      </div>

                      <p className="text-[10px] text-slate-600 mt-0.5">{timeAgo}</p>
                    </div>

                    {/* Verb badge */}
                    <span
                      className="flex-shrink-0 text-[9px] font-semibold px-1.5 py-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ backgroundColor: verbMeta.colour + '22', color: verbMeta.colour }}
                    >
                      {verbMeta.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Load more */}
          {hasMore && (
            <div className="flex justify-center pt-4">
              <button
                onClick={() => setPage(p => p + 1)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0C1526] border border-[#1C3054] text-xs text-slate-400 hover:text-slate-200 hover:border-slate-500 transition-all"
              >
                <ChevronDown className="w-3.5 h-3.5" />
                Load more ({filtered.length - visible.length} remaining)
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
