import { create } from 'zustand';

export interface RoadmapFeature {
  id: string;
  title: string;
  description: string;
  priority: 'must' | 'should' | 'could' | 'wont';
  impact: 'high' | 'medium' | 'low';
  effort: 'high' | 'medium' | 'low';
  tags: string[];
  status: 'planned' | 'in_progress' | 'done';
}

interface RoadmapState {
  features: RoadmapFeature[];
  filter: 'all' | 'must' | 'should' | 'could' | 'wont';
  setFilter: (filter: RoadmapState['filter']) => void;
  addFeature: (feature: RoadmapFeature) => void;
  removeFeature: (id: string) => void;
}

// TODO: Connect to /api/roadmap when the backend endpoint exists
export const useRoadmapStore = create<RoadmapState>((set) => ({
  features: [],
  filter: 'all',
  setFilter: (filter) => set({ filter }),
  addFeature: (feature) => set((state) => ({ features: [...state.features, feature] })),
  removeFeature: (id) => set((state) => ({ features: state.features.filter((f) => f.id !== id) })),
}));
