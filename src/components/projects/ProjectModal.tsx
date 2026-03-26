import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Button } from '../ui/Button';
import { useProjectStore } from '../../store/projectStore';
import { useUIStore } from '../../store/uiStore';
import { PROJECT_COLOURS } from '../../lib/constants';
import { CURRENT_USER_ID } from '../../lib/sampleData';
import { cn } from '../../lib/utils';

const schema = z.object({
  name: z.string().min(1, 'Name is required').max(128, 'Name must be 128 characters or fewer'),
  description: z.string().max(1024, 'Description must be 1024 characters or fewer').optional(),
  colour: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid colour'),
});

type FormData = z.infer<typeof schema>;

export function ProjectModal() {
  const { isProjectModalOpen, closeProjectModal } = useUIStore();
  const { addProject } = useProjectStore();

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', description: '', colour: PROJECT_COLOURS[0] },
  });

  const selectedColour = watch('colour');

  const onSubmit = (data: FormData) => {
    addProject({
      ...data,
      icon: 'FolderOpen',
      ownerId: CURRENT_USER_ID,
      memberIds: [CURRENT_USER_ID],
      status: 'active',
    });
    reset();
    closeProjectModal();
  };

  return (
    <Modal open={isProjectModalOpen} onClose={closeProjectModal} title="New Project">
      <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
        <Input label="Project Name *" placeholder="e.g. Q3 Product Launch" error={errors.name?.message} {...register('name')} />
        <Textarea label="Description" placeholder="What is this project about?" rows={2} {...register('description')} />
        <div>
          <label className="text-xs font-medium text-slate-400 mb-2 block">Colour</label>
          <div className="flex gap-2 flex-wrap">
            {PROJECT_COLOURS.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => setValue('colour', c)}
                className={cn('w-7 h-7 rounded-full transition-all', selectedColour === c ? 'ring-2 ring-offset-2 ring-offset-[#111C44] ring-white scale-110' : 'hover:scale-105')}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={() => { reset(); closeProjectModal(); }}>Cancel</Button>
          <Button type="submit">Create Project</Button>
        </div>
      </form>
    </Modal>
  );
}
