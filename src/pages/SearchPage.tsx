import { useState, useMemo, useEffect, useRef } from 'react';
import { Search, X, Tag, FolderOpen, MessageSquare, FileText, Clock, ChevronDown } from 'lucide-react';
import { useTaskStore } from '../store/taskStore';
import { useProjectStore } from '../store/projectStore';
import { useUIStore } from '../store/uiStore';
import { useNavigate } from 'react-router-dom';
import { PriorityBadge } from '../components/ui/PriorityBadge';
import { StatusBadge } from '../components/ui/StatusBadge';
import { formatRelativeDate, isOverdue, cn } from '../lib/utils';
import { SEED_USERS } from '../lib/sampleData';
import { useTagStore } from '../store/tagStore';

/* ── Search match helpers ──────────────────────────────── */
function highlight(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-yellow-400/30 text-yellow-300 rounded px-0.5">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}

function getMatchContext(text: string, query: string, contextChars = 80): string {
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text.slice(0, contextChars);
  const start = Math.max(0, idx - 30);
  const end = Math.min(text.length, idx + query.length + 50);
  return (start > 0 ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : '');
}

/* ── Result types ─────────────────────────────────────── */
type TaskResult = {
  kind: 'task';
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  projectId: string;
  assigneeId?: string;
  dueDate?: string;
  tags: string[];
  matchIn: ('title' | 'description' | 'comment')[];
  matchContext?: string;
};

type ProjectResult = {
  kind: 'project';
  id: string;
  name: string;
  description?: string;
  colour: string;
  matchContext?: string;
};

type AnyResult = TaskResult | ProjectResult;

/* ── Page ──────────────────────────────────────────────── */
type ScopeFilter = 'all' | 'tasks' | 'projects';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState<ScopeFilter>('all');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState('');
  const [tagFilters, setTagFilters] = useState<string[]>([]);
  const [dueDateFrom, setDueDateFrom] = useState('');
  const [dueDateTo, setDueDateTo] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { tasks } = useTaskStore();
  const { projects } = useProjectStore();
  const { setSelectedTask } = useUIStore();
  const navigate = useNavigate();
  const tags = useTagStore(s => s.tags);

  // Auto-focus on mount
  useEffect(() => { inputRef.current?.focus(); }, []);

  const q = query.trim().toLowerCase();

  const toggleTag = (tagId: string) =>
    setTagFilters(prev => prev.includes(tagId) ? prev.filter(t => t !== tagId) : [...prev, tagId]);

  const hasAdvancedFilters = !!(assigneeFilter || tagFilters.length || dueDateFrom || dueDateTo);

  const clearAll = () => {
    setStatusFilter(''); setPriorityFilter('');
    setAssigneeFilter(''); setTagFilters([]);
    setDueDateFrom(''); setDueDateTo('');
  };

  const results = useMemo((): AnyResult[] => {
    if (!q) return [];

    const out: AnyResult[] = [];

    // ── Task search ────────────────────────────────────────
    if (scope !== 'projects') {
      for (const task of tasks) {
        if (statusFilter && task.status !== statusFilter) continue;
        if (priorityFilter && task.priority !== priorityFilter) continue;
        if (assigneeFilter && task.assigneeId !== assigneeFilter) continue;
        if (tagFilters.length && !tagFilters.every(tid => task.tags.includes(tid))) continue;
        if (dueDateFrom && (!task.dueDate || task.dueDate < new Date(dueDateFrom).toISOString())) continue;
        if (dueDateTo) {
          const toEnd = new Date(dueDateTo); toEnd.setHours(23, 59, 59, 999);
          if (!task.dueDate || task.dueDate > toEnd.toISOString()) continue;
        }

        const matchIn: TaskResult['matchIn'] = [];
        let matchContext: string | undefined;

        const titleMatch = task.title.toLowerCase().includes(q);
        if (titleMatch) matchIn.push('title');

        const descMatch = task.description?.toLowerCase().includes(q) ?? false;
        if (descMatch) {
          matchIn.push('description');
          matchContext = getMatchContext(task.description!, query.trim());
        }

        const commentMatch = task.comments.some(c => c.content.toLowerCase().includes(q));
        if (commentMatch) {
          matchIn.push('comment');
          const matchingComment = task.comments.find(c => c.content.toLowerCase().includes(q));
          if (matchingComment && !matchContext) {
            matchContext = getMatchContext(matchingComment.content, query.trim());
          }
        }

        if (matchIn.length > 0) {
          out.push({
            kind: 'task',
            id: task.id,
            title: task.title,
            description: task.description,
            status: task.status,
            priority: task.priority,
            projectId: task.projectId,
            assigneeId: task.assigneeId,
            dueDate: task.dueDate,
            tags: task.tags,
            matchIn,
            matchContext,
          });
        }
      }
    }

    // ── Project search ─────────────────────────────────────
    if (scope !== 'tasks') {
      for (const project of projects) {
        const nameMatch = project.name.toLowerCase().includes(q);
        const descMatch = project.description?.toLowerCase().includes(q) ?? false;
        const notesMatch = project.notes?.toLowerCase().includes(q) ?? false;
        if (nameMatch || descMatch || notesMatch) {
          const matchText = descMatch ? project.description : notesMatch ? project.notes : undefined;
          out.push({
            kind: 'project',
            id: project.id,
            name: project.name,
            description: project.description,
            colour: project.colour,
            matchContext: matchText ? getMatchContext(matchText, query.trim()) : undefined,
          });
        }
      }
    }

    // Sort: title matches first, then description, then comment
    return out.sort((a, b) => {
      if (a.kind === 'task' && b.kind === 'task') {
        const scoreA = (a.matchIn.includes('title') ? 3 : 0) + (a.matchIn.includes('description') ? 2 : 0) + (a.matchIn.includes('comment') ? 1 : 0);
        const scoreB = (b.matchIn.includes('title') ? 3 : 0) + (b.matchIn.includes('description') ? 2 : 0) + (b.matchIn.includes('comment') ? 1 : 0);
        return scoreB - scoreA;
      }
      return 0;
    });
  }, [q, tasks, projects, scope, statusFilter, priorityFilter, assigneeFilter, tagFilters, dueDateFrom, dueDateTo, query]);

  const taskResults = results.filter((r): r is TaskResult => r.kind === 'task');
  const projectResults = results.filter((r): r is ProjectResult => r.kind === 'project');

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { setQuery(''); inputRef.current?.focus(); }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Search input */}
      <div className={cn(
        'flex items-center gap-3 bg-[#0C1526] border rounded-2xl px-4 py-3 transition-colors',
        q ? 'border-blue-500/50' : 'border-[#1C3054]'
      )}>
        <Search className="w-5 h-5 text-slate-400 flex-shrink-0" />
        <input
          ref={inputRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search tasks, descriptions, comments, projects…"
          className="flex-1 bg-transparent text-base text-slate-200 placeholder-slate-500 outline-none"
        />
        {query && (
          <button onClick={() => { setQuery(''); inputRef.current?.focus(); }} className="text-slate-500 hover:text-slate-300 transition-colors">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Scope */}
        {(['all', 'tasks', 'projects'] as ScopeFilter[]).map(s => (
          <button
            key={s}
            onClick={() => setScope(s)}
            className={cn(
              'px-3 py-1.5 rounded-xl text-xs font-medium border transition-all capitalize',
              scope === s
                ? 'bg-blue-500/20 border-blue-500/40 text-blue-300'
                : 'border-[#1C3054] text-slate-500 hover:text-slate-300 bg-[#0C1526]'
            )}
          >
            {s === 'all' ? 'Everything' : s}
            {s === 'tasks' && q && ` (${taskResults.length})`}
            {s === 'projects' && q && ` (${projectResults.length})`}
          </button>
        ))}

        <div className="w-px h-5 bg-[#1C3054] mx-1" />

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="bg-[#0C1526] border border-[#1C3054] rounded-xl px-2.5 py-1.5 text-xs text-slate-400 outline-none"
        >
          <option value="">Any status</option>
          <option value="todo">To Do</option>
          <option value="in-progress">In Progress</option>
          <option value="review">Review</option>
          <option value="done">Done</option>
          <option value="blocked">Blocked</option>
        </select>

        {/* Priority filter */}
        <select
          value={priorityFilter}
          onChange={e => setPriorityFilter(e.target.value)}
          className="bg-[#0C1526] border border-[#1C3054] rounded-xl px-2.5 py-1.5 text-xs text-slate-400 outline-none"
        >
          <option value="">Any priority</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        {/* Advanced toggle */}
        <button
          onClick={() => setShowAdvanced(v => !v)}
          className={cn(
            'flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ml-auto',
            (showAdvanced || hasAdvancedFilters)
              ? 'bg-purple-500/20 border-purple-500/40 text-purple-300'
              : 'border-[#1C3054] text-slate-500 hover:text-slate-300 bg-[#0C1526]'
          )}
        >
          Filters
          {hasAdvancedFilters && <span className="w-1.5 h-1.5 rounded-full bg-purple-400 ml-0.5" />}
          <ChevronDown className={cn('w-3 h-3 transition-transform', showAdvanced && 'rotate-180')} />
        </button>

        {(statusFilter || priorityFilter || hasAdvancedFilters) && (
          <button onClick={clearAll} className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
            Clear all
          </button>
        )}
      </div>

      {/* Advanced filters panel */}
      {showAdvanced && (
        <div className="bg-[#0C1526] border border-[#1C3054] rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Assignee */}
            <div>
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Assignee</p>
              <select
                value={assigneeFilter}
                onChange={e => setAssigneeFilter(e.target.value)}
                className="w-full bg-[#06091A] border border-[#1C3054] rounded-xl px-2.5 py-1.5 text-xs text-slate-400 outline-none"
              >
                <option value="">Anyone</option>
                {SEED_USERS.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>

            {/* Due date range */}
            <div>
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Due date range</p>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={dueDateFrom}
                  onChange={e => setDueDateFrom(e.target.value)}
                  className="flex-1 bg-[#06091A] border border-[#1C3054] rounded-xl px-2 py-1.5 text-xs text-slate-400 outline-none [color-scheme:dark]"
                />
                <span className="text-slate-600 text-xs">to</span>
                <input
                  type="date"
                  value={dueDateTo}
                  onChange={e => setDueDateTo(e.target.value)}
                  className="flex-1 bg-[#06091A] border border-[#1C3054] rounded-xl px-2 py-1.5 text-xs text-slate-400 outline-none [color-scheme:dark]"
                />
              </div>
            </div>
          </div>

          {/* Tag filter pills */}
          {tags.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Tags</p>
              <div className="flex flex-wrap gap-1.5">
                {tags.map(tag => {
                  const active = tagFilters.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      onClick={() => toggleTag(tag.id)}
                      className={cn(
                        'text-xs font-medium px-2.5 py-1 rounded-full border transition-all',
                        active ? 'border-transparent' : 'border-[#1C3054] text-slate-500 hover:text-slate-300'
                      )}
                      style={active ? { backgroundColor: `${tag.colour}22`, color: tag.colour, borderColor: `${tag.colour}55` } : {}}
                    >
                      {tag.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Results */}
      {!q ? (
        <div className="text-center py-16 text-slate-600">
          <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Type to search across all tasks, descriptions, comments, and projects.</p>
          <p className="text-xs mt-1 text-slate-700">Tip: results highlight exactly where your query matched.</p>
        </div>
      ) : results.length === 0 ? (
        <div className="text-center py-16 text-slate-600">
          <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No results for "<span className="text-slate-400">{query}</span>"</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary */}
          <p className="text-xs text-slate-500">
            {results.length} result{results.length !== 1 ? 's' : ''} for "<span className="text-slate-300">{query}</span>"
          </p>

          {/* Task results */}
          {taskResults.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Tag className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tasks ({taskResults.length})</span>
              </div>
              <div className="space-y-2">
                {taskResults.map(result => {
                  const project = projects.find(p => p.id === result.projectId);
                  const assignee = SEED_USERS.find(u => u.id === result.assigneeId);
                  const overdue = isOverdue(result.dueDate) && result.status !== 'done';
                  const resultTags = result.tags.map(id => tags.find(t => t.id === id)).filter(Boolean);

                  return (
                    <button
                      key={result.id}
                      onClick={() => setSelectedTask(result.id)}
                      className="w-full text-left bg-[#0C1526] border border-[#1C3054] hover:border-blue-500/30 hover:bg-[#122040] rounded-xl p-4 transition-all group"
                    >
                      {/* Title row */}
                      <div className="flex items-start gap-3 mb-2">
                        <div className="flex-1 min-w-0">
                          <p className={cn(
                            'text-sm font-medium',
                            result.status === 'done' ? 'line-through text-slate-500' : 'text-slate-100 group-hover:text-white'
                          )}>
                            {highlight(result.title, query.trim())}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <PriorityBadge priority={result.priority as any} />
                          <StatusBadge status={result.status as any} />
                        </div>
                      </div>

                      {/* Match context — description or comment snippet */}
                      {result.matchContext && !result.matchIn.includes('title') && (
                        <p className="text-xs text-slate-500 mb-2 flex items-start gap-1.5">
                          {result.matchIn.includes('comment')
                            ? <MessageSquare className="w-3 h-3 flex-shrink-0 mt-0.5 text-slate-600" />
                            : <FileText className="w-3 h-3 flex-shrink-0 mt-0.5 text-slate-600" />
                          }
                          <span className="leading-relaxed">{highlight(result.matchContext, query.trim())}</span>
                        </p>
                      )}

                      {/* Match location badges */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {result.matchIn.map(m => (
                          <span key={m} className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium">
                            in {m}
                          </span>
                        ))}

                        {project && (
                          <span className="flex items-center gap-1 text-[10px] text-slate-500">
                            <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: project.colour }} />
                            {project.name}
                          </span>
                        )}

                        {result.dueDate && (
                          <span className={cn('flex items-center gap-1 text-[10px]', overdue ? 'text-red-400' : 'text-slate-500')}>
                            <Clock className="w-2.5 h-2.5" />
                            {formatRelativeDate(result.dueDate)}
                          </span>
                        )}

                        {assignee && (
                          <span className="flex items-center gap-1 text-[10px] text-slate-500">
                            <div
                              className="w-3 h-3 rounded-full flex items-center justify-center text-[7px] font-bold text-white"
                              style={{ backgroundColor: assignee.colour }}
                            >
                              {assignee.name.split(' ').map(n => n[0]).join('')}
                            </div>
                            {assignee.name.split(' ')[0]}
                          </span>
                        )}

                        {resultTags.slice(0, 2).map(tag => tag && (
                          <span key={tag.id} className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ backgroundColor: `${tag.colour}22`, color: tag.colour }}>
                            {tag.name}
                          </span>
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Project results */}
          {projectResults.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <FolderOpen className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Projects ({projectResults.length})</span>
              </div>
              <div className="space-y-2">
                {projectResults.map(result => {
                  const taskCount = tasks.filter(t => t.projectId === result.id).length;
                  const doneCount = tasks.filter(t => t.projectId === result.id && t.status === 'done').length;
                  return (
                    <button
                      key={result.id}
                      onClick={() => navigate(`/projects/${result.id}`)}
                      className="w-full text-left bg-[#0C1526] border border-[#1C3054] hover:border-blue-500/30 hover:bg-[#122040] rounded-xl p-4 transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl flex-shrink-0" style={{ backgroundColor: result.colour + '33', border: `1px solid ${result.colour}44` }}>
                          <div className="w-full h-full rounded-xl flex items-center justify-center">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: result.colour }} />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-100 group-hover:text-white">
                            {highlight(result.name, query.trim())}
                          </p>
                          {result.matchContext && (
                            <p className="text-xs text-slate-500 mt-0.5 truncate">
                              {highlight(result.matchContext, query.trim())}
                            </p>
                          )}
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <p className="text-xs text-slate-400">{taskCount} task{taskCount !== 1 ? 's' : ''}</p>
                          {taskCount > 0 && (
                            <p className="text-[10px] text-slate-600">{Math.round((doneCount / taskCount) * 100)}% done</p>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
