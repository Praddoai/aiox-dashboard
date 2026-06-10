'use client';

import { memo } from 'react';
import { cn } from '@/lib/utils';
import { Tag, ImpactTag, EffortTag } from '@/components/ui/tag';
import type { RoadmapItem } from '@/types';

interface RoadmapCardProps {
  item: RoadmapItem;
  className?: string;
  onClick?: () => void;
}

export const RoadmapCard = memo(function RoadmapCard({
  item,
  className,
  onClick,
}: RoadmapCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'card-refined p-3 group cursor-pointer hover-lift',
        item.priority === 'wont_have' && 'opacity-50 hover:opacity-80',
        className
      )}
    >
      {/* Title */}
      <h4
        className="text-reading font-normal mb-2 leading-snug transition-colors text-text-primary"
      >
        {item.title}
      </h4>

      {/* Description */}
      {item.description && (
        <p className="text-label mb-3 line-clamp-2 leading-relaxed text-text-muted">
          {item.description}
        </p>
      )}

      {/* Tags */}
      <div className="flex flex-wrap gap-1.5">
        <EffortTag effort={item.effort} />
        <ImpactTag impact={item.impact} />
      </div>

      {/* Category & custom tags */}
      {(item.category || (item.tags && item.tags.length > 0)) && (
        <div className="flex flex-wrap gap-1 mt-2.5 pt-2.5 border-t border-[var(--border-subtle)]">
          {item.category && <Tag label={item.category} variant="category" size="sm" />}
          {item.tags?.slice(0, 2).map((tag) => (
            <Tag key={tag} label={tag} size="sm" />
          ))}
        </div>
      )}

      {/* Linked Story */}
      {item.linkedStoryId && (
        <div className="mt-2.5 pt-2.5 border-t border-[var(--border-subtle)]">
          <span className="text-detail uppercase tracking-wider text-text-muted">
            Linked: <span className="normal-case text-text-tertiary">{item.linkedStoryId}</span>
          </span>
        </div>
      )}
    </div>
  );
});
