import { useMemo, useState } from 'react';
import { ViewerPile } from '../components/collaboration/ViewerPile';
import { useParams, useNavigate } from 'react-router-dom';
import { useProjectStore } from '../store/projectStore';
import { useTaskStore } from '../store/taskStore';
import { useUIStore } from '../store/uiStore';
import { useAuthStore } from '../store/authStore';
import { useSprintStore } from '../store/sprintStore';
import { RoleGuard } from '../components/auth/RoleGuard';
import { canCreateTask, canDeleteProject, canEditTask } from '../lib/permissions';
import { TaskBoard } from '../components/tasks/TaskBoard';
import { TaskList } from '../components/tasks/TaskList';
import { TaskTable } from '../components/tasks/TaskTable';
import { TaskTimeline } from '../components/tasks/TaskTimeline';
import { TaskMatrix } from '../components/tasks/TaskMatrix';
import { TaskFilters } from '../components/tasks/TaskFilters';
import { ProgressBar } from '../components/ui/ProgressBar';
import { Button } from '../components/ui/Button';
import { Plus, ArrowLeft, Trash2, Archive, CheckCircle2, Play, CalendarClock, AlertTriangle, Heart, CheckCheck, Download, Flag, CheckCircle, Circle as CircleIcon, TrendingDown, ChevronDown, Zap, SquareCheck, X as XIcon } from 'lucide-react';
import { differenceInCalendarDays, eachDayOfInterval, startOfDay, format, addDays, isPast } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from 'recharts';
import { SEED_USERS } from '../lib/sampleData';
import type { Project, Milestone } from '../types';
import { DEFAULT_FILTERS, applySort } from '../components/tasks/TaskFilters';
import type { FilterState } from '../components/tasks/TaskFilters';
import { Markdown } from '../components/ui/Markdown';
import { cn } from '../lib/utils';
import toast from 'react-hot-toast';
import { emitProjectUpdate, emitProjectDelete, emitTaskUpdate } from '../lib/collabEmit';

