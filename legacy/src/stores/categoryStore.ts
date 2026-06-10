import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SquadType } from '@/types';

export interface CategoryConfig {
  id: string;
  name: string;
  icon: string; // emoji or icon name
  squadType: SquadType;
  squads: string[]; // squad IDs in this category
  collapsed?: boolean;
}

interface CategoryState {
  categories: CategoryConfig[];
  // Actions
  addCategory: (category: Omit<CategoryConfig, 'squads'>) => void;
  updateCategory: (id: string, updates: Partial<CategoryConfig>) => void;
  deleteCategory: (id: string) => void;
  moveSquadToCategory: (squadId: string, fromCategoryId: string | null, toCategoryId: string) => void;
  reorderSquadsInCategory: (categoryId: string, squadIds: string[]) => void;
  reorderCategories: (categoryIds: string[]) => void;
  getSquadCategory: (squadId: string) => string | null;
  resetToDefaults: () => void;
}

// Default categories matching the current system (updated 2026-02-06)
// Version bumped to force localStorage refresh
const CATEGORY_VERSION = 3;
const defaultCategories: CategoryConfig[] = [
  {
    id: 'natalia-tanaka',
    name: 'Natália Tanaka',
    icon: 'User',
    squadType: 'copywriting',
    squads: [
      'communication-natalia-tanaka',
      'community-natalia-tanaka',
      'strategy-natalia-tanaka',
    ],
    collapsed: true,
  },
  {
    id: 'content',
    name: 'Conteúdo & YouTube',
    icon: 'Clapperboard',
    squadType: 'creator',
    squads: ['content-ecosystem', 'youtube-lives'],
  },
  {
    id: 'marketing',
    name: 'Marketing & Vendas',
    icon: 'PenTool',
    squadType: 'copywriting',
    squads: ['copywriting', 'media-buy', 'funnel-creator', 'sales'],
  },
  {
    id: 'creative',
    name: 'Criação & Design',
    icon: 'Palette',
    squadType: 'design',
    squads: ['design-system', 'creative-studio'],
  },
  {
    id: 'development',
    name: 'Desenvolvimento',
    icon: 'Monitor',
    squadType: 'creator',
    squads: ['full-stack-dev', 'aios-core-dev'],
  },
  {
    id: 'data',
    name: 'Dados & Pesquisa',
    icon: 'BarChart3',
    squadType: 'orchestrator',
    squads: ['data-analytics', 'deep-scraper'],
  },
  {
    id: 'strategy',
    name: 'Estratégia & Conselho',
    icon: 'Target',
    squadType: 'orchestrator',
    squads: ['conselho', 'project-management-clickup', 'infoproduct-creation'],
  },
  {
    id: 'orchestration',
    name: 'Orquestração',
    icon: 'RefreshCw',
    squadType: 'orchestrator',
    squads: ['orquestrador-global', 'squad-creator', 'operations-hub', 'docs'],
  },
];

export const useCategoryStore = create<CategoryState>()(
  persist(
    (set, get) => ({
      categories: defaultCategories,

      addCategory: (category) => {
        set((state) => ({
          categories: [
            ...state.categories,
            { ...category, squads: [] },
          ],
        }));
      },

      updateCategory: (id, updates) => {
        set((state) => ({
          categories: state.categories.map((cat) =>
            cat.id === id ? { ...cat, ...updates } : cat
          ),
        }));
      },

      deleteCategory: (id) => {
        set((state) => ({
          categories: state.categories.filter((cat) => cat.id !== id),
        }));
      },

      moveSquadToCategory: (squadId, fromCategoryId, toCategoryId) => {
        set((state) => {
          const newCategories = state.categories.map((cat) => {
            // Remove from source category
            if (fromCategoryId && cat.id === fromCategoryId) {
              return {
                ...cat,
                squads: cat.squads.filter((s) => s !== squadId),
              };
            }
            // Add to target category
            if (cat.id === toCategoryId && !cat.squads.includes(squadId)) {
              return {
                ...cat,
                squads: [...cat.squads, squadId],
              };
            }
            return cat;
          });
          return { categories: newCategories };
        });
      },

      reorderSquadsInCategory: (categoryId, squadIds) => {
        set((state) => ({
          categories: state.categories.map((cat) =>
            cat.id === categoryId ? { ...cat, squads: squadIds } : cat
          ),
        }));
      },

      reorderCategories: (categoryIds) => {
        set((state) => {
          const categoryMap = new Map(state.categories.map((c) => [c.id, c]));
          const reordered = categoryIds
            .map((id) => categoryMap.get(id))
            .filter(Boolean) as CategoryConfig[];
          return { categories: reordered };
        });
      },

      getSquadCategory: (squadId) => {
        const { categories } = get();
        for (const cat of categories) {
          if (cat.squads.includes(squadId)) {
            return cat.id;
          }
        }
        return null;
      },

      resetToDefaults: () => {
        set({ categories: defaultCategories });
      },
    }),
    {
      name: 'aios-category-config',
      version: CATEGORY_VERSION,
      migrate: (persistedState, version) => {
        // If version is outdated, reset to new defaults
        if (version < CATEGORY_VERSION) {
          return { categories: defaultCategories };
        }
        return persistedState as CategoryState;
      },
    }
  )
);
