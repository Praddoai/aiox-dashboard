'use client';

import { cn } from '@/lib/utils';
import { ChevronRight } from '@/lib/icons';

export interface BreadcrumbSegment {
  label: string;
  onClick?: () => void;
}

interface SquadBreadcrumbProps {
  segments: BreadcrumbSegment[];
  className?: string;
}

export function SquadBreadcrumb({ segments, className }: SquadBreadcrumbProps) {
  if (segments.length === 0) return null;

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn('flex items-center gap-1 text-detail font-mono', className)}
    >
      {segments.map((segment, i) => {
        const isLast = i === segments.length - 1;
        return (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && (
              <ChevronRight className="h-2.5 w-2.5 text-text-disabled shrink-0" aria-hidden="true" />
            )}
            {isLast || !segment.onClick ? (
              <span
                className={cn(
                  isLast
                    ? 'text-text-primary'
                    : 'text-text-muted'
                )}
              >
                {segment.label}
              </span>
            ) : (
              <button
                onClick={segment.onClick}
                className="text-text-muted hover:text-text-primary transition-colors"
              >
                {segment.label}
              </button>
            )}
          </span>
        );
      })}
    </nav>
  );
}
