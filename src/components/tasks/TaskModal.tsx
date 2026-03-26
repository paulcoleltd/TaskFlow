import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { useTaskStore } from '../../store/taskStore';
import { useProjectStore } from '../../store/projectStore';
import { useUIStore } from '../../store/uiStore';
import { SEED_USERS, CURRENT_USER_ID } from '../../lib/sampleData';
import { STATUS_OPTIONS, PRIORITY_OPTIONS } from '../../lib/constants';
import { useEffect } from 'react';

const schema = z.object({
  title: z.string().min(1, 'Title is required').max(256, 'Title must be 256 characters or fewer'),
  description: z.string().max(4096, 'Description must be 4096 characters or fewer').optional(),
  status: z.enum(['todo', 'in-progress', 'review', 'done', 'blocked']),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  projectId: z.string().min(1, 'Project is required'),
  assigneeId: z.string().optional(),
  dueDate: z.string().optional(),
  estimatedHours: z.preprocess(
    v => (v === '' || v === null || v === undefined ? undefined : Number(v)),
    z.number().min(0).max(9999).optional()
  ),
});

type FormData = z.infer<typeof schema>;

export function TaskModal() {
  const { isTaskModalOpen, editingTaskId, closeTaskModal } = useUIStore();
  const { tasks, addTask, updateTask } = useTaskStore();
  const { projects } = useProjectStore();

  const editing = tasks.find(t => t.id === editingTaskId);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      title: '', description: '', status: 'todo', priority: 'medium',
      projectId: projects[0]?.id ?? '',
    },
  });

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
        estimatedHours: editing.estimatedHours,
      });
    } else {
      reset({ title: '', description: '', status: 'todo', priority: 'medium', projectId: projects[0]?.id ?? '' });
    }
  }, [editing, isTaskModalOpen, projects, reset]);

  const onSubmit = (data: any) => {
    if (editing) {
      updateTask(editing.id, { ...data, dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : undefined });
    } else {
      addTask({
        ...data,
        dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : undefined,
        tags: [], subtasks: [], comments: [], attachmentCount: 0,
        assigneeId: data.assigneeId || CURRENT_USER_ID,
      });
    }
    closeTaskModal();
  };

  return (
    <Modal open={isTaskModalOpen} onClose={closeTaskModal} title={editing ? 'Edit Task' : 'New Task'} size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
        <Input id="task-title" label="Title *" placeholder="Task name" error={errors.title?.message} {...register('title')} />
        <Textarea id="task-description" label="Description" placeholder="Add details..." rows={3} {...register('description')} />
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
          <Input label="Estimated Hours" type="number" min={0} step={0.5} {...register('estimatedHours')} />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={closeTaskModal}>Cancel</Button>
          <Button type="submit">{editing ? 'Save Changes' : 'Create Task'}</Button>
        </div>
      </form>
    </Modal>
  );
}
