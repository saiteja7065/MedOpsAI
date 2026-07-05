import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Activity, Mail, Lock, User, Phone, ArrowRight, Building2, Stethoscope, HeartPulse } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/auth';
import { Button } from '../../components/ui/Button';
import { cn } from '../../lib/utils';

const schema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  phone: z.string().optional(),
  role: z.enum(['patient', 'doctor']),
});

type FormData = z.infer<typeof schema>;

export function RegisterPage() {
  const navigate = useNavigate();
  const { fetchProfile } = useAuthStore();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors }, watch } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { role: 'patient' },
  });

  const role = watch('role');

  const onSubmit = async (data: FormData) => {
    setError(null);
    setLoading(true);
    try {
      const { data: authData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.full_name,
            role: data.role,
          },
        },
      });
      if (error) throw error;
      if (authData.user) {
        await fetchProfile(authData.user.id);
        navigate(data.role === 'doctor' ? '/doctor' : '/patient');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to register');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-cyan-600 via-primary-700 to-primary-800 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-20 right-20 w-72 h-72 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-20 left-20 w-96 h-96 bg-cyan-300 rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 flex flex-col justify-between p-12 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/20 backdrop-blur-xl rounded-2xl">
              <Activity className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-xl font-bold">MedOps AI</h1>
              <p className="text-sm text-white/70">Hospital Administration</p>
            </div>
          </div>

          <div>
            <h2 className="text-4xl font-bold leading-tight mb-4">
              Join the future of<br />healthcare management
            </h2>
            <p className="text-white/80 text-lg max-w-md">
              Create your account to access AI-powered hospital administration, video consultations, medical records, and more.
            </p>
            <div className="space-y-3 mt-8 max-w-md">
              {[
                'AI-powered symptom triage and health assistant',
                'Real-time bed and OT management',
                'Secure video consultations with AI transcripts',
                'Comprehensive medical record management with OCR',
              ].map((feature) => (
                <div key={feature} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                  </div>
                  <p className="text-white/90">{feature}</p>
                </div>
              ))}
            </div>
          </div>

          <p className="text-white/60 text-sm">© 2026 MedOps AI. All rights reserved.</p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8 bg-slate-50 dark:bg-slate-950 overflow-y-auto">
        <div className="w-full max-w-md py-8">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="p-2.5 bg-primary-600 rounded-2xl text-white">
              <Activity className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-xl font-bold">MedOps AI</h1>
              <p className="text-sm text-slate-500">Hospital Administration</p>
            </div>
          </div>

          <h2 className="text-3xl font-bold mb-2">Create your account</h2>
          <p className="text-slate-500 mb-8">Join MedOps AI today</p>

          {error && (
            <div className="mb-6 p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-700 dark:text-rose-300 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-2">I am a</label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: 'patient', label: 'Patient', icon: HeartPulse },
                  { value: 'doctor', label: 'Doctor', icon: Stethoscope },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => register('role').onChange({ target: { value: opt.value } })}
                    className={cn(
                      'flex items-center gap-3 p-4 rounded-xl border-2 transition-all',
                      role === opt.value
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                    )}
                  >
                    <opt.icon className="w-5 h-5" />
                    <span className="font-medium">{opt.label}</span>
                  </button>
                ))}
              </div>
              <input type="hidden" {...register('role')} />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input {...register('full_name')} className="input pl-11" placeholder="John Doe" />
              </div>
              {errors.full_name && <p className="text-rose-500 text-xs mt-1.5">{errors.full_name.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input type="email" {...register('email')} className="input pl-11" placeholder="you@hospital.com" />
              </div>
              {errors.email && <p className="text-rose-500 text-xs mt-1.5">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Phone (optional)</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input {...register('phone')} className="input pl-11" placeholder="+1 234 567 890" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input type="password" {...register('password')} className="input pl-11" placeholder="••••••••" />
              </div>
              {errors.password && <p className="text-rose-500 text-xs mt-1.5">{errors.password.message}</p>}
            </div>

            <Button type="submit" className="w-full" size="lg" loading={loading} icon={!loading ? <ArrowRight className="w-4 h-4" /> : undefined}>
              Create Account
            </Button>
          </form>

          <p className="text-center mt-6 text-sm text-slate-500">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
