import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act } from '@testing-library/react';
import { useFavoritesStore } from '../useFavorites';

// Mock the toast store so addFavorite/removeFavorite don't throw
vi.mock('../../stores/toastStore', () => ({
  useToastStore: Object.assign(
    (selector: (s: Record<string, unknown>) => unknown) =>
      selector({ addToast: vi.fn() }),
    {
      getState: () => ({ addToast: vi.fn() }),
      subscribe: vi.fn(),
      setState: vi.fn(),
      destroy: vi.fn(),
    }
  ),
}));

const agent1 = { id: 'agent-1', name: 'Alpha', squad: 'dev' };
const agent2 = { id: 'agent-2', name: 'Beta', squad: 'qa' };
const _agent3 = { id: 'agent-3', name: 'Gamma', squad: 'design' };

describe('useFavoritesStore', () => {
  beforeEach(() => {
    // Reset store to initial state between tests
    useFavoritesStore.setState({ favorites: [], recents: [] });
  });

  // ---- Favorites ----

  describe('addFavorite', () => {
    it('should add an agent to favorites', () => {
      act(() => {
        useFavoritesStore.getState().addFavorite(agent1);
      });

      const { favorites } = useFavoritesStore.getState();
      expect(favorites).toHaveLength(1);
      expect(favorites[0].id).toBe('agent-1');
      expect(favorites[0].name).toBe('Alpha');
      expect(favorites[0].squad).toBe('dev');
      expect(favorites[0].addedAt).toBeDefined();
    });

    it('should move existing favorite to the top (dedup)', () => {
      act(() => {
        useFavoritesStore.getState().addFavorite(agent1);
        useFavoritesStore.getState().addFavorite(agent2);
        useFavoritesStore.getState().addFavorite(agent1); // re-add
      });

      const { favorites } = useFavoritesStore.getState();
      expect(favorites).toHaveLength(2);
      expect(favorites[0].id).toBe('agent-1'); // moved to top
      expect(favorites[1].id).toBe('agent-2');
    });

    it('should cap at 20 favorites max', () => {
      act(() => {
        for (let i = 0; i < 25; i++) {
          useFavoritesStore
            .getState()
            .addFavorite({ id: `agent-${i}`, name: `Agent ${i}`, squad: 'dev' });
        }
      });

      const { favorites } = useFavoritesStore.getState();
      expect(favorites).toHaveLength(20);
    });
  });

  describe('removeFavorite', () => {
    it('should remove a favorite by id', () => {
      act(() => {
        useFavoritesStore.getState().addFavorite(agent1);
        useFavoritesStore.getState().addFavorite(agent2);
        useFavoritesStore.getState().removeFavorite('agent-1');
      });

      const { favorites } = useFavoritesStore.getState();
      expect(favorites).toHaveLength(1);
      expect(favorites[0].id).toBe('agent-2');
    });

    it('should do nothing when removing a non-existent favorite', () => {
      act(() => {
        useFavoritesStore.getState().addFavorite(agent1);
        useFavoritesStore.getState().removeFavorite('non-existent');
      });

      expect(useFavoritesStore.getState().favorites).toHaveLength(1);
    });
  });

  describe('isFavorite', () => {
    it('should return true for a favorited agent', () => {
      act(() => {
        useFavoritesStore.getState().addFavorite(agent1);
      });

      expect(useFavoritesStore.getState().isFavorite('agent-1')).toBe(true);
    });

    it('should return false for a non-favorited agent', () => {
      expect(useFavoritesStore.getState().isFavorite('agent-1')).toBe(false);
    });
  });

  describe('toggleFavorite', () => {
    it('should add when not favorited', () => {
      act(() => {
        useFavoritesStore.getState().toggleFavorite(agent1);
      });

      expect(useFavoritesStore.getState().favorites).toHaveLength(1);
    });

    it('should remove when already favorited', () => {
      act(() => {
        useFavoritesStore.getState().addFavorite(agent1);
        useFavoritesStore.getState().toggleFavorite(agent1);
      });

      expect(useFavoritesStore.getState().favorites).toHaveLength(0);
    });
  });

  // ---- Recents ----

  describe('addRecent', () => {
    it('should add an agent to recents', () => {
      act(() => {
        useFavoritesStore.getState().addRecent(agent1);
      });

      const { recents } = useFavoritesStore.getState();
      expect(recents).toHaveLength(1);
      expect(recents[0].id).toBe('agent-1');
      expect(recents[0].useCount).toBe(1);
    });

    it('should increment useCount for an existing recent', () => {
      act(() => {
        useFavoritesStore.getState().addRecent(agent1);
        useFavoritesStore.getState().addRecent(agent1);
        useFavoritesStore.getState().addRecent(agent1);
      });

      const { recents } = useFavoritesStore.getState();
      expect(recents).toHaveLength(1);
      expect(recents[0].useCount).toBe(3);
    });

    it('should move re-used recent to the top', () => {
      act(() => {
        useFavoritesStore.getState().addRecent(agent1);
        useFavoritesStore.getState().addRecent(agent2);
        useFavoritesStore.getState().addRecent(agent1); // re-use
      });

      const { recents } = useFavoritesStore.getState();
      expect(recents[0].id).toBe('agent-1');
      expect(recents[1].id).toBe('agent-2');
    });

    it('should cap at 10 recents max', () => {
      act(() => {
        for (let i = 0; i < 15; i++) {
          useFavoritesStore
            .getState()
            .addRecent({ id: `agent-${i}`, name: `Agent ${i}`, squad: 'dev' });
        }
      });

      const { recents } = useFavoritesStore.getState();
      expect(recents).toHaveLength(10);
    });
  });

  describe('clearRecents', () => {
    it('should remove all recents', () => {
      act(() => {
        useFavoritesStore.getState().addRecent(agent1);
        useFavoritesStore.getState().addRecent(agent2);
        useFavoritesStore.getState().clearRecents();
      });

      expect(useFavoritesStore.getState().recents).toHaveLength(0);
    });
  });
});
