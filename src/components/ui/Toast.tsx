import { motion, AnimatePresence } from 'framer-motion';
import { useToastStore, type Toast, type ToastType } from '../../stores/toastStore';
import { cn } from '../../lib/utils';

// Icons
const SuccessIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const ErrorIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <line x1="15" y1="9" x2="9" y2="15" />
    <line x1="9" y1="9" x2="15" y2="15" />
  </svg>
);

const WarningIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const InfoIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);

const CloseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const iconMap: Record<ToastType, React.FC> = {
  success: SuccessIcon,
  error: ErrorIcon,
  warning: WarningIcon,
  info: InfoIcon,
};

const styleMap: Record<ToastType, { bg: string; border: string; icon: string }> = {
  success: {
    bg: 'bg-[var(--toast-success-bg)]',
    border: 'border-[var(--toast-success-border)]',
    icon: 'text-[var(--toast-success-text)]',
  },
  error: {
    bg: 'bg-[var(--toast-error-bg)]',
    border: 'border-[var(--toast-error-border)]',
    icon: 'text-[var(--toast-error-text)]',
  },
  warning: {
    bg: 'bg-[var(--toast-warning-bg)]',
    border: 'border-[var(--toast-warning-border)]',
    icon: 'text-[var(--toast-warning-text)]',
  },
  info: {
    bg: 'bg-[var(--toast-info-bg)]',
    border: 'border-[var(--toast-info-border)]',
    icon: 'text-[var(--toast-info-text)]',
  },
};

interface ToastItemProps {
  toast: Toast;
  onDismiss: () => void;
}

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const Icon = iconMap[toast.type];
  const styles = styleMap[toast.type];

  // Icon animation variants based on toast type
  const iconAnimations = {
    success: {
      initial: { scale: 0, rotate: -180 },
      animate: { scale: 1, rotate: 0 },
      transition: { type: 'spring', damping: 15, stiffness: 300, delay: 0.1 },
    },
    error: {
      initial: { scale: 0 },
      animate: { scale: [0, 1.2, 1] },
      transition: { duration: 0.4, delay: 0.1 },
    },
    warning: {
      initial: { y: -20, opacity: 0 },
      animate: { y: 0, opacity: 1 },
      transition: { type: 'spring', damping: 15, stiffness: 300, delay: 0.1 },
    },
    info: {
      initial: { scale: 0, opacity: 0 },
      animate: { scale: 1, opacity: 1 },
      transition: { type: 'spring', damping: 20, stiffness: 300, delay: 0.1 },
    },
  };

  const iconAnim = iconAnimations[toast.type];

  return (
    <motion.div
      layout
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.9 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className={cn(
        'relative flex items-start gap-3 p-4 rounded-xl border backdrop-blur-xl shadow-lg',
        'min-w-[280px] max-w-[420px] sm:min-w-[320px]',
        styles.bg,
        styles.border
      )}
    >
      {/* Animated Icon */}
      <motion.div
        className={cn('flex-shrink-0 mt-0.5', styles.icon)}
        initial={iconAnim.initial}
        animate={iconAnim.animate}
        transition={iconAnim.transition}
      >
        <Icon />
      </motion.div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-primary font-medium text-sm">{toast.title}</p>
        {toast.message && (
          <p className="text-secondary text-xs mt-0.5 line-clamp-2">{toast.message}</p>
        )}
        {toast.action && (
          <button
            onClick={() => {
              toast.action?.onClick();
              onDismiss();
            }}
            className={cn(
              'mt-2 text-xs font-medium transition-colors',
              styles.icon,
              'hover:underline'
            )}
          >
            {toast.action.label}
          </button>
        )}
      </div>

      {/* Close button */}
      <button
        onClick={onDismiss}
        aria-label="Fechar notificacao"
        className="flex-shrink-0 p-1 rounded-lg text-tertiary hover:text-primary hover:bg-white/10 transition-colors"
      >
        <CloseIcon aria-hidden="true" />
      </button>

      {/* Progress bar for auto-dismiss */}
      {toast.duration && toast.duration > 0 && (
        <motion.div
          className={cn('absolute bottom-0 left-0 h-0.5 rounded-full', styles.icon.replace('text-', 'bg-'))}
          initial={{ width: '100%' }}
          animate={{ width: '0%' }}
          transition={{ duration: toast.duration / 1000, ease: 'linear' }}
        />
      )}
    </motion.div>
  );
}

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  return (
    <div className="fixed bottom-20 md:bottom-4 right-4 left-4 md:left-auto z-[100] flex flex-col items-center md:items-end gap-2 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto w-full md:w-auto">
            <ToastItem toast={toast} onDismiss={() => removeToast(toast.id)} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// Re-export for convenience
export { useToast } from '../../stores/toastStore';
export type { Toast, ToastType } from '../../stores/toastStore';
