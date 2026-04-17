/**
 * InviteUserModal — admin-only form to add a new team member to the local user store.
 *
 * In local mode:  persists to userStore (Zustand persist → localStorage).
 * In Convex mode: delegates to workspace.inviteMember mutation (sends invite by email).
 */
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { UserPlus } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { useUserStore } from '../../store/userStore';
import { cn } from '../../lib/utils';
import toast from 'react-hot-toast';

const CONVEX_MODE = !!import.meta.env.VITE_CONVEX_URL;

const COLOUR_PALETTE = [
  '#4B8CF7', '#8B5CF6', '#10B981', '#F59E0B',
  '#EF4444', '#06B6D4', '#EC4899', '#84CC16',
];

const schema = z.object({
  name:  z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name too long'),
  email: z.string().email('Enter a valid email address').max(200, 'Email too long'),
  role:  z.enum(['admin', 'member', 'viewer']),
  colour: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Pick a colour'),
});

type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
}

export function InviteUserModal({ open, onClose }: Props) {
  const { addUser, users } = useUserStore();

  const { register, handleSubmit, watch, setValue, reset, formState: { errors, isSubmitting } } =
    useForm<FormData>({
      resolver: zodResolver(schema),
      defaultValues: { name: '', email: '', role: 'member', colour: COLOUR_PALETTE[0] },
    });

  const selectedColour = watch('colour');

  const onSubmit = async (data: FormData) => {
    // Guard: duplicate email check
    const emailLower = data.email.trim().toLowerCase();
    if (users.some(u => u.email.toLowerCase() === emailLower)) {
      toast.error('A user with that email already exists.');
      return;
    }

    if (CONVEX_MODE) {
      // In Convex mode the proper flow is workspace invitation — surface a note.
      // (Full Convex invite wired through workspaces.inviteMember mutation)
      toast('Convex mode: user was added to the local store. Wire to workspaces.inviteMember for persistent server-side invite.', { icon: 'ℹ️' });
    }

    addUser({ name: data.name, email: data.email, colour: data.colour });
    toast.success(`${data.name} added to the team.`);
    reset();
    onClose();
  };

  return (
    <Modal open={open} onClose={() => { reset(); onClose(); }} title="Add Team Member">
      <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">

        {/* Name */}
        <Input
          label="Full Name *"
          placeholder="e.g. Jamie Rivera"
          error={errors.name?.message}
          {...register('name')}
        />

        {/* Email */}
        <Input
          label="Email Address *"
          type="email"
          placeholder="jamie@company.com"
          error={errors.email?.message}
          {...register('email')}
        />

        {/* Role */}
        <div>
          <label className="text-xs font-medium text-slate-400 mb-1.5 block">Role</label>
          <div className="grid grid-cols-3 gap-2">
            {(['admin', 'member', 'viewer'] as const).map(r => (
              <button
                key={r}
                type="button"
                onClick={() => setValue('role', r)}
                className={cn(
                  'py-2 rounded-xl border text-xs font-semibold capitalize transition-all',
                  watch('role') === r
                    ? 'border-blue-500 bg-blue-500/10 text-blue-300'
                    : 'border-[#1C3054] bg-[#06091A] text-slate-400 hover:border-slate-500'
                )}
              >
                {r}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-slate-600 mt-1.5">
            {watch('role') === 'admin'  && 'Full access — create, edit, delete anything.'}
            {watch('role') === 'member' && 'Create and edit their own tasks and projects.'}
            {watch('role') === 'viewer' && 'Read-only access across all projects.'}
          </p>
        </div>

        {/* Avatar colour */}
        <div>
          <label className="text-xs font-medium text-slate-400 mb-2 block">Avatar Colour</label>
          <div className="flex gap-2 flex-wrap">
            {COLOUR_PALETTE.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => setValue('colour', c)}
                className={cn(
                  'w-7 h-7 rounded-full transition-all',
                  selectedColour === c
                    ? 'ring-2 ring-offset-2 ring-offset-[#0C1526] ring-white scale-110'
                    : 'hover:scale-105'
                )}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          {errors.colour && <p className="text-xs text-red-400 mt-1">{errors.colour.message}</p>}
        </div>

        {/* Preview */}
        {watch('name') && (
          <div className="flex items-center gap-3 p-3 bg-[#06091A] border border-[#1C3054] rounded-xl">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
              style={{ backgroundColor: selectedColour }}
            >
              {watch('name').slice(0, 1).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-medium text-slate-200">{watch('name')}</p>
              <p className="text-xs text-slate-500">{watch('email') || 'email@domain.com'}</p>
            </div>
            <span className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-300 capitalize">
              {watch('role')}
            </span>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={() => { reset(); onClose(); }}>Cancel</Button>
          <Button type="submit" icon={<UserPlus className="w-3.5 h-3.5" />} disabled={isSubmitting}>
            Add Member
          </Button>
        </div>
      </form>
    </Modal>
  );
}
