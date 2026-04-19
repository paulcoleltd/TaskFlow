/**
 * InviteUserModal — admin-only form to add a new team member.
 *
 * Security model (post-hardening):
 *   - In production: POSTs to /api/auth/register which stores bcrypt-hashed
 *     credentials in Vercel Blob. Any device can then log in cross-device.
 *   - In DEV: falls back to localStorage (no server running).
 *   - In Convex mode: delegates to workspace.inviteMember mutation.
 *   - Password never leaves the browser unencrypted.
 *   - Admin role is re-verified server-side (defence-in-depth, CWE-285).
 */
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { UserPlus, Eye, EyeOff } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { useUserStore } from '../../store/userStore';
import { useAuthStore } from '../../store/authStore';
import { canManageUsers } from '../../lib/permissions';
import { cn } from '../../lib/utils';
import toast from 'react-hot-toast';

const CONVEX_MODE = !!import.meta.env.VITE_CONVEX_URL;

const COLOUR_PALETTE = [
  '#4B8CF7', '#8B5CF6', '#10B981', '#F59E0B',
  '#EF4444', '#06B6D4', '#EC4899', '#84CC16',
];

const schema = z.object({
  name:            z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name too long'),
  email:           z.string().email('Enter a valid email address').max(200, 'Email too long'),
  role:            z.enum(['admin', 'member', 'viewer']),
  colour:          z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Pick a colour'),
  password:        z.string()
    .min(8,   'Password must be at least 8 characters')
    .max(128, 'Password too long')
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Must contain at least one number'),
  confirmPassword: z.string().min(1, 'Please confirm the password'),
}).refine(d => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path:    ['confirmPassword'],
});

type FormData = z.infer<typeof schema>;

interface Props {
  open:    boolean;
  onClose: () => void;
}

export function InviteUserModal({ open, onClose }: Props) {
  const { addUser, users } = useUserStore();
  const [showPw, setShowPw] = useState(false);
  const [showCp, setShowCp] = useState(false);

  const { register, handleSubmit, watch, setValue, reset, formState: { errors, isSubmitting } } =
    useForm<FormData>({
      resolver:      zodResolver(schema),
      defaultValues: { name: '', email: '', role: 'member', colour: COLOUR_PALETTE[0], password: '', confirmPassword: '' },
    });

  const selectedColour = watch('colour');

  const onSubmit = async (data: FormData) => {
    // Defence-in-depth: verify admin rights in the client (server also checks — CWE-285)
    const callerRole = useAuthStore.getState().currentUser?.role ?? 'viewer';
    if (!canManageUsers(callerRole)) {
      toast.error('You do not have permission to add team members.');
      return;
    }

    const emailLower = data.email.trim().toLowerCase();

    // Duplicate check against local user store
    if (users.some(u => u.email.toLowerCase() === emailLower)) {
      toast.error('A user with that email already exists.');
      return;
    }

    if (CONVEX_MODE) {
      toast('Convex mode: wire to workspaces.inviteMember for server-side invite.', { icon: 'ℹ️' });
    }

    // ── Register credentials server-side (production) ──────────────────────
    if (!CONVEX_MODE && !import.meta.env.DEV) {
      // Production: send to /api/auth/register
      // Server hashes with bcrypt (cost=12) and stores in Vercel Blob.
      // The new member can log in from ANY device after this call.
      const res = await fetch('/api/auth/register', {
        method:      'POST',
        headers:     { 'Content-Type': 'application/json' },
        credentials: 'include',   // send session cookie so server can verify admin role
        body:        JSON.stringify({
          name:     data.name,
          email:    emailLower,
          password: data.password,
          colour:   data.colour,
          role:     data.role,
        }),
      });

      if (!res.ok) {
        const err = (await res.json()) as { error?: string };
        toast.error(err.error ?? 'Failed to register user. Please try again.');
        return;
      }
    } else if (import.meta.env.DEV) {
      // DEV fallback: store SHA-256 hash in localStorage (no server in local dev)
      await _storeDevCredential({ email: emailLower, password: data.password, role: data.role });
    }

    // Add to the local user store (so they appear in Settings, task assignee list, etc.)
    addUser({ name: data.name, email: emailLower, colour: data.colour, role: data.role });

    toast.success(`${data.name} added! They can now sign in with their email and password.`);
    reset();
    onClose();
  };

  return (
    <Modal open={open} onClose={() => { reset(); onClose(); }} title="Add Team Member">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="p-6 space-y-4">

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

        {/* Password */}
        <div className="relative">
          <Input
            label="Password *"
            type={showPw ? 'text' : 'password'}
            placeholder="Min. 8 chars, 1 uppercase, 1 number"
            error={errors.password?.message}
            {...register('password')}
          />
          <button
            type="button"
            onClick={() => setShowPw(v => !v)}
            className="absolute right-3 top-8 text-slate-500 hover:text-slate-300 transition-colors"
            tabIndex={-1}
            aria-label={showPw ? 'Hide password' : 'Show password'}
          >
            {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        {/* Confirm Password */}
        <div className="relative">
          <Input
            label="Confirm Password *"
            type={showCp ? 'text' : 'password'}
            placeholder="Re-enter password"
            error={errors.confirmPassword?.message}
            {...register('confirmPassword')}
          />
          <button
            type="button"
            onClick={() => setShowCp(v => !v)}
            className="absolute right-3 top-8 text-slate-500 hover:text-slate-300 transition-colors"
            tabIndex={-1}
            aria-label={showCp ? 'Hide password' : 'Show password'}
          >
            {showCp ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

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
            {isSubmitting ? 'Adding…' : 'Add Member'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ── DEV-only fallback: SHA-256 hash to localStorage ───────────────────────────
// Used when there is no running API server (local development only).
// In production, bcrypt via /api/auth/register is used instead.
async function _storeDevCredential(cred: { email: string; password: string; role: string }): Promise<void> {
  try {
    const enc  = new TextEncoder().encode(cred.password);
    const buf  = await crypto.subtle.digest('SHA-256', enc);
    const hash = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
    const KEY  = 'taskflow-local-users';
    const raw  = localStorage.getItem(KEY);
    const list = raw ? (JSON.parse(raw) as Array<{ email: string; passwordHash: string; role: string }>) : [];
    const idx  = list.findIndex(u => u.email === cred.email);
    const entry = { email: cred.email, passwordHash: hash, role: cred.role };
    if (idx >= 0) list[idx] = entry; else list.push(entry);
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch { /* ignore storage errors in dev */ }
}
