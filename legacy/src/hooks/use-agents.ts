import useSWR from 'swr';
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAgentStore } from '@/stores/agent-store';
import { useSettingsStore } from '@/stores/settings-store';
import { MOCK_AGENTS } from '@/lib/mock-data';
import { agentsApi } from '@/services/api';
import type { AiosStatus, AgentId, AgentSummary, AgentCommand, PlatformAgent, SearchFilters } from '@/types';
import { getSquadType } from '@/types';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useAgents() {
  const {
    agents,
    activeAgentId,
    pollingInterval,
    setAgents,
    setActiveAgent,
    clearActiveAgent,
    updateAgent,
    setLastPolledAt,
    setIsPolling,
    getActiveAgents,
    getIdleAgents,
  } = useAgentStore();

  const { settings } = useSettingsStore();
  const useMockData = settings.useMockData;

  // Poll the status endpoint (disabled when using mock data)
  const { data, error, isLoading, mutate } = useSWR<AiosStatus>(
    useMockData ? null : '/api/status',
    fetcher,
    {
      refreshInterval: pollingInterval,
      revalidateOnFocus: true,
      dedupingInterval: 2000,
    }
  );

  // Load mock agents when enabled
  useEffect(() => {
    if (useMockData) {
      setAgents(MOCK_AGENTS);
      setLastPolledAt(new Date().toISOString());
      setIsPolling(false);
    }
  }, [useMockData, setAgents, setLastPolledAt, setIsPolling]);

  // Sync status data with agent store (when not using mock)
  useEffect(() => {
    if (useMockData || !data) return;

    setLastPolledAt(new Date().toISOString());
    setIsPolling(true);

    // Update active agent from status
    if (data.activeAgent) {
      const agentId = data.activeAgent.id as AgentId;
      setActiveAgent(agentId, data.activeAgent.currentStory);

      // Update last activity
      updateAgent(agentId, {
        lastActivity: data.activeAgent.activatedAt,
      });
    } else if (activeAgentId) {
      clearActiveAgent();
    }

    return () => {
      setIsPolling(false);
    };
  }, [
    data,
    activeAgentId,
    useMockData,
    setActiveAgent,
    clearActiveAgent,
    updateAgent,
    setLastPolledAt,
    setIsPolling,
  ]);

  return {
    agents: Object.values(agents),
    activeAgents: getActiveAgents(),
    idleAgents: getIdleAgents(),
    activeAgentId,
    status: data,
    isLoading: useMockData ? false : isLoading,
    error: useMockData ? null : error,
    useMockData,
    refresh: mutate,
  };
}

// ============ Platform Agent Hooks (migrated from aios-platform) ============

// Extended agent with UI fields
export interface AgentWithUI extends AgentSummary {
  squadType: ReturnType<typeof getSquadType>;
  role: string;
  status: 'online' | 'busy' | 'offline';
  commands?: AgentCommand[];
  frameworks?: string[];
  capabilities?: Array<{ type: string; text: string }>;
  sampleTasks?: string[];
  persona?: {
    archetype?: string;
    zodiac?: string;
    role?: string;
    style?: string;
    focus?: string;
    communication?: {
      tone?: string;
      emoji_frequency?: string;
      vocabulary?: string[];
    };
  };
  corePrinciples?: string[];
  mindSource?: {
    name?: string;
    frameworks?: string[];
  };
}

// Fetch agent details with UI enrichment
export function useAgentById(agentId: string | null, squadId?: string | null) {
  return useQuery<AgentWithUI | null>({
    queryKey: ['agentById', agentId, squadId],
    queryFn: async () => {
      if (!agentId) return null;
      let agent: AgentSummary | null = null;
      let fullAgent: PlatformAgent | null = null;

      if (squadId) {
        try {
          fullAgent = await agentsApi.getAgent(squadId, agentId) as unknown as PlatformAgent;
          agent = fullAgent;
        } catch (e) {
          console.warn(`Direct fetch failed for ${squadId}/${agentId}, falling back to search:`, e);
        }
      }

      if (!agent) {
        const results = await agentsApi.searchAgents({ query: agentId, limit: 10 });
        agent = results.find((a: AgentSummary) => a.id === agentId) || null;

        if (agent && !fullAgent) {
          try {
            fullAgent = await agentsApi.getAgent(agent.squad, agent.id) as unknown as PlatformAgent;
          } catch (e) {
            console.warn(`Could not fetch full agent details for ${agentId}:`, e);
          }
        }
      }

      if (!agent) return null;

      const mergedAgent = fullAgent || agent;
      return {
        ...mergedAgent,
        squadType: getSquadType(mergedAgent.squad),
        role: mergedAgent.title || 'Agent',
        status: 'online' as const,
      };
    },
    enabled: !!agentId,
    staleTime: 2 * 60 * 1000,
  });
}

export function usePlatformAgents(squadId?: string | null, options?: { refetchInterval?: number | false }) {
  return useQuery<AgentSummary[]>({
    queryKey: ['agents', squadId || 'all'],
    queryFn: async () => {
      if (squadId) {
        return agentsApi.getAgentsBySquad(squadId);
      }
      return agentsApi.getAgents({ limit: 500 });
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchInterval: options?.refetchInterval,
  });
}

export function useAgentCommands(squadId: string | null, agentId: string | null) {
  return useQuery<AgentCommand[]>({
    queryKey: ['agentCommands', squadId, agentId],
    queryFn: async () => {
      if (!squadId || !agentId) return [];
      return agentsApi.getAgentCommands(squadId, agentId);
    },
    enabled: !!squadId && !!agentId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useAgentSearch(filters: SearchFilters) {
  return useQuery<AgentSummary[]>({
    queryKey: ['agents', 'search', filters],
    queryFn: async () => {
      return agentsApi.searchAgents(filters);
    },
    enabled: !!filters.query || !!filters.squad || filters.tier !== undefined,
    staleTime: 1 * 60 * 1000,
  });
}
