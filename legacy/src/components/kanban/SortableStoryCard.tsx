'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import { StoryCard } from '@/components/stories';
import type { Story } from '@/types';

interface SortableStoryCardProps {
  story: Story;
  onClick?: () => void;
}

export function SortableStoryCard({ story, onClick }: SortableStoryCardProps) {
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

  // Determine if story is running (has agent and in_progress)
  const isRunning = story.status === 'in_progress' && !!story.agentId;

  // Determine if stuck (in_progress for more than 30 minutes without update)
  // This is a simplified check - in production would use actual timestamps
  const isStuck = false; // TODO: Implement based on updatedAt

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      aria-label={`Story: ${story.title}. Status: ${story.status}. Press Space to drag.`}
      aria-describedby="dnd-instructions"
      className={cn(
        'touch-none outline-none',
        'focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-bg-surface',
        isDragging
          ? 'opacity-30 border-dashed border-2 border-border z-50'
          : 'cursor-grab active:cursor-grabbing'
      )}
    >
      <StoryCard
        story={story}
        isRunning={isRunning}
        isStuck={isStuck}
        onClick={onClick}
      />
    </div>
  );
}
