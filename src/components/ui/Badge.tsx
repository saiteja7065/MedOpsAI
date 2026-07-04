import { cn } from '../../lib/utils';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';

const variants: Record<BadgeVariant, string> = {
  default: 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300',
  success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  danger: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
  info: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
  neutral: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
};

export function Badge({ variant = 'default', children, className, icon }: {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
}) {
  return (
    <span className={cn('badge', variants[variant], className)}>
      {icon}
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, BadgeVariant> = {
    pending: 'warning',
    confirmed: 'info',
    in_progress: 'info',
    completed: 'success',
    cancelled: 'danger',
    missed: 'danger',
    rescheduled: 'warning',
    available: 'success',
    occupied: 'danger',
    reserved: 'warning',
    cleaning: 'neutral',
    maintenance: 'neutral',
    emergency: 'danger',
    active: 'success',
    scheduled: 'info',
    waiting: 'warning',
  };
  return <Badge variant={map[status] || 'neutral'}>{status.replace('_', ' ')}</Badge>;
}
