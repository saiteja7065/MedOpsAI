import { cn } from '../../lib/utils';

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
