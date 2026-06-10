'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useStoryStore } from '@/stores/story-store';
import type { StoryStatus } from '@/types';
import { StoryCard } from './StoryCard';
import { StoryDetailModal } from './StoryDetailModal';
import { StoryCreateModal } from './StoryCreateModal';

const statusFilters: { value: StoryStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
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

export function StoryList() {
  const stories = useStoryStore((s) => s.stories);
  const [statusFilter, setStatusFilter] = useState<StoryStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStoryId, setSelectedStoryId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const allStories = useMemo(() => Object.values(stories), [stories]);

  const filteredStories = useMemo(() => {
    let result = allStories;

    // Filter by status
    if (statusFilter !== 'all') {
      result = result.filter((s) => s.status === statusFilter);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.title.toLowerCase().includes(query) ||
          s.description?.toLowerCase().includes(query) ||
          s.id.toLowerCase().includes(query)
      );
    }

    return result;
  }, [allStories, statusFilter, searchQuery]);

  const selectedStory = useMemo(
    () => (selectedStoryId ? stories[selectedStoryId] ?? null : null),
    [selectedStoryId, stories]
  );

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-muted-foreground">Stories</h3>
          <Badge variant="outline">{allStories.length}</Badge>
        </div>
        <Button
          size="sm"
          onClick={() => setIsCreateOpen(true)}
        >
          <Plus size={14} className="mr-1" />
          Create Story
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by title, description or ID..."
          className="pl-9"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Status Filters */}
      <div className="flex flex-wrap items-center gap-1.5">
        {statusFilters.map((filter) => {
          const isActive = statusFilter === filter.value;
          const colorClass = filter.value !== 'all' ? statusFilterColors[filter.value] : '';

          return (
            <button
              key={filter.value}
              onClick={() => setStatusFilter(filter.value)}
              className={cn(
                'inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-lg transition-all duration-150',
                isActive
                  ? filter.value !== 'all'
                    ? cn(colorClass, 'ring-1 ring-current')
                    : 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:opacity-80',
              )}
            >
              {filter.label}
            </button>
          );
        })}
      </div>

      {/* Story Grid */}
      {filteredStories.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 flex-1 overflow-y-auto">
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
          <div className="text-center">
            <Search className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No results found</p>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      <StoryDetailModal
        story={selectedStory}
        open={!!selectedStory}
        onOpenChange={(open) => { if (!open) setSelectedStoryId(null); }}
      />

      {/* Create Modal */}
      <StoryCreateModal
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
      />
    </div>
  );
}
