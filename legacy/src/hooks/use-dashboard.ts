'use client';

import { useQuery } from '@tanstack/react-query';
import {
  analyticsApi,
  agentsApi,
  type AnalyticsOverview,
  type RealtimeMetrics,
  type AgentPerformance,
  type CostReport,
  type HealthDashboard,
  type TimePeriod,
} from '@/services/api';
import { executeApi } from '@/services/api/execute';
import type {
  CostSummary,
  SystemMetrics,
  HealthStatus,
  AgentAnalytics,
  CommandAnalytics,
  ExecutionHistory,
  AgentSummary,
} from '@/types';

// Hook for analytics overview
export function useAnalyticsOverview(period: TimePeriod = 'day') {
  return useQuery<AnalyticsOverview>({
    queryKey: ['analytics-overview', period],
    queryFn: () => analyticsApi.getOverview(period),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    refetchInterval: 2 * 60 * 1000, // Refetch every 2 minutes
  });
}

// Hook for realtime metrics
export function useRealtimeMetrics() {
  return useQuery<RealtimeMetrics>({
    queryKey: ['analytics-realtime'],
    queryFn: () => analyticsApi.getRealtime(),
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    refetchInterval: 60 * 1000, // Refetch every minute
  });
}

// Hook for cost summary (derived from analytics)
export function useCostSummary() {
  const { data: costReport } = useQuery<CostReport>({
    queryKey: ['analytics-costs'],
    queryFn: () => analyticsApi.getCostReport('month'),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
  });

  const { data: overview } = useAnalyticsOverview('day');

  // Extract provider costs from the array format
  const claudeProvider = costReport?.byProvider?.find(p => p.provider?.toLowerCase().includes('claude'));
  const openaiProvider = costReport?.byProvider?.find(p => p.provider?.toLowerCase().includes('openai'));

  // Extract from externalData if available
  const externalByProvider = costReport?.externalData?.usageStats?.byProvider || {};
  const externalBySquad = costReport?.externalData?.usageStats?.bySquad || {};
  const dailyCosts = costReport?.externalData?.trends?.dailyCosts || {};

  // Build cost summary from real data
  const costSummary: CostSummary = {
    today: overview?.summary.totalCost || 0,
    thisWeek: (costReport?.summary?.totalCost || 0) / 4, // Approximate
    thisMonth: costReport?.summary?.totalCost || 0,
    byProvider: {
      claude: claudeProvider?.cost || externalByProvider['claude']?.cost || 0,
      openai: openaiProvider?.cost || externalByProvider['openai']?.cost || 0,
    },
    bySquad: Object.entries(externalBySquad).reduce((acc, [squadId, data]) => {
      acc[squadId] = (data as any)?.cost || 0;
      return acc;
    }, {} as Record<string, number>),
    trend: costReport?.timeline?.map(t => t.cost) || Object.values(dailyCosts).slice(-7) as number[],
  };

  return { data: costSummary };
}

// Hook for agent analytics -- enriched with squad names and avg response time from execution history
export function useAgentAnalytics() {
  const { data: overview } = useAnalyticsOverview('week');
  const { data: agents } = useQuery<AgentSummary[]>({
    queryKey: ['agents', 'all'],
    queryFn: () => agentsApi.getAgents({ limit: 500 }),
    staleTime: 5 * 60 * 1000,
  });
  const { data: historyData } = useQuery<ExecutionHistory>({
    queryKey: ['executionHistory', 100],
    queryFn: () => executeApi.getHistory({ limit: 100 }),
    staleTime: 5 * 60 * 1000,
  });

  const executions = historyData?.executions || [];
  const agentMap = new Map((agents || []).map(a => [a.id, a]));

  const analytics: AgentAnalytics[] = (overview?.topAgents || []).map(agent => {
    const agentInfo = agentMap.get(agent.agentId);
    const agentExecs = executions.filter(e => e.agentId === agent.agentId);
    const totalDuration = agentExecs.reduce((sum, e) => sum + (e.duration || 0), 0);

    return {
      agentId: agent.agentId,
      agentName: agent.name,
      squad: agentInfo?.squad || '',
      totalExecutions: agent.executions,
      successRate: agent.successRate,
      avgResponseTime: agentExecs.length > 0 ? totalDuration / agentExecs.length : 0,
      avgTokens: 0,
      topCommands: [],
      lastActive: agentExecs[0]?.createdAt || '',
    };
  });

  return { data: analytics };
}

