import { useState, useCallback, useMemo, type ReactNode } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  BookOpen,
  ClipboardList,
  RefreshCw,
  Bot,
  User,
  GitMerge,
  CheckCircle,
  XCircle,
  Search,
  Filter,
  X,
} from 'lucide-react';
import { GlassButton, Celebration, useCelebration } from '../ui';
import { cn } from '../../lib/utils';
import { KanbanColumn, type ColumnConfig } from './KanbanColumn';
import { StoryCard } from './StoryCard';
import { StoryCreateModal } from './StoryCreateModal';
import { playSound } from '../../hooks/useSound';
import { StoryDetailModal } from './StoryDetailModal';
import { useStories } from '../../hooks/useStories';
import { useStoryStore, type Story, type StoryStatus } from '../../stores/storyStore';

const COLUMNS: ColumnConfig[] = [
  { id: 'backlog', label: 'Backlog', color: 'var(--kanban-backlog, #6b7280)', icon: ClipboardList },
  { id: 'in_progress', label: 'In Progress', color: 'var(--kanban-in-progress, #3b82f6)', icon: RefreshCw },
  { id: 'ai_review', label: 'AI Review', color: 'var(--kanban-ai-review, #a855f7)', icon: Bot },
  { id: 'human_review', label: 'Human Review', color: 'var(--kanban-human-review, #f97316)', icon: User },
  { id: 'pr_created', label: 'PR Created', color: 'var(--kanban-pr-created, #22c55e)', icon: GitMerge },
  { id: 'done', label: 'Done', color: 'var(--kanban-done, #10b981)', icon: CheckCircle },
  { id: 'error', label: 'Error', color: 'var(--kanban-error, #ef4444)', icon: XCircle },
];

