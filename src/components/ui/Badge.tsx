import { cn } from '../../lib/utils';
import type { SquadType } from '../../types';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'squad' | 'status' | 'count' | 'subtle' | 'primary';
  squadType?: SquadType;
  status?: 'online' | 'busy' | 'offline' | 'success' | 'error' | 'warning';
  size?: 'sm' | 'md';
  className?: string;
}

const squadStyles: Record<SquadType, string> = {
  copywriting: 'bg-orange-500/15 text-orange-500 dark:text-orange-400',
  design: 'bg-purple-500/15 text-purple-500 dark:text-purple-400',
  creator: 'bg-green-500/15 text-green-500 dark:text-green-400',
  orchestrator: 'bg-cyan-500/15 text-cyan-500 dark:text-cyan-400',
  content: 'bg-red-500/15 text-red-500 dark:text-red-400',
  development: 'bg-blue-500/15 text-blue-500 dark:text-blue-400',
  engineering: 'bg-indigo-500/15 text-indigo-500 dark:text-indigo-400',
  analytics: 'bg-teal-500/15 text-teal-500 dark:text-teal-400',
  marketing: 'bg-pink-500/15 text-pink-500 dark:text-pink-400',
  advisory: 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400',
  default: 'bg-gray-500/15 text-gray-500 dark:text-gray-400',
};

const statusStyles = {
  online: 'bg-green-500/15 text-green-500',
  busy: 'bg-orange-500/15 text-orange-500',
  offline: 'bg-gray-500/15 text-gray-500',
  success: 'bg-green-500/15 text-green-500',
  error: 'bg-red-500/15 text-red-500',
  warning: 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400',
};

const sizeClasses = {
  sm: 'px-2 py-0.5 text-[10px]',
  md: 'px-2.5 py-1 text-xs',
};

export function Badge({
  children,
  variant = 'default',
  squadType = 'default',
  status,
  size = 'md',
  className,
}: BadgeProps) {
  const baseClasses =
    'inline-flex items-center justify-center font-medium rounded-md whitespace-nowrap';

  const variantClasses = {
    default: 'glass-badge',
    squad: cn('glass-badge', squadStyles[squadType]),
    status: cn('glass-badge', status ? statusStyles[status] : ''),
    count: 'bg-[var(--badge-count-bg)] text-[var(--badge-count-text)] min-w-[20px] px-1.5 py-0.5 rounded-full text-[10px]',
    subtle: 'bg-white/5 text-white/60 border border-white/10',
    primary: 'bg-[rgba(209,255,0,0.1)] text-[#D1FF00] border border-[rgba(209,255,0,0.2)]',
  };

  return (
    <span
      className={cn(
        baseClasses,
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
