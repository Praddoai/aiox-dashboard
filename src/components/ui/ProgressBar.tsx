import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

interface ProgressBarProps {
  value: number; // 0-100
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  glow?: boolean;
  showLabel?: boolean;
  label?: string;
  animate?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: 'h-1',
  md: 'h-2',
  lg: 'h-3',
};

const variantColors = {
  default: 'bg-[var(--progress-default)]',
  success: 'bg-[var(--progress-success)]',
  warning: 'bg-[var(--progress-warning)]',
  error: 'bg-[var(--progress-error)]',
  info: 'bg-[var(--progress-info)]',
};

const glowShadows = {
  default: 'shadow-[0_0_8px_var(--progress-default-glow)]',
  success: 'shadow-[0_0_8px_var(--progress-success-glow)]',
  warning: 'shadow-[0_0_8px_var(--progress-warning-glow)]',
  error: 'shadow-[0_0_8px_var(--progress-error-glow)]',
  info: 'shadow-[0_0_8px_var(--progress-info-glow)]',
};

export function ProgressBar({
  value,
  size = 'md',
  variant = 'default',
  glow = false,
  showLabel = false,
  label,
  animate = true,
  className,
}: ProgressBarProps) {
  const clampedValue = Math.max(0, Math.min(100, value));

  return (
    <div className={cn('w-full', className)}>
      {(showLabel || label) && (
        <div className="flex items-center justify-between mb-1">
          {label && <span className="text-xs text-secondary">{label}</span>}
          {showLabel && <span className="text-xs text-tertiary">{Math.round(clampedValue)}%</span>}
        </div>
      )}
      <div
        className={cn(
          'w-full rounded-full bg-[var(--progress-track)] overflow-hidden',
          sizeClasses[size],
        )}
        role="progressbar"
        aria-label={label || `${clampedValue}% complete`}
        aria-valuenow={clampedValue}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        {animate ? (
          <motion.div
            className={cn(
              'h-full rounded-full',
              variantColors[variant],
              glow && glowShadows[variant],
            )}
            initial={{ width: 0 }}
            animate={{ width: `${clampedValue}%` }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          />
        ) : (
          <div
            className={cn(
              'h-full rounded-full transition-all duration-300',
              variantColors[variant],
              glow && glowShadows[variant],
            )}
            style={{ width: `${clampedValue}%` }}
          />
        )}
      </div>
    </div>
  );
}
