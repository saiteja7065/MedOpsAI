import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Activity, Mail, Lock, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/auth';
import { Button } from '../../components/ui/Button';

const schema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type FormData = z.infer<typeof schema>;

export function LoginPage() {
  const navigate = useNavigate();
  const { setUser, fetchProfile } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [seedResults, setSeedResults] = useState<any[] | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setError(null);
    setLoading(true);
    try {
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });
      if (error) throw error;
      if (authData.user) {
        const profile = await fetchProfile(authData.user.id);
        if (profile) {
          const route = profile.role === 'admin' ? '/admin' : profile.role === 'doctor' ? '/doctor' : '/patient';
          navigate(route);
        } else {
          // Fallback: use role from user metadata if profile fetch failed
          const role = (authData.user.user_metadata as any)?.role || 'patient';
          const route = role === 'admin' ? '/admin' : role === 'doctor' ? '/doctor' : '/patient';
          navigate(route);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel - branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-600 via-primary-700 to-cyan-800 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-20 left-20 w-72 h-72 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-cyan-300 rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 flex flex-col justify-between p-12 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/20 backdrop-blur-xl rounded-2xl">
              <Activity className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-xl font-bold">MediCore OS</h1>
              <p className="text-sm text-white/70">Hospital Administration</p>
            </div>
          </div>

          <div>
            <h2 className="text-4xl font-bold leading-tight mb-4">
              The Future of<br />Hospital Management
            </h2>
            <p className="text-white/80 text-lg max-w-md">
              AI-powered hospital administration operating system. Streamline appointments, beds, OTs, video consultations, and patient care in one platform.
            </p>
            <div className="grid grid-cols-2 gap-4 mt-8 max-w-md">
              {[
                { label: 'AI Triage', value: '24/7' },
                { label: 'Real-time', value: 'Beds & OTs' },
                { label: 'Video', value: 'Consultations' },
                { label: 'Analytics', value: 'Live Dashboard' },
              ].map((item) => (
                <div key={item.label} className="bg-white/10 backdrop-blur-xl rounded-xl p-4 border border-white/20">
                  <p className="text-2xl font-bold">{item.value}</p>
                  <p className="text-sm text-white/70">{item.label}</p>
                </div>
              ))}
            </div>
          </div>

          <p className="text-white/60 text-sm">© 2026 MediCore OS. All rights reserved.</p>
        </div>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-slate-50 dark:bg-slate-950">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="p-2.5 bg-primary-600 rounded-2xl text-white">
              <Activity className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-xl font-bold">MediCore OS</h1>
              <p className="text-sm text-slate-500">Hospital Administration</p>
            </div>
          </div>

          <h2 className="text-3xl font-bold mb-2">Welcome back</h2>
          <p className="text-slate-500 mb-8">Sign in to your account to continue</p>

          {error && (
            <div className="mb-6 p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-700 dark:text-rose-300 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-2">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="email"
                  {...register('email')}
                  className="input pl-11"
                  placeholder="you@hospital.com"
                />
              </div>
              {errors.email && <p className="text-rose-500 text-xs mt-1.5">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  {...register('password')}
                  className="input pl-11 pr-11"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && <p className="text-rose-500 text-xs mt-1.5">{errors.password.message}</p>}
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                <input type="checkbox" className="rounded border-slate-300 text-primary-600 focus:ring-primary-500" />
                Remember me
              </label>
              <Link to="/forgot-password" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
                Forgot password?
              </Link>
            </div>

            <Button type="submit" className="w-full" size="lg" loading={loading} icon={!loading ? <ArrowRight className="w-4 h-4" /> : undefined}>
              Sign In
            </Button>
          </form>

          <div className="mt-8 p-4 bg-primary-50 dark:bg-primary-900/20 rounded-xl border border-primary-100 dark:border-primary-800">
            <p className="text-sm font-medium text-primary-700 dark:text-primary-300 mb-2">Demo Accounts:</p>
            <div className="space-y-1 text-xs text-primary-600 dark:text-primary-400">
              <p>Admin: admin@medicore.health / Admin@MediCore2026</p>
              <p>Doctor: doctor@medicore.health / Doctor@MediCore2026</p>
              <p>Patient: patient@medicore.health / Patient@MediCore2026</p>
            </div>
            <button
              type="button"
              onClick={async () => {
                setSeeding(true);
                try {
                  const { seedDemoUsers } = await import('../../lib/seed');
                  const results = await seedDemoUsers();
                  setSeedResults(results);
                } catch (e: any) {
                  setError(e.message);
                } finally {
                  setSeeding(false);
                }
              }}
              className="mt-3 text-xs text-primary-600 hover:text-primary-700 font-medium underline"
            >
              {seeding ? 'Creating demo accounts...' : 'Click to create demo accounts (first time only)'}
            </button>
            {seedResults && (
              <div className="mt-2 text-xs space-y-1">
                {seedResults.map((r: any) => (
                  <p key={r.email} className={r.status === 'error' ? 'text-rose-600' : 'text-emerald-600'}>
                    {r.email}: {r.status} {r.error || ''}
                  </p>
                ))}
              </div>
            )}
          </div>

          <p className="text-center mt-6 text-sm text-slate-500">
            Don't have an account?{' '}
            <Link to="/register" className="text-primary-600 hover:text-primary-700 font-medium">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
