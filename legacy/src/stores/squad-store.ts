import { create } from 'zustand';
import type { Squad, SquadConnection } from '@/types';

interface SquadState {
  squads: Squad[];
  selectedSquad: string | null;
  connections: SquadConnection[];
  domainIndex: Record<string, string[]>;
  summary: {
    total_agents: number;
    total_tasks: number;
    total_workflows: number;
    total_templates: number;
    total_checklists: number;
    total_data_files: number;
  };

  setSquads: (squads: Squad[]) => void;
  setSelectedSquad: (name: string | null) => void;
  setConnections: (connections: SquadConnection[]) => void;
  setDomainIndex: (index: Record<string, string[]>) => void;
  setSummary: (summary: SquadState['summary']) => void;

  getSquadByName: (name: string) => Squad | undefined;
  getSquadsByDomain: (domain: string) => Squad[];
}

export const useSquadStore = create<SquadState>((set, get) => ({
  squads: [],
  selectedSquad: null,
  connections: [],
  domainIndex: {},
  summary: { total_agents: 0, total_tasks: 0, total_workflows: 0, total_templates: 0, total_checklists: 0, total_data_files: 0 },

  setSquads: (squads) => set({ squads }),
  setSelectedSquad: (name) => set({ selectedSquad: name }),
  setConnections: (connections) => set({ connections }),
  setDomainIndex: (domainIndex) => set({ domainIndex }),
  setSummary: (summary) => set({ summary }),

  getSquadByName: (name) => get().squads.find((s) => s.name === name),
  getSquadsByDomain: (domain) =>
    get().squads.filter((s) => s.domain === domain),
}));