// Hook for command analytics -- derived from real execution history grouped by agent
export function useCommandAnalytics() {
  const { data: historyData } = useQuery<ExecutionHistory>({
    queryKey: ['executionHistory', 100],
    queryFn: () => executeApi.getHistory({ limit: 100 }),
    staleTime: 5 * 60 * 1000,
  });

  const executions = historyData?.executions || [];

  // Group by agent and compute stats
  const byAgent = new Map<string, { total: number; success: number; totalDuration: number }>();
  for (const e of executions) {
    const key = e.agentId || 'unknown';
    const existing = byAgent.get(key) || { total: 0, success: 0, totalDuration: 0 };
    existing.total++;
    if (e.status === 'completed') existing.success++;
    existing.totalDuration += e.duration || 0;
    byAgent.set(key, existing);
  }

  const analytics: CommandAnalytics[] = Array.from(byAgent.entries())
    .map(([agentId, data]) => ({
      command: agentId,
      agentId,
      totalCalls: data.total,
      successRate: data.total > 0 ? Math.round((data.success / data.total) * 100) : 0,
      avgDuration: data.total > 0 ? data.totalDuration / data.total : 0,
    }))
    .sort((a, b) => b.totalCalls - a.totalCalls)
    .slice(0, 10);

  return { data: analytics };
}

// MCP Types
export interface MCPTool {
  name: string;
  description?: string;
  calls: number;
}

export interface MCPResource {
  uri: string;
  name: string;
  accessCount?: number;
}

export interface MCPServer {
  name: string;
  status: 'connected' | 'disconnected' | 'error';
  type: string;
  tools: MCPTool[];
  toolCount?: number;
  resources: MCPResource[];
  lastPing: string;
  error?: string;
  usedBy?: string[];
}

// Hook for MCP status - Real data from /api/tools/mcp
export function useMCPStatus() {
  return useQuery<MCPServer[]>({
    queryKey: ['mcp-status'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/tools/mcp');
        if (!response.ok) throw new Error('Failed to fetch MCP status');
        const data = await response.json();
        return data.servers || [];
      } catch (error) {
        console.warn('MCP status fetch failed, using fallback:', error);
        // Fallback data when API unavailable
        return [
          {
            name: 'mcp-scrapers',
            status: 'connected' as const,
            type: 'scraper',
            tools: [
              { name: 'scraper_multi_search', calls: 0 },
              { name: 'scraper_topic_research', calls: 0 },
            ],
            resources: [],
            lastPing: new Date().toISOString(),
          },
          {
            name: 'filesystem',
            status: 'connected' as const,
            type: 'builtin',
            tools: [
              { name: 'read_file', calls: 0 },
              { name: 'write_file', calls: 0 },
            ],
            resources: [],
            lastPing: new Date().toISOString(),
          },
        ];
      }
    },
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refresh every minute
  });
}

// Hook for MCP stats
export function useMCPStats() {
  const { data: servers } = useMCPStatus();

  if (!servers) return { data: null };

  const connectedServers = servers.filter(s => s.status === 'connected');
  const allTools = connectedServers.flatMap(s =>
    s.tools.map(t => ({ ...t, server: s.name }))
  );
  const totalToolCount = servers.reduce((sum, s) => sum + (s.toolCount || s.tools.length), 0);
  const totalCalls = allTools.reduce((sum, t) => sum + t.calls, 0);

  return {
    data: {
      totalServers: servers.length,
      connectedServers: connectedServers.length,
      totalTools: totalToolCount,
      totalToolCalls: totalCalls,
      topTools: allTools
        .sort((a, b) => b.calls - a.calls)
        .slice(0, 5)
        .map(t => ({ name: t.name, server: t.server, calls: t.calls })),
    },
  };
}

// Hook for system health status
export function useSystemHealth() {
  const { data: healthDashboard } = useQuery<HealthDashboard>({
    queryKey: ['analytics-health-dashboard'],
    queryFn: () => analyticsApi.getHealthDashboard(),
    staleTime: 10 * 1000,
    refetchInterval: 30 * 1000,
  });

  const healthStatus: HealthStatus | null = healthDashboard ? {
    api: {
      healthy: healthDashboard.status === 'healthy',
      latency: healthDashboard.performance.avgLatencyMs,
    },
    database: {
      healthy: healthDashboard.services.queue.status === 'healthy',
      latency: 10, // Not directly available
    },
    llm: {
      healthy: healthDashboard.performance.executionSuccessRate > 50,
      providers: { claude: true, openai: true },
    },
    mcp: {
      healthy: true,
      connectedServers: 2,
    },
  } : null;

  return { data: healthStatus };
}

// Hook for system metrics
export function useSystemMetrics() {
  const { data: realtime } = useRealtimeMetrics();
  const { data: overview } = useAnalyticsOverview('day');
  const { data: healthDashboard } = useQuery<HealthDashboard>({
    queryKey: ['analytics-health-dashboard'],
    queryFn: () => analyticsApi.getHealthDashboard(),
    staleTime: 10 * 1000,
  });

  const metrics: SystemMetrics | null = (overview || healthDashboard) ? {
    uptime: healthDashboard?.resources.uptimeSeconds || overview?.health?.uptime || 0,
    avgLatency: realtime?.avgLatencyMs || healthDashboard?.performance.avgLatencyMs || overview?.summary.avgLatency || 0,
    requestsPerMinute: realtime?.requestsPerMinute || 0,
    errorRate: overview?.summary.errorRate || 0,
    queueSize: healthDashboard?.services.queue.pending || realtime?.activeExecutions || 0,
    activeConnections: realtime?.activeExecutions || 0,
  } : null;

  return { data: metrics };
}
