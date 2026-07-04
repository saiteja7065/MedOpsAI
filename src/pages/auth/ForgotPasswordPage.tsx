import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, Mail, ArrowRight, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
      setSent(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-slate-50 dark:bg-slate-950">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="p-2.5 bg-primary-600 rounded-2xl text-white">
            <Activity className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-bold">MediCore OS</h1>
            <p className="text-sm text-slate-500">Hospital Administration</p>
          </div>
        </div>

        <div className="card p-8">
          {sent ? (
            <div className="text-center">
              <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-4">
                <CheckCircle className="w-8 h-8 text-emerald-600" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Check your email</h2>
              <p className="text-slate-500 mb-6">We've sent a password reset link to {email}</p>
              <Link to="/login" className="btn-primary w-full">Back to Login</Link>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-bold mb-2">Forgot password?</h2>
              <p className="text-slate-500 mb-6">Enter your email and we'll send you a reset link</p>

              {error && (
                <div className="mb-4 p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-700 dark:text-rose-300 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={onSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium mb-2">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="input pl-11"
                      placeholder="you@hospital.com"
                      required
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full" size="lg" loading={loading} icon={!loading ? <ArrowRight className="w-4 h-4" /> : undefined}>
                  Send Reset Link
                </Button>
              </form>

              <p className="text-center mt-6 text-sm text-slate-500">
                Remember your password?{' '}
                <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">Sign in</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
