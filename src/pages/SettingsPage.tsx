import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTaskStore } from '../store/taskStore';
import { useProjectStore } from '../store/projectStore';
import { useConvexAuth } from '../hooks/useConvexUser';
import { useCurrentUser } from '../hooks/useConvexUser';
import { useTagStore } from '../store/tagStore';
import { useUIStore } from '../store/uiStore';
import { useTemplateStore } from '../store/templateStore';
import { RoleGuard } from '../components/auth/RoleGuard';
import { canClearData, canExportData, canManageTags, ROLE_META } from '../lib/permissions';
import { sanitiseTasks, sanitiseProjects } from '../lib/storageValidation';
import { requestNotificationPermission, getNotificationPermission } from '../hooks/useNotifications';
import { Button } from '../components/ui/Button';
import { Avatar } from '../components/ui/Avatar';
import { SEED_USERS } from '../lib/sampleData';
import { PROJECT_COLOURS, STATUS_OPTIONS, PRIORITY_OPTIONS } from '../lib/constants';
import type { Task } from '../types';
import toast from 'react-hot-toast';
import { emitTaskCreate } from '../lib/collabEmit';
import { LogOut, Upload, Plus, Pencil, Trash2, Check, X, Bell, BellOff, FileSpreadsheet, AlertCircle, Sun, Moon } from 'lucide-react';

// ── Robust CSV parser (handles quoted fields with commas) ─────────────────────
function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let cur = '';
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuote && line[i + 1] === '"') { cur += '"'; i++; }
      else inQuote = !inQuote;
    } else if (ch === ',' && !inQuote) {
      fields.push(cur.trim()); cur = '';
    } else {
      cur += ch;
    }
  }
  fields.push(cur.trim());
  return fields;
}

function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  // Strip UTF-8 BOM
  const clean = text.replace(/^\uFEFF/, '').trim();
  const lines = clean.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return { headers: [], rows: [] };
  const headers = parseCsvLine(lines[0]).map(h => h.toLowerCase().replace(/\s+/g, ''));
  const rows = lines.slice(1).map(l => parseCsvLine(l));
  return { headers, rows };
}

// Try to normalise a status string to a known value
function coerceStatus(s: string): Task['status'] {
  const v = s.toLowerCase().replace(/[\s_-]/g, '');
  const direct = STATUS_OPTIONS.find(o => o.value.replace('-', '') === v || o.value === v);
  if (direct) return direct.value;
  if (v === 'inprogress' || v === 'wip' || v === 'doing') return 'in-progress';
  if (v === 'complete' || v === 'closed' || v === 'finished') return 'done';
  return 'todo';
}

function coercePriority(s: string): Task['priority'] {
  const v = s.toLowerCase();
  const direct = PRIORITY_OPTIONS.find(o => o.value === v);
  if (direct) return direct.value;
  if (v === 'urgent' || v === 'highest') return 'critical';
  return 'medium';
}

function exportCSV() {
  const { tasks } = useTaskStore.getState();
  const { projects } = useProjectStore.getState();
  const projectMap = new Map(projects.map(p => [p.id, p.name]));
  const userMap = new Map(SEED_USERS.map(u => [u.id, u.name]));

  const headers = ['ID', 'Title', 'Description', 'Status', 'Priority', 'Project', 'Assignee', 'Due Date', 'Tags', 'Estimated Hours', 'Logged Hours', 'Created At'];
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;

  const rows = tasks.map(t => [
    t.id,
    t.title,
    t.description ?? '',
    t.status,
    t.priority,
    projectMap.get(t.projectId) ?? t.projectId,
    userMap.get(t.assigneeId ?? '') ?? '',
    t.dueDate ? t.dueDate.slice(0, 10) : '',
    t.tags.join('; '),
    t.estimatedHours ?? '',
    t.loggedHours ?? '',
    t.createdAt.slice(0, 10),
  ].map(v => escape(String(v))).join(','));

  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'taskflow-tasks.csv'; a.click();
  URL.revokeObjectURL(url);
}

