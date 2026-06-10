import { apiClient } from './client';

export type TimePeriod = 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year';

export interface AnalyticsOverview {
  period: TimePeriod;
  periodStart: string;
  periodEnd: string;
  generatedAt: string;
  summary: {
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    successRate: number;
    averageDuration: number;
    totalRequests: number;
    errorRate: number;
    avgLatency: number;
    p95Latency: number;
    totalCost: number;
    totalTokens: number;
    avgCostPerExecution: number;
    activeJobs: number;
    scheduledTasks: number;
    activeTasks: number;
  };
  trends: {
    executions: { direction: 'up' | 'down' | 'stable'; change: number };
    costs: { direction: 'up' | 'down' | 'stable'; change: number };
    errors: { direction: 'up' | 'down' | 'stable'; change: number };
  };
  topAgents: Array<{ agentId: string; name: string; executions: number; successRate: number }>;
  topSquads: Array<{ squadId: string; name: string; executions: number; cost: number }>;
  health: {
    status: 'healthy' | 'degraded' | 'unhealthy';
    uptime: number;
    memoryUsage: {
      rss: number;
      heapTotal: number;
      heapUsed: number;
      external: number;
      arrayBuffers: number;
    };
  };
}

export interface RealtimeMetrics {
  timestamp: string;
  requestsPerMinute: number;
  errorsPerMinute: number;
  executionsPerMinute: number;
  activeExecutions: number;
  avgLatencyMs: number;
}

export interface AgentPerformance {
  agentId: string;
  agentName: string;
  squad: string;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  successRate: number;
  avgDuration: number;
  avgTokens: number;
  totalCost: number;
  lastActive: string;
}

export interface SquadPerformance {
  squadId: string;
  squadName: string;
  agentCount: number;
  totalExecutions: number;
  successRate: number;
  avgDuration: number;
  totalCost: number;
  topAgents: Array<{ agentId: string; executions: number }>;
}

export interface CostReport {
  period: TimePeriod;
  periodStart: string;
  generatedAt: string;
  summary: {
    totalCost: number;
    totalTokens: number;
    totalRecords: number;
    avgCostPerRecord: number;
    avgTokensPerRecord: number;
  };
  byProvider: Array<{ provider: string; cost: number; tokens: number; percentage: number }>;
  byModel: Array<{ model: string; cost: number; tokens: number; percentage: number }>;
  timeline: Array<{ date: string; cost: number; tokens: number }>;
  externalData?: {
    usageStats?: {
      totals: { inputTokens: number; outputTokens: number; totalTokens: number; cost: number; count: number };
      byProvider: Record<string, { inputTokens: number; outputTokens: number; cost: number; count: number }>;
      bySquad: Record<string, { inputTokens: number; outputTokens: number; cost: number; count: number }>;
    };
    trends?: {
      dailyCosts: Record<string, number>;
      projectedMonthly: number;
      averageDaily: number;
    };
  };
}

export interface HealthDashboard {
  timestamp: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  availability: number;
  performance: {
    requestsLastHour: number;
    errorsLastHour: number;
    avgLatencyMs: number;
    p95LatencyMs: number;
    executionsLastHour: number;
    executionSuccessRate: number;
  };
  resources: {
    memoryUsedMB: number;
    memoryTotalMB: number;
    memoryPercentage: number;
    uptimeSeconds: number;
    uptimeFormatted: string;
  };
  services: {
    queue: { status: string; pending: number; processing: number };
    scheduler: { status: string; activeTasks: number; totalTasks: number };
  };
}

export const analyticsApi = {
  // Get comprehensive overview
  // GET /api/analytics/overview
  getOverview: async (period: TimePeriod = 'day'): Promise<AnalyticsOverview> => {
    return apiClient.get<AnalyticsOverview>('/analytics/overview', { period });
  },

  // Get real-time metrics
  // GET /api/analytics/realtime
  getRealtime: async (): Promise<RealtimeMetrics> => {
    return apiClient.get<RealtimeMetrics>('/analytics/realtime');
  },

  // Get agent performance
  // GET /api/analytics/performance/agents
  getAgentPerformance: async (params?: {
    period?: TimePeriod;
    squadId?: string;
    limit?: number;
  }): Promise<{ agents: AgentPerformance[] }> => {
    return apiClient.get<{ agents: AgentPerformance[] }>('/analytics/performance/agents', params);
  },

  // Get squad performance
  // GET /api/analytics/performance/squads
  getSquadPerformance: async (params?: {
    period?: TimePeriod;
    limit?: number;
  }): Promise<{ squads: SquadPerformance[] }> => {
    return apiClient.get<{ squads: SquadPerformance[] }>('/analytics/performance/squads', params);
  },

  // Get cost report
  // GET /api/analytics/costs
  getCostReport: async (period: TimePeriod = 'month'): Promise<CostReport> => {
    return apiClient.get<CostReport>('/analytics/costs', { period });
  },

  // Get health dashboard
  // GET /api/analytics/health-dashboard
  getHealthDashboard: async (): Promise<HealthDashboard> => {
    return apiClient.get<HealthDashboard>('/analytics/health-dashboard');
  },

  // Get token usage details
  // GET /api/analytics/usage/tokens
  getTokenUsage: async (params?: {
    period?: TimePeriod;
    groupBy?: 'provider' | 'squad' | 'agent';
  }): Promise<{
    total: { input: number; output: number };
    byGroup: Array<{ name: string; input: number; output: number }>;
  }> => {
    return apiClient.get('/analytics/usage/tokens', params);
  },
};
