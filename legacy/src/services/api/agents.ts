import { apiClient } from './client';
import type { Agent, AgentSummary, AgentCommand, SearchFilters, getSquadType } from '@/types';

export interface AgentsParams {
  squad?: string;
  tier?: number;
  limit?: number;
  [key: string]: string | number | undefined;
}

export const agentsApi = {
  // Get all agents
  // GET /api/agents
  getAgents: async (params?: AgentsParams): Promise<AgentSummary[]> => {
    const response = await apiClient.get<{ agents: AgentSummary[]; total: number }>('/agents', params);
    return response.agents || [];
  },

  // Search agents
  // GET /api/agents/search?q=query
  searchAgents: async (filters: SearchFilters): Promise<AgentSummary[]> => {
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

  // Get agents by squad
  // GET /api/agents/squad/:squadId
  getAgentsBySquad: async (squadId: string): Promise<AgentSummary[]> => {
    const response = await apiClient.get<{ squad: string; agents: AgentSummary[]; total: number }>(
      `/agents/squad/${squadId}`
    );
    return response.agents || [];
  },

  // Get agent by ID (requires squadId)
  // GET /api/agents/:squadId/:agentId
  getAgent: async (squadId: string, agentId: string): Promise<Agent> => {
    const response = await apiClient.get<{ agent: Agent }>(`/agents/${squadId}/${agentId}`);
    return response.agent;
  },

  // Get agent commands
  // GET /api/agents/:squadId/:agentId/commands
  getAgentCommands: async (squadId: string, agentId: string): Promise<AgentCommand[]> => {
    const response = await apiClient.get<{ agentId: string; commands: AgentCommand[] }>(
      `/agents/${squadId}/${agentId}/commands`
    );
    return response.commands || [];
  },
};

// Named export for convenience
export const searchAgents = agentsApi.searchAgents;
