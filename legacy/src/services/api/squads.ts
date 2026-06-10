import { apiClient } from './client';
import type { Squad, SquadDetail, SquadStats, EcosystemOverview } from '@/types';

export interface SquadsParams {
  domain?: string;
  [key: string]: string | number | undefined;
}

export const squadsApi = {
  // Get all squads
  // GET /api/squads
  getSquads: async (params?: SquadsParams): Promise<Squad[]> => {
    const response = await apiClient.get<{ squads: Squad[]; total: number }>('/squads', params);
    return response.squads || [];
  },

  // Get squad by ID with agents
  // GET /api/squads/:squadId
  getSquad: async (squadId: string): Promise<SquadDetail> => {
    const response = await apiClient.get<{ squad: SquadDetail }>(`/squads/${squadId}`);
    return response.squad;
  },

  // Get squad statistics
  // GET /api/squads/:squadId/stats
  getSquadStats: async (squadId: string): Promise<SquadStats> => {
    return apiClient.get<SquadStats>(`/squads/${squadId}/stats`);
  },

  // Get ecosystem overview (all squads summary)
  // GET /api/squads/ecosystem/overview
  getEcosystemOverview: async (): Promise<EcosystemOverview> => {
    return apiClient.get<EcosystemOverview>('/squads/ecosystem/overview');
  },

};
