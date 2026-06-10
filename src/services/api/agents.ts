import { apiClient } from './client';
import { engineApi } from './engine';
import { getEngineUrl } from '../../lib/connection';
import type { Agent, AgentSummary, AgentCommand, SearchFilters } from '../../types';

export interface AgentsParams {
  squad?: string;
  tier?: number;
  limit?: number;
  [key: string]: string | number | undefined;
}

/** Check if engine is available (URL configured) */
function hasEngine(): boolean {
  return !!getEngineUrl();
}

/** Map engine registry agent to AgentSummary */
function toAgentSummary(a: { id: string; name: string; squadId: string; role?: string; description?: string }): AgentSummary {
  return {
    id: a.id,
    name: a.name,
    squad: a.squadId,
    tier: 2,
    title: a.role,
    description: a.description,
  };
}

export const agentsApi = {
  // Get all agents — engine-first, fallback to apiClient
  getAgents: async (params?: AgentsParams): Promise<AgentSummary[]> => {
    if (hasEngine()) {
      try {
        const data = await engineApi.getRegistryAgents(params?.squad);
        let agents = data.agents.map(toAgentSummary);
        if (params?.limit) agents = agents.slice(0, params.limit);
        return agents;
      } catch {
        // Engine unavailable — fall through
      }
    }
    const response = await apiClient.get<{ agents: AgentSummary[]; total: number }>('/agents', params);
    return response.agents || [];
  },

  // Search agents — engine-first with client-side filter, fallback to apiClient
  searchAgents: async (filters: SearchFilters): Promise<AgentSummary[]> => {
    if (hasEngine()) {
      try {
        const data = await engineApi.getRegistryAgents();
        const query = (filters.query || '').toLowerCase();
        let results = data.agents
          .map(toAgentSummary)
          .filter((a) =>
            a.name.toLowerCase().includes(query) ||
            a.squad.toLowerCase().includes(query) ||
            (a.description || '').toLowerCase().includes(query)
          );
        if (filters.limit) results = results.slice(0, filters.limit);
        return results;
      } catch {
        // Engine unavailable — fall through
      }
    }
    const params: Record<string, string | number | undefined> = {
      q: filters.query,
      limit: filters.limit,
    };
    const response = await apiClient.get<{ results: AgentSummary[]; query: string; total: number }>(
      '/agents/search',
      params
    );
    return response.results || [];
  },

  // Get agents by squad — engine-first
  getAgentsBySquad: async (squadId: string): Promise<AgentSummary[]> => {
    if (hasEngine()) {
      try {
        const data = await engineApi.getRegistryAgents(squadId);
        return data.agents.map(toAgentSummary);
      } catch {
        // Engine unavailable — fall through
      }
    }
    const response = await apiClient.get<{ squad: string; agents: AgentSummary[]; total: number }>(
      `/agents/squad/${squadId}`
    );
    return response.agents || [];
  },

  // Get agent by ID — engine-first
  getAgent: async (squadId: string, agentId: string): Promise<Agent> => {
    if (hasEngine()) {
      try {
        const data = await engineApi.getRegistryAgent(squadId, agentId);
        return {
          id: data.id,
          name: data.name,
          squad: data.squadId,
          tier: 2,
          title: data.role,
          description: data.description,
        };
      } catch {
        // Engine unavailable — fall through
      }
    }
    const response = await apiClient.get<{ agent: Agent }>(`/agents/${squadId}/${agentId}`);
    return response.agent;
  },

  // Get agent commands — apiClient only (not parsed by engine registry)
  getAgentCommands: async (squadId: string, agentId: string): Promise<AgentCommand[]> => {
    const response = await apiClient.get<{ agentId: string; commands: AgentCommand[] }>(
      `/agents/${squadId}/${agentId}/commands`
    );
    return response.commands || [];
  },
};

// Named export for convenience
export const searchAgents = agentsApi.searchAgents;
