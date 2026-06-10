import { apiClient } from './client';
import { engineApi } from './engine';
import { getEngineUrl } from '../../lib/connection';
import type { Squad, SquadDetail, SquadStats, EcosystemOverview } from '../../types';
import type { AgentConnection } from '../../mocks/squads';

export interface SquadsParams {
  domain?: string;
  [key: string]: string | number | undefined;
}

/** Check if engine is available (URL configured) */
function hasEngine(): boolean {
  return !!getEngineUrl();
}

export const squadsApi = {
  // Get all squads — engine-first, fallback to apiClient
  getSquads: async (params?: SquadsParams): Promise<Squad[]> => {
    if (hasEngine()) {
      try {
        const data = await engineApi.getRegistrySquads();
        let squads: Squad[] = data.squads.map((s) => ({
          id: s.id,
          name: s.name,
          description: s.description || '',
          domain: s.domain,
          agentCount: s.agentCount,
          status: 'active' as const,
        }));
        if (params?.domain) {
          squads = squads.filter((s) => s.domain === params.domain);
        }
        return squads;
      } catch {
        // Engine unavailable — fall through to apiClient
      }
    }
    const response = await apiClient.get<{ squads: Squad[]; total: number }>('/squads', params);
    return response.squads || [];
  },

  // Get squad by ID with agents — engine-first
  getSquad: async (squadId: string): Promise<SquadDetail> => {
    if (hasEngine()) {
      try {
        const [squadsData, agentsData] = await Promise.all([
          engineApi.getRegistrySquads(),
          engineApi.getRegistryAgents(squadId),
        ]);
        const squad = squadsData.squads.find((s) => s.id === squadId);
        if (squad) {
          return {
            id: squad.id,
            name: squad.name,
            description: squad.description || '',
            domain: squad.domain,
            agentCount: squad.agentCount,
            status: 'active',
            agents: agentsData.agents.map((a) => ({
              id: a.id,
              name: a.name,
              squad: a.squadId,
              tier: 2 as const,
              description: a.description,
            })),
          };
        }
      } catch {
        // Engine unavailable — fall through
      }
    }
    const response = await apiClient.get<{ squad: SquadDetail }>(`/squads/${squadId}`);
    return response.squad;
  },

  // Get squad statistics — apiClient only (engine doesn't track stats)
  getSquadStats: async (squadId: string): Promise<SquadStats> => {
    return apiClient.get<SquadStats>(`/squads/${squadId}/stats`);
  },

  // Get ecosystem overview — apiClient only (rich aggregation)
  getEcosystemOverview: async (): Promise<EcosystemOverview> => {
    return apiClient.get<EcosystemOverview>('/squads/ecosystem/overview');
  },

  // Get agent connections — apiClient only (not in engine registry)
  getSquadConnections: async (squadId: string): Promise<AgentConnection[]> => {
    const response = await apiClient.get<{ connections: AgentConnection[] }>(
      `/squads/${squadId}/connections`,
    );
    return response.connections || [];
  },
};
