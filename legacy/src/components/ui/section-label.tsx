'use client';

import { cn } from '@/lib/utils';

interface SectionLabelProps {
  children: React.ReactNode;
  variant?: 'default' | 'gold' | 'muted';
  withLine?: boolean;
  lineDirection?: 'right' | 'both';
  className?: string;
}

const VARIANT_CLASSES = {
  default: 'text-text-tertiary',
  gold: 'text-gold',
  muted: 'text-text-muted',
};

export function SectionLabel({
  children,
  variant = 'gold',
  withLine = false,
  lineDirection = 'right',
  className,
}: SectionLabelProps) {
  const label = (
    <span
      className={cn(
        'text-detail font-medium uppercase tracking-[0.2em]',
        VARIANT_CLASSES[variant],
        className
      )}
    >
      {children}
    </span>
  );

  if (!withLine) return label;

  const lineClass = variant === 'gold'
    ? 'bg-gradient-to-r from-[var(--border-gold)] to-transparent'
    : 'bg-border';

  if (lineDirection === 'both') {
    return (
      <div className="flex items-center gap-3">
        <div className={cn('flex-1 h-px', lineClass, 'rotate-180')} />
        {label}
        <div className={cn('flex-1 h-px', lineClass)} />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      {label}
      <div className={cn('flex-1 h-px', lineClass)} />
    </div>
  );
}

export default SectionLabel;
