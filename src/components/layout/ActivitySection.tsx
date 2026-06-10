import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '../ui';
import { ChevronDownIcon } from './activity-panel-icons';

// Section Component
interface SectionProps {
  title: string;
  badge?: string;
  expanded?: boolean;
  onToggle?: () => void;
  children: React.ReactNode;
}

export function Section({ title, badge, expanded = true, onToggle, children }: SectionProps) {
  return (
    <div className="space-y-2">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between text-left group"
      >
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-semibold text-secondary uppercase tracking-wider">
            {title}
          </h3>
          {badge && (
            <Badge variant="count" size="sm">
              {badge}
            </Badge>
          )}
        </div>
        {onToggle && (
          <motion.div
            animate={{ rotate: expanded ? 0 : -90 }}
            transition={{ duration: 0.2 }}
            className="text-tertiary group-hover:text-secondary"
          >
            <ChevronDownIcon />
          </motion.div>
        )}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Empty State
interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

export function EmptyState({ icon, title, description }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="h-14 w-14 rounded-2xl glass-subtle flex items-center justify-center mb-4 text-tertiary">
        {icon}
      </div>
      <p className="text-primary text-sm font-medium">{title}</p>
      <p className="text-tertiary text-xs mt-1 max-w-[200px] leading-relaxed">{description}</p>
    </div>
  );
}