const STATUS_CYCLE: { value: Project['status']; label: string; icon: any; colour: string }[] = [
  { value: 'active',    label: 'Active',    icon: Play,         colour: 'text-green-400' },
  { value: 'completed', label: 'Completed', icon: CheckCircle2, colour: 'text-blue-400'  },
  { value: 'archived',  label: 'Archived',  icon: Archive,      colour: 'text-slate-400' },
];

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>();
  const { getProjectById, updateProject, deleteProject } = useProjectStore();
  const { tasks, updateTask } = useTaskStore();
  const { openTaskModal, currentView, setView } = useUIStore();
  const { currentUser } = useAuthStore();
  const navigate = useNavigate();
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [assigneeFilter, setAssigneeFilter] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesDraft, setNotesDraft] = useState('');
  const [showMilestoneForm, setShowMilestoneForm] = useState(false);
  const [milestoneTitle, setMilestoneTitle] = useState('');
  const [milestoneDate, setMilestoneDate] = useState('');
  const [showBurndown, setShowBurndown] = useState(false);
  const [showSprintForm, setShowSprintForm] = useState(false);
  const [sprintName, setSprintName] = useState('');
  const [sprintStart, setSprintStart] = useState('');
  const [sprintEnd, setSprintEnd] = useState('');
  const [sprintGoal, setSprintGoal] = useState('');
  const [sprintFilter, setSprintFilter] = useState<string | null>(null); // sprint id or 'backlog'

  const { sprints: allSprints, addSprint, updateSprint, deleteSprint, startSprint, completeSprint } = useSprintStore();
  const [retroSprint, setRetroSprint] = useState<(typeof allSprints)[0] | null>(null);
  const [retroNotes, setRetroNotes] = useState('');
  const [retroMoveIncomplete, setRetroMoveIncomplete] = useState(true);

  const role = currentUser?.role ?? 'viewer';

  const project = getProjectById(id!);

  // IDOR guard — admin sees all; members/viewers only see their projects
  const isMember = currentUser
    ? role === 'admin' || project?.memberIds.includes(currentUser.id)
    : false;

  if (!project || !isMember) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <p className="text-slate-400 font-medium">Project not found or access denied.</p>
        <button onClick={() => navigate('/projects')} className="text-sm text-blue-400 hover:text-blue-300">
          ← Back to All Projects
        </button>
      </div>
    );
  }

  // O(n) single pass for stats
  const pTasks = tasks.filter(t => t.projectId === id);
  let done = 0, active = 0, totalEst = 0, totalLogged = 0;
  for (const t of pTasks) {
    if (t.status === 'done') done++;
    else if (t.status === 'in-progress') active++;
    totalEst += t.estimatedHours ?? 0;
    totalLogged += t.loggedHours ?? 0;
  }
  const pct = pTasks.length ? Math.round((done / pTasks.length) * 100) : 0;
  const members = SEED_USERS.filter(u => project.memberIds.includes(u.id));

  // Health score: penalise overdue tasks (max 100)
  const overdueCount = pTasks.filter(t => t.status !== 'done' && t.dueDate && new Date(t.dueDate) < new Date()).length;
  const healthScore = pTasks.length === 0 ? 100 : Math.max(0, Math.round(100 - (overdueCount / pTasks.length) * 100 * 0.6 + (pct * 0.4) - (overdueCount > 0 ? 10 : 0)));
  const healthColour = healthScore >= 75 ? '#10B981' : healthScore >= 50 ? '#F59E0B' : '#EF4444';
  const healthLabel = healthScore >= 75 ? 'Healthy' : healthScore >= 50 ? 'At Risk' : 'Critical';

  // Due date countdown
  const daysUntilDue = project.dueDate ? differenceInCalendarDays(new Date(project.dueDate), new Date()) : null;

  // Burndown chart data — remaining tasks per day from project start to due/today
  const burndownData = useMemo(() => {
    if (pTasks.length === 0) return [];
    const start = startOfDay(new Date(project.createdAt));
    const endRaw = project.dueDate ? new Date(project.dueDate) : new Date();
    const end = startOfDay(endRaw < new Date() ? new Date() : endRaw);
    // Guard: if range is fewer than 2 days, pad to 14 days
    const effectiveEnd = differenceInCalendarDays(end, start) < 2 ? addDays(start, 14) : end;
    const days = eachDayOfInterval({ start, end: effectiveEnd });
    const totalAtStart = pTasks.filter(t => new Date(t.createdAt) <= start).length || pTasks.length;
    const totalDays = days.length - 1;
    return days.map((day, i) => {
      const dayEnd = new Date(day);
      dayEnd.setHours(23, 59, 59, 999);
      const created = pTasks.filter(t => new Date(t.createdAt) <= dayEnd).length;
      const completed = pTasks.filter(t =>
        t.status === 'done' && new Date(t.updatedAt) <= dayEnd
      ).length;
      const remaining = Math.max(0, created - completed);
      const ideal = totalDays > 0 ? Math.round(Math.max(0, totalAtStart - (totalAtStart / totalDays) * i)) : 0;
      return {
        date: format(day, 'd MMM'),
        remaining,
        ideal,
      };
    });
  }, [pTasks, project.createdAt, project.dueDate]);

  const filtered = useMemo(() => pTasks.filter(t => {
    if (filters.search && !t.title.toLowerCase().includes(filters.search.toLowerCase())) return false;
    if (filters.status.length && !filters.status.includes(t.status)) return false;
    if (filters.priority.length && !filters.priority.includes(t.priority)) return false;
    if (filters.tags.length && !filters.tags.some(tag => t.tags?.includes(tag))) return false;
    if (filters.assignees.length && !filters.assignees.includes(t.assigneeId ?? '')) return false;
    if (assigneeFilter && t.assigneeId !== assigneeFilter) return false;
    if (sprintFilter === 'backlog' && t.sprintId) return false;
    if (sprintFilter && sprintFilter !== 'backlog' && t.sprintId !== sprintFilter) return false;
    return true;
  }), [pTasks, filters, assigneeFilter, sprintFilter]);

  const sorted = useMemo(
    () => applySort(filtered, filters.sortBy, filters.sortDir),
    [filtered, filters.sortBy, filters.sortDir]
  );

  const currentStatusMeta = STATUS_CYCLE.find(s => s.value === project.status) ?? STATUS_CYCLE[0];
  const nextStatus = STATUS_CYCLE[(STATUS_CYCLE.findIndex(s => s.value === project.status) + 1) % STATUS_CYCLE.length];

  const handleCycleStatus = () => {
    updateProject(project.id, { status: nextStatus.value });
    emitProjectUpdate(project.id, { status: nextStatus.value });
    toast.success(`Project marked as ${nextStatus.label}`);
  };

  const handleExportCSV = () => {
    const userMap = new Map(SEED_USERS.map(u => [u.id, u.name]));
    const headers = ['ID', 'Title', 'Status', 'Priority', 'Assignee', 'Due Date', 'Tags', 'Est. Hours', 'Logged Hours'];
    const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const rows = pTasks.map(t => [
      t.id, t.title, t.status, t.priority,
      userMap.get(t.assigneeId ?? '') ?? '',
      t.dueDate ? t.dueDate.slice(0, 10) : '',
      t.tags.join('; '),
      t.estimatedHours ?? '',
      t.loggedHours ?? '',
    ].map(v => escape(String(v))).join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${project.name.replace(/\s+/g, '-').toLowerCase()}-tasks.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported');
  };

  const handleMarkAllDone = () => {
    const activeTasks = pTasks.filter(t => t.status !== 'done');
    if (activeTasks.length === 0) return;
    if (!window.confirm(`Mark all ${activeTasks.length} active tasks as done?`)) return;
    activeTasks.forEach(t => {
      if (canEditTask(role, t.assigneeId, currentUser?.id ?? '')) {
        updateTask(t.id, { status: 'done' });
        emitTaskUpdate(t.id, { status: 'done' });
      }
    });
    toast.success(`Marked ${activeTasks.length} tasks as done`);
  };

  const handleDelete = () => {
    if (!window.confirm(`Delete "${project.name}"? This cannot be undone.`)) return;
    deleteProject(project.id);
    emitProjectDelete(project.id);
    toast.success('Project deleted');
    navigate('/projects');
  };

  const StatusIcon = currentStatusMeta.icon;

  const milestones: Milestone[] = project.milestones ?? [];
  const projectSprints = allSprints.filter(sp => sp.projectId === id).sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  const activeSprint = projectSprints.find(sp => sp.status === 'active');

  const handleAddSprint = () => {
    if (!sprintName.trim() || !sprintStart || !sprintEnd) return;
    const n = projectSprints.filter(sp => sp.status !== 'completed').length + 1;
    addSprint({
      projectId: id!,
      name: sprintName.trim() || `Sprint ${n}`,
      goal: sprintGoal.trim() || undefined,
      startDate: new Date(sprintStart).toISOString(),
      endDate: new Date(sprintEnd).toISOString(),
    });
    setSprintName(''); setSprintStart(''); setSprintEnd(''); setSprintGoal('');
    setShowSprintForm(false);
    toast.success('Sprint created');
  };

  const handleAssignToSprint = (taskId: string, sprintId: string | undefined) => {
    updateTask(taskId, { sprintId });
    emitTaskUpdate(taskId, { sprintId });
  };

  const handleAddMilestone = () => {
    if (!milestoneTitle.trim() || !milestoneDate) return;
    const m: Milestone = {
      id: crypto.randomUUID(),
      title: milestoneTitle.trim(),
      dueDate: new Date(milestoneDate).toISOString(),
      completed: false,
    };
    const newMilestones = [...milestones, m];
    updateProject(project.id, { milestones: newMilestones });
    emitProjectUpdate(project.id, { milestones: newMilestones });
    setMilestoneTitle('');
    setMilestoneDate('');
    setShowMilestoneForm(false);
    toast.success('Milestone added');
  };

  const toggleMilestone = (mId: string) => {
    const updated = milestones.map(m => m.id === mId ? { ...m, completed: !m.completed } : m);
    updateProject(project.id, { milestones: updated });
    emitProjectUpdate(project.id, { milestones: updated });
  };

  const deleteMilestone = (mId: string) => {
    const updated = milestones.filter(m => m.id !== mId);
    updateProject(project.id, { milestones: updated });
    emitProjectUpdate(project.id, { milestones: updated });
  };

  const handleCompleteRetro = () => {
    if (!retroSprint) return;
    const spTasks = pTasks.filter(t => t.sprintId === retroSprint.id);
    const completed = spTasks.filter(t => t.status === 'done').length;
    // Move incomplete tasks back to backlog if toggled
    if (retroMoveIncomplete) {
      spTasks.filter(t => t.status !== 'done').forEach(t => { updateTask(t.id, { sprintId: undefined }); emitTaskUpdate(t.id, { sprintId: undefined }); });
    }
    completeSprint(retroSprint.id);
    updateSprint(retroSprint.id, {
      retrospective: retroNotes.trim() || undefined,
      velocity: completed,
    });
    toast.success(`${retroSprint.name} completed — velocity: ${completed} task${completed !== 1 ? 's' : ''}`, { duration: 4000 });
    setRetroSprint(null);
    setRetroNotes('');
    setRetroMoveIncomplete(true);
  };

  return (
    <div className="pb-20 md:pb-0">
      <button onClick={() => navigate('/projects')} className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 mb-5 transition-colors">
        <ArrowLeft className="w-4 h-4" /> All Projects
      </button>

      <div className="bg-[#111C44] border border-[#1F3461] rounded-xl p-5 mb-6">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1 flex-wrap">
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: project.colour }} />
              <h2 className="text-lg font-bold text-white truncate">{project.name}</h2>
              <ViewerPile projectId={id} />
              {/* Health badge */}
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border" style={{ color: healthColour, borderColor: `${healthColour}40`, backgroundColor: `${healthColour}15` }}>
                <Heart className="w-2.5 h-2.5" />
                {healthLabel}
              </span>
              {/* Due date countdown */}
              {daysUntilDue !== null && (
                <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${daysUntilDue < 0 ? 'text-red-400 border-red-500/30 bg-red-500/10' : daysUntilDue <= 7 ? 'text-amber-400 border-amber-500/30 bg-amber-500/10' : 'text-slate-400 border-[#1F3461] bg-[#0B1437]'}`}>
                  {daysUntilDue < 0 ? <AlertTriangle className="w-2.5 h-2.5" /> : <CalendarClock className="w-2.5 h-2.5" />}
                  {daysUntilDue < 0 ? `${Math.abs(daysUntilDue)}d overdue` : daysUntilDue === 0 ? 'Due today' : `${daysUntilDue}d left`}
                </span>
              )}
            </div>
            {project.description && <p className="text-sm text-slate-400 ml-6">{project.description}</p>}
          </div>

          {/* Admin controls */}
          <div className="flex items-center gap-2 ml-4 flex-shrink-0">
            {pTasks.length > 0 && (
              <button
                onClick={handleExportCSV}
                className="p-1.5 rounded-lg hover:bg-[#1B254B] text-slate-500 hover:text-slate-300 transition-colors"
                title="Export tasks as CSV"
              >
                <Download className="w-4 h-4" />
              </button>
            )}
            <RoleGuard allowed={canDeleteProject(role)}>
              {/* Status cycle button */}
              <button
                onClick={handleCycleStatus}
                className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg bg-[#0B1437] border border-[#1F3461] hover:border-blue-500/40 transition-all ${currentStatusMeta.colour}`}
                title={`Mark as ${nextStatus.label}`}
              >
                <StatusIcon className="w-3.5 h-3.5" />
                {currentStatusMeta.label}
              </button>
              {/* Delete */}
              <button
                onClick={handleDelete}
                className="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-500 hover:text-red-400 transition-colors"
                title="Delete project"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </RoleGuard>

            <RoleGuard allowed={canCreateTask(role)}>
              {pTasks.filter(t => t.status !== 'done').length > 0 && (
                <Button size="sm" variant="secondary" icon={<CheckCheck className="w-3.5 h-3.5" />} onClick={handleMarkAllDone}>
                  Mark all done
                </Button>
              )}
              <Button size="sm" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => openTaskModal(undefined, undefined, id)}>
                Add Task
              </Button>
            </RoleGuard>
          </div>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 text-center mb-4">
          {[
            ['Total', pTasks.length],
            ['Done', done],
            ['Active', active],
            ['Members', members.length],
            ['Est. hrs', totalEst > 0 ? `${totalEst}h` : '—'],
            ['Logged', totalLogged > 0 ? `${Math.round(totalLogged * 10) / 10}h` : '—'],
          ].map(([l, v]) => (
            <div key={l} className="bg-[#0B1437] rounded-xl p-3">
              <p className={`text-xl font-bold ${l === 'Logged' && totalLogged > totalEst && totalEst > 0 ? 'text-red-400' : 'text-white'}`}>{v}</p>
              <p className="text-xs text-slate-500">{l}</p>
            </div>
          ))}
        </div>
        <ProgressBar value={pct} colour={project.colour} showLabel />

        {/* Project notes — inline editable */}
        <div className="mt-4 pt-4 border-t border-[#1F3461]">
          {editingNotes ? (
            <div>
              <textarea
                value={notesDraft}
                onChange={e => setNotesDraft(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Escape') setEditingNotes(false);
                  if (e.key === 'Enter' && e.metaKey) {
                    const notes = notesDraft.trim() || undefined;
                    updateProject(project.id, { notes });
                    emitProjectUpdate(project.id, { notes });
                    setEditingNotes(false);
                    toast.success('Notes saved');
                  }
                }}
                rows={3}
                maxLength={4096}
                placeholder="Add project notes, links, or context…"
                className="w-full bg-[#0B1437] border border-blue-500 rounded-xl px-3 py-2 text-sm text-slate-200 placeholder-slate-600 outline-none resize-none transition-colors"
              />
              <div className="flex items-center gap-2 mt-1.5">
                <button
                  onClick={() => { const notes = notesDraft.trim() || undefined; updateProject(project.id, { notes }); emitProjectUpdate(project.id, { notes }); setEditingNotes(false); toast.success('Notes saved'); }}
                  className="px-2.5 py-1 rounded-lg bg-blue-500 text-white text-xs font-medium hover:bg-blue-600 transition-colors"
                >Save</button>
                <button onClick={() => setEditingNotes(false)} className="text-xs text-slate-500 hover:text-slate-300 transition-colors">Cancel</button>
                <span className="text-[10px] text-slate-600 ml-auto">⌘↵ to save</span>
              </div>
            </div>
          ) : (
            <button
              onClick={() => { setNotesDraft(project.notes ?? ''); setEditingNotes(true); }}
              className="w-full text-left group/notes"
              title="Click to edit project notes"
            >
              {project.notes ? (
                <div className="border border-transparent hover:border-[#1F3461] rounded-lg px-2 py-1 -mx-2 -my-1 transition-colors">
                  <Markdown className="text-sm opacity-80 group-hover/notes:opacity-100 transition-opacity">{project.notes}</Markdown>
                </div>
              ) : (
                <p className="text-xs text-slate-600 italic hover:text-slate-500 transition-colors">+ Add notes or links…</p>
              )}
            </button>
          )}
        </div>

        {/* Assignee quick-filter */}
        {members.length > 1 && (
          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-[#1F3461]">
            <span className="text-xs text-slate-500">Filter by:</span>
            <div className="flex gap-1.5 flex-wrap">
              {members.map(m => {
                const mCount = pTasks.filter(t => t.assigneeId === m.id && t.status !== 'done').length;
                const isActive = assigneeFilter === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => setAssigneeFilter(isActive ? null : m.id)}
                    title={m.name}
                    className={`flex items-center gap-1.5 pl-1 pr-2.5 py-1 rounded-full text-xs font-medium border transition-all ${isActive ? 'border-blue-500/50 bg-blue-500/10 text-blue-300' : 'border-[#1F3461] text-slate-400 hover:border-[#3B82F6]/40 hover:text-slate-200'}`}
                  >
                    <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0" style={{ backgroundColor: m.colour }}>
                      {m.name.split(' ').map((n: string) => n[0]).join('')}
                    </div>
                    {m.name.split(' ')[0]}
                    {mCount > 0 && <span className={`text-[10px] px-1 rounded-full ${isActive ? 'bg-blue-500/30 text-blue-200' : 'bg-[#1B254B] text-slate-500'}`}>{mCount}</span>}
                  </button>
                );
              })}
              {assigneeFilter && (
                <button
                  onClick={() => setAssigneeFilter(null)}
                  className="text-xs text-slate-500 hover:text-slate-300 px-2 transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Milestones ── */}
      {(milestones.length > 0 || role === 'admin') && (
        <div className="bg-[#111C44] border border-[#1F3461] rounded-xl p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Flag className="w-4 h-4 text-purple-400" />
              <h3 className="text-sm font-semibold text-white">Milestones</h3>
              {milestones.length > 0 && (
                <span className="text-[10px] text-slate-500 bg-[#1B254B] px-1.5 py-0.5 rounded-full">
                  {milestones.filter(m => m.completed).length}/{milestones.length}
                </span>
              )}
            </div>
            <RoleGuard allowed={role === 'admin'}>
              <button
                onClick={() => setShowMilestoneForm(v => !v)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-slate-400 hover:text-blue-400 hover:bg-[#1B254B] border border-transparent hover:border-[#1F3461] transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                Add milestone
              </button>
            </RoleGuard>
          </div>

          {/* Add form */}
          {showMilestoneForm && (
            <div className="flex items-center gap-3 mb-4 p-3 bg-[#0B1437] border border-blue-500/30 rounded-xl">
              <input
                autoFocus
                value={milestoneTitle}
                onChange={e => setMilestoneTitle(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAddMilestone(); if (e.key === 'Escape') setShowMilestoneForm(false); }}
                placeholder="Milestone name…"
                maxLength={128}
                className="flex-1 bg-transparent text-sm text-slate-200 placeholder-slate-600 outline-none"
              />
              <input
                type="date"
                value={milestoneDate}
                onChange={e => setMilestoneDate(e.target.value)}
                className="bg-transparent text-sm text-slate-400 outline-none [color-scheme:dark] border-0"
              />
              <button
                onClick={handleAddMilestone}
                disabled={!milestoneTitle.trim() || !milestoneDate}
                className="px-3 py-1 rounded-lg bg-blue-500 text-white text-xs font-medium hover:bg-blue-600 disabled:opacity-30 transition-colors flex-shrink-0"
              >
                Save
              </button>
            </div>
          )}

          {milestones.length === 0 ? (
            <p className="text-xs text-slate-600 italic">No milestones yet. Add key dates to track project progress.</p>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-1">
              {milestones
                .slice()
                .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
                .map(m => {
                  const due = new Date(m.dueDate);
                  const daysLeft = Math.ceil((due.getTime() - Date.now()) / 86_400_000);
                  const overdue = !m.completed && daysLeft < 0;
                  const soon = !m.completed && !overdue && daysLeft <= 7;
                  const colour = m.completed ? '#10B981' : overdue ? '#EF4444' : soon ? '#F59E0B' : '#8B5CF6';
                  return (
                    <div
                      key={m.id}
                      className="flex-shrink-0 w-52 p-3.5 rounded-xl border transition-all"
                      style={{ borderColor: `${colour}40`, backgroundColor: `${colour}08` }}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <button
                          onClick={() => toggleMilestone(m.id)}
                          className="flex-shrink-0 mt-0.5 transition-colors"
                          title={m.completed ? 'Mark incomplete' : 'Mark complete'}
                        >
                          {m.completed
                            ? <CheckCircle className="w-4 h-4 text-green-400" />
                            : <CircleIcon className="w-4 h-4" style={{ color: colour }} />
                          }
                        </button>
                        <p className={`text-xs font-medium flex-1 leading-tight ${m.completed ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                          {m.title}
                        </p>
                        <button
                          onClick={() => deleteMilestone(m.id)}
                          className="text-slate-700 hover:text-red-400 transition-colors flex-shrink-0"
                          title="Remove milestone"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-slate-500">
                          {due.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                        <span className="text-[10px] font-semibold" style={{ color: colour }}>
                          {m.completed ? 'Done' : overdue ? `${Math.abs(daysLeft)}d late` : daysLeft === 0 ? 'Today' : `${daysLeft}d left`}
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {/* ── Burndown Chart ── */}
      {pTasks.length > 0 && (
        <div className="bg-[#111C44] border border-[#1F3461] rounded-xl mb-6 overflow-hidden">
          <button
            onClick={() => setShowBurndown(v => !v)}
            className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-[#1B254B]/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-blue-400" />
              <h3 className="text-sm font-semibold text-white">Burndown Chart</h3>
              <span className="text-[10px] text-slate-500 bg-[#1B254B] px-1.5 py-0.5 rounded-full">
                {pTasks.filter(t => t.status !== 'done').length} remaining
              </span>
            </div>
            <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${showBurndown ? 'rotate-180' : ''}`} />
          </button>

          {showBurndown && (
            <div className="px-5 pb-5">
              {burndownData.length < 2 ? (
                <p className="text-xs text-slate-600 italic py-4 text-center">Not enough data yet — add tasks with due dates.</p>
              ) : (
                <>
                  <p className="text-xs text-slate-500 mb-4">
                    Remaining tasks vs ideal burn rate
                    {project.dueDate ? ` · Due ${new Date(project.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}
                  </p>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={burndownData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                      <XAxis
                        dataKey="date"
                        tick={{ fill: '#64748B', fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                        interval={Math.max(1, Math.floor(burndownData.length / 6) - 1)}
                      />
                      <YAxis
                        tick={{ fill: '#64748B', fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                        allowDecimals={false}
                        width={28}
                      />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#111C44', border: '1px solid #1F3461', borderRadius: 8, color: '#E2E8F0', fontSize: 12 }}
                        formatter={(v, name) => [v, name === 'remaining' ? 'Remaining' : 'Ideal']}
                      />
                      <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: '#94A3B8' }} />
                      <ReferenceLine y={0} stroke="#1F3461" />
                      <Line
                        type="monotone"
                        dataKey="ideal"
                        name="Ideal"
                        stroke="#1F3461"
                        strokeWidth={1.5}
                        strokeDasharray="4 3"
                        dot={false}
                        activeDot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="remaining"
                        name="Remaining"
                        stroke={project.colour}
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4, fill: project.colour }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Sprints ── */}
      {(projectSprints.length > 0 || role === 'admin') && (
        <div className="bg-[#111C44] border border-[#1F3461] rounded-xl p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-blue-400" />
              <h3 className="text-sm font-semibold text-white">Sprints</h3>
              {activeSprint && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 border border-green-500/30">
                  Active
                </span>
              )}
            </div>
            <RoleGuard allowed={role === 'admin'}>
              <button
                onClick={() => setShowSprintForm(v => !v)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-slate-400 hover:text-blue-400 hover:bg-[#1B254B] border border-transparent hover:border-[#1F3461] transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                New sprint
              </button>
            </RoleGuard>
          </div>

          {/* Create sprint form */}
          {showSprintForm && (
            <div className="mb-4 p-4 bg-[#0B1437] border border-blue-500/30 rounded-xl space-y-3">
              <div className="flex gap-3">
                <input
                  autoFocus
                  value={sprintName}
                  onChange={e => setSprintName(e.target.value)}
                  placeholder="Sprint name…"
                  maxLength={64}
                  className="flex-1 bg-transparent border-b border-[#1F3461] focus:border-blue-500 text-sm text-slate-200 placeholder-slate-600 outline-none pb-1 transition-colors"
                />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 block">Start</label>
                  <input
                    type="date"
                    value={sprintStart}
                    onChange={e => setSprintStart(e.target.value)}
                    className="w-full bg-transparent text-sm text-slate-300 outline-none [color-scheme:dark]"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 block">End</label>
                  <input
                    type="date"
                    value={sprintEnd}
                    onChange={e => setSprintEnd(e.target.value)}
                    className="w-full bg-transparent text-sm text-slate-300 outline-none [color-scheme:dark]"
                  />
                </div>
              </div>
              <input
                value={sprintGoal}
                onChange={e => setSprintGoal(e.target.value)}
                placeholder="Sprint goal (optional)…"
                maxLength={256}
                className="w-full bg-transparent border-b border-[#1F3461] focus:border-blue-500 text-sm text-slate-200 placeholder-slate-600 outline-none pb-1 transition-colors"
              />
              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleAddSprint}
                  disabled={!sprintName.trim() || !sprintStart || !sprintEnd}
                  className="px-3 py-1 rounded-lg bg-blue-500 text-white text-xs font-medium hover:bg-blue-600 disabled:opacity-30 transition-colors"
                >
                  Create sprint
                </button>
                <button onClick={() => setShowSprintForm(false)} className="text-xs text-slate-500 hover:text-slate-300 transition-colors px-2">
                  Cancel
                </button>
              </div>
            </div>
          )}

          {projectSprints.length === 0 ? (
            <p className="text-xs text-slate-600 italic">No sprints yet. Sprints help you plan and track time-boxed iterations.</p>
          ) : (
            <div className="space-y-3">
              {/* Sprint filter bar */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSprintFilter(null)}
                  className={cn('text-[10px] font-medium px-2.5 py-1 rounded-full border transition-all', sprintFilter === null ? 'bg-blue-500/15 border-blue-500/40 text-blue-300' : 'border-[#1F3461] text-slate-500 hover:border-slate-600 hover:text-slate-400')}
                >
                  All tasks
                </button>
                <button
                  onClick={() => setSprintFilter('backlog')}
                  className={cn('text-[10px] font-medium px-2.5 py-1 rounded-full border transition-all', sprintFilter === 'backlog' ? 'bg-slate-500/15 border-slate-500/40 text-slate-300' : 'border-[#1F3461] text-slate-500 hover:border-slate-600 hover:text-slate-400')}
                >
                  Backlog
                </button>
                {projectSprints.map(sp => (
                  <button
                    key={sp.id}
                    onClick={() => setSprintFilter(sp.id === sprintFilter ? null : sp.id)}
                    className={cn('text-[10px] font-medium px-2.5 py-1 rounded-full border transition-all', sprintFilter === sp.id ? 'bg-blue-500/15 border-blue-500/40 text-blue-300' : 'border-[#1F3461] text-slate-500 hover:border-slate-600 hover:text-slate-400')}
                  >
                    {sp.name}
                    {sp.status === 'active' && <span className="ml-1 text-green-400">●</span>}
                  </button>
                ))}
              </div>

              {/* Sprint cards */}
              {projectSprints.map(sp => {
                const spTasks = pTasks.filter(t => t.sprintId === sp.id);
                const spDone = spTasks.filter(t => t.status === 'done').length;
                const spPct = spTasks.length ? Math.round((spDone / spTasks.length) * 100) : 0;
                const statusColour = sp.status === 'active' ? '#10B981' : sp.status === 'completed' ? '#3B82F6' : '#64748B';
                const spEnd = new Date(sp.endDate);
                const daysLeft = Math.ceil((spEnd.getTime() - Date.now()) / 86_400_000);
                const overdue = sp.status === 'active' && isPast(spEnd);
                const backlogCount = pTasks.filter(t => !t.sprintId).length;

                return (
                  <div key={sp.id} className="border border-[#1F3461] rounded-xl p-4 hover:border-blue-500/20 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-white">{sp.name}</span>
                          <span
                            className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full border capitalize"
                            style={{ color: statusColour, borderColor: `${statusColour}40`, backgroundColor: `${statusColour}15` }}
                          >
                            {sp.status}
                          </span>
                          {overdue && (
                            <span className="text-[10px] text-red-400 font-semibold">Overdue</span>
                          )}
                        </div>
                        {sp.goal && (
                          <p className="text-xs text-slate-500 mt-0.5 truncate">{sp.goal}</p>
                        )}
                        <div className="flex items-center gap-3 mt-1.5 text-[10px] text-slate-600">
                          <span>{format(new Date(sp.startDate), 'd MMM')} → {format(new Date(sp.endDate), 'd MMM yyyy')}</span>
                          {sp.status === 'active' && !overdue && (
                            <span className="text-amber-400">{daysLeft}d left</span>
                          )}
                          <span>{spTasks.length} task{spTasks.length !== 1 ? 's' : ''} · {spDone} done</span>
                        </div>
                      </div>

                      {/* Sprint progress ring */}
                      <div className="flex-shrink-0 relative w-10 h-10">
                        <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                          <circle cx="18" cy="18" r="15.9" fill="none" stroke="#1F3461" strokeWidth="3" />
                          <circle
                            cx="18" cy="18" r="15.9" fill="none"
                            stroke={statusColour}
                            strokeWidth="3"
                            strokeDasharray={`${spPct} ${100 - spPct}`}
                            strokeLinecap="round"
                            pathLength="100"
                          />
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white">{spPct}%</span>
                      </div>
                    </div>

                    {/* Progress bar */}
                    {spTasks.length > 0 && (
                      <div className="mt-3">
                        <ProgressBar value={spPct} colour={statusColour} />
                      </div>
                    )}

                    {/* Retrospective notes (completed sprints) */}
                    {sp.status === 'completed' && sp.retrospective && (
                      <div className="mt-3 px-3 py-2.5 bg-[#0B1437] border border-[#1F3461] rounded-lg">
                        <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1.5">Retrospective</p>
                        <p className="text-xs text-slate-400 whitespace-pre-line leading-relaxed">{sp.retrospective}</p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2 mt-3 flex-wrap">
                      {sp.status === 'planning' && role === 'admin' && (
                        <button
                          onClick={() => { startSprint(sp.id); toast.success(`${sp.name} started!`); }}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 text-xs font-medium hover:bg-green-500/20 transition-colors"
                        >
                          <Play className="w-3 h-3" />
                          Start sprint
                        </button>
                      )}
                      {sp.status === 'active' && role === 'admin' && (
                        <button
                          onClick={() => { setRetroSprint(sp); setRetroNotes(sp.retrospective ?? ''); }}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-medium hover:bg-blue-500/20 transition-colors"
                        >
                          <SquareCheck className="w-3 h-3" />
                          Complete
                        </button>
                      )}
                      {role === 'admin' && (
                        <button
                          onClick={() => setSprintFilter(sp.id === sprintFilter ? null : sp.id)}
                          className={cn('flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-medium transition-colors', sprintFilter === sp.id ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' : 'border-[#1F3461] text-slate-500 hover:text-slate-300')}
                        >
                          {sprintFilter === sp.id ? 'Showing sprint tasks' : 'View tasks'}
                        </button>
                      )}
                      {sp.status === 'completed' && sp.velocity !== undefined && (
                        <span className="flex items-center gap-1 text-[10px] text-slate-500 px-2 py-1 rounded-lg bg-[#0B1437]">
                          <Zap className="w-3 h-3 text-amber-400" />
                          {sp.velocity} task{sp.velocity !== 1 ? 's' : ''} done
                        </span>
                      )}
                      {/* Quick-assign backlog tasks to this sprint */}
                      {role === 'admin' && sp.status !== 'completed' && backlogCount > 0 && (
                        <button
                          onClick={() => {
                            pTasks.filter(t => !t.sprintId && t.status !== 'done')
                              .forEach(t => handleAssignToSprint(t.id, sp.id));
                            toast.success(`${backlogCount} backlog task${backlogCount !== 1 ? 's' : ''} added to ${sp.name}`);
                          }}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#1F3461] text-slate-500 text-xs hover:text-slate-300 hover:border-slate-600 transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                          Add {backlogCount} backlog tasks
                        </button>
                      )}
                      {role === 'admin' && (
                        <button
                          onClick={() => {
                            pTasks.filter(t => t.sprintId === sp.id)
                              .forEach(t => handleAssignToSprint(t.id, undefined));
                            deleteSprint(sp.id);
                            if (sprintFilter === sp.id) setSprintFilter(null);
                            toast.success('Sprint deleted');
                          }}
                          className="ml-auto flex items-center gap-1 p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          title="Delete sprint"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <TaskFilters filters={filters} onChange={setFilters} view={currentView} onViewChange={setView} showTimeline />
      {/* Sprint context label */}
      {sprintFilter && (
        <div className="flex items-center gap-2 mb-3 px-1">
          <span className="text-xs text-slate-500">
            Showing: <span className="text-blue-400 font-medium">
              {sprintFilter === 'backlog' ? 'Backlog (unassigned to sprint)' : projectSprints.find(sp => sp.id === sprintFilter)?.name ?? 'Sprint'}
            </span>
          </span>
          <button onClick={() => setSprintFilter(null)} className="text-slate-600 hover:text-slate-400 transition-colors">
            <XIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      {currentView === 'board'     ? <TaskBoard    tasks={sorted} projectId={id} />
       : currentView === 'table'   ? <TaskTable    tasks={sorted} />
       : currentView === 'timeline'? <TaskTimeline tasks={sorted} />
       : currentView === 'matrix'  ? <TaskMatrix   tasks={sorted} />
       : <TaskList tasks={sorted} projectId={id} />}

      {/* ── Sprint Retrospective Modal ── */}
      {retroSprint && (() => {
        const spTasks = pTasks.filter(t => t.sprintId === retroSprint.id);
        const spDone = spTasks.filter(t => t.status === 'done').length;
        const spIncomplete = spTasks.filter(t => t.status !== 'done').length;
        const durationDays = differenceInCalendarDays(new Date(retroSprint.endDate), new Date(retroSprint.startDate)) + 1;
        const velocityPct = spTasks.length ? Math.round((spDone / spTasks.length) * 100) : 0;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setRetroSprint(null)}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <div
              className="relative bg-[#111C44] border border-[#1F3461] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="px-6 pt-6 pb-4 border-b border-[#1F3461]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <SquareCheck className="w-4 h-4 text-blue-400" />
                      <h2 className="text-base font-bold text-white">Complete Sprint</h2>
                    </div>
                    <p className="text-sm text-blue-300 font-medium">{retroSprint.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {format(new Date(retroSprint.startDate), 'd MMM')} → {format(new Date(retroSprint.endDate), 'd MMM yyyy')} · {durationDays} day{durationDays !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <button onClick={() => setRetroSprint(null)} className="text-slate-500 hover:text-slate-300 transition-colors p-1">
                    <XIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Velocity Stats */}
              <div className="px-6 py-4 border-b border-[#1F3461]">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-3 font-semibold">Sprint Summary</p>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="bg-[#0B1437] rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-green-400">{spDone}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Completed</p>
                  </div>
                  <div className="bg-[#0B1437] rounded-xl p-3 text-center">
                    <p className={`text-2xl font-bold ${spIncomplete > 0 ? 'text-amber-400' : 'text-slate-400'}`}>{spIncomplete}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Incomplete</p>
                  </div>
                  <div className="bg-[#0B1437] rounded-xl p-3 text-center">
                    <p className={`text-2xl font-bold ${velocityPct >= 80 ? 'text-green-400' : velocityPct >= 50 ? 'text-amber-400' : 'text-red-400'}`}>{velocityPct}%</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Velocity</p>
                  </div>
                </div>
                {retroSprint.goal && (
                  <div className="text-xs text-slate-400 bg-[#0B1437] px-3 py-2 rounded-lg mb-3">
                    <span className="text-slate-600 font-medium">Goal: </span>{retroSprint.goal}
                  </div>
                )}
                {spIncomplete > 0 && (
                  <label className="flex items-center gap-2.5 cursor-pointer group">
                    <div
                      onClick={() => setRetroMoveIncomplete(v => !v)}
                      className={`w-8 h-4 rounded-full transition-colors flex-shrink-0 relative ${retroMoveIncomplete ? 'bg-blue-500' : 'bg-[#1F3461]'}`}
                    >
                      <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform ${retroMoveIncomplete ? 'translate-x-4' : 'translate-x-0.5'}`} />
                    </div>
                    <span className="text-xs text-slate-400 group-hover:text-slate-300 transition-colors select-none">
                      Move {spIncomplete} incomplete task{spIncomplete !== 1 ? 's' : ''} back to backlog
                    </span>
                  </label>
                )}
              </div>

              {/* Retrospective notes */}
              <div className="px-6 py-4">
                <label className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block mb-2">
                  Retrospective Notes <span className="text-slate-600 normal-case">(optional)</span>
                </label>
                <textarea
                  value={retroNotes}
                  onChange={e => setRetroNotes(e.target.value)}
                  maxLength={2048}
                  rows={4}
                  placeholder="What went well? What to improve? Any blockers?&#10;&#10;e.g. ✓ Good collaboration on auth tickets&#10;✗ Underestimated API integration work"
                  className="w-full bg-[#0B1437] border border-[#1F3461] focus:border-blue-500/60 rounded-xl px-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 outline-none resize-none transition-colors"
                />
                <p className="text-[10px] text-slate-600 text-right mt-1">{retroNotes.length}/2048</p>
              </div>

              {/* Footer actions */}
              <div className="px-6 pb-6 flex items-center gap-3">
                <button
                  onClick={handleCompleteRetro}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold transition-colors"
                >
                  <SquareCheck className="w-4 h-4" />
                  Complete Sprint
                </button>
                <button
                  onClick={() => setRetroSprint(null)}
                  className="px-4 py-2.5 rounded-xl border border-[#1F3461] text-slate-400 text-sm hover:text-slate-200 hover:border-slate-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
