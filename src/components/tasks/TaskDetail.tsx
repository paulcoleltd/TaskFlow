import { useState, useRef } from 'react';
import { ViewerPile } from '../collaboration/ViewerPile';
import { useNavigate } from 'react-router-dom';
import { X, Edit2, Trash2, Calendar, User, Tag, Clock, CheckSquare2, MessageCircle, Send, ChevronDown, Copy, ExternalLink, Plus, Timer, Pin, AlertCircle, Activity, Maximize2, Repeat2, Link2, XCircle, Square, BookmarkPlus, Paperclip, Download, FileText, Image, FileArchive, File } from 'lucide-react';
import { formatDistanceToNow, formatDistance, addDays, addMonths, format } from 'date-fns';
import type { Task, ActivityVerb, Attachment } from '../../types';
import { useTaskStore } from '../../store/taskStore';
import { useProjectStore } from '../../store/projectStore';
import { useUIStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';
import { RoleGuard } from '../auth/RoleGuard';
import { canEditTask, canDeleteTask } from '../../lib/permissions';
import { StatusBadge } from '../ui/StatusBadge';
import { PriorityBadge } from '../ui/PriorityBadge';
import { ProgressBar } from '../ui/ProgressBar';
import { formatDate, cn, generateId, now } from '../../lib/utils';
import { SEED_USERS } from '../../lib/sampleData';
import { STATUS_OPTIONS, PRIORITY_OPTIONS, RECURRENCE_OPTIONS } from '../../lib/constants';
import { useTagStore } from '../../store/tagStore';
import { useTemplateStore } from '../../store/templateStore';
import { Markdown } from '../ui/Markdown';
import toast from 'react-hot-toast';
import { getSocket } from '../../lib/socket';
import { emitTaskDelete, emitTaskCreate } from '../../lib/collabEmit';

export function TaskDetail() {
  const navigate = useNavigate();
  const { selectedTaskId, setSelectedTask, openTaskModal, openFocusMode, activeTimer, startTimer, startPomodoro, stopTimer } = useUIStore();
  const { tasks, updateTask, deleteTask, togglePin, duplicateTask, logActivity, getTaskActivity, addTask } = useTaskStore();
  const { getProjectById } = useProjectStore();
  const { currentUser } = useAuthStore();
  const tags = useTagStore(s => s.tags);
  const addTemplate = useTemplateStore(s => s.addTemplate);
  const [commentText, setCommentText] = useState('');
  const [mentionState, setMentionState] = useState<{ query: string; atIndex: number } | null>(null);
  const [newSubtask, setNewSubtask] = useState('');
  const [showSubtaskInput, setShowSubtaskInput] = useState(false);
  const [logHours, setLogHours] = useState('');
  const [showLogTime, setShowLogTime] = useState(false);
  const [showSetEstimate, setShowSetEstimate] = useState(false);
  const [estimateInput, setEstimateInput] = useState('');
  const [editingDesc, setEditingDesc] = useState(false);
  const [descDraft, setDescDraft] = useState('');
  const [depSearch, setDepSearch] = useState('');
  const [showDepPicker, setShowDepPicker] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState('');
  const subtaskInputRef = useRef<HTMLInputElement>(null);
  const logTimeInputRef = useRef<HTMLInputElement>(null);
  const descRef = useRef<HTMLTextAreaElement>(null);
  const commentRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const task = tasks.find(t => t.id === selectedTaskId);

  if (!task || !selectedTaskId) return null;

  // Emit a task update to other connected clients (echo-free: server uses socket.broadcast).
  // Attachments are excluded — they contain base64 data that exceeds the server's schema.
  const emitUpdate = (updates: Partial<Task>) => {
    const { attachments: _a, ...safe } = updates as Task & { attachments?: unknown };
    try { getSocket().emit('task:update', { taskId: task.id, updates: safe }); } catch {}
  };

  const project = getProjectById(task.projectId);
  const assignee = SEED_USERS.find(u => u.id === task.assigneeId);
  const completedSubs = task.subtasks.filter(s => s.completed).length;
  const subProgress = task.subtasks.length ? (completedSubs / task.subtasks.length) * 100 : 0;

  const role = currentUser?.role ?? 'viewer';
  const userId = currentUser?.id ?? '';
  const canEdit = canEditTask(role, task.assigneeId, userId);
  const canDelete = canDeleteTask(role);

  const handleDelete = () => {
    const snapshot = { ...task };
    deleteTask(task.id);
    emitTaskDelete(task.id);
    setSelectedTask(null);
    toast(
      (t) => (
        <div className="flex items-center gap-3">
          <span className="text-sm">Task deleted</span>
          <button
            onClick={() => {
              useTaskStore.getState().restoreTask(snapshot);
              useUIStore.getState().setSelectedTask(snapshot.id);
              toast.dismiss(t.id);
              toast.success('Task restored');
            }}
            className="text-blue-400 font-semibold hover:text-blue-300 transition-colors text-sm flex-shrink-0"
          >
            Undo
          </button>
        </div>
      ),
      { duration: 5000, icon: '🗑️' }
    );
  };

  const handleClone = () => {
    duplicateTask(task.id);
    logActivity(task.id, userId, 'duplicated');
    toast.success('Task duplicated');
  };

  // ── Attachment handlers ────────────────────────────────────────────────────
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB per file
  const MAX_ATTACHMENTS = 10;

  const processFiles = (files: FileList | null) => {
    if (!files || !canEdit) return;
    const existing = task.attachments ?? [];
    if (existing.length >= MAX_ATTACHMENTS) {
      toast.error(`Maximum ${MAX_ATTACHMENTS} attachments per task.`);
      return;
    }
    Array.from(files).slice(0, MAX_ATTACHMENTS - existing.length).forEach(file => {
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`"${file.name}" exceeds the 5 MB limit.`);
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = e.target?.result as string;
        const attachment: Attachment = {
          id: generateId(),
          name: file.name.slice(0, 256),
          size: file.size,
          type: file.type || 'application/octet-stream',
          data,
          uploadedAt: now(),
          uploadedBy: userId,
        };
        const updated = [...(useTaskStore.getState().tasks.find(t => t.id === task.id)?.attachments ?? []), attachment];
        updateTask(task.id, { attachments: updated, attachmentCount: updated.length });
        toast.success(`"${file.name}" attached`);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    processFiles(e.target.files);
    e.target.value = ''; // reset so same file can be re-uploaded
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    processFiles(e.dataTransfer.files);
  };

  const handleRemoveAttachment = (attachmentId: string) => {
    const updated = (task.attachments ?? []).filter(a => a.id !== attachmentId);
    updateTask(task.id, { attachments: updated, attachmentCount: updated.length });
  };

  const handleDownloadAttachment = (attachment: Attachment) => {
    const a = document.createElement('a');
    a.href = attachment.data;
    a.download = attachment.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return Image;
    if (type === 'application/zip' || type.includes('compressed') || type.includes('archive')) return FileArchive;
    if (type === 'application/pdf' || type.startsWith('text/')) return FileText;
    return File;
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleSaveAsTemplate = () => {
    const name = window.prompt('Template name:', task.title);
    if (!name?.trim()) return;
    addTemplate({
      name: name.trim(),
      icon: '📋',
      description: task.description ?? '',
      priority: task.priority,
      subtasks: task.subtasks.map(s => s.title),
      tags: task.tags,
      estimatedHours: task.estimatedHours,
    });
    toast.success(`Template "${name.trim()}" saved — available in New Task`);
  };

  const cycleStatus = () => {
    if (!canEdit) return;
    const ORDER = STATUS_OPTIONS.map(s => s.value);
    const next = ORDER[(ORDER.indexOf(task.status) + 1) % ORDER.length];
    updateTask(task.id, { status: next });
    emitUpdate({ status: next as Task['status'] });
    logActivity(task.id, userId, 'status_changed', { from: task.status, to: next });
    const label = STATUS_OPTIONS.find(s => s.value === next)?.label ?? next;
    toast.success(`Status → ${label}`);
    if (next === 'done' && task.recurrence && task.recurrence !== 'none') {
      // Compute the next due date based on the recurrence interval
      const nextDue = (() => {
        if (!task.dueDate) return undefined;
        const base = new Date(task.dueDate);
        if (task.recurrence === 'daily')   return format(addDays(base, 1),    'yyyy-MM-dd');
        if (task.recurrence === 'weekly')  return format(addDays(base, 7),    'yyyy-MM-dd');
        if (task.recurrence === 'monthly') return format(addMonths(base, 1),  'yyyy-MM-dd');
        return undefined;
      })();
      addTask({
        title: task.title,
        description: task.description,
        status: 'todo',
        priority: task.priority,
        projectId: task.projectId,
        assigneeId: task.assigneeId,
        dueDate: nextDue,
        tags: task.tags,
        // Reset subtask completion but keep the same titles
        subtasks: task.subtasks.map(s => ({ id: generateId(), title: s.title, completed: false })),
        comments: [],
        attachments: [],
        attachmentCount: 0,
        estimatedHours: task.estimatedHours,
        recurrence: task.recurrence,
      });
      const recurring = useTaskStore.getState().tasks.at(-1);
      if (recurring) emitTaskCreate(recurring);
      const dueSuffix = nextDue ? ` — due ${format(new Date(nextDue), 'd MMM')}` : '';
      toast.success(`Next occurrence created${dueSuffix}`, { duration: 4000, icon: '🔁' });
    }
  };

  const toggleSub = (subId: string) => {
    if (!canEdit) return;
    const updated = task.subtasks.map(s => s.id === subId ? { ...s, completed: !s.completed } : s);
    updateTask(task.id, { subtasks: updated });
    emitUpdate({ subtasks: updated });
  };

  // ── @mention helpers ────────────────────────────────────────────────────
  const allUsers = SEED_USERS;

  const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setCommentText(val);
    const cursor = e.target.selectionStart ?? val.length;
    const before = val.slice(0, cursor);
    const atMatch = before.match(/@(\w*)$/);
    if (atMatch) {
      setMentionState({ query: atMatch[1].toLowerCase(), atIndex: cursor - atMatch[0].length });
    } else {
      setMentionState(null);
    }
  };

  const insertMention = (user: typeof SEED_USERS[0]) => {
    if (!mentionState) return;
    const firstName = user.name.split(' ')[0];
    const before = commentText.slice(0, mentionState.atIndex);
    const after = commentText.slice(mentionState.atIndex + mentionState.query.length + 1);
    const newText = `${before}@${firstName} ${after}`;
    setCommentText(newText);
    setMentionState(null);
    const newCursor = mentionState.atIndex + firstName.length + 2;
    setTimeout(() => {
      commentRef.current?.focus();
      commentRef.current?.setSelectionRange(newCursor, newCursor);
    }, 0);
  };

  const mentionSuggestions = mentionState
    ? allUsers.filter(u =>
        u.id !== currentUser?.id &&
        (mentionState.query === '' || u.name.toLowerCase().startsWith(mentionState.query))
      ).slice(0, 5)
    : [];

  const handleAddComment = () => {
    const content = commentText.trim();
    if (!content || !currentUser) return;
    // Extract @mentions — match @word, map to user IDs by first name
    const mentionRegex = /@(\w+)/g;
    const mentionedFirstNames = [...content.matchAll(mentionRegex)].map(m => m[1].toLowerCase());
    const mentionedIds = allUsers
      .filter(u => mentionedFirstNames.includes(u.name.split(' ')[0].toLowerCase()))
      .map(u => u.id);
    const comment = {
      id: generateId(),
      taskId: task.id,
      userId: currentUser.id,
      content,
      createdAt: now(),
      mentions: mentionedIds.length > 0 ? mentionedIds : undefined,
    };
    updateTask(task.id, { comments: [...task.comments, comment] });
    logActivity(task.id, currentUser.id, 'commented');
    try { getSocket().emit('comment:add', { taskId: task.id, comment }); } catch {}
    if (mentionedIds.length > 0) {
      const names = allUsers.filter(u => mentionedIds.includes(u.id)).map(u => u.name.split(' ')[0]);
      toast.success(`Notified ${names.join(', ')}`);
    }
    setCommentText('');
    setMentionState(null);
  };

  const handleEditComment = (commentId: string) => {
    const c = task.comments.find(c => c.id === commentId);
    if (!c) return;
    setEditingCommentId(commentId);
    setEditingCommentText(c.content);
  };

  const handleSaveEditComment = () => {
    const trimmed = editingCommentText.trim();
    if (!trimmed || !editingCommentId) { setEditingCommentId(null); return; }
    const comments = task.comments.map(c =>
      c.id === editingCommentId ? { ...c, content: trimmed } : c
    );
    updateTask(task.id, { comments });
    emitUpdate({ comments });
    setEditingCommentId(null);
  };

  const handleDeleteComment = (commentId: string) => {
    const comments = task.comments.filter(c => c.id !== commentId);
    updateTask(task.id, { comments });
    emitUpdate({ comments });
  };

  const handleAddSubtask = () => {
    const title = newSubtask.trim();
    if (!title) return;
    const sub = { id: generateId(), title, completed: false };
    const subtasks = [...task.subtasks, sub];
    updateTask(task.id, { subtasks });
    emitUpdate({ subtasks });
    setNewSubtask('');
    setShowSubtaskInput(false);
    toast.success('Subtask added');
  };

  const handleConvertSubtask = (subId: string, subTitle: string) => {
    const subtasks = task.subtasks.filter(s => s.id !== subId);
    updateTask(task.id, { subtasks });
    emitUpdate({ subtasks });
    addTask({
      title: subTitle,
      status: 'todo',
      priority: task.priority,
      projectId: task.projectId,
      assigneeId: task.assigneeId,
      tags: [],
      subtasks: [],
      comments: [],
      attachments: [],
      attachmentCount: 0,
    });
    const created = useTaskStore.getState().tasks.at(-1);
    if (created) emitTaskCreate(created);
    toast.success(`"${subTitle}" converted to a task`, { duration: 4000 });
  };

  const handleLogTime = () => {
    const h = parseFloat(logHours);
    if (isNaN(h) || h <= 0) return;
    const loggedHours = Math.round(((task.loggedHours ?? 0) + h) * 10) / 10;
    updateTask(task.id, { loggedHours });
    emitUpdate({ loggedHours });
    setLogHours('');
    setShowLogTime(false);
    toast.success(`Logged ${h}h`);
  };

  const handleSetEstimate = () => {
    const h = parseFloat(estimateInput);
    if (isNaN(h) || h <= 0) return;
    const estimatedHours = Math.round(h * 10) / 10;
    updateTask(task.id, { estimatedHours });
    emitUpdate({ estimatedHours });
    setEstimateInput('');
    setShowSetEstimate(false);
    toast.success(`Estimate set to ${h}h`);
  };

  const isTimerRunningForThis = activeTimer?.taskId === task.id;

  const handleStartTimer = () => {
    if (activeTimer && !isTimerRunningForThis) {
      toast.error('Stop the current timer before starting a new one.');
      return;
    }
    startTimer(task.id);
    toast.success('Timer started');
  };

  const handleStartPomodoro = () => {
    if (activeTimer && !isTimerRunningForThis) {
      toast.error('Stop the current timer before starting a Pomodoro.');
      return;
    }
    startPomodoro(task.id);
    toast.success('🍅 Pomodoro started — 25 minutes of focus');
  };

  const handleStopTimerFromDetail = () => {
    const result = stopTimer();
    if (!result) return;
    const added = result.elapsedHours;
    const loggedHours = Math.round(((task.loggedHours ?? 0) + added) * 100) / 100;
    updateTask(task.id, { loggedHours });
    emitUpdate({ loggedHours });
    const mins = Math.round(added * 60);
    toast.success(`Timer stopped — ${mins < 1 ? '<1' : mins}m logged`);
  };

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 z-30 bg-black/30" onClick={() => setSelectedTask(null)} />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-full sm:w-96 bg-[#111C44] border-l border-[#1F3461] z-40 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1F3461]">
          <div className="flex items-center gap-1">
            {/* Pin toggle — visible to all */}
            <button
              onClick={() => { togglePin(task.id); if (!task.pinned) logActivity(task.id, userId, 'pinned'); }}
              className={cn('p-1.5 rounded-lg hover:bg-[#1B254B] transition-colors', task.pinned ? 'text-amber-400' : 'text-slate-400 hover:text-amber-400')}
              title={task.pinned ? 'Unpin task' : 'Pin task'}
            >
              <Pin className={cn('w-4 h-4', task.pinned && 'fill-amber-400')} />
            </button>
            <RoleGuard allowed={canEdit}>
              <button
                onClick={() => { openTaskModal(task.id); setSelectedTask(null); }}
                className="p-1.5 rounded-lg hover:bg-[#1B254B] text-slate-400 hover:text-blue-400 transition-colors"
                title="Edit task"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            </RoleGuard>
            <RoleGuard allowed={canEdit}>
              <button
                onClick={handleClone}
                className="p-1.5 rounded-lg hover:bg-[#1B254B] text-slate-400 hover:text-green-400 transition-colors"
                title="Duplicate task"
              >
                <Copy className="w-4 h-4" />
              </button>
            </RoleGuard>
            <button
              onClick={handleSaveAsTemplate}
              className="p-1.5 rounded-lg hover:bg-[#1B254B] text-slate-400 hover:text-amber-400 transition-colors"
              title="Save as template"
            >
              <BookmarkPlus className="w-4 h-4" />
            </button>
            <RoleGuard allowed={canDelete}>
              <button
                onClick={handleDelete}
                className="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-colors"
                title="Delete task"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </RoleGuard>
          </div>
          <button
            onClick={openFocusMode}
            className="p-1.5 rounded-lg hover:bg-[#1B254B] text-slate-400 hover:text-blue-400 transition-colors"
            title="Focus mode (F)"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
          <button aria-label="Close" onClick={() => setSelectedTask(null)} className="p-1.5 rounded-lg hover:bg-[#1B254B] text-slate-400 hover:text-slate-200 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <div>
            <ViewerPile taskId={task.id} />
            <div className="flex items-start gap-2 mb-2">
              <h2 className={cn('flex-1 text-base font-semibold text-white', task.status === 'done' && 'line-through text-slate-400')}>{task.title}</h2>
              <button
                onClick={() => { navigator.clipboard.writeText(task.title); toast.success('Copied to clipboard'); }}
                className="p-1 rounded-lg hover:bg-[#1B254B] text-slate-600 hover:text-slate-400 transition-colors flex-shrink-0"
                title="Copy title"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>
            {canEdit ? (
              editingDesc ? (
                <div>
                  <textarea
                    ref={descRef}
                    value={descDraft}
                    onChange={e => setDescDraft(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Escape') { setEditingDesc(false); }
                      if (e.key === 'Enter' && e.metaKey) {
                        const desc = descDraft.trim() || undefined;
                        updateTask(task.id, { description: desc });
                        emitUpdate({ description: desc });
                        setEditingDesc(false);
                        toast.success('Description updated');
                      }
                    }}
                    rows={3}
                    maxLength={4096}
                    className="w-full bg-[#0B1437] border border-blue-500 rounded-xl px-3 py-2 text-sm text-slate-200 placeholder-slate-600 outline-none resize-none transition-colors"
                    placeholder="Add a description…"
                  />
                  <div className="flex items-center gap-2 mt-1.5">
                    <button
                      onClick={() => { const desc = descDraft.trim() || undefined; updateTask(task.id, { description: desc }); emitUpdate({ description: desc }); setEditingDesc(false); toast.success('Description updated'); }}
                      className="px-2.5 py-1 rounded-lg bg-blue-500 text-white text-xs font-medium hover:bg-blue-600 transition-colors"
                    >Save</button>
                    <button onClick={() => setEditingDesc(false)} className="text-xs text-slate-500 hover:text-slate-300 transition-colors">Cancel</button>
                    <span className="text-[10px] text-slate-600 ml-auto">⌘↵ to save · Esc to cancel</span>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => { setDescDraft(task.description ?? ''); setEditingDesc(true); setTimeout(() => descRef.current?.focus(), 50); }}
                  className="w-full text-left group/desc"
                  title="Click to edit description"
                >
                  {task.description ? (
                    <div className="border border-transparent hover:border-[#1F3461] rounded-lg px-2 py-1 -mx-2 -my-1 transition-colors group-hover/desc:border-[#1F3461]">
                      <Markdown>{task.description}</Markdown>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-600 italic hover:text-slate-500 transition-colors">+ Add description…</p>
                  )}
                </button>
              )
            ) : (
              task.description && <Markdown className="text-sm">{task.description}</Markdown>
            )}
          </div>

          {/* Blocked warning banner */}
          {task.status === 'blocked' && (
            <div className="flex items-start gap-2.5 p-3 bg-red-500/10 border border-red-500/25 rounded-xl">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs font-semibold text-red-400 mb-0.5">Task Blocked</p>
                <p className="text-xs text-red-300/70">This task is blocked. Resolve the blocker then advance the status.</p>
              </div>
              {canEdit && (
                <button
                  onClick={() => { updateTask(task.id, { status: 'in-progress' }); emitUpdate({ status: 'in-progress' }); toast.success('Unblocked → In Progress'); }}
                  className="text-[10px] font-semibold px-2 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 transition-colors flex-shrink-0"
                >
                  Unblock
                </button>
              )}
            </div>
          )}

          {/* Time in current status */}
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <Clock className="w-3 h-3 flex-shrink-0" />
            <span>
              In <span className="text-slate-500">{task.status.replace('-', ' ')}</span> for{' '}
              {formatDistance(new Date(task.updatedAt), new Date(), { addSuffix: false })}
            </span>
            <span className="text-slate-700">·</span>
            <span>Created {formatDistanceToNow(new Date(task.createdAt), { addSuffix: true })}</span>
          </div>

          {/* Badges + tags */}
          <div className="flex flex-wrap gap-2">
            {/* Status — clickable cycle for authorised users */}
            {canEdit ? (
              <button
                onClick={cycleStatus}
                className="flex items-center gap-1 rounded-full transition-all hover:opacity-80 active:scale-95"
                title="Click to advance status"
              >
                <StatusBadge status={task.status} />
                <ChevronDown className="w-3 h-3 text-slate-500 -ml-1" />
              </button>
            ) : (
              <StatusBadge status={task.status} />
            )}
            {canEdit ? (
              <button
                onClick={() => {
                  const ORDER = PRIORITY_OPTIONS.map(p => p.value);
                  const next = ORDER[(ORDER.indexOf(task.priority) + 1) % ORDER.length] as Task['priority'];
                  updateTask(task.id, { priority: next });
                  emitUpdate({ priority: next });
                  logActivity(task.id, userId, 'priority_changed', { from: task.priority, to: next });
                  toast.success(`Priority → ${PRIORITY_OPTIONS.find(p => p.value === next)?.label}`);
                }}
                className="flex items-center gap-1 rounded-full transition-all hover:opacity-80 active:scale-95"
                title="Click to change priority"
              >
                <PriorityBadge priority={task.priority} />
                <ChevronDown className="w-3 h-3 text-slate-500 -ml-1" />
              </button>
            ) : (
              <PriorityBadge priority={task.priority} />
            )}
            {task.tags.map(tagId => {
              const tag = tags.find(t => t.id === tagId);
              if (!tag) return null;
              return (
                <span key={tagId} className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${tag.colour}22`, color: tag.colour }}>
                  {tag.name}
                </span>
              );
            })}
          </div>

          {/* Meta */}
          <div className="space-y-2.5 text-sm">
            {project && (
              <div className="flex items-center gap-3 text-slate-400">
                <Tag className="w-4 h-4 text-slate-500 flex-shrink-0" />
                <button
                  onClick={() => { setSelectedTask(null); navigate(`/projects/${project.id}`); }}
                  className="flex items-center gap-1.5 hover:text-blue-400 transition-colors group"
                  title="Go to project"
                >
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: project.colour }} />
                  <span>{project.name}</span>
                  <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              </div>
            )}
            {/* Assignee — inline change for editors */}
            <div className="flex items-center gap-3 text-slate-400">
              <User className="w-4 h-4 text-slate-500 flex-shrink-0" />
              {canEdit ? (
                <select
                  value={task.assigneeId ?? ''}
                  onChange={e => {
                    const newId = e.target.value || undefined;
                    const newName = SEED_USERS.find(u => u.id === newId)?.name ?? 'Unassigned';
                    updateTask(task.id, { assigneeId: newId });
                    emitUpdate({ assigneeId: newId });
                    logActivity(task.id, userId, 'assigned', { to: newName });
                  }}
                  className="bg-transparent border-0 outline-none text-sm text-slate-400 cursor-pointer hover:text-slate-200 transition-colors"
                >
                  <option value="" className="bg-[#111C44] text-slate-400">Unassigned</option>
                  {SEED_USERS.map(u => (
                    <option key={u.id} value={u.id} className="bg-[#111C44] text-slate-200">{u.name}</option>
                  ))}
                </select>
              ) : assignee ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white" style={{ backgroundColor: assignee.colour }}>
                    {assignee.name.split(' ').map((n: string) => n[0]).join('')}
                  </div>
                  {assignee.name}
                </div>
              ) : (
                <span className="text-slate-600 italic text-sm">Unassigned</span>
              )}
            </div>

            {/* Due date — inline change for editors */}
            <div className="flex items-center gap-3 text-slate-400">
              <Calendar className="w-4 h-4 text-slate-500 flex-shrink-0" />
              {canEdit ? (
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={task.dueDate?.slice(0, 10) ?? ''}
                    onChange={e => { const dueDate = e.target.value || undefined; updateTask(task.id, { dueDate }); emitUpdate({ dueDate }); }}
                    className="bg-transparent border-0 outline-none text-sm text-slate-400 cursor-pointer hover:text-slate-200 transition-colors [color-scheme:dark]"
                  />
                  {task.dueDate && (
                    <button
                      onClick={() => { updateTask(task.id, { dueDate: undefined }); emitUpdate({ dueDate: undefined }); }}
                      className="text-slate-600 hover:text-red-400 transition-colors text-xs"
                      title="Clear due date"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ) : task.dueDate ? (
                formatDate(task.dueDate)
              ) : (
                <span className="text-slate-600 italic text-sm">No due date</span>
              )}
            </div>
            {/* Recurrence — inline change for editors */}
            {(canEdit || (task.recurrence && task.recurrence !== 'none')) && (
              <div className="flex items-center gap-3 text-slate-400">
                <Repeat2 className="w-4 h-4 text-slate-500 flex-shrink-0" />
                {canEdit ? (
                  <select
                    value={task.recurrence ?? 'none'}
                    onChange={e => {
                      const val = e.target.value;
                      const recurrence = val === 'none' ? undefined : val as any;
                      updateTask(task.id, { recurrence });
                      emitUpdate({ recurrence });
                    }}
                    className="bg-transparent border-0 outline-none text-sm text-slate-400 cursor-pointer hover:text-slate-200 transition-colors"
                  >
                    {RECURRENCE_OPTIONS.map(r => (
                      <option key={r.value} value={r.value} className="bg-[#111C44]">{r.label}</option>
                    ))}
                  </select>
                ) : (
                  <span className="text-sm text-blue-400">
                    {RECURRENCE_OPTIONS.find(r => r.value === task.recurrence)?.label}
                  </span>
                )}
              </div>
            )}

            {(canEdit || (task.estimatedHours ?? 0) > 0 || (task.loggedHours ?? 0) > 0) && (
              <div className="flex items-start gap-3 text-slate-400">
                <Clock className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  {(task.estimatedHours ?? 0) > 0 ? (
                    <>
                      <div className="flex justify-between text-xs mb-1">
                        <span>{task.loggedHours ?? 0}h logged</span>
                        <span className={cn((task.loggedHours ?? 0) > task.estimatedHours! ? 'text-red-400' : 'text-slate-500')}>
                          {task.estimatedHours}h estimated
                        </span>
                      </div>
                      <div className="h-1.5 bg-[#1B254B] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${Math.min(100, ((task.loggedHours ?? 0) / task.estimatedHours!) * 100)}%`,
                            backgroundColor: (task.loggedHours ?? 0) > task.estimatedHours! ? '#EF4444' : '#3B82F6',
                          }}
                        />
                      </div>
                    </>
                  ) : (task.loggedHours ?? 0) > 0 ? (
                    <span className="text-xs text-slate-400">{task.loggedHours}h logged</span>
                  ) : canEdit ? (
                    <span className="text-xs text-slate-600 italic">No time tracked yet</span>
                  ) : null}

                  {canEdit && (
                    <div className="flex gap-3 mt-1.5 flex-wrap">
                      {isTimerRunningForThis ? (
                        <button
                          onClick={handleStopTimerFromDetail}
                          className={`flex items-center gap-1 text-[10px] font-semibold transition-colors ${
                            activeTimer?.mode === 'pomodoro'
                              ? 'text-orange-400 hover:text-orange-300'
                              : 'text-emerald-400 hover:text-emerald-300'
                          }`}
                        >
                          <Square className="w-3 h-3 fill-current" />
                          {activeTimer?.mode === 'pomodoro' ? 'Stop 🍅' : 'Stop timer'}
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={handleStartTimer}
                            className="flex items-center gap-1 text-[10px] text-slate-600 hover:text-emerald-400 transition-colors"
                          >
                            <Timer className="w-3 h-3" />
                            Start timer
                          </button>
                          <button
                            onClick={handleStartPomodoro}
                            className="flex items-center gap-1 text-[10px] text-slate-600 hover:text-orange-400 transition-colors"
                          >
                            <span className="text-[11px] leading-none">🍅</span>
                            Pomodoro
                          </button>
                        </>
                      )}
                      {!showLogTime && (
                        <button
                          onClick={() => { setShowLogTime(true); setTimeout(() => logTimeInputRef.current?.focus(), 50); }}
                          className="flex items-center gap-1 text-[10px] text-slate-600 hover:text-blue-400 transition-colors"
                        >
                          <Clock className="w-3 h-3" />
                          Log time
                        </button>
                      )}
                      {!showSetEstimate && (task.estimatedHours ?? 0) === 0 && (
                        <button
                          onClick={() => setShowSetEstimate(true)}
                          className="flex items-center gap-1 text-[10px] text-slate-600 hover:text-amber-400 transition-colors"
                        >
                          <Clock className="w-3 h-3" />
                          Set estimate
                        </button>
                      )}
                    </div>
                  )}

                  {showLogTime && (
                    <div className="flex gap-2 mt-2">
                      <input
                        ref={logTimeInputRef}
                        type="number"
                        value={logHours}
                        onChange={e => setLogHours(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleLogTime(); if (e.key === 'Escape') { setShowLogTime(false); setLogHours(''); } }}
                        placeholder="Hours (e.g. 1.5)"
                        min="0.1"
                        step="0.5"
                        className="flex-1 bg-[#0B1437] border border-[#1F3461] focus:border-blue-500 rounded-lg px-2 py-1 text-xs text-slate-200 placeholder-slate-600 outline-none transition-colors"
                      />
                      <button onClick={handleLogTime} disabled={!logHours || parseFloat(logHours) <= 0} className="px-2.5 py-1 rounded-lg bg-blue-500 text-white text-xs font-medium hover:bg-blue-600 disabled:opacity-40 transition-colors">Log</button>
                      <button onClick={() => { setShowLogTime(false); setLogHours(''); }} className="text-xs text-slate-500 hover:text-slate-300 transition-colors">✕</button>
                    </div>
                  )}

                  {showSetEstimate && (
                    <div className="flex gap-2 mt-2">
                      <input
                        type="number"
                        value={estimateInput}
                        onChange={e => setEstimateInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleSetEstimate(); if (e.key === 'Escape') { setShowSetEstimate(false); setEstimateInput(''); } }}
                        autoFocus
                        placeholder="Estimate in hours"
                        min="0.1"
                        step="0.5"
                        className="flex-1 bg-[#0B1437] border border-[#1F3461] focus:border-amber-500 rounded-lg px-2 py-1 text-xs text-slate-200 placeholder-slate-600 outline-none transition-colors"
                      />
                      <button onClick={handleSetEstimate} disabled={!estimateInput || parseFloat(estimateInput) <= 0} className="px-2.5 py-1 rounded-lg bg-amber-500 text-white text-xs font-medium hover:bg-amber-600 disabled:opacity-40 transition-colors">Set</button>
                      <button onClick={() => { setShowSetEstimate(false); setEstimateInput(''); }} className="text-xs text-slate-500 hover:text-slate-300 transition-colors">✕</button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Blocked By — task dependencies */}
          {(canEdit || (task.blockedBy && task.blockedBy.length > 0)) && (() => {
            const blockers = tasks.filter(t => task.blockedBy?.includes(t.id));
            const allDone = blockers.length > 0 && blockers.every(t => t.status === 'done');
            // Tasks eligible to be added as blockers (not this task, not already added)
            const eligible = tasks.filter(t =>
              t.id !== task.id &&
              !task.blockedBy?.includes(t.id) &&
              (depSearch === '' || t.title.toLowerCase().includes(depSearch.toLowerCase()))
            ).slice(0, 8);
            return (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Link2 className="w-3 h-3" />
                    Blocked By
                    {blockers.length > 0 && (
                      <span className={cn('ml-1 text-[10px] px-1.5 py-0.5 rounded-full border font-semibold',
                        allDone
                          ? 'text-green-400 border-green-500/30 bg-green-500/10'
                          : 'text-red-400 border-red-500/30 bg-red-500/10'
                      )}>
                        {allDone ? 'All resolved' : `${blockers.filter(t => t.status !== 'done').length} open`}
                      </span>
                    )}
                  </span>
                  {canEdit && (
                    <button
                      onClick={() => setShowDepPicker(v => !v)}
                      className="p-1 rounded-lg hover:bg-[#1B254B] text-slate-500 hover:text-blue-400 transition-colors"
                      title="Add blocker"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Dependency picker */}
                {showDepPicker && canEdit && (
                  <div className="mb-2 bg-[#0B1437] border border-[#1F3461] rounded-xl overflow-hidden">
                    <input
                      autoFocus
                      value={depSearch}
                      onChange={e => setDepSearch(e.target.value)}
                      placeholder="Search tasks to add as blockers…"
                      className="w-full bg-transparent px-3 py-2 text-xs text-slate-200 placeholder-slate-600 outline-none border-b border-[#1F3461]"
                    />
                    {eligible.length === 0 ? (
                      <p className="text-xs text-slate-600 px-3 py-2 italic">No tasks found</p>
                    ) : (
                      eligible.map(t => (
                        <button
                          key={t.id}
                          onClick={() => {
                            const blockedBy = [...(task.blockedBy ?? []), t.id];
                            updateTask(task.id, { blockedBy });
                            emitUpdate({ blockedBy });
                            setDepSearch('');
                            setShowDepPicker(false);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 hover:bg-[#1B254B] transition-colors text-left border-t border-[#1F3461] first:border-0"
                        >
                          <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', t.status === 'done' ? 'bg-green-400' : 'bg-slate-500')} />
                          <span className="text-xs text-slate-300 flex-1 truncate">{t.title}</span>
                          <span className="text-[10px] text-slate-600">{STATUS_OPTIONS.find(s => s.value === t.status)?.label}</span>
                        </button>
                      ))
                    )}
                  </div>
                )}

                {/* Blocker list */}
                {blockers.length > 0 && (
                  <div className="space-y-1">
                    {blockers.map(blocker => (
                      <div key={blocker.id} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[#0B1437] border border-[#1F3461]">
                        <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', blocker.status === 'done' ? 'bg-green-400' : 'bg-red-400')} />
                        <button
                          onClick={() => setSelectedTask(blocker.id)}
                          className="flex-1 text-left text-xs truncate hover:text-blue-400 transition-colors"
                          style={{ color: blocker.status === 'done' ? '#64748B' : '#CBD5E1' }}
                        >
                          <span className={blocker.status === 'done' ? 'line-through' : ''}>{blocker.title}</span>
                        </button>
                        <span className="text-[10px] text-slate-600 flex-shrink-0">
                          {STATUS_OPTIONS.find(s => s.value === blocker.status)?.label}
                        </span>
                        {canEdit && (
                          <button
                            onClick={() => { const blockedBy = task.blockedBy?.filter(id => id !== blocker.id); updateTask(task.id, { blockedBy }); emitUpdate({ blockedBy }); }}
                            className="text-slate-600 hover:text-red-400 transition-colors flex-shrink-0"
                            title="Remove blocker"
                          >
                            <XCircle className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {blockers.length === 0 && !showDepPicker && (
                  <p className="text-xs text-slate-600 italic">No blockers — this task can proceed freely.</p>
                )}
              </div>
            );
          })()}

          {/* Subtasks */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Subtasks {task.subtasks.length > 0 && `(${completedSubs}/${task.subtasks.length})`}
              </span>
              {canEdit && (
                <button
                  onClick={() => { setShowSubtaskInput(v => !v); setTimeout(() => subtaskInputRef.current?.focus(), 50); }}
                  className="p-1 rounded-lg hover:bg-[#1B254B] text-slate-500 hover:text-blue-400 transition-colors"
                  title="Add subtask"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            {task.subtasks.length > 0 && <ProgressBar value={subProgress} size="sm" className="mb-3" />}
            <div className="space-y-1.5">
              {task.subtasks.map(sub => (
                <div
                  key={sub.id}
                  className={cn(
                    'flex items-center gap-2.5 p-2 rounded-lg transition-colors group/sub',
                    canEdit ? 'hover:bg-[#1B254B]' : 'opacity-70'
                  )}
                >
                  <button
                    onClick={() => toggleSub(sub.id)}
                    disabled={!canEdit}
                    className="flex-shrink-0"
                  >
                    <CheckSquare2 className={cn('w-4 h-4', sub.completed ? 'text-green-400' : 'text-slate-600 hover:text-blue-400')} />
                  </button>
                  <span
                    onClick={() => toggleSub(sub.id)}
                    className={cn('flex-1 text-sm cursor-pointer', sub.completed ? 'line-through text-slate-500' : 'text-slate-300')}
                  >
                    {sub.title}
                  </span>
                  {canEdit && (
                    <div className="opacity-0 group-hover/sub:opacity-100 flex items-center gap-0.5 transition-all">
                      <button
                        onClick={() => handleConvertSubtask(sub.id, sub.title)}
                        className="p-0.5 rounded text-slate-600 hover:text-blue-400 transition-colors"
                        title="Convert to full task"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => {
                          const updated = task.subtasks.filter(s => s.id !== sub.id);
                          updateTask(task.id, { subtasks: updated });
                          emitUpdate({ subtasks: updated });
                        }}
                        className="p-0.5 rounded text-slate-600 hover:text-red-400 transition-colors"
                        title="Delete subtask"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
            {showSubtaskInput && (
              <div className="flex gap-2 mt-2">
                <input
                  ref={subtaskInputRef}
                  value={newSubtask}
                  onChange={e => setNewSubtask(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleAddSubtask(); if (e.key === 'Escape') { setShowSubtaskInput(false); setNewSubtask(''); } }}
                  placeholder="New subtask…"
                  maxLength={100}
                  className="flex-1 bg-[#0B1437] border border-[#1F3461] focus:border-blue-500 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-600 outline-none transition-colors"
                />
                <button
                  onClick={handleAddSubtask}
                  disabled={!newSubtask.trim()}
                  className="px-2.5 py-1.5 rounded-lg bg-blue-500 text-white text-xs font-medium hover:bg-blue-600 disabled:opacity-40 transition-colors"
                >
                  Add
                </button>
              </div>
            )}
          </div>

          {/* Attachments */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Paperclip className="w-4 h-4 text-slate-500" />
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Attachments {(task.attachments ?? []).length > 0 && `(${(task.attachments ?? []).length})`}
                </span>
              </div>
              {canEdit && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-1 rounded-lg hover:bg-[#1B254B] text-slate-500 hover:text-blue-400 transition-colors"
                  title="Attach file"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* File list */}
            {(task.attachments ?? []).length > 0 && (
              <div className="space-y-1.5 mb-2">
                {(task.attachments ?? []).map(attachment => {
                  const Icon = getFileIcon(attachment.type);
                  const isImage = attachment.type.startsWith('image/');
                  return (
                    <div key={attachment.id} className="flex items-center gap-2.5 p-2 rounded-lg bg-[#0B1437] border border-[#1F3461] group/att hover:border-[#2A4080] transition-colors">
                      {isImage ? (
                        <img
                          src={attachment.data}
                          alt={attachment.name}
                          className="w-8 h-8 rounded object-cover flex-shrink-0 border border-[#1F3461]"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded flex items-center justify-center bg-[#111C44] flex-shrink-0">
                          <Icon className="w-4 h-4 text-blue-400" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-slate-300 truncate font-medium">{attachment.name}</p>
                        <p className="text-[10px] text-slate-600">{formatBytes(attachment.size)}</p>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover/att:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleDownloadAttachment(attachment)}
                          title="Download"
                          className="p-1 rounded-lg hover:bg-[#1B254B] text-slate-500 hover:text-emerald-400 transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        {canEdit && (
                          <button
                            onClick={() => handleRemoveAttachment(attachment.id)}
                            title="Remove attachment"
                            className="p-1 rounded-lg hover:bg-[#1B254B] text-slate-500 hover:text-red-400 transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Drop zone — only shown to editors */}
            {canEdit && (task.attachments ?? []).length < MAX_ATTACHMENTS && (
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  'flex items-center justify-center gap-2 border border-dashed rounded-xl py-3 px-4 cursor-pointer transition-colors',
                  dragOver
                    ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                    : 'border-[#1F3461] hover:border-[#2A4080] text-slate-600 hover:text-slate-400'
                )}
              >
                <Paperclip className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="text-xs">
                  {dragOver ? 'Drop to attach' : 'Click or drag to attach files (max 5 MB)'}
                </span>
              </div>
            )}

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFileInput}
              aria-label="Attach files"
            />
          </div>

          {/* Activity log */}
          {(() => {
            const events = getTaskActivity(task.id);
            if (events.length === 0) return null;
            const verbLabel = (verb: ActivityVerb, meta?: Record<string, string>) => {
              const statusLabel = (v: string) => STATUS_OPTIONS.find(s => s.value === v)?.label ?? v;
              switch (verb) {
                case 'status_changed':   return `changed status ${meta?.from ? `from ${statusLabel(meta.from)} ` : ''}to ${statusLabel(meta?.to ?? '')}`;
                case 'priority_changed': return `changed priority to ${meta?.to ?? ''}`;
                case 'assigned':         return `assigned to ${meta?.to ?? ''}`;
                case 'commented':        return 'added a comment';
                case 'subtask_added':    return 'added a subtask';
                case 'subtask_completed':return 'completed a subtask';
                case 'pinned':           return 'pinned this task';
                case 'duplicated':       return 'duplicated this task';
                default:                 return verb;
              }
            };
            return (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Activity className="w-4 h-4 text-slate-500" />
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Activity</span>
                </div>
                <div className="space-y-2">
                  {events.slice(0, 8).map(event => {
                    const actor = SEED_USERS.find(u => u.id === event.userId)
                      ?? (currentUser?.id === event.userId ? { name: currentUser.name, colour: currentUser.colour } : null);
                    return (
                      <div key={event.id} className="flex items-start gap-2">
                        {actor && (
                          <div className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-[8px] font-bold text-white mt-0.5" style={{ backgroundColor: actor.colour }}>
                            {actor.name.split(' ').map((n: string) => n[0]).join('')}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <span className="text-xs text-slate-400">
                            <span className="text-slate-300 font-medium">{actor?.name ?? 'Someone'}</span>
                            {' '}{verbLabel(event.verb, event.meta)}
                          </span>
                          <span className="text-[10px] text-slate-600 ml-2">
                            {formatDistanceToNow(new Date(event.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Comments */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <MessageCircle className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Comments {task.comments.length > 0 && `(${task.comments.length})`}
              </span>
            </div>
            {task.comments.length > 0 && (
              <div className="space-y-3 mb-3">
                {task.comments.map(comment => {
                  const author = SEED_USERS.find(u => u.id === comment.userId)
                    ?? (currentUser?.id === comment.userId ? { name: currentUser.name, colour: currentUser.colour } : null);
                  return (
                    <div key={comment.id} className="flex gap-2.5 group/comment">
                      {author && (
                        <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-[9px] font-bold text-white mt-0.5" style={{ backgroundColor: author.colour }}>
                          {author.name.split(' ').map((n: string) => n[0]).join('')}
                        </div>
                      )}
                      <div className="flex-1 bg-[#1B254B] rounded-lg p-2.5">
                        <div className="flex items-baseline justify-between mb-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-medium text-slate-300">{author?.name}</span>
                            {comment.mentions && comment.mentions.length > 0 && (
                              <span className="text-[9px] px-1 py-0.5 rounded bg-blue-500/15 text-blue-400 border border-blue-500/20">@</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-slate-600">
                              {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                            </span>
                            {/* Edit/delete — own comments only */}
                            {comment.userId === currentUser?.id && editingCommentId !== comment.id && (
                              <div className="flex items-center gap-1 opacity-0 group-hover/comment:opacity-100 transition-opacity">
                                <button
                                  onClick={() => handleEditComment(comment.id)}
                                  className="text-[10px] text-slate-600 hover:text-blue-400 transition-colors px-1"
                                  title="Edit comment"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteComment(comment.id)}
                                  className="text-[10px] text-slate-600 hover:text-red-400 transition-colors px-1"
                                  title="Delete comment"
                                >
                                  Delete
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                        {editingCommentId === comment.id ? (
                          <div>
                            <textarea
                              value={editingCommentText}
                              onChange={e => setEditingCommentText(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSaveEditComment(); }
                                if (e.key === 'Escape') setEditingCommentId(null);
                              }}
                              autoFocus
                              rows={2}
                              maxLength={500}
                              className="w-full bg-[#0B1437] border border-blue-500 rounded-lg px-2 py-1.5 text-xs text-slate-200 outline-none resize-none"
                            />
                            <div className="flex gap-2 mt-1.5">
                              <button onClick={handleSaveEditComment} className="text-[10px] text-blue-400 hover:text-blue-300 font-medium transition-colors">Save</button>
                              <button onClick={() => setEditingCommentId(null)} className="text-[10px] text-slate-500 hover:text-slate-300 transition-colors">Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400 leading-relaxed">
                          {comment.content.split(/(@\w+)/g).map((part, i) => {
                            if (part.startsWith('@')) {
                              const name = part.slice(1).toLowerCase();
                              const mentioned = allUsers.find(u => u.name.split(' ')[0].toLowerCase() === name);
                              if (mentioned) {
                                return (
                                  <span key={i} className="text-blue-400 font-medium bg-blue-500/15 rounded px-1 py-0.5 text-[10px]">
                                    {part}
                                  </span>
                                );
                              }
                            }
                            return part;
                          })}
                        </p>
                        )}
                        {/* Emoji reactions — only shown when not editing */}
                        {editingCommentId !== comment.id && (() => {
                          const EMOJI_OPTIONS = ['👍', '✅', '🚀', '❤️'];
                          const uid = currentUser?.id ?? '';
                          const toggleReaction = (emoji: string) => {
                            const current = comment.reactions ?? {};
                            const reactors = current[emoji] ?? [];
                            const next = reactors.includes(uid)
                              ? reactors.filter(id => id !== uid)
                              : [...reactors, uid];
                            const updated = { ...current, [emoji]: next };
                            // Remove key if no reactors remain
                            if (updated[emoji].length === 0) delete updated[emoji];
                            const updatedComments = task.comments.map(c =>
                              c.id === comment.id ? { ...c, reactions: Object.keys(updated).length ? updated : undefined } : c
                            );
                            updateTask(task.id, { comments: updatedComments });
                            emitUpdate({ comments: updatedComments });
                          };
                          const hasReactions = comment.reactions && Object.keys(comment.reactions).length > 0;
                          return (
                            <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                              {hasReactions && Object.entries(comment.reactions!).map(([emoji, reactors]) => (
                                <button
                                  key={emoji}
                                  onClick={() => toggleReaction(emoji)}
                                  className={cn(
                                    'flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] border transition-all',
                                    reactors.includes(uid)
                                      ? 'bg-blue-500/15 border-blue-500/30 text-blue-300'
                                      : 'bg-[#0B1437] border-[#1F3461] text-slate-500 hover:border-slate-600'
                                  )}
                                >
                                  <span>{emoji}</span>
                                  <span>{reactors.length}</span>
                                </button>
                              ))}
                              {/* Add reaction picker */}
                              <div className="relative group/rxn">
                                <button className="opacity-0 group-hover:opacity-100 p-0.5 rounded-full text-slate-600 hover:text-slate-400 hover:bg-[#1B254B] transition-all text-[10px]">
                                  +
                                </button>
                                <div className="absolute bottom-full left-0 mb-1 hidden group-hover/rxn:flex bg-[#111C44] border border-[#1F3461] rounded-xl p-1.5 gap-1 shadow-lg z-50">
                                  {EMOJI_OPTIONS.map(emoji => (
                                    <button
                                      key={emoji}
                                      onClick={() => toggleReaction(emoji)}
                                      className="text-sm hover:scale-125 transition-transform px-1 py-0.5 rounded hover:bg-[#1B254B]"
                                    >
                                      {emoji}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Add comment — visible to all authenticated users */}
            {currentUser && (
              <div className="flex gap-2 items-end">
                <div
                  className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-[9px] font-bold text-white mt-1"
                  style={{ backgroundColor: currentUser.colour }}
                >
                  {currentUser.name.split(' ').map((n: string) => n[0]).join('')}
                </div>
                <div className="flex-1 relative">
                  {/* @mention suggestion dropdown */}
                  {mentionSuggestions.length > 0 && (
                    <div className="absolute bottom-full left-0 mb-1 w-52 bg-[#111C44] border border-[#1F3461] rounded-xl shadow-lg overflow-hidden z-50">
                      {mentionSuggestions.map(user => (
                        <button
                          key={user.id}
                          type="button"
                          onMouseDown={e => { e.preventDefault(); insertMention(user); }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-[#1B254B] transition-colors text-left"
                        >
                          <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0" style={{ backgroundColor: user.colour }}>
                            {user.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <span className="text-xs text-slate-200">{user.name}</span>
                          <span className="text-[10px] text-slate-500 truncate ml-auto">{user.email}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  <textarea
                    ref={commentRef}
                    value={commentText}
                    onChange={handleCommentChange}
                    onKeyDown={e => {
                      if (e.key === 'Escape') { setMentionState(null); return; }
                      if (e.key === 'Enter' && !e.shiftKey && !mentionState) { e.preventDefault(); handleAddComment(); }
                    }}
                    placeholder="Add a comment… (type @ to mention)"
                    rows={2}
                    maxLength={500}
                    className="w-full bg-[#0B1437] border border-[#1F3461] focus:border-blue-500 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-600 outline-none resize-none transition-colors"
                  />
                  <button
                    onClick={handleAddComment}
                    disabled={!commentText.trim()}
                    className="absolute right-2 bottom-2 p-1 rounded-lg text-slate-500 hover:text-blue-400 disabled:opacity-30 transition-colors"
                    title="Send (Enter)"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
