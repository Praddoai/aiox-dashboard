import { cn } from '../../lib/utils';

export type StatusType = 'idle' | 'working' | 'waiting' | 'error' | 'success' | 'offline';

interface StatusDotProps {
  status: StatusType;
  size?: 'sm' | 'md' | 'lg';
  glow?: boolean;
  pulse?: boolean;
  label?: string;
  className?: string;
}

const statusColors: Record<StatusType, string> = {
  idle: 'bg-[var(--status-dot-idle)]',
  working: 'bg-[var(--status-dot-working)]',
  waiting: 'bg-[var(--status-dot-waiting)]',
  error: 'bg-[var(--status-dot-error)]',
  success: 'bg-[var(--status-dot-success)]',
  offline: 'bg-[var(--status-dot-offline)]',
};

const glowColors: Record<StatusType, string> = {
  idle: '',
  working: 'shadow-[0_0_8px_var(--status-dot-working-glow)]',
  waiting: 'shadow-[0_0_8px_var(--status-dot-waiting-glow)]',
  error: 'shadow-[0_0_8px_var(--status-dot-error-glow)]',
  success: 'shadow-[0_0_8px_var(--status-dot-success-glow)]',
  offline: '',
};

const sizeClasses = {
  sm: 'h-2 w-2',
  md: 'h-2.5 w-2.5',
  lg: 'h-3 w-3',
};

export function StatusDot({
  status,
  size = 'md',
  glow = false,
  pulse = false,
  label,
  className,
}: StatusDotProps) {
  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <span className="relative inline-flex">
        <span
          className={cn(
            'rounded-full',
            sizeClasses[size],
            statusColors[status],
            glow && glowColors[status],
          )}
        />
        {pulse && (status === 'working' || status === 'waiting') && (
          <span
            className={cn(
              'absolute inset-0 rounded-full animate-ping opacity-75',
              statusColors[status],
            )}
          />
        )}
      </span>
      {label && (
        <span className="text-xs text-secondary">{label}</span>
      )}
    </span>
  );
}
