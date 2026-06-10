import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useToastStore } from '../stores/toastStore';

interface FavoriteAgent {
  id: string;
  name: string;
  squad: string;
  addedAt: string;
}

interface RecentAgent {
  id: string;
  name: string;
  squad: string;
  lastUsed: string;
  useCount: number;
}

interface FavoritesState {
  favorites: FavoriteAgent[];
  recents: RecentAgent[];
}

interface FavoritesActions {
  addFavorite: (agent: { id: string; name: string; squad: string }) => void;
  removeFavorite: (agentId: string) => void;
  isFavorite: (agentId: string) => boolean;
  toggleFavorite: (agent: { id: string; name: string; squad: string }) => void;
  addRecent: (agent: { id: string; name: string; squad: string }) => void;
  clearRecents: () => void;
}

export const useFavoritesStore = create<FavoritesState & FavoritesActions>()(
  persist(
    (set, get) => ({
      // State
      favorites: [],
      recents: [],

      // Actions
      addFavorite: (agent) => {
        set((state) => ({
          favorites: [
            { ...agent, addedAt: new Date().toISOString() },
            ...state.favorites.filter((f) => f.id !== agent.id),
          ].slice(0, 20), // Max 20 favorites
        }));
        useToastStore.getState().addToast({
          type: 'success',
          title: 'Favorito adicionado',
          message: `${agent.name} foi adicionado aos favoritos`,
          duration: 3000,
        });
      },

      removeFavorite: (agentId) => {
        const agent = get().favorites.find((f) => f.id === agentId);
        set((state) => ({
          favorites: state.favorites.filter((f) => f.id !== agentId),
        }));
        if (agent) {
          useToastStore.getState().addToast({
            type: 'info',
            title: 'Favorito removido',
            message: `${agent.name} foi removido dos favoritos`,
            duration: 3000,
          });
        }
      },

      isFavorite: (agentId) => {
        return get().favorites.some((f) => f.id === agentId);
      },

      toggleFavorite: (agent) => {
        const { favorites, addFavorite, removeFavorite } = get();
        if (favorites.some((f) => f.id === agent.id)) {
          removeFavorite(agent.id);
        } else {
          addFavorite(agent);
        }
      },

      addRecent: (agent) => {
        set((state) => {
          const existing = state.recents.find((r) => r.id === agent.id);
          const updated: RecentAgent = existing
            ? {
                ...existing,
                lastUsed: new Date().toISOString(),
                useCount: existing.useCount + 1,
              }
            : {
                ...agent,
                lastUsed: new Date().toISOString(),
                useCount: 1,
              };

          return {
            recents: [
              updated,
              ...state.recents.filter((r) => r.id !== agent.id),
            ].slice(0, 10), // Max 10 recents
          };
        });
      },

      clearRecents: () => {
        set({ recents: [] });
      },
    }),
    {
      name: 'aios-favorites-store',
    }
  )
);

// Hook for easier usage
export function useFavorites() {
  const store = useFavoritesStore();

  return {
    favorites: store.favorites,
    recents: store.recents,
    addFavorite: store.addFavorite,
    removeFavorite: store.removeFavorite,
    isFavorite: store.isFavorite,
    toggleFavorite: store.toggleFavorite,
    addRecent: store.addRecent,
    clearRecents: store.clearRecents,
  };
}
