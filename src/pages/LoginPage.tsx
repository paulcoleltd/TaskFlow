import { useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Zap, Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { useConvexAuth as useLocalConvexAuth } from '../hooks/useConvexUser';
import { useAuthStore } from '../store/authStore';
import { Button } from '../components/ui/Button';

const CONVEX_MODE = !!import.meta.env.VITE_CONVEX_URL;

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

// Local demo accounts — validated client-side when Convex is not configured
const LOCAL_ACCOUNTS: Record<string, { id: string; name: string; email: string; colour: string; role: 'admin' | 'member' | 'viewer'; password: string }> = {
  'alex@taskflow.io':   { id: 'user-1', name: 'Alex Morgan',     email: 'alex@taskflow.io',   colour: '#4B8CF7', role: 'admin',  password: 'Admin1234!'  },
  'sarah@taskflow.io':  { id: 'user-2', name: 'Sarah Chen',      email: 'sarah@taskflow.io',  colour: '#8B5CF6', role: 'member', password: 'Member1234!' },
  'marcus@taskflow.io': { id: 'user-3', name: 'Marcus Williams', email: 'marcus@taskflow.io', colour: '#10B981', role: 'viewer', password: 'Viewer1234!' },
};

export default function LoginPage() {
  const { signIn } = useLocalConvexAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as any)?.from?.pathname ?? '/';

  const [showPw, setShowPw] = useState(false);
  const [serverError, setServerError] = useState('');
  const [_lockedUntil, setLockedUntil] = useState(0);
  const lockedUntilRef = useRef(0);   // mirrors state — always readable in onSubmit closure
  const failCount = useRef(0);

  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setServerError('');
    if (!CONVEX_MODE) {
      // Rate limiting — block after 5 consecutive failures
      if (Date.now() < lockedUntilRef.current) {
        const secs = Math.ceil((lockedUntilRef.current - Date.now()) / 1000);
        setServerError(`Too many attempts. Please wait ${secs} seconds before trying again.`);
        return;
      }
      // Local mode — validate against demo accounts directly (no server needed)
      const u = LOCAL_ACCOUNTS[data.email.trim().toLowerCase()];
      if (!u || u.password !== data.password) {
        failCount.current += 1;
        if (failCount.current >= 5) {
          // Lock on the 5th failure — next attempt (6th) will be blocked at the top check
          const lockTime = Date.now() + 60_000;
          lockedUntilRef.current = lockTime;
          setLockedUntil(lockTime);
        }
        setServerError('Invalid email or password. Please try again.');
        return;
      }
      const { password: _pw, ...user } = u;
      localStorage.setItem('taskflow-local-auth', JSON.stringify(user));
      useAuthStore.setState({ currentUser: user, token: 'local', isAuthenticated: true });
      navigate(from, { replace: true });
      return;
    }
    try {
      await signIn('password', { email: data.email, password: data.password, flow: 'signIn' });
      navigate(from, { replace: true });
    } catch {
      setServerError('Invalid email or password. Please try again.');
    }
  };

  const fillDemo = (email: string, password: string) => {
    setValue('email', email);
    setValue('password', password);
    setServerError('');
  };

  return (
    <div className="min-h-screen bg-gradient-navy flex items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient background orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/8 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-600/8 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-11 h-11 rounded-xl bg-gradient-accent flex items-center justify-center shadow-glow-lg">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="text-2xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">TaskFlow</span>
        </div>

        {/* Card */}
        <div className="card-nebula rounded-2xl p-8">
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
                  className={`w-full bg-[#06091A] border rounded-xl pl-9 pr-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 outline-none transition-colors ${
                    errors.email ? 'border-red-500' : 'border-[#1C3054] focus:border-[#4B8CF7]/70 focus:shadow-glow'
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
                  className={`w-full bg-[#06091A] border rounded-xl pl-9 pr-10 py-2.5 text-sm text-slate-200 placeholder-slate-600 outline-none transition-colors ${
                    errors.password ? 'border-red-500' : 'border-[#1C3054] focus:border-[#4B8CF7]/70 focus:shadow-glow'
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
        <div className="mt-4 card-nebula rounded-2xl p-5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Demo accounts</p>
          <div className="space-y-2">
            {DEMO_ACCOUNTS.map(acc => (
              <button
                key={acc.email}
                type="button"
                onClick={() => fillDemo(acc.email, acc.password)}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-[#06091A] border border-[#1C3054] hover:border-[#4B8CF7]/40 hover:bg-[#0C1526] transition-all duration-200 text-left group"
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