// ── Notifications panel ───────────────────────────────────────────────────────
function NotificationsPanel({ enabled, setEnabled }: { enabled: boolean; setEnabled: (v: boolean) => void }) {
  const permission = getNotificationPermission();
  const unsupported = permission === 'unsupported';
  const denied = permission === 'denied';

  const handleToggle = async () => {
    if (!enabled) {
      // Turning on — may need to ask for permission
      if (permission === 'default') {
        const result = await requestNotificationPermission();
        if (result !== 'granted') {
          toast.error('Permission denied. Enable notifications in your browser settings.');
          return;
        }
      }
      if (permission === 'denied') {
        toast.error('Notifications are blocked. Allow them in your browser site settings.');
        return;
      }
      setEnabled(true);
      toast.success('Browser notifications enabled — you\'ll be alerted 15 min before tasks are due.');
    } else {
      setEnabled(false);
      toast.success('Browser notifications disabled.');
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between p-3 bg-[#06091A] rounded-xl">
        <div className="flex items-center gap-3">
          {enabled ? (
            <Bell className="w-4 h-4 text-blue-400 flex-shrink-0" />
          ) : (
            <BellOff className="w-4 h-4 text-slate-500 flex-shrink-0" />
          )}
          <div>
            <p className="text-sm text-slate-200">Browser notifications</p>
            <p className="text-xs text-slate-400">
              {unsupported
                ? 'Not supported in this browser'
                : denied
                  ? 'Blocked — allow in browser site settings to enable'
                  : 'Alert 15 minutes before a task is due'}
            </p>
          </div>
        </div>
        <button
          onClick={handleToggle}
          disabled={unsupported || denied}
          className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed ${
            enabled ? 'bg-blue-500' : 'bg-[#1C3054]'
          }`}
          role="switch"
          aria-checked={enabled}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform duration-200 ${
              enabled ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {enabled && permission === 'granted' && (
        <p className="text-xs text-slate-500 px-1">
          Notifications fire once per task per session. Completing or rescheduling a task resets its alert.
        </p>
      )}

      {!unsupported && denied && (
        <p className="text-xs text-amber-500/80 px-1">
          To unblock: open browser settings → Site settings → Notifications → allow this site.
        </p>
      )}
    </div>
  );
}

export default function SettingsPage() {
  const currentUser = useCurrentUser();
  const { signOut } = useConvexAuth();
  const navigate = useNavigate();
  const importRef = useRef<HTMLInputElement>(null);
  const csvImportRef = useRef<HTMLInputElement>(null);
  const { tags, addTag, updateTag, deleteTag } = useTagStore();
  const { notificationsEnabled, setNotificationsEnabled, theme, setTheme } = useUIStore();
  const { templates: userTemplates, deleteTemplate, updateTemplate } = useTemplateStore();
  const role = (currentUser?.role ?? 'viewer') as import('../store/authStore').Role;
  const [csvPreview, setCsvPreview] = useState<{
    headers: string[];
    rows: string[][];
    fileName: string;
  } | null>(null);
  const roleMeta = ROLE_META[role];

  // Tag management state
  const [newTagName, setNewTagName] = useState('');
  const [newTagColour, setNewTagColour] = useState(PROJECT_COLOURS[0]);
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [editTagName, setEditTagName] = useState('');

  // Template editing state
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [editTemplateName, setEditTemplateName] = useState('');
  const [editTemplateIcon, setEditTemplateIcon] = useState('');
  const [editTemplateDesc, setEditTemplateDesc] = useState('');

  const handleSaveTemplateEdit = (id: string) => {
    const name = editTemplateName.trim();
    if (!name) { toast.error('Template name is required.'); return; }
    updateTemplate(id, { name, icon: editTemplateIcon || '📋', description: editTemplateDesc });
    setEditingTemplateId(null);
    toast.success('Template updated');
  };

  const handleAddTag = () => {
    const name = newTagName.trim();
    if (!name || tags.some(t => t.name.toLowerCase() === name.toLowerCase())) {
      toast.error(name ? 'A tag with that name already exists.' : 'Tag name is required.');
      return;
    }
    addTag(name, newTagColour);
    setNewTagName('');
    setNewTagColour(PROJECT_COLOURS[0]);
    toast.success(`Tag "${name}" created`);
  };

  const handleSaveTagEdit = (id: string) => {
    const name = editTagName.trim();
    if (!name) { setEditingTagId(null); return; }
    if (tags.some(t => t.id !== id && t.name.toLowerCase() === name.toLowerCase())) {
      toast.error('A tag with that name already exists.');
      return;
    }
    updateTag(id, { name });
    setEditingTagId(null);
    toast.success('Tag renamed');
  };

  const handleDeleteTag = (id: string, name: string) => {
    if (!window.confirm(`Delete tag "${name}"? Tasks using this tag will lose it.`)) return;
    deleteTag(id);
    toast.success(`Tag "${name}" deleted`);
  };

  const handleLogout = async () => {
    await signOut();
    toast.success('Signed out.');
    navigate('/login', { replace: true });
  };

  const handleClearData = () => {
    if (window.confirm('Clear all data? This cannot be undone.')) {
      localStorage.removeItem('taskflow-tasks');
      localStorage.removeItem('taskflow-projects');
      window.location.reload();
    }
  };

  const handleCsvFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const { headers, rows } = parseCsv(text);
      if (headers.length === 0 || rows.length === 0) {
        toast.error('CSV appears empty or could not be parsed.'); return;
      }
      if (!headers.some(h => h.includes('title') || h.includes('name') || h === 'task')) {
        toast.error('CSV must have a "title" or "name" column.'); return;
      }
      setCsvPreview({ headers, rows, fileName: file.name });
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleCsvImport = () => {
    if (!csvPreview) return;
    const { headers, rows } = csvPreview;
    const { projects } = useProjectStore.getState();
    const { addTask } = useTaskStore.getState();

    const col = (name: string) => {
      const candidates = name.split('|');
      for (const c of candidates) {
        const idx = headers.findIndex(h => h.includes(c));
        if (idx !== -1) return idx;
      }
      return -1;
    };

    const titleCol    = col('title|name|task');
    const descCol     = col('description|desc|notes|body');
    const statusCol   = col('status|state');
    const priorityCol = col('priority|prio');
    const projectCol  = col('project');
    const assigneeCol = col('assignee|assign|owner|responsible');
    const dueDateCol  = col('duedate|due|deadline|enddate');
    const tagsCol     = col('tags|tag|labels');
    const estCol      = col('estimatedhours|estimate|est|hours');

    // Build lookup maps
    const projectMap = new Map(projects.map(p => [p.name.toLowerCase(), p.id]));
    const userMap    = new Map(SEED_USERS.map(u => [u.name.toLowerCase(), u.id]));
    const fallbackProject = projects[0];

    let imported = 0;
    let skipped = 0;

    for (const row of rows) {
      const get = (idx: number) => (idx >= 0 && idx < row.length ? row[idx].trim() : '');
      const title = get(titleCol);
      if (!title || title.length > 512) { skipped++; continue; }

      const rawProject = get(projectCol).toLowerCase();
      const projectId = projectMap.get(rawProject) ?? fallbackProject?.id;
      if (!projectId) { skipped++; continue; }

      const rawAssignee = get(assigneeCol).toLowerCase();
      const assigneeId = rawAssignee ? userMap.get(rawAssignee) : undefined;

      const rawDue = get(dueDateCol);
      let dueDate: string | undefined;
      if (rawDue) {
        const d = new Date(rawDue);
        if (!isNaN(d.getTime())) dueDate = d.toISOString().split('T')[0];
      }

      const rawTags = get(tagsCol);
      const tags = rawTags ? rawTags.split(/[;,]/).map(t => t.trim()).filter(Boolean).slice(0, 10) : [];

      const rawEst = parseFloat(get(estCol));

      const task: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'order'> = {
        title: title.slice(0, 256),
        description: get(descCol).slice(0, 2048) || undefined,
        status: statusCol >= 0 ? coerceStatus(get(statusCol)) : 'todo',
        priority: priorityCol >= 0 ? coercePriority(get(priorityCol)) : 'medium',
        projectId,
        assigneeId,
        dueDate,
        tags,
        subtasks: [],
        comments: [],
        attachments: [],
        attachmentCount: 0,
        estimatedHours: !isNaN(rawEst) && rawEst > 0 ? Math.min(rawEst, 9999) : undefined,
      };

      addTask(task);
      const created = useTaskStore.getState().tasks.at(-1);
      if (created) emitTaskCreate(created);
      imported++;
    }

    toast.success(`Imported ${imported} task${imported !== 1 ? 's' : ''}${skipped > 0 ? ` · ${skipped} skipped` : ''}`, { duration: 5000 });
    setCsvPreview(null);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        if (!Array.isArray(data.tasks) || !Array.isArray(data.projects)) {
          toast.error('Invalid export file — missing tasks or projects.'); return;
        }
        // Security: validate imported data through the same schema used on rehydration
        // (OWASP A08 — prevents malicious JSON payloads from entering the store)
        const validTasks = sanitiseTasks(data.tasks);
        const validProjects = sanitiseProjects(data.projects);
        if (validTasks.length === 0 && data.tasks.length > 0) {
          toast.error('Import failed — no valid tasks found. File may be corrupted.'); return;
        }
        if (!window.confirm(`Import ${validTasks.length} tasks and ${validProjects.length} projects? This will replace all current data.`)) return;
        localStorage.setItem('taskflow-tasks', JSON.stringify({ state: { tasks: validTasks }, version: 0 }));
        localStorage.setItem('taskflow-projects', JSON.stringify({ state: { projects: validProjects }, version: 0 }));
        toast.success('Data imported — reloading…');
        setTimeout(() => window.location.reload(), 800);
      } catch {
        toast.error('Failed to parse file. Make sure it\'s a valid TaskFlow JSON export.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="max-w-2xl space-y-6 pb-20 md:pb-0">
      {/* Profile */}
      <div className="bg-[#0C1526] border border-[#1C3054] rounded-xl p-6">
        <h3 className="text-sm font-semibold text-white mb-4">Profile</h3>
        {currentUser && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Avatar name={currentUser.name} colour={currentUser.colour} size="lg" />
              <div>
                <p className="font-semibold text-white">{currentUser.name}</p>
                <p className="text-sm text-slate-400">{currentUser.email}</p>
              </div>
            </div>
            <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${roleMeta.colour} ${roleMeta.bg}`}>
              {roleMeta.label}
            </span>
          </div>
        )}
      </div>

      {/* Appearance */}
      <div className="bg-[#0C1526] border border-[#1C3054] rounded-xl p-6">
        <h3 className="text-sm font-semibold text-white mb-4">Appearance</h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-200">Theme</p>
            <p className="text-xs text-slate-400">{theme === 'light' ? 'Light mode active' : 'Dark mode active'}</p>
          </div>
          <div className="flex items-center gap-1 bg-[#06091A] border border-[#1C3054] rounded-xl p-1">
            <button
              onClick={() => setTheme('dark')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                theme === 'dark'
                  ? 'bg-blue-500 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <Moon className="w-3.5 h-3.5" />
              Dark
            </button>
            <button
              onClick={() => setTheme('light')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                theme === 'light'
                  ? 'bg-amber-400/20 border border-amber-400/40 text-amber-300'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <Sun className="w-3.5 h-3.5" />
              Light
            </button>
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="bg-[#0C1526] border border-[#1C3054] rounded-xl p-6">
        <h3 className="text-sm font-semibold text-white mb-4">Notifications</h3>
        <NotificationsPanel enabled={notificationsEnabled} setEnabled={setNotificationsEnabled} />
      </div>

      {/* Tags */}
      <div className="bg-[#0C1526] border border-[#1C3054] rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white">Tags</h3>
          <span className="text-xs text-slate-500">{tags.length} tag{tags.length !== 1 ? 's' : ''}</span>
        </div>

        {/* Existing tags */}
        <div className="space-y-2 mb-4">
          {tags.map(tag => (
            <div key={tag.id} className="flex items-center gap-3 p-2.5 bg-[#06091A] rounded-xl">
              {editingTagId === tag.id ? (
                <>
                  {/* Colour picker dots */}
                  <div className="flex gap-1 flex-shrink-0">
                    {PROJECT_COLOURS.map(c => (
                      <button
                        key={c}
                        onClick={() => updateTag(tag.id, { colour: c })}
                        className="w-4 h-4 rounded-full border-2 transition-all"
                        style={{ backgroundColor: c, borderColor: tag.colour === c ? 'white' : 'transparent' }}
                      />
                    ))}
                  </div>
                  <input
                    autoFocus
                    value={editTagName}
                    onChange={e => setEditTagName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleSaveTagEdit(tag.id);
                      if (e.key === 'Escape') setEditingTagId(null);
                    }}
                    maxLength={32}
                    className="flex-1 bg-transparent text-sm text-slate-200 outline-none border-b border-blue-500 pb-0.5"
                  />
                  <button onClick={() => handleSaveTagEdit(tag.id)} className="p-1 text-green-400 hover:text-green-300 transition-colors">
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setEditingTagId(null)} className="p-1 text-slate-500 hover:text-slate-300 transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </>
              ) : (
                <>
                  <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: tag.colour }} />
                  <span
                    className="text-sm px-2 py-0.5 rounded-full font-medium"
                    style={{ backgroundColor: `${tag.colour}22`, color: tag.colour }}
                  >
                    {tag.name}
                  </span>
                  <div className="flex items-center gap-1 ml-auto">
                    <RoleGuard allowed={canManageTags(role)}>
                      <button
                        onClick={() => { setEditingTagId(tag.id); setEditTagName(tag.name); }}
                        className="p-1 rounded-lg text-slate-600 hover:text-blue-400 hover:bg-[#122040] transition-colors"
                        title="Rename tag"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteTag(tag.id, tag.name)}
                        className="p-1 rounded-lg text-slate-600 hover:text-red-400 hover:bg-[#122040] transition-colors"
                        title="Delete tag"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </RoleGuard>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        {/* Add new tag — admin only */}
        <RoleGuard
          allowed={canManageTags(role)}
          fallback={<p className="text-xs text-slate-600 italic">Only admins can create or edit tags.</p>}
        >
          <div className="flex items-center gap-2 p-3 bg-[#06091A] rounded-xl border border-dashed border-[#1C3054] hover:border-[#4B8CF7]/30 transition-colors">
            <div className="flex gap-1 flex-shrink-0">
              {PROJECT_COLOURS.map(c => (
                <button
                  key={c}
                  onClick={() => setNewTagColour(c)}
                  className="w-4 h-4 rounded-full border-2 transition-all"
                  style={{ backgroundColor: c, borderColor: newTagColour === c ? 'white' : 'transparent' }}
                />
              ))}
            </div>
            <input
              value={newTagName}
              onChange={e => setNewTagName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAddTag(); }}
              placeholder="New tag name…"
              maxLength={32}
              className="flex-1 bg-transparent text-sm text-slate-300 placeholder-slate-600 outline-none"
            />
            <button
              onClick={handleAddTag}
              disabled={!newTagName.trim()}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 disabled:opacity-30 transition-all text-xs font-medium flex-shrink-0"
            >
              <Plus className="w-3 h-3" />
              Add
            </button>
          </div>
        </RoleGuard>
      </div>

      {/* My Templates */}
      {userTemplates.length > 0 && (
        <div className="bg-[#0C1526] border border-[#1C3054] rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">My Templates</h3>
            <span className="text-xs text-slate-500">{userTemplates.length} saved</span>
          </div>
          <div className="space-y-2">
            {userTemplates.map(tpl => (
              editingTemplateId === tpl.id ? (
                <div key={tpl.id} className="flex items-start gap-3 p-3 bg-[#06091A] border border-blue-500/40 rounded-xl">
                  <input
                    value={editTemplateIcon}
                    onChange={e => setEditTemplateIcon(e.target.value)}
                    maxLength={4}
                    className="w-10 bg-[#0C1526] border border-[#1C3054] rounded-lg text-center text-base p-1 outline-none focus:border-blue-500"
                  />
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <input
                      autoFocus
                      value={editTemplateName}
                      onChange={e => setEditTemplateName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleSaveTemplateEdit(tpl.id); if (e.key === 'Escape') setEditingTemplateId(null); }}
                      placeholder="Template name"
                      maxLength={100}
                      className="w-full bg-[#0C1526] border border-[#1C3054] rounded-lg px-2.5 py-1.5 text-sm text-slate-100 outline-none focus:border-blue-500"
                    />
                    <input
                      value={editTemplateDesc}
                      onChange={e => setEditTemplateDesc(e.target.value)}
                      placeholder="Description (optional)"
                      maxLength={200}
                      className="w-full bg-[#0C1526] border border-[#1C3054] rounded-lg px-2.5 py-1.5 text-xs text-slate-300 outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0 pt-0.5">
                    <button onClick={() => handleSaveTemplateEdit(tpl.id)} className="p-1.5 rounded-lg text-green-400 hover:bg-green-500/10 transition-colors" title="Save"><Check className="w-3.5 h-3.5" /></button>
                    <button onClick={() => setEditingTemplateId(null)} className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-[#122040] transition-colors" title="Cancel"><X className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              ) : (
                <div key={tpl.id} className="flex items-center gap-3 p-2.5 bg-[#06091A] rounded-xl group">
                  <span className="text-base">{tpl.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-200 truncate">{tpl.name}</p>
                    <p className="text-xs text-slate-500">
                      {tpl.subtasks.length} subtask{tpl.subtasks.length !== 1 ? 's' : ''}
                      {tpl.estimatedHours ? ` · ${tpl.estimatedHours}h estimated` : ''}
                    </p>
                  </div>
                  <button
                    onClick={() => { setEditingTemplateId(tpl.id); setEditTemplateName(tpl.name); setEditTemplateIcon(tpl.icon); setEditTemplateDesc(tpl.description); }}
                    className="p-1.5 rounded-lg text-slate-600 hover:text-blue-400 hover:bg-[#122040] transition-colors opacity-0 group-hover:opacity-100"
                    title="Edit template"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm(`Delete template "${tpl.name}"?`)) deleteTemplate(tpl.id);
                    }}
                    className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-[#122040] transition-colors"
                    title="Delete template"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )
            ))}
          </div>
          <p className="text-xs text-slate-600 mt-3">
            Templates are saved from any task using the <span className="text-amber-400">🔖</span> bookmark button in the task detail panel.
          </p>
        </div>
      )}

      {/* Data Management */}
      <div className="bg-[#0C1526] border border-[#1C3054] rounded-xl p-6">
        <h3 className="text-sm font-semibold text-white mb-4">Data Management</h3>
        <div className="space-y-3">
          <RoleGuard
            allowed={canExportData(role)}
            fallback={
              <div className="flex items-center justify-between p-3 bg-[#06091A] rounded-xl opacity-50">
                <div>
                  <p className="text-sm text-slate-400">Export Data</p>
                  <p className="text-xs text-slate-500">Requires Member or Admin role</p>
                </div>
                <Button variant="secondary" size="sm" disabled>Export</Button>
              </div>
            }
          >
            <div className="flex items-center justify-between p-3 bg-[#06091A] rounded-xl">
              <div>
                <p className="text-sm text-slate-200">Export Data</p>
                <p className="text-xs text-slate-400">Download all tasks and projects as JSON</p>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => {
                  const data = {
                    tasks: useTaskStore.getState().tasks,
                    projects: useProjectStore.getState().projects,
                    exportedAt: new Date().toISOString(),
                  };
                  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url; a.download = 'taskflow-export.json'; a.click();
                  URL.revokeObjectURL(url);
                  toast.success('JSON exported!');
                }}>JSON</Button>
                <Button variant="secondary" size="sm" onClick={() => { exportCSV(); toast.success('CSV exported!'); }}>CSV</Button>
              </div>
            </div>
          </RoleGuard>

          <RoleGuard allowed={canClearData(role)}>
            <div className="flex items-center justify-between p-3 bg-[#06091A] rounded-xl">
              <div>
                <p className="text-sm text-slate-200">Import Data</p>
                <p className="text-xs text-slate-400">Restore from a TaskFlow JSON export file</p>
              </div>
              <div>
                <input ref={importRef} type="file" accept=".json" onChange={handleImport} className="hidden" />
                <Button variant="secondary" size="sm" icon={<Upload className="w-3.5 h-3.5" />} onClick={() => importRef.current?.click()}>
                  Import
                </Button>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 bg-[#06091A] rounded-xl">
              <div>
                <p className="text-sm text-slate-200">Import from CSV</p>
                <p className="text-xs text-slate-400">Import tasks from a spreadsheet export (Excel, Google Sheets, Asana…)</p>
              </div>
              <div>
                <input ref={csvImportRef} type="file" accept=".csv,.tsv,text/csv" onChange={handleCsvFile} className="hidden" />
                <Button variant="secondary" size="sm" icon={<FileSpreadsheet className="w-3.5 h-3.5" />} onClick={() => csvImportRef.current?.click()}>
                  Import CSV
                </Button>
              </div>
            </div>
          </RoleGuard>

          <RoleGuard
            allowed={canClearData(role)}
            fallback={
              <div className="flex items-center justify-between p-3 bg-[#06091A] rounded-xl opacity-50">
                <div>
                  <p className="text-sm text-slate-400">Clear All Data</p>
                  <p className="text-xs text-slate-500">Requires Admin role</p>
                </div>
                <Button variant="danger" size="sm" disabled>Clear</Button>
              </div>
            }
          >
            <div className="flex items-center justify-between p-3 bg-[#06091A] rounded-xl">
              <div>
                <p className="text-sm text-slate-200">Clear All Data</p>
                <p className="text-xs text-slate-400">Remove all tasks and projects permanently</p>
              </div>
              <Button variant="danger" size="sm" onClick={handleClearData}>Clear</Button>
            </div>
          </RoleGuard>
        </div>
      </div>

      {/* Team */}
      <div className="bg-[#0C1526] border border-[#1C3054] rounded-xl p-6">
        <h3 className="text-sm font-semibold text-white mb-4">Team Members</h3>
        <div className="space-y-3">
          {SEED_USERS.map(u => {
            const uRole = u.id === 'user-1' ? 'admin' : u.id === 'user-2' ? 'member' : 'viewer';
            const uMeta = ROLE_META[uRole];
            const { tasks: allTasks } = useTaskStore.getState();
            const assigned = allTasks.filter(t => t.assigneeId === u.id).length;
            const done = allTasks.filter(t => t.assigneeId === u.id && t.status === 'done').length;
            return (
              <div key={u.id} className="flex items-center gap-3">
                <Avatar name={u.name} colour={u.colour} />
                <div className="flex-1">
                  <p className="text-sm text-slate-200">{u.name}</p>
                  <p className="text-xs text-slate-400">{u.email}</p>
                </div>
                {assigned > 0 && (
                  <div className="text-xs text-slate-500 text-right">
                    <span className="text-white font-medium">{done}</span>/{assigned}
                    <span className="text-slate-600 ml-1">done</span>
                  </div>
                )}
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${uMeta.colour} ${uMeta.bg}`}>
                  {uMeta.label}
                </span>
                {u.id === currentUser?._id && (
                  <span className="text-xs text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded-full border border-blue-400/20">You</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Sign out */}
      <div className="bg-[#0C1526] border border-[#1C3054] rounded-xl p-6">
        <h3 className="text-sm font-semibold text-white mb-4">Session</h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-200">Sign out</p>
            <p className="text-xs text-slate-400">End your current session</p>
          </div>
          <Button variant="danger" size="sm" icon={<LogOut className="w-3.5 h-3.5" />} onClick={handleLogout}>
            Sign out
          </Button>
        </div>
      </div>

      {/* ── CSV Import Preview Modal ── */}
      {csvPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setCsvPreview(null)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="relative bg-[#0C1526] border border-[#1C3054] rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 pt-5 pb-4 border-b border-[#1C3054] flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <FileSpreadsheet className="w-4 h-4 text-green-400" />
                  <h2 className="text-base font-bold text-white">CSV Import Preview</h2>
                </div>
                <p className="text-xs text-slate-500">{csvPreview.fileName} · {csvPreview.rows.length} row{csvPreview.rows.length !== 1 ? 's' : ''} detected</p>
              </div>
              <button onClick={() => setCsvPreview(null)} className="text-slate-500 hover:text-slate-300 transition-colors p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Column mapping info */}
            <div className="px-6 py-3 bg-[#06091A] border-b border-[#1C3054]">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-2">Detected columns</p>
              <div className="flex flex-wrap gap-2">
                {csvPreview.headers.map((h, i) => (
                  <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-[#122040] border border-[#1C3054] text-slate-300 font-mono">
                    {h || `col${i}`}
                  </span>
                ))}
              </div>
              {!csvPreview.headers.some(h => h.includes('title') || h.includes('name') || h === 'task') && (
                <div className="flex items-center gap-2 mt-2 text-amber-400">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  <p className="text-xs">No "title" column found — first column will be used as task title.</p>
                </div>
              )}
            </div>

            {/* Data preview table */}
            <div className="flex-1 overflow-auto px-6 py-4">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-2">
                Preview (first {Math.min(5, csvPreview.rows.length)} of {csvPreview.rows.length} rows)
              </p>
              <div className="overflow-x-auto rounded-xl border border-[#1C3054]">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-[#06091A]">
                      {csvPreview.headers.map((h, i) => (
                        <th key={i} className="px-3 py-2 text-left text-slate-500 font-medium whitespace-nowrap border-b border-[#1C3054]">
                          {h || `col${i}`}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {csvPreview.rows.slice(0, 5).map((row, ri) => (
                      <tr key={ri} className="border-b border-[#1C3054] last:border-0 hover:bg-[#122040]/50">
                        {csvPreview.headers.map((_, ci) => (
                          <td key={ci} className="px-3 py-2 text-slate-300 max-w-[180px] truncate whitespace-nowrap">
                            {row[ci] ?? ''}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {csvPreview.rows.length > 5 && (
                <p className="text-xs text-slate-600 mt-2 text-center">…and {csvPreview.rows.length - 5} more rows</p>
              )}
            </div>

            {/* Mapping hints */}
            <div className="px-6 pb-3">
              <div className="flex items-start gap-2 px-3 py-2.5 bg-blue-500/8 border border-blue-500/20 rounded-xl">
                <AlertCircle className="w-3.5 h-3.5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-slate-400 space-y-0.5">
                  <p><span className="text-slate-300 font-medium">Auto-mapped:</span> title/name, description, status, priority, project, assignee, duedate, tags, estimatedhours</p>
                  <p>Unknown project names fall back to your first project. Unmatched assignees are left unassigned.</p>
                </div>
              </div>
            </div>

            {/* Footer actions */}
            <div className="px-6 pb-5 flex items-center gap-3 border-t border-[#1C3054] pt-4">
              <button
                onClick={handleCsvImport}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-green-500 hover:bg-green-600 text-white text-sm font-semibold transition-colors"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Import {csvPreview.rows.length} Task{csvPreview.rows.length !== 1 ? 's' : ''}
              </button>
              <button
                onClick={() => setCsvPreview(null)}
                className="px-4 py-2.5 rounded-xl border border-[#1C3054] text-slate-400 text-sm hover:text-slate-200 hover:border-slate-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
