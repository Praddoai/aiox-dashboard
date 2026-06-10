import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus } from 'lucide-react';
import { GlassInput, GlassButton, SectionLabel } from '../ui';
import { NoSearchResults } from '../ui';
import { cn } from '../../lib/utils';
import { useStoryStore } from '../../stores/storyStore';
import type { Story, StoryStatus, StoryState, StoryActions } from '../../stores/storyStore';
import { StoryCard } from './StoryCard';
import { StoryDetailModal } from './StoryDetailModal';
import { StoryCreateModal } from './StoryCreateModal';

type StoryStore = StoryState & StoryActions;

const statusFilters: { value: StoryStatus | null; label: string }[] = [
  { value: null, label: 'Todas' },
  { value: 'backlog', label: 'Backlog' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'ai_review', label: 'AI Review' },
  { value: 'human_review', label: 'Human Review' },
  { value: 'pr_created', label: 'PR Created' },
  { value: 'done', label: 'Done' },
  { value: 'error', label: 'Error' },
];

const statusFilterColors: Record<string, string> = {
  backlog: 'bg-gray-500/15 text-gray-500',
  in_progress: 'bg-blue-500/15 text-blue-500',
  ai_review: 'bg-purple-500/15 text-purple-500',
  human_review: 'bg-orange-500/15 text-orange-500',
  pr_created: 'bg-cyan-500/15 text-cyan-500',
  done: 'bg-green-500/15 text-green-500',
  error: 'bg-red-500/15 text-red-500',
};

export function StoryList({ viewToggle }: { viewToggle?: React.ReactNode } = {}) {
  const stories = useStoryStore((s: StoryStore) => s.stories);
  const statusFilter = useStoryStore((s: StoryStore) => s.statusFilter);
  const searchQuery = useStoryStore((s: StoryStore) => s.searchQuery);
  const setStatusFilter = useStoryStore((s: StoryStore) => s.setStatusFilter);
  const setSearchQuery = useStoryStore((s: StoryStore) => s.setSearchQuery);
  const getFilteredStories = useStoryStore((s: StoryStore) => s.getFilteredStories);

  const [selectedStoryId, setSelectedStoryId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const filteredStories = useMemo(() => getFilteredStories(), [getFilteredStories]);

  const selectedStory = useMemo(
    () => (selectedStoryId ? stories.find((s: Story) => s.id === selectedStoryId) ?? null : null),
    [selectedStoryId, stories]
  );

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <SectionLabel count={stories.length}>Stories</SectionLabel>
          {viewToggle}
        </div>
        <GlassButton
          variant="primary"
          size="sm"
          leftIcon={<Plus size={14} />}
          onClick={() => setIsCreateOpen(true)}
        >
          Criar Story
        </GlassButton>
      </div>

      {/* Search */}
      <GlassInput
        placeholder="Buscar por titulo, descricao ou ID..."
        leftIcon={<Search size={16} />}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />

      {/* Status Filters */}
      <div className="flex flex-wrap items-center gap-1.5">
        {statusFilters.map((filter) => {
          const isActive = statusFilter === filter.value;
          const colorClass = filter.value ? statusFilterColors[filter.value] : '';

          return (
            <button
              key={filter.value ?? 'all'}
              onClick={() => setStatusFilter(filter.value)}
              className={cn(
                'inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-lg transition-all duration-150',
                isActive
                  ? filter.value
                    ? cn(colorClass, 'ring-1 ring-current')
                    : 'glass-button-primary text-[var(--button-primary-text)]'
                  : 'glass-badge hover:opacity-80',
              )}
            >
              {filter.label}
            </button>
          );
        })}
      </div>

      {/* Story Grid */}
      {filteredStories.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <AnimatePresence mode="popLayout">
            {filteredStories.map((story) => (
              <motion.div
                key={story.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                <StoryCard
                  story={story}
                  onClick={() => setSelectedStoryId(story.id)}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center py-12">
          <NoSearchResults query={searchQuery} onClear={() => setSearchQuery('')} />
        </div>
      )}

      {/* Detail Modal */}
      <StoryDetailModal
        story={selectedStory}
        isOpen={!!selectedStory}
        onClose={() => setSelectedStoryId(null)}
      />

      {/* Create Modal */}
      <StoryCreateModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
      />
    </div>
  );
}
