import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Zap, Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { Button } from '../components/ui/Button';

const schema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});
type FormData = z.infer<typeof schema>;

const DEMO_ACCOUNTS = [
  { email: 'alex@taskflow.io',   password: 'Admin1234!',  role: 'Admin',  desc: 'Full access — create, edit, delete' },
  { email: 'sarah@taskflow.io',  password: 'Member1234!', role: 'Member', desc: 'Create & edit own tasks/projects' },
  { email: 'marcus@taskflow.io', password: 'Viewer1234!', role: 'Viewer', desc: 'Read-only access' },
];

export default function LoginPage() {
  const { login } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as any)?.from?.pathname ?? '/';

  const [showPw, setShowPw] = useState(false);
  const [serverError, setServerError] = useState('');

  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setServerError('');
    const result = await login(data.email, data.password);
    if (!result.success) {
      setServerError(result.error ?? 'Login failed.');
      return;
    }
    navigate(from, { replace: true });
  };

  const fillDemo = (email: string, password: string) => {
    setValue('email', email);
    setValue('password', password);
    setServerError('');
  };

  return (
    <div className="min-h-screen bg-[#0B1437] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="text-2xl font-bold text-white">TaskFlow</span>
        </div>

        {/* Card */}
        <div className="bg-[#111C44] border border-[#1F3461] rounded-2xl p-8">
          <h2 className="text-xl font-bold text-white mb-1">Sign in</h2>
          <p className="text-sm text-slate-400 mb-6">Enter your credentials to access your workspace.</p>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            {/* Email */}
            <div>
              <label className="text-xs font-medium text-slate-400 mb-1.5 block">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  {...register('email')}
                  type="email"
                  autoComplete="email"
                  placeholder="you@taskflow.io"
                  className={`w-full bg-[#0B1437] border rounded-xl pl-9 pr-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 outline-none transition-colors ${
                    errors.email ? 'border-red-500' : 'border-[#1F3461] focus:border-blue-500'
                  }`}
                />
              </div>
              {errors.email && <p className="text-xs text-red-400 mt-1">{errors.email.message}</p>}
            </div>

            {/* Password */}
            <div>
              <label className="text-xs font-medium text-slate-400 mb-1.5 block">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  {...register('password')}
                  type={showPw ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className={`w-full bg-[#0B1437] border rounded-xl pl-9 pr-10 py-2.5 text-sm text-slate-200 placeholder-slate-600 outline-none transition-colors ${
                    errors.password ? 'border-red-500' : 'border-[#1F3461] focus:border-blue-500'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  tabIndex={-1}
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-400 mt-1">{errors.password.message}</p>}
            </div>

            {/* Server error */}
            {serverError && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
                <p className="text-sm text-red-400">{serverError}</p>
              </div>
            )}

            <Button type="submit" className="w-full justify-center" disabled={isSubmitting}>
              {isSubmitting ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
        </div>

        {/* Demo accounts */}
        <div className="mt-4 bg-[#111C44] border border-[#1F3461] rounded-2xl p-5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Demo accounts</p>
          <div className="space-y-2">
            {DEMO_ACCOUNTS.map(acc => (
              <button
                key={acc.email}
                type="button"
                onClick={() => fillDemo(acc.email, acc.password)}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-[#0B1437] border border-[#1F3461] hover:border-blue-500/40 transition-all text-left group"
              >
                <div>
                  <p className="text-xs font-semibold text-slate-200 group-hover:text-blue-300 transition-colors">
                    {acc.role} — {acc.email}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{acc.desc}</p>
                </div>
                <span className="text-[10px] text-slate-600 font-mono ml-3 flex-shrink-0">
                  {acc.password}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
