import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../lib/safeStorage', () => ({
  safePersistStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
}));

import { useStoryStore, type Story, type StoryStatus } from '../storyStore';

function makeStory(overrides: Partial<Story> = {}): Story {
  return {
    id: 'story-1',
    title: 'Test Story',
    status: 'backlog',
    priority: 'medium',
    complexity: 'standard',
    category: 'feature',
    progress: 0,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    ...overrides,
  };
}

const emptyOrder: Record<StoryStatus, string[]> = {
  backlog: [],
  in_progress: [],
  ai_review: [],
  human_review: [],
  pr_created: [],
  done: [],
  error: [],
};

describe('storyStore', () => {
  beforeEach(() => {
    useStoryStore.setState({
      stories: [],
      storyOrder: { ...emptyOrder },
      draggedStoryId: null,
      statusFilter: null,
      epicFilter: null,
      searchQuery: '',
    });
  });

  describe('initial state', () => {
    it('should have empty stories after reset', () => {
      const state = useStoryStore.getState();
      expect(state.stories).toEqual([]);
      expect(state.draggedStoryId).toBeNull();
      expect(state.statusFilter).toBeNull();
      expect(state.epicFilter).toBeNull();
      expect(state.searchQuery).toBe('');
    });
  });

  describe('addStory', () => {
    it('should add a story and update storyOrder', () => {
      const story = makeStory({ id: 's1', status: 'backlog' });
      useStoryStore.getState().addStory(story);

      const state = useStoryStore.getState();
      expect(state.stories).toHaveLength(1);
      expect(state.stories[0]).toEqual(story);
      expect(state.storyOrder.backlog).toContain('s1');
    });

    it('should add multiple stories to correct status columns', () => {
      useStoryStore.getState().addStory(makeStory({ id: 's1', status: 'backlog' }));
      useStoryStore.getState().addStory(makeStory({ id: 's2', status: 'in_progress' }));

      const state = useStoryStore.getState();
      expect(state.stories).toHaveLength(2);
      expect(state.storyOrder.backlog).toContain('s1');
      expect(state.storyOrder.in_progress).toContain('s2');
    });
  });

  describe('updateStory', () => {
    it('should update fields and set updatedAt', () => {
      const story = makeStory({ id: 's1', title: 'Original' });
      useStoryStore.getState().addStory(story);

      useStoryStore.getState().updateStory('s1', { title: 'Updated Title', progress: 50 });

      const updated = useStoryStore.getState().stories[0];
      expect(updated.title).toBe('Updated Title');
      expect(updated.progress).toBe(50);
      expect(updated.updatedAt).not.toBe('2026-01-01');
    });

    it('should rebuild storyOrder when status changes', () => {
      useStoryStore.getState().addStory(makeStory({ id: 's1', status: 'backlog' }));
      expect(useStoryStore.getState().storyOrder.backlog).toContain('s1');

      useStoryStore.getState().updateStory('s1', { status: 'in_progress' });

      const order = useStoryStore.getState().storyOrder;
      expect(order.backlog).not.toContain('s1');
      expect(order.in_progress).toContain('s1');
    });

    it('should not rebuild storyOrder when status is not changed', () => {
      useStoryStore.getState().addStory(makeStory({ id: 's1', status: 'backlog' }));
      const orderBefore = useStoryStore.getState().storyOrder;

      useStoryStore.getState().updateStory('s1', { title: 'New Title' });

      // storyOrder reference should be the same since no status change
      const orderAfter = useStoryStore.getState().storyOrder;
      expect(orderAfter).toBe(orderBefore);
    });
  });

  describe('deleteStory', () => {
    it('should remove the story and rebuild order', () => {
      useStoryStore.getState().addStory(makeStory({ id: 's1', status: 'backlog' }));
      useStoryStore.getState().addStory(makeStory({ id: 's2', status: 'backlog' }));

      useStoryStore.getState().deleteStory('s1');

      const state = useStoryStore.getState();
      expect(state.stories).toHaveLength(1);
      expect(state.stories[0].id).toBe('s2');
      expect(state.storyOrder.backlog).toEqual(['s2']);
    });
  });

  describe('moveStory', () => {
    it('should move story from old status to new status in order', () => {
      useStoryStore.getState().addStory(makeStory({ id: 's1', status: 'backlog' }));

      useStoryStore.getState().moveStory('s1', 'in_progress');

      const state = useStoryStore.getState();
      const movedStory = state.stories.find((s) => s.id === 's1')!;
      expect(movedStory.status).toBe('in_progress');
      expect(state.storyOrder.backlog).not.toContain('s1');
      expect(state.storyOrder.in_progress).toContain('s1');
    });

    it('should not change state when moving to the same status', () => {
      useStoryStore.getState().addStory(makeStory({ id: 's1', status: 'backlog' }));
      const stateBefore = useStoryStore.getState();

      useStoryStore.getState().moveStory('s1', 'backlog');

      const stateAfter = useStoryStore.getState();
      expect(stateAfter.stories).toBe(stateBefore.stories);
      expect(stateAfter.storyOrder).toBe(stateBefore.storyOrder);
    });

    it('should update the updatedAt timestamp', () => {
      useStoryStore.getState().addStory(makeStory({ id: 's1', status: 'backlog' }));
      useStoryStore.getState().moveStory('s1', 'done');

      const moved = useStoryStore.getState().stories.find((s) => s.id === 's1')!;
      expect(moved.updatedAt).not.toBe('2026-01-01');
    });
  });

  describe('reorderStory', () => {
    it('should swap indices within a status column', () => {
      useStoryStore.getState().addStory(makeStory({ id: 's1', status: 'backlog' }));
      useStoryStore.getState().addStory(makeStory({ id: 's2', status: 'backlog' }));
      useStoryStore.getState().addStory(makeStory({ id: 's3', status: 'backlog' }));

      useStoryStore.getState().reorderStory('backlog', 0, 2);

      expect(useStoryStore.getState().storyOrder.backlog).toEqual(['s2', 's3', 's1']);
    });

    it('should return unchanged state for out-of-bounds indices', () => {
      useStoryStore.getState().addStory(makeStory({ id: 's1', status: 'backlog' }));
      const orderBefore = useStoryStore.getState().storyOrder;

      useStoryStore.getState().reorderStory('backlog', -1, 0);

      expect(useStoryStore.getState().storyOrder).toBe(orderBefore);
    });
  });

  describe('setDraggedStory', () => {
    it('should set draggedStoryId', () => {
      useStoryStore.getState().setDraggedStory('s1');
      expect(useStoryStore.getState().draggedStoryId).toBe('s1');
    });

    it('should clear draggedStoryId with null', () => {
      useStoryStore.getState().setDraggedStory('s1');
      useStoryStore.getState().setDraggedStory(null);
      expect(useStoryStore.getState().draggedStoryId).toBeNull();
    });
  });

  describe('setStories', () => {
    it('should replace all stories and rebuild order', () => {
      useStoryStore.getState().addStory(makeStory({ id: 'old-1' }));

      const newStories = [
        makeStory({ id: 'new-1', status: 'backlog' }),
        makeStory({ id: 'new-2', status: 'done' }),
      ];

      useStoryStore.getState().setStories(newStories);

      const state = useStoryStore.getState();
      expect(state.stories).toEqual(newStories);
      expect(state.storyOrder.backlog).toEqual(['new-1']);
      expect(state.storyOrder.done).toEqual(['new-2']);
    });
  });

  describe('filter setters', () => {
    it('setStatusFilter should update statusFilter', () => {
      useStoryStore.getState().setStatusFilter('in_progress');
      expect(useStoryStore.getState().statusFilter).toBe('in_progress');
    });

    it('setEpicFilter should update epicFilter', () => {
      useStoryStore.getState().setEpicFilter('epic-42');
      expect(useStoryStore.getState().epicFilter).toBe('epic-42');
    });

    it('setSearchQuery should update searchQuery', () => {
      useStoryStore.getState().setSearchQuery('kanban');
      expect(useStoryStore.getState().searchQuery).toBe('kanban');
    });
  });

  describe('getFilteredStories', () => {
    beforeEach(() => {
      const stories = [
        makeStory({ id: 's1', title: 'Build Kanban', status: 'backlog', epicId: 'epic-1', description: 'Drag and drop board' }),
        makeStory({ id: 's2', title: 'Fix SSE bug', status: 'in_progress', epicId: 'epic-1' }),
        makeStory({ id: 's3', title: 'Add metrics panel', status: 'backlog', epicId: 'epic-2' }),
        makeStory({ id: 's4', title: 'Deploy pipeline', status: 'done', epicId: 'epic-2' }),
      ];
      useStoryStore.getState().setStories(stories);
    });

    it('should return all stories when no filters are set', () => {
      const filtered = useStoryStore.getState().getFilteredStories();
      expect(filtered).toHaveLength(4);
    });

    it('should filter by status', () => {
      useStoryStore.getState().setStatusFilter('backlog');
      const filtered = useStoryStore.getState().getFilteredStories();
      expect(filtered).toHaveLength(2);
      expect(filtered.every((s) => s.status === 'backlog')).toBe(true);
    });

    it('should filter by epicId', () => {
      useStoryStore.getState().setEpicFilter('epic-1');
      const filtered = useStoryStore.getState().getFilteredStories();
      expect(filtered).toHaveLength(2);
      expect(filtered.every((s) => s.epicId === 'epic-1')).toBe(true);
    });

    it('should filter by search query matching title', () => {
      useStoryStore.getState().setSearchQuery('kanban');
      const filtered = useStoryStore.getState().getFilteredStories();
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('s1');
    });

    it('should filter by search query matching id', () => {
      useStoryStore.getState().setSearchQuery('s2');
      const filtered = useStoryStore.getState().getFilteredStories();
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('s2');
    });

    it('should filter by search query matching description', () => {
      useStoryStore.getState().setSearchQuery('drag and drop');
      const filtered = useStoryStore.getState().getFilteredStories();
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('s1');
    });

    it('should combine filters (status + epic + search)', () => {
      useStoryStore.getState().setStatusFilter('backlog');
      useStoryStore.getState().setEpicFilter('epic-1');
      useStoryStore.getState().setSearchQuery('kanban');

      const filtered = useStoryStore.getState().getFilteredStories();
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('s1');
    });
  });
});
