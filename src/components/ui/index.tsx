import { cn } from '../../lib/utils';

export { Button } from './Button';
export { Badge, StatusBadge } from './Badge';

export function Card({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('card p-5', className)} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, action, icon }: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between mb-4">
      <div className="flex items-center gap-3">
        {icon && <div className="p-2 rounded-xl bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400">{icon}</div>}
        <div>
          <h3 className="font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
          {subtitle && <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

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

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton', className)} />;
}

export function EmptyState({ icon, title, description, action }: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 mb-4">
        {icon}
      </div>
      <h3 className="font-semibold text-slate-700 dark:text-slate-300">{title}</h3>
      {description && <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Modal({ open, onClose, title, children, size = 'md' }: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}) {
  if (!open) return null;
  const sizes = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className={cn('relative w-full bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col animate-scale-in', sizes[size])}>
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="p-5 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
}

export function Avatar({ name, src, size = 'md' }: {
  name: string;
  src?: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const sizes = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-14 h-14 text-lg' };
  const initials = name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  if (src) return <img src={src} alt={name} className={cn('rounded-full object-cover', sizes[size])} />;
  return (
    <div className={cn('rounded-full bg-gradient-to-br from-primary-500 to-cyan-500 text-white font-semibold flex items-center justify-center', sizes[size])}>
      {initials}
    </div>
  );
}
