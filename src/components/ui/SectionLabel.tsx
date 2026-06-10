import { cn } from '../../lib/utils';

interface SectionLabelProps {
  children: React.ReactNode;
  count?: number;
  action?: React.ReactNode;
  className?: string;
}

export function SectionLabel({ children, count, action, className }: SectionLabelProps) {
  return (
    <div className={cn('flex items-center justify-between mb-3', className)}>
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-secondary uppercase tracking-wider">
          {children}
        </span>
        {count !== undefined && (
          <span className="inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full bg-[var(--color-background-hover)] text-[10px] font-medium text-tertiary">
            {count}
          </span>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
