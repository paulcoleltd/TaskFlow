import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Button } from '../ui/Button';
import { useProjectStore } from '../../store/projectStore';
import { useUIStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';
import { PROJECT_COLOURS } from '../../lib/constants';
import { emitProjectCreate } from '../../lib/collabEmit';
import { cn } from '../../lib/utils';

const schema = z.object({
  name: z.string().min(1, 'Name is required').max(128, 'Name must be 128 characters or fewer'),
  description: z.string().max(1024, 'Description must be 1024 characters or fewer').optional(),
  colour: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid colour'),
  dueDate: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export function ProjectModal() {
  const { isProjectModalOpen, closeProjectModal } = useUIStore();
  const { addProject } = useProjectStore();
  const { currentUser } = useAuthStore();

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', description: '', colour: PROJECT_COLOURS[0], dueDate: '' },
  });

  const selectedColour = watch('colour');

  const onSubmit = (data: FormData) => {
    addProject({
      name: data.name,
      description: data.description,
      colour: data.colour,
      dueDate: data.dueDate || undefined,
      icon: 'FolderOpen',
      ownerId: currentUser?.id ?? '',
      memberIds: currentUser ? [currentUser.id] : [],
      status: 'active',
    });
    const newProject = useProjectStore.getState().projects.at(-1);
    if (newProject) emitProjectCreate(newProject);
    reset();
    closeProjectModal();
  };

  return (
    <Modal open={isProjectModalOpen} onClose={closeProjectModal} title="New Project">
      <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
        <Input label="Project Name *" placeholder="e.g. Q3 Product Launch" error={errors.name?.message} {...register('name')} />
        <Textarea label="Description" placeholder="What is this project about?" rows={2} {...register('description')} />
        <div>
          <label className="text-xs font-medium text-slate-400 mb-1.5 block">Due Date <span className="text-slate-600">(optional)</span></label>
          <input
            type="date"
            {...register('dueDate')}
            className="w-full bg-[#06091A] border border-[#1C3054] focus:border-blue-500 rounded-xl px-3 py-2 text-sm text-slate-300 placeholder-slate-600 outline-none transition-colors [color-scheme:dark]"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-400 mb-2 block">Colour</label>
          <div className="flex gap-2 flex-wrap mb-2">
            {PROJECT_COLOURS.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => setValue('colour', c)}
                className={cn('w-7 h-7 rounded-full transition-all', selectedColour === c ? 'ring-2 ring-offset-2 ring-offset-[#0C1526] ring-white scale-110' : 'hover:scale-105')}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full flex-shrink-0 border border-[#1C3054]" style={{ backgroundColor: selectedColour }} />
            <input
              type="text"
              value={selectedColour}
              onChange={e => {
                const val = e.target.value;
                if (/^#[0-9A-Fa-f]{0,6}$/.test(val)) setValue('colour', val.length === 7 ? val : val);
              }}
              placeholder="#4B8CF7"
              maxLength={7}
              className="flex-1 bg-[#06091A] border border-[#1C3054] focus:border-blue-500 rounded-lg px-3 py-1.5 text-xs text-slate-300 placeholder-slate-600 outline-none font-mono transition-colors"
            />
            {errors.colour && <span className="text-xs text-red-400">{errors.colour.message}</span>}
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
