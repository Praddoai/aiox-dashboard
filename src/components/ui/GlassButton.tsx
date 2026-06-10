import { forwardRef, ButtonHTMLAttributes } from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { cn } from '../../lib/utils';

export interface GlassButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const sizeClasses = {
  sm: 'h-8 px-3 text-sm gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-6 text-base gap-2',
  icon: 'h-11 w-11 p-0 touch-manipulation', // 44px for better touch targets
};

const variantClasses = {
  default: 'glass-button',
  primary: 'glass-button-primary',
  ghost: 'bg-transparent border-transparent',
  danger: 'glass-button',
};

export const GlassButton = forwardRef<HTMLButtonElement, GlassButtonProps>(
  (
    {
      className,
      variant = 'default',
      size = 'md',
      loading = false,
      leftIcon,
      rightIcon,
      disabled,
      children,
      style,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    const variantStyles: React.CSSProperties | undefined =
      variant === 'danger'
        ? {
            backgroundColor: 'var(--button-danger-bg)',
            color: 'var(--button-danger-text)',
            borderColor: 'var(--button-danger-border)',
          }
        : variant === 'ghost'
          ? { ['--tw-ring-color' as string]: 'var(--button-focus-ring)' }
          : undefined;

    return (
      <motion.button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center font-medium rounded-xl',
          'transition-all duration-150 ease-out',
          'focus:outline-none focus-visible:ring-2',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none',
          sizeClasses[size],
          variantClasses[variant],
          variant === 'ghost' && 'hover:bg-[var(--button-ghost-hover)]',
          className
        )}
        style={{ ...variantStyles, ...style, ['--tw-ring-color' as string]: 'var(--button-focus-ring)' }}
        disabled={isDisabled}
        whileHover={!isDisabled ? { scale: 1.02 } : undefined}
        whileTap={!isDisabled ? { scale: 0.98 } : undefined}
        {...(props as HTMLMotionProps<'button'>)}
      >
        {loading ? (
          <>
            <LoadingSpinner />
            <span className="sr-only">Carregando</span>
          </>
        ) : (
          <>
            {leftIcon && <span className="flex-shrink-0" aria-hidden="true">{leftIcon}</span>}
            {children}
            {rightIcon && <span className="flex-shrink-0" aria-hidden="true">{rightIcon}</span>}
          </>
        )}
      </motion.button>
    );
  }
);

GlassButton.displayName = 'GlassButton';

function LoadingSpinner() {
  return (
    <svg
      className="animate-spin h-4 w-4"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}
