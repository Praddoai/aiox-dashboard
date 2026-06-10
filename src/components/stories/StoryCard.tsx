import { Bot } from 'lucide-react';
import { GlassCard, Badge, ProgressBar } from '../ui';
import { cn } from '../../lib/utils';
import type { Story } from '../../stores/storyStore';

interface StoryCardProps {
  story: Story;
  onClick?: () => void;
}

const categoryColors: Record<Story['category'], string> = {
  feature: 'bg-blue-500/15 text-blue-500',
  fix: 'bg-red-500/15 text-red-500',
  refactor: 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400',
  docs: 'bg-green-500/15 text-green-500',
};

const categoryLabels: Record<Story['category'], string> = {
  feature: 'Feature',
  fix: 'Fix',
  refactor: 'Refactor',
  docs: 'Docs',
};

const complexityColors: Record<Story['complexity'], string> = {
  simple: 'bg-green-500/15 text-green-500',
  standard: 'bg-blue-500/15 text-blue-500',
  complex: 'bg-purple-500/15 text-purple-500',
};

const priorityColors: Record<Story['priority'], string> = {
  low: 'bg-gray-500/15 text-gray-500',
  medium: 'bg-blue-500/15 text-blue-500',
  high: 'bg-orange-500/15 text-orange-500',
  critical: 'bg-red-500/15 text-red-500',
};

const statusRing: Record<Story['status'], string> = {
  backlog: '',
  in_progress: 'ring-1 ring-blue-500/30',
  ai_review: 'ring-1 ring-purple-500/30',
  human_review: 'ring-1 ring-orange-500/30',
  pr_created: 'ring-1 ring-cyan-500/30',
  done: 'bg-green-500/5',
  error: 'bg-red-500/5 ring-1 ring-red-500/30',
};

export function StoryCard({ story, onClick }: StoryCardProps) {
  return (
    <GlassCard
      interactive
      padding="sm"
      radius="lg"
      className={cn(
        'cursor-pointer select-none',
        statusRing[story.status],
      )}
      onClick={onClick}
    >
      {/* Header: category + complexity */}
      <div className="flex items-center gap-1.5 mb-2">
        <span className={cn('inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded-md', categoryColors[story.category])}>
          {categoryLabels[story.category]}
        </span>
        <span className={cn('inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded-md', complexityColors[story.complexity])}>
          {story.complexity}
        </span>
        {story.bobOrchestrated && (
          <span className="ml-auto inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded-md bg-cyan-500/15 text-cyan-500" title="Bob Orchestrated">
            <Bot size={10} className="mr-0.5" />
            BOB
          </span>
        )}
      </div>

      {/* Title */}
      <h3 className="text-sm font-medium text-primary line-clamp-2 mb-1">
        {story.title}
      </h3>

      {/* Description */}
      {story.description && (
        <p className="text-xs text-secondary line-clamp-2 mb-2">
          {story.description}
        </p>
      )}

      {/* Footer */}
      <div className="flex items-center gap-1.5 mt-auto pt-2 border-t border-glass-border">
        <span className={cn('inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded-md', priorityColors[story.priority])}>
          {story.priority}
        </span>
        {story.assignedAgent && (
          <Badge size="sm" variant="default">
            {story.assignedAgent}
          </Badge>
        )}
        {story.progress > 0 && (
          <div className="flex-1 ml-1">
            <ProgressBar value={story.progress} size="sm" variant="info" />
          </div>
        )}
      </div>
    </GlassCard>
  );
}
