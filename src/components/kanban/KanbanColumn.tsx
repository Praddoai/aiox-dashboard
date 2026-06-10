import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Plus, type LucideIcon } from 'lucide-react';
import { GlassButton } from '../ui';
import { cn } from '../../lib/utils';
import { StoryCard } from './StoryCard';
import type { Story, StoryStatus } from '../../stores/storyStore';

export interface ColumnConfig {
  id: StoryStatus;
  label: string;
  color: string;
  icon: LucideIcon;
}

interface KanbanColumnProps {
  column: ColumnConfig;
  stories: Story[];
  onStoryClick: (story: Story) => void;
  onAddStory: (status: StoryStatus) => void;
}

export function KanbanColumn({
  column,
  stories,
  onStoryClick,
  onAddStory,
}: KanbanColumnProps) {
  const [collapsed, setCollapsed] = useState(false);

  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: {
      type: 'column',
      status: column.id,
    },
  });

  const storyIds = stories.map((s) => s.id);

  return (
    <div
      className={cn(
        'flex flex-col min-w-[300px] max-w-[300px] rounded-xl transition-colors duration-200',
        isOver && 'ring-2 kanban-drop-highlight'
      )}
    >
      {/* Column header */}
      <div className="flex items-center justify-between px-3 py-2.5 mb-1">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            aria-label={collapsed ? `Expand ${column.label}` : `Collapse ${column.label}`}
          >
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: column.color }}
            />
            <span className="text-sm font-semibold text-primary">
              {column.label}
            </span>
            <motion.span
              animate={{ rotate: collapsed ? -90 : 0 }}
              transition={{ duration: 0.15 }}
              className="text-tertiary"
            >
              <ChevronDown size={14} />
            </motion.span>
          </button>

          {/* Count badge */}
          <span className="inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full bg-white/10 text-[10px] font-medium text-tertiary">
            {stories.length}
          </span>
        </div>

        {/* Add story button */}
        <GlassButton
          variant="ghost"
          size="icon"
          className="h-7 w-7 opacity-0 group-hover:opacity-100 hover:!opacity-100 transition-opacity"
          onClick={() => onAddStory(column.id)}
          aria-label={`Add story to ${column.label}`}
          style={{ opacity: 1 }}
        >
          <Plus size={14} />
        </GlassButton>
      </div>

      {/* Drop zone */}
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div
              ref={setNodeRef}
              className={cn(
                'flex flex-col gap-2 px-1.5 pb-2 min-h-[80px] rounded-lg transition-all duration-200',
                isOver
                  ? 'kanban-drop-zone bg-blue-500/5 ring-2 ring-blue-500/20 ring-inset scale-[1.01]'
                  : ''
              )}
            >
              <SortableContext
                items={storyIds}
                strategy={verticalListSortingStrategy}
              >
                {stories.length > 0 ? (
                  stories.map((story, index) => (
                    <motion.div
                      key={story.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        duration: 0.25,
                        delay: index * 0.04,
                        ease: [0, 0, 0.2, 1],
                      }}
                    >
                      <StoryCard
                        story={story}
                        onClick={() => onStoryClick(story)}
                      />
                    </motion.div>
                  ))
                ) : (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2, duration: 0.3 }}
                    className="flex flex-col items-center justify-center py-8 gap-2"
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-tertiary/40">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <line x1="12" y1="8" x2="12" y2="16" />
                      <line x1="8" y1="12" x2="16" y2="12" />
                    </svg>
                    <p className="text-[11px] text-tertiary/60">Sem stories</p>
                    <button
                      onClick={() => onAddStory(column.id)}
                      className="text-[10px] text-blue-400/70 hover:text-blue-400 transition-colors"
                    >
                      + Adicionar
                    </button>
                  </motion.div>
                )}
              </SortableContext>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
