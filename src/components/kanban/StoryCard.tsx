import { memo } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion } from 'framer-motion';
import { GripVertical, User, Zap } from 'lucide-react';
import { GlassCard, ProgressBar } from '../ui';
import { cn } from '../../lib/utils';
import type { Story } from '../../stores/storyStore';

interface StoryCardProps {
  story: Story;
  onClick?: () => void;
  isDragOverlay?: boolean;
}

const categoryColors: Record<Story['category'], string> = {
  feature: 'kanban-badge kanban-badge-feature',
  fix: 'kanban-badge kanban-badge-fix',
  refactor: 'kanban-badge kanban-badge-refactor',
  docs: 'kanban-badge kanban-badge-docs',
};

const categoryLabels: Record<Story['category'], string> = {
  feature: 'Feature',
  fix: 'Fix',
  refactor: 'Refactor',
  docs: 'Docs',
};

const complexityColors: Record<Story['complexity'], string> = {
  simple: 'kanban-badge kanban-badge-simple',
  standard: 'kanban-badge kanban-badge-standard',
  complex: 'kanban-badge kanban-badge-complex',
};

const priorityIndicators: Record<Story['priority'], { color: string; label: string }> = {
  low: { color: 'kanban-priority-dot kanban-priority-low', label: 'Low' },
  medium: { color: 'kanban-priority-dot kanban-priority-medium', label: 'Medium' },
  high: { color: 'kanban-priority-dot kanban-priority-high', label: 'High' },
  critical: { color: 'kanban-priority-dot kanban-priority-critical', label: 'Critical' },
};

const progressVariant = (progress: number) => {
  if (progress >= 100) return 'success' as const;
  if (progress >= 60) return 'info' as const;
  if (progress >= 30) return 'warning' as const;
  return 'default' as const;
};

export const StoryCard = memo(function StoryCard({ story, onClick, isDragOverlay = false }: StoryCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: story.id,
    data: {
      type: 'story',
      story,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const priority = priorityIndicators[story.priority];

  if (isDragOverlay) {
    return (
      <div
        className="w-[280px] rounded-xl shadow-2xl shadow-black/40 ring-2 ring-blue-500/40"
        style={{
          transform: 'rotate(2deg) scale(1.05)',
          background: 'rgba(30, 30, 40, 0.95)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <div className="p-3">
          <StoryCardContent story={story} priority={priority} />
        </div>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group transition-opacity duration-150',
        isDragging && 'opacity-40'
      )}
    >
      <motion.div
        whileHover={{ scale: 1.01 }}
        transition={{ duration: 0.15 }}
      >
        <GlassCard
          variant="subtle"
          padding="sm"
          radius="md"
          animate={false}
          interactive
          className="cursor-pointer relative"
          onClick={onClick}
        >
          {/* Drag handle */}
          <div
            {...attributes}
            {...listeners}
            className={cn(
              'absolute left-0 top-0 bottom-0 w-6 flex items-center justify-center',
              'opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity',
              'cursor-grab active:cursor-grabbing touch-manipulation'
            )}
            aria-label="Drag to reorder"
          >
            <GripVertical size={14} className="text-tertiary" />
          </div>

          <div className="pl-4">
            <StoryCardContent story={story} priority={priority} />
          </div>
        </GlassCard>
      </motion.div>
    </div>
  );
});

function StoryCardContent({
  story,
  priority,
}: {
  story: Story;
  priority: { color: string; label: string };
}) {
  return (
    <div className="flex flex-col gap-2">
      {/* Top row: badges */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {/* Priority dot */}
        <span
          className={cn('w-2 h-2 rounded-full flex-shrink-0', priority.color)}
          title={`Priority: ${priority.label}`}
        />

        {/* Category badge */}
        <span
          className={cn(
            'inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium',
            categoryColors[story.category]
          )}
        >
          {categoryLabels[story.category]}
        </span>

        {/* Complexity badge */}
        <span
          className={cn(
            'inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium capitalize',
            complexityColors[story.complexity]
          )}
        >
          {story.complexity}
        </span>

        {/* Bob orchestrated indicator */}
        {story.bobOrchestrated && (
          <span
            className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium kanban-badge kanban-badge-bob"
            title="Bob Orchestrated"
          >
            <Zap size={10} className="mr-0.5" />
            Bob
          </span>
        )}
      </div>

      {/* Title */}
      <h2 className="text-sm font-medium text-primary leading-tight line-clamp-2">
        {story.title}
      </h2>

      {/* Description */}
      {story.description && (
        <p className="text-xs text-tertiary line-clamp-2 leading-relaxed">
          {story.description}
        </p>
      )}

      {/* Progress bar */}
      {story.progress > 0 && (
        <ProgressBar
          value={story.progress}
          size="sm"
          variant={progressVariant(story.progress)}
          showLabel
          animate={false}
        />
      )}

      {/* Bottom row: agent + ID */}
      <div className="flex items-center justify-between">
        {story.assignedAgent ? (
          <div className="flex items-center gap-1 text-xs text-secondary">
            <User size={12} />
            <span className="truncate max-w-[120px]">{story.assignedAgent}</span>
          </div>
        ) : (
          <span className="text-xs text-tertiary italic">Unassigned</span>
        )}
        <span className="text-[10px] text-tertiary font-mono">{story.id}</span>
      </div>
    </div>
  );
}
