import { useEffect, useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, X, Trash2 } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { useTaskStore } from '../../store/taskStore';
import { emitTaskCreate, emitTaskUpdate } from '../../lib/collabEmit';
import { useProjectStore } from '../../store/projectStore';
import { useUIStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';
import { SEED_USERS } from '../../lib/sampleData';
import { STATUS_OPTIONS, PRIORITY_OPTIONS, RECURRENCE_OPTIONS, TASK_TEMPLATES } from '../../lib/constants';
import { useTemplateStore } from '../../store/templateStore';
import { useTagStore } from '../../store/tagStore';
import { useSprintStore } from '../../store/sprintStore';
import { generateId } from '../../lib/utils';
import type { Subtask } from '../../types';
import { cn } from '../../lib/utils';

const schema = z.object({
  title: z.string().min(1, 'Title is required').max(256, 'Title must be 256 characters or fewer'),
  description: z.string().max(4096, 'Description must be 4096 characters or fewer').optional(),
  status: z.enum(['todo', 'in-progress', 'review', 'done', 'blocked']),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  projectId: z.string().min(1, 'Project is required'),
  assigneeId: z.string().optional(),
  dueDate: z.string().optional(),
  recurrence: z.enum(['none', 'daily', 'weekly', 'monthly']).optional(),
  estimatedHours: z.preprocess(
    v => (v === '' || v === null || v === undefined ? undefined : Number(v)),
    z.number().min(0).max(9999).optional()
  ),
  loggedHours: z.preprocess(
    v => (v === '' || v === null || v === undefined ? undefined : Number(v)),
    z.number().min(0).max(9999).optional()
  ),
});

type FormData = z.infer<typeof schema>;

export function TaskModal() {
  const { isTaskModalOpen, editingTaskId, prefillDueDate, prefillProjectId, prefillTitle, prefillPriority, prefillAssigneeId, closeTaskModal } = useUIStore();
  const { tasks, addTask, updateTask, logActivity } = useTaskStore();
  const { projects } = useProjectStore();
  const { currentUser } = useAuthStore();
  const allTags = useTagStore(s => s.tags);
  const { templates: userTemplates, deleteTemplate } = useTemplateStore();
  const { getProjectSprints } = useSprintStore();

  const editing = tasks.find(t => t.id === editingTaskId);

  // Controlled state for tags, subtasks, and sprint (outside RHF schema)
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [selectedSprintId, setSelectedSprintId] = useState<string>('');
  const [newSubtask, setNewSubtask] = useState('');
  const subtaskInputRef = useRef<HTMLInputElement>(null);

  const { register, handleSubmit, reset, setValue, watch: watchField, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      title: '', description: '', status: 'todo', priority: 'medium',
      projectId: projects[0]?.id ?? '',
    },
  });
  const watchedProjectId = watchField('projectId');

  useEffect(() => {
    if (editing) {
      reset({
        title: editing.title,
        description: editing.description ?? '',
        status: editing.status,
        priority: editing.priority,
        projectId: editing.projectId,
        assigneeId: editing.assigneeId ?? '',
        dueDate: editing.dueDate ? editing.dueDate.slice(0, 10) : '',
        recurrence: editing.recurrence ?? 'none',
        estimatedHours: editing.estimatedHours,
        loggedHours: editing.loggedHours,
      });
      setSelectedTags(editing.tags ?? []);
      setSubtasks(editing.subtasks ?? []);
      setSelectedSprintId(editing.sprintId ?? '');
    } else {
      reset({
        title: prefillTitle ?? '',
        description: '',
        status: 'todo',
        priority: prefillPriority ?? 'medium',
        projectId: prefillProjectId ?? projects[0]?.id ?? '',
        assigneeId: prefillAssigneeId ?? '',
        dueDate: prefillDueDate ?? '',
        recurrence: 'none',
      });
      setSelectedTags([]);
      setSubtasks([]);
      setSelectedSprintId('');
    }
    setNewSubtask('');
  }, [editing, isTaskModalOpen, projects, prefillDueDate, prefillProjectId, prefillTitle, prefillPriority, prefillAssigneeId, reset]);

  const applyTemplate = (tplId: string) => {
    const tpl =
      TASK_TEMPLATES.find(t => t.id === tplId) ??
      userTemplates.find(t => t.id === tplId);
    if (!tpl) return;
    setValue('description', tpl.description);
    setValue('priority', tpl.priority);
    if (tpl.estimatedHours) setValue('estimatedHours', tpl.estimatedHours);
    setSelectedTags(tpl.tags);
    setSubtasks(tpl.subtasks.map(title => ({ id: generateId(), title, completed: false })));
  };

  const toggleTag = (tagId: string) => {
    setSelectedTags(prev =>
      prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
    );
  };

  const addSubtask = () => {
    const title = newSubtask.trim();
    if (!title) return;
    setSubtasks(prev => [...prev, { id: generateId(), title, completed: false }]);
    setNewSubtask('');
    subtaskInputRef.current?.focus();
  };

  const removeSubtask = (id: string) => setSubtasks(prev => prev.filter(s => s.id !== id));

  const onSubmit = (data: any) => {
    const dueDate = data.dueDate ? new Date(data.dueDate).toISOString() : undefined;
    const recurrence = data.recurrence === 'none' ? undefined : data.recurrence;
    const uid = currentUser?.id ?? '';
    const sprintId = selectedSprintId || undefined;
    if (editing) {
      const prev = editing;
      const updates = { ...data, dueDate, recurrence, tags: selectedTags, subtasks, sprintId };
      updateTask(editing.id, updates);
      emitTaskUpdate(editing.id, updates);
      if (prev.status !== data.status) logActivity(editing.id, uid, 'status_changed', { from: prev.status, to: data.status });
      if (prev.priority !== data.priority) logActivity(editing.id, uid, 'priority_changed', { from: prev.priority, to: data.priority });
    } else {
      addTask({
        ...data,
        dueDate,
        recurrence,
        tags: selectedTags,
        subtasks,
        sprintId,
        comments: [],
        attachments: [],
        attachmentCount: 0,
        assigneeId: data.assigneeId || uid,
      });
      // addTask is synchronous — task is immediately available at the end of the array
      const newTask = useTaskStore.getState().tasks.at(-1);
      if (newTask) {
        logActivity(newTask.id, uid, 'created');
        emitTaskCreate(newTask);
      }
    }
    closeTaskModal();
  };

  return (
    <Modal open={isTaskModalOpen} onClose={closeTaskModal} title={editing ? 'Edit Task' : 'New Task'} size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
        {/* Template picker — new tasks only */}
        {!editing && (
          <div>
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Start from template</p>
            <div className="flex flex-wrap gap-2">
              {/* User-defined templates first */}
              {userTemplates.map(tpl => (
                <div key={tpl.id} className="flex items-center gap-0 rounded-xl overflow-hidden border border-amber-500/30 bg-amber-500/5 hover:border-amber-500/50 transition-all group/utpl">
                  <button
                    type="button"
                    onClick={() => applyTemplate(tpl.id)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-amber-400/80 hover:text-amber-300 transition-colors"
                  >
                    <span>{tpl.icon}</span>
                    {tpl.name}
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteTemplate(tpl.id)}
                    className="pr-2 py-1.5 opacity-0 group-hover/utpl:opacity-100 text-slate-600 hover:text-red-400 transition-all"
                    title="Delete template"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {/* Built-in templates */}
              {TASK_TEMPLATES.map(tpl => (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => applyTemplate(tpl.id)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#06091A] border border-[#1C3054] hover:border-blue-500/40 hover:bg-[#122040] text-xs text-slate-400 hover:text-slate-200 transition-all"
                >
                  <span>{tpl.icon}</span>
                  {tpl.name}
                </button>
              ))}
            </div>
          </div>
        )}
        <Input id="task-title" label="Title *" placeholder="Task name" error={errors.title?.message} {...register('title')} />
        <Textarea id="task-description" label="Description" placeholder="Add details..." rows={2} {...register('description')} />

        <div className="grid grid-cols-2 gap-4">
          <Select id="task-status" label="Status" options={STATUS_OPTIONS.map(s => ({ value: s.value, label: s.label }))} {...register('status')} />
          <Select id="task-priority" label="Priority" options={PRIORITY_OPTIONS.map(p => ({ value: p.value, label: p.label }))} {...register('priority')} />
          <Select label="Project *" options={projects.map(p => ({ value: p.id, label: p.name }))} error={errors.projectId?.message} {...register('projectId')} />
          <Select
            label="Assignee"
            options={[{ value: '', label: 'Unassigned' }, ...SEED_USERS.map(u => ({ value: u.id, label: u.name }))]}
            {...register('assigneeId')}
          />
          <Input label="Due Date" type="date" {...register('dueDate')} />
          <Select
            label="Recurrence"
            options={RECURRENCE_OPTIONS.map(r => ({ value: r.value, label: r.label }))}
            {...register('recurrence')}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Estimated Hours" type="number" min={0} step={0.5} placeholder="0" {...register('estimatedHours')} />
          <Input label="Logged Hours" type="number" min={0} step={0.5} placeholder="0" {...register('loggedHours')} />
        </div>

        {/* Sprint picker — show only if project has non-completed sprints */}
        {(() => {
          const projectId = watchedProjectId || editing?.projectId;
          const sprints = projectId ? getProjectSprints(projectId).filter(sp => sp.status !== 'completed') : [];
          if (sprints.length === 0) return null;
          return (
            <div>
              <label className="text-xs font-medium text-slate-400 mb-2 block">Sprint</label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedSprintId('')}
                  className={cn('text-xs font-medium px-2.5 py-1 rounded-full border transition-all', selectedSprintId === '' ? 'bg-slate-500/15 border-slate-500/40 text-slate-300' : 'border-[#1C3054] text-slate-500 hover:border-slate-600 hover:text-slate-400')}
                >
                  Backlog
                </button>
                {sprints.map(sp => (
                  <button
                    key={sp.id}
                    type="button"
                    onClick={() => setSelectedSprintId(sp.id)}
                    className={cn('text-xs font-medium px-2.5 py-1 rounded-full border transition-all', selectedSprintId === sp.id ? 'bg-blue-500/15 border-blue-500/40 text-blue-300' : 'border-[#1C3054] text-slate-500 hover:border-slate-600 hover:text-slate-400')}
                  >
                    {sp.name}
                    {sp.status === 'active' && <span className="ml-1 text-green-400">●</span>}
                  </button>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Tags */}
        <div>
          <label className="text-xs font-medium text-slate-400 mb-2 block">Tags</label>
          <div className="flex flex-wrap gap-2">
            {allTags.map(tag => {
              const active = selectedTags.includes(tag.id);
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => toggleTag(tag.id)}
                  className={cn(
                    'text-xs font-medium px-2.5 py-1 rounded-full border transition-all',
                    active
                      ? 'border-transparent'
                      : 'border-[#1C3054] text-slate-400 hover:border-slate-500'
                  )}
                  style={active ? { backgroundColor: `${tag.colour}22`, color: tag.colour, borderColor: `${tag.colour}44` } : {}}
                >
                  {tag.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Subtasks */}
        <div>
          <label className="text-xs font-medium text-slate-400 mb-2 block">
            Subtasks {subtasks.length > 0 && <span className="text-slate-600">({subtasks.length})</span>}
          </label>

          {subtasks.length > 0 && (
            <div className="space-y-1.5 mb-2">
              {subtasks.map(sub => (
                <div key={sub.id} className="flex items-center gap-2 bg-[#06091A] rounded-lg px-3 py-2">
                  <span className="flex-1 text-sm text-slate-300 truncate">{sub.title}</span>
                  <button type="button" onClick={() => removeSubtask(sub.id)} className="text-slate-600 hover:text-red-400 transition-colors flex-shrink-0">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <input
              ref={subtaskInputRef}
              value={newSubtask}
              onChange={e => setNewSubtask(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSubtask(); } }}
              placeholder="Add a subtask…"
              maxLength={256}
              className="flex-1 bg-[#06091A] border border-[#1C3054] focus:border-blue-500 rounded-xl px-3 py-2 text-sm text-slate-200 placeholder-slate-600 outline-none transition-colors"
            />
            <button
              type="button"
              onClick={addSubtask}
              disabled={!newSubtask.trim()}
              className="p-2 rounded-xl bg-[#06091A] border border-[#1C3054] text-slate-400 hover:text-blue-400 hover:border-blue-500 disabled:opacity-30 transition-all"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={closeTaskModal}>Cancel</Button>
          <Button type="submit">{editing ? 'Save Changes' : 'Create Task'}</Button>
        </div>
      </form>
    </Modal>
  );
}
