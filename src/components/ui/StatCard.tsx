import { cn } from '../../lib/utils';

export function StatCard({ label, value, icon, trend, color = 'primary', subtitle }: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: { value: string; positive: boolean };
  color?: 'primary' | 'emerald' | 'amber' | 'rose' | 'cyan';
  subtitle?: string;
}) {
  const colors = {
    primary: 'from-primary-500 to-primary-600',
    emerald: 'from-emerald-500 to-emerald-600',
    amber: 'from-amber-500 to-amber-600',
    rose: 'from-rose-500 to-rose-600',
    cyan: 'from-cyan-500 to-cyan-600',
  };
  return (
    <div className="card p-5 relative overflow-hidden group hover:shadow-lg transition-shadow">
      <div className={cn('absolute top-0 right-0 w-24 h-24 rounded-full bg-gradient-to-br opacity-10 group-hover:opacity-20 transition-opacity', colors[color])} style={{ transform: 'translate(30%, -30%)' }} />
      <div className="flex items-center justify-between mb-3">
        <div className={cn('p-2.5 rounded-xl bg-gradient-to-br text-white shadow-lg', colors[color])}>
          {icon}
        </div>
        {trend && (
          <span className={cn('text-xs font-medium', trend.positive ? 'text-emerald-600' : 'text-rose-600')}>
            {trend.positive ? '↑' : '↓'} {trend.value}
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{value}</p>
      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{label}</p>
      {subtitle && <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{subtitle}</p>}
    </div>
  );
}