export default function KanbanBoard({ viewToggle }: { viewToggle?: ReactNode }) {
  const { stories, isLoading } = useStories();
  const {
    storyOrder,
    addStory,
    updateStory,
    deleteStory,
    moveStory,
    reorderStory,
    setDraggedStory,
  } = useStoryStore();

  // Celebration when story moves to done
  const { celebrating, celebrate, onComplete: onCelebrationComplete } = useCelebration();

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<Story['priority'] | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<Story['category'] | 'all'>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  const hasActiveFilters = searchQuery !== '' || priorityFilter !== 'all' || categoryFilter !== 'all' || assigneeFilter !== 'all';

  // Extract unique assignees for filter dropdown
  const assignees = useMemo(() => {
    const agents = new Set<string>();
    stories.forEach((s: Story) => { if (s.assignedAgent) agents.add(s.assignedAgent); });
    return Array.from(agents).sort();
  }, [stories]);

  // Modal state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createDefaultStatus, setCreateDefaultStatus] = useState<StoryStatus>('backlog');
  const [detailStory, setDetailStory] = useState<Story | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  // Drag state
  const [activeStory, setActiveStory] = useState<Story | null>(null);

  // Sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor)
  );

  // Group stories by column using storyOrder
  const storiesByColumn = useMemo(() => {
    const storyMap = new Map(stories.map((s: Story) => [s.id, s]));
    const result: Record<StoryStatus, Story[]> = {
      backlog: [],
      in_progress: [],
      ai_review: [],
      human_review: [],
      pr_created: [],
      done: [],
      error: [],
    };

    for (const col of COLUMNS) {
      const orderedIds = storyOrder[col.id] || [];
      // Add stories that are in the order
      for (const id of orderedIds) {
        const story = storyMap.get(id);
        if (story) {
          result[col.id].push(story);
          storyMap.delete(id);
        }
      }
    }

    // Add any remaining stories that are not in the order (fallback)
    for (const [, story] of storyMap) {
      if (result[story.status]) {
        result[story.status].push(story);
      }
    }

    return result;
  }, [stories, storyOrder]);

  // Apply filters on top of storiesByColumn
  const filteredStoriesByColumn = useMemo(() => {
    if (!hasActiveFilters) return storiesByColumn;

    const query = searchQuery.toLowerCase();
    const filterStory = (s: Story) => {
      if (query && !s.title.toLowerCase().includes(query) && !s.id.toLowerCase().includes(query) && !(s.description?.toLowerCase().includes(query))) return false;
      if (priorityFilter !== 'all' && s.priority !== priorityFilter) return false;
      if (categoryFilter !== 'all' && s.category !== categoryFilter) return false;
      if (assigneeFilter !== 'all') {
        if (assigneeFilter === 'unassigned') { if (s.assignedAgent) return false; }
        else if (s.assignedAgent !== assigneeFilter) return false;
      }
      return true;
    };

    const result = {} as Record<StoryStatus, Story[]>;
    for (const col of COLUMNS) {
      result[col.id] = storiesByColumn[col.id].filter(filterStory);
    }
    return result;
  }, [storiesByColumn, hasActiveFilters, searchQuery, priorityFilter, categoryFilter, assigneeFilter]);

  const filteredTotal = Object.values(filteredStoriesByColumn).reduce((sum, arr) => sum + arr.length, 0);
  const totalStories = stories.length;

  // Find which column a story is in
  const findColumnOfStory = useCallback(
    (storyId: string): StoryStatus | null => {
      for (const col of COLUMNS) {
        const colStories = storiesByColumn[col.id];
        if (colStories.some((s: Story) => s.id === storyId)) {
          return col.id;
        }
      }
      return null;
    },
    [storiesByColumn]
  );

  // Drag handlers
  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const { active } = event;
      const story = stories.find((s: Story) => s.id === active.id);
      if (story) {
        setActiveStory(story);
        setDraggedStory(story.id);
      }
    },
    [stories, setDraggedStory]
  );

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event;
      if (!over) return;

      const activeId = active.id as string;
      const overId = over.id as string;

      const activeColumn = findColumnOfStory(activeId);
      if (!activeColumn) return;

      // Determine the target column
      let overColumn: StoryStatus | null = null;

      // Check if we're over a column directly
      if (COLUMNS.some((c) => c.id === overId)) {
        overColumn = overId as StoryStatus;
      } else {
        // We're over another story card - find its column
        overColumn = findColumnOfStory(overId);
      }

      if (!overColumn || activeColumn === overColumn) return;

      // Move story to a different column
      moveStory(activeId, overColumn);

      // Celebrate when story reaches Done!
      if (overColumn === 'done') {
        celebrate();
        playSound('success');
      }
    },
    [findColumnOfStory, moveStory, celebrate]
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveStory(null);
      setDraggedStory(null);
      playSound('drop');

      if (!over) return;

      const activeId = active.id as string;
      const overId = over.id as string;

      // If dropped on a column header, just the moveStory from dragOver already handled it
      if (COLUMNS.some((c) => c.id === overId)) return;

      // If dropped on another story in the same column, reorder
      const activeColumn = findColumnOfStory(activeId);
      const overColumn = findColumnOfStory(overId);

      if (activeColumn && activeColumn === overColumn) {
        const colStories = storiesByColumn[activeColumn];
        const oldIndex = colStories.findIndex((s: Story) => s.id === activeId);
        const newIndex = colStories.findIndex((s: Story) => s.id === overId);

        if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
          reorderStory(activeColumn, oldIndex, newIndex);
        }
      }
    },
    [findColumnOfStory, storiesByColumn, reorderStory, setDraggedStory]
  );

  // Story card click
  const handleStoryClick = useCallback((story: Story) => {
    setDetailStory(story);
    setDetailModalOpen(true);
  }, []);

  // Add story to column
  const handleAddStory = useCallback((status: StoryStatus) => {
    setCreateDefaultStatus(status);
    setCreateModalOpen(true);
  }, []);

  // Create story
  const handleCreateStory = useCallback(
    (story: Story) => {
      addStory(story);
    },
    [addStory]
  );

  // Update story
  const handleUpdateStory = useCallback(
    (id: string, updates: Partial<Story>) => {
      updateStory(id, updates);
      // Refresh the detail story with updated data
      if (detailStory && detailStory.id === id) {
        setDetailStory((prev) =>
          prev ? { ...prev, ...updates, updatedAt: new Date().toISOString() } : null
        );
      }
    },
    [updateStory, detailStory]
  );

  // Delete story
  const handleDeleteStory = useCallback(
    (id: string) => {
      deleteStory(id);
    },
    [deleteStory]
  );

  if (isLoading) {
    return (
      <div className="h-full flex flex-col">
        {/* Skeleton header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-glass-border flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 rounded bg-white/10 shimmer" />
            <div className="w-32 h-5 rounded bg-white/10 shimmer" />
          </div>
          <div className="w-24 h-8 rounded-lg bg-white/10 shimmer" />
        </div>
        {/* Skeleton columns */}
        <div className="flex-1 overflow-hidden p-4">
          <div className="flex gap-4 h-full">
            {Array.from({ length: 7 }).map((_, col) => (
              <div key={col} className="min-w-[260px] max-w-[280px] sm:min-w-[300px] sm:max-w-[300px] flex flex-col gap-3">
                <div className="flex items-center gap-2 px-3 py-2.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-white/10 shimmer" />
                  <div className="w-20 h-4 rounded bg-white/10 shimmer" />
                  <div className="w-5 h-5 rounded-full bg-white/10 shimmer" />
                </div>
                {Array.from({ length: col === 0 ? 3 : col < 3 ? 2 : 1 }).map((_, card) => (
                  <div
                    key={card}
                    className="mx-1.5 p-3 rounded-xl bg-white/5 space-y-2 shimmer"
                    style={{ animationDelay: `${(col * 3 + card) * 100}ms` }}
                  >
                    <div className="flex gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-white/10" />
                      <div className="w-12 h-4 rounded bg-white/10" />
                      <div className="w-14 h-4 rounded bg-white/10" />
                    </div>
                    <div className="w-full h-4 rounded bg-white/10" />
                    <div className="w-2/3 h-3 rounded bg-white/10" />
                    <div className="flex justify-between mt-1">
                      <div className="w-16 h-3 rounded bg-white/10" />
                      <div className="w-10 h-3 rounded bg-white/10" />
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-4 sm:px-6 py-3 sm:py-4 border-b border-glass-border flex-shrink-0"
      >
        <div className="flex items-center gap-3">
          <BookOpen size={20} className="text-secondary" />
          <h1 className="text-lg font-semibold text-primary">Stories</h1>
          <span className="inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full bg-white/10 text-[10px] font-medium text-tertiary">
            {hasActiveFilters ? `${filteredTotal}/${totalStories}` : totalStories}
          </span>
          {viewToggle}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Search */}
          <div className="relative flex-1 sm:flex-none">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-tertiary pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar stories..."
              className="h-8 w-full sm:w-44 pl-8 pr-7 rounded-lg text-xs bg-white/5 border border-glass-border text-primary placeholder:text-tertiary focus:outline-none focus:ring-1 focus:ring-blue-500/40 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-tertiary hover:text-primary"
                aria-label="Limpar busca"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Filter toggle */}
          <GlassButton
            variant="ghost"
            size="sm"
            className={cn(hasActiveFilters && 'text-blue-400 bg-blue-500/10')}
            onClick={() => setShowFilters(!showFilters)}
            aria-label="Filtros"
          >
            <Filter size={14} />
            {hasActiveFilters && (
              <span className="ml-1 w-1.5 h-1.5 rounded-full bg-blue-400" />
            )}
          </GlassButton>

          <GlassButton
            variant="primary"
            size="sm"
            leftIcon={<Plus size={16} />}
            onClick={() => {
              setCreateDefaultStatus('backlog');
              setCreateModalOpen(true);
            }}
          >
            <span className="hidden sm:inline">New Story</span>
            <span className="sm:hidden">New</span>
          </GlassButton>
        </div>
      </motion.div>

      {/* Filter bar */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-b border-glass-border flex-shrink-0"
          >
            <div className="flex items-center gap-3 px-4 sm:px-6 py-2.5 flex-wrap">
              <FilterSelect
                label="Prioridade"
                value={priorityFilter}
                onChange={(v) => setPriorityFilter(v as Story['priority'] | 'all')}
                options={[
                  { value: 'all', label: 'Todas' },
                  { value: 'critical', label: 'Critical' },
                  { value: 'high', label: 'High' },
                  { value: 'medium', label: 'Medium' },
                  { value: 'low', label: 'Low' },
                ]}
              />
              <FilterSelect
                label="Categoria"
                value={categoryFilter}
                onChange={(v) => setCategoryFilter(v as Story['category'] | 'all')}
                options={[
                  { value: 'all', label: 'Todas' },
                  { value: 'feature', label: 'Feature' },
                  { value: 'fix', label: 'Fix' },
                  { value: 'refactor', label: 'Refactor' },
                  { value: 'docs', label: 'Docs' },
                ]}
              />
              <FilterSelect
                label="Assignee"
                value={assigneeFilter}
                onChange={setAssigneeFilter}
                options={[
                  { value: 'all', label: 'Todos' },
                  { value: 'unassigned', label: 'Sem agente' },
                  ...assignees.map((a) => ({ value: a, label: a })),
                ]}
              />

              {hasActiveFilters && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setPriorityFilter('all');
                    setCategoryFilter('all');
                    setAssigneeFilter('all');
                  }}
                  className="text-[11px] text-tertiary hover:text-primary underline ml-auto"
                >
                  Limpar filtros
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden p-4">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 h-full min-w-max">
            {COLUMNS.map((column) => (
              <div key={column.id} className="flex flex-col h-full">
                <KanbanColumn
                  column={column}
                  stories={filteredStoriesByColumn[column.id]}
                  onStoryClick={handleStoryClick}
                  onAddStory={handleAddStory}
                />
              </div>
            ))}
          </div>

          {/* Drag overlay */}
          <DragOverlay dropAnimation={null}>
            {activeStory ? (
              <StoryCard story={activeStory} isDragOverlay />
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Create modal */}
      <StoryCreateModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSubmit={handleCreateStory}
        defaultStatus={createDefaultStatus}
      />

      {/* Detail modal */}
      <StoryDetailModal
        isOpen={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setDetailStory(null);
        }}
        story={detailStory}
        onUpdate={handleUpdateStory}
        onDelete={handleDeleteStory}
      />

      {/* Celebration confetti when story is marked Done */}
      <Celebration trigger={celebrating} onComplete={onCelebrationComplete} />
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] text-tertiary font-medium uppercase tracking-wider">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-7 px-2 rounded-md text-xs bg-white/5 border border-glass-border text-primary focus:outline-none focus:ring-1 focus:ring-blue-500/40 cursor-pointer"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}
