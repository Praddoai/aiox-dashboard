'use client';

import { useQuery } from '@tanstack/react-query';
import { analyticsApi, type AgentPerformance, type TimePeriod } from '@/services/api/analytics';
import { apiClient } from '@/services/api/client';
import type { AgentActivityEntry } from '@/types';

export function useAgentPerformance(params?: { period?: TimePeriod; squadId?: string }) {
  return useQuery<AgentPerformance[]>({
    queryKey: ['agentPerformance', params],
    queryFn: async () => {
      const result = await analyticsApi.getAgentPerformance(params);
      return result.agents;
    },
    staleTime: 5 * 60 * 1000,
  });
}

interface EventHistoryItem {
  id: string;
  agent?: string;
  description?: string;
  timestamp: string;
  type: string;
  duration?: number;
  success?: boolean;
}

export function useAgentActivity(agentId?: string | null) {
  return useQuery<AgentActivityEntry[]>({
    queryKey: ['agentActivity', agentId || 'all'],
    queryFn: async () => {
      const params: Record<string, string | number> = { limit: 20 };
      if (agentId) params.aios_agent = agentId;
      const result = await apiClient.get<{ events?: EventHistoryItem[] }>('/events/history', params);
      return (result.events || []).map((evt, i) => ({
        id: evt.id || `evt-${i}`,
        agentId: evt.agent?.replace('@', '') || 'system',
        timestamp: evt.timestamp,
        action: evt.description || evt.type,
        status: (evt.success !== false ? 'success' : 'error') as 'success' | 'error',
        duration: evt.duration || 0,
      }));
    },
    staleTime: 30 * 1000,
  });
}
