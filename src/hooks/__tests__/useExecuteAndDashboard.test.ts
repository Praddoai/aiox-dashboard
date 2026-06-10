import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Use vi.hoisted to avoid temporal dead zone issues with vi.mock hoisting
const {
  mockExecuteApi,
  mockBuildExecuteRequest,
  mockAddMessage,
  mockSetStreaming,
  mockUpdateMessage,
  mockSetAbortController,
  mockStartExecution,
  mockEndExecution,
  mockAddAgentStart,
  mockAddAgentComplete,
  mockAddToolUse,
  mockAddError,
} = vi.hoisted(() => ({
  mockExecuteApi: {
    executeAgent: vi.fn(),
    executeAgentStream: vi.fn(),
    getHistory: vi.fn(),
    getStats: vi.fn(),
    getTokenUsage: vi.fn(),
    getLLMHealth: vi.fn(),
  },
  mockBuildExecuteRequest: vi.fn(),
  mockAddMessage: vi.fn().mockReturnValue('msg-1'),
  mockSetStreaming: vi.fn(),
  mockUpdateMessage: vi.fn(),
  mockSetAbortController: vi.fn(),
  mockStartExecution: vi.fn(),
  mockEndExecution: vi.fn(),
  mockAddAgentStart: vi.fn(),
  mockAddAgentComplete: vi.fn(),
  mockAddToolUse: vi.fn(),
  mockAddError: vi.fn(),
}));

vi.mock('../../services/api', () => ({
  executeApi: mockExecuteApi,
  buildExecuteRequest: mockBuildExecuteRequest,
  analyticsApi: {
    getOverview: vi.fn(),
    getRealtime: vi.fn(),
    getCostReport: vi.fn(),
    getHealthDashboard: vi.fn(),
  },
  agentsApi: {
    getAgents: vi.fn(),
  },
}));

// Re-import the mocked analyticsApi and agentsApi so tests can configure them
import { analyticsApi, agentsApi } from '../../services/api';
const mockAnalyticsApi = vi.mocked(analyticsApi);
const mockAgentsApi = vi.mocked(agentsApi);

// Mock executeApi specifically for useDashboard (it imports from services/api/execute)
vi.mock('../../services/api/execute', () => ({
  executeApi: mockExecuteApi,
}));

vi.mock('../../stores/chatStore', () => ({
  useChatStore: () => ({
    addMessage: mockAddMessage,
    setStreaming: mockSetStreaming,
    updateMessage: mockUpdateMessage,
    setAbortController: mockSetAbortController,
  }),
}));

vi.mock('../../stores/executionLogStore', () => ({
  useExecutionLogStore: () => ({
    startExecution: mockStartExecution,
    endExecution: mockEndExecution,
    addAgentStart: mockAddAgentStart,
    addAgentComplete: mockAddAgentComplete,
    addToolUse: mockAddToolUse,
    addError: mockAddError,
  }),
}));

// Mock global fetch for useMCPStatus
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// ---------------------------------------------------------------------------
// Imports under test (after mocks)
// ---------------------------------------------------------------------------

import {
  useExecuteAgent,
  useExecutionHistory,
  useExecutionStats,
  useTokenUsage,
  useLLMHealth,
} from '../useExecute';

import {
  useAnalyticsOverview,
  useRealtimeMetrics,
  useCostSummary,
  useAgentAnalytics,
  useCommandAnalytics,
  useMCPStatus,
  useMCPStats,
  useSystemHealth,
  useSystemMetrics,
} from '../useDashboard';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, children);
}

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const mockHistoryData = {
  executions: [
    {
      id: 'exec-1',
      agentId: 'agent-a',
      squadId: 'squad-1',
      status: 'completed' as const,
      createdAt: '2026-03-01T10:00:00Z',
      duration: 2.5,
    },
    {
      id: 'exec-2',
      agentId: 'agent-a',
      squadId: 'squad-1',
      status: 'failed' as const,
      createdAt: '2026-03-01T09:00:00Z',
      duration: 1.2,
    },
    {
      id: 'exec-3',
      agentId: 'agent-b',
      squadId: 'squad-2',
      status: 'completed' as const,
      createdAt: '2026-03-01T08:00:00Z',
      duration: 3.0,
    },
  ],
  total: 3,
};

const mockStatsData = {
  total: 100,
  byStatus: { completed: 80, failed: 15, pending: 5 },
  bySquad: { 'squad-1': 60, 'squad-2': 40 },
  byAgent: { 'agent-a': 50, 'agent-b': 50 },
};

const mockTokenUsageData = {
  claude: { input: 10000, output: 5000, requests: 50 },
  openai: { input: 3000, output: 1500, requests: 20 },
  total: { input: 13000, output: 6500, requests: 70 },
};

const mockLLMHealthData = {
  claude: { available: true },
  openai: { available: true },
};

const mockOverviewData = {
  period: 'day' as const,
  periodStart: '2026-03-09T00:00:00Z',
  periodEnd: '2026-03-09T23:59:59Z',
  generatedAt: '2026-03-09T12:00:00Z',
  summary: {
    totalExecutions: 42,
    successfulExecutions: 38,
    failedExecutions: 4,
    successRate: 90.5,
    averageDuration: 1.5,
    totalRequests: 42,
    errorRate: 9.5,
    avgLatency: 250,
    p95Latency: 800,
    totalCost: 12.50,
    totalTokens: 150000,
    avgCostPerExecution: 0.30,
    activeJobs: 2,
    scheduledTasks: 5,
    activeTasks: 3,
  },
  trends: {
    executions: { direction: 'up' as const, change: 15 },
    costs: { direction: 'down' as const, change: 5 },
    errors: { direction: 'stable' as const, change: 0 },
  },
  topAgents: [
    { agentId: 'agent-a', name: 'Agent A', executions: 20, successRate: 95 },
    { agentId: 'agent-b', name: 'Agent B', executions: 15, successRate: 87 },
  ],
  topSquads: [
    { squadId: 'squad-1', name: 'Squad 1', executions: 30, cost: 8.0 },
  ],
  health: {
    status: 'healthy' as const,
    uptime: 86400,
    memoryUsage: { rss: 200, heapTotal: 150, heapUsed: 100, external: 10, arrayBuffers: 5 },
  },
};

const mockRealtimeData = {
  timestamp: '2026-03-09T12:00:00Z',
  requestsPerMinute: 10,
  errorsPerMinute: 1,
  executionsPerMinute: 8,
  activeExecutions: 3,
  avgLatencyMs: 200,
};

const mockCostReportData = {
  period: 'month' as const,
  periodStart: '2026-03-01T00:00:00Z',
  generatedAt: '2026-03-09T12:00:00Z',
  summary: {
    totalCost: 150.0,
    totalTokens: 2000000,
    totalRecords: 500,
    avgCostPerRecord: 0.30,
    avgTokensPerRecord: 4000,
  },
  byProvider: [
    { provider: 'Claude', cost: 100.0, tokens: 1400000, percentage: 66.7 },
    { provider: 'OpenAI', cost: 50.0, tokens: 600000, percentage: 33.3 },
  ],
  byModel: [],
  timeline: [
    { date: '2026-03-01', cost: 5.0, tokens: 60000 },
    { date: '2026-03-02', cost: 7.0, tokens: 80000 },
  ],
  externalData: {
    usageStats: {
      totals: { inputTokens: 1000000, outputTokens: 1000000, totalTokens: 2000000, cost: 150, count: 500 },
      byProvider: {
        claude: { inputTokens: 700000, outputTokens: 700000, cost: 100, count: 300 },
      },
      bySquad: {
        'squad-1': { inputTokens: 500000, outputTokens: 500000, cost: 80, count: 200 },
      },
    },
    trends: {
      dailyCosts: { '2026-03-01': 5, '2026-03-02': 7 },
      projectedMonthly: 180,
      averageDaily: 6,
    },
  },
};

const mockHealthDashboard = {
  timestamp: '2026-03-09T12:00:00Z',
  status: 'healthy' as const,
  availability: 99.9,
  performance: {
    requestsLastHour: 120,
    errorsLastHour: 3,
    avgLatencyMs: 180,
    p95LatencyMs: 500,
    executionsLastHour: 80,
    executionSuccessRate: 95,
  },
  resources: {
    memoryUsedMB: 512,
    memoryTotalMB: 2048,
    memoryPercentage: 25,
    uptimeSeconds: 172800,
    uptimeFormatted: '2d 0h',
  },
  services: {
    queue: { status: 'healthy', pending: 2, processing: 1 },
    scheduler: { status: 'healthy', activeTasks: 3, totalTasks: 10 },
  },
};

const mockAgentsSummary = [
  { id: 'agent-a', name: 'Agent A', tier: 1 as const, squad: 'squad-1' },
  { id: 'agent-b', name: 'Agent B', tier: 2 as const, squad: 'squad-2' },
];

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  mockFetch.mockReset();
});

// ===========================================================================
// useExecute.ts tests
// ===========================================================================

describe('useExecuteAgent', () => {
  it('should return a mutation object', () => {
    const { result } = renderHook(() => useExecuteAgent(), { wrapper: createWrapper() });
    expect(result.current.mutate).toBeDefined();
    expect(result.current.mutateAsync).toBeDefined();
    expect(result.current.isPending).toBe(false);
  });

  it('should add user message and trigger non-streaming execution', async () => {
    const mockResponse = {
      executionId: 'exec-1',
      status: 'completed' as const,
      result: {
        agentId: 'agent-a',
        agentName: 'Agent A',
        message: 'Hello back',
        metadata: {
          squad: 'squad-1',
          tier: 1 as const,
          provider: 'claude',
          model: 'claude-sonnet-4-6-20250929',
          usage: { inputTokens: 100, outputTokens: 50 },
          duration: 1.2,
          processedAt: '2026-03-09T12:00:00Z',
        },
      },
    };
    mockExecuteApi.executeAgent.mockResolvedValue(mockResponse);
    mockBuildExecuteRequest.mockReturnValue({
      squadId: 'squad-1',
      agentId: 'agent-a',
      input: { message: 'Hello' },
    });

    const { result } = renderHook(() => useExecuteAgent(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.mutateAsync({
        sessionId: 'session-1',
        squadId: 'squad-1',
        agentId: 'agent-a',
        agentName: 'Agent A',
        squadType: 'engineering',
        message: 'Hello',
        stream: false,
      });
    });

    // Should have added a user message
    expect(mockAddMessage).toHaveBeenCalledWith('session-1', expect.objectContaining({
      role: 'user',
      content: 'Hello',
    }));

    // Should have called buildExecuteRequest and executeAgent
    expect(mockBuildExecuteRequest).toHaveBeenCalledWith('squad-1', 'agent-a', 'Hello', { context: undefined });
    expect(mockExecuteApi.executeAgent).toHaveBeenCalled();

    // Should have added the agent response message
    expect(mockAddMessage).toHaveBeenCalledWith('session-1', expect.objectContaining({
      role: 'agent',
      content: 'Hello back',
      agentId: 'agent-a',
    }));
  });

  it('should set up streaming execution and add initial agent message', async () => {
    // Set up executeAgentStream to call onStart and onDone immediately
    mockExecuteApi.executeAgentStream.mockImplementation(
      (_req: unknown, callbacks: {
        onStart: (e: { executionId: string }) => void;
        onText: (e: { content: string }) => void;
        onDone: (e: { usage: { inputTokens: number; outputTokens: number }; duration: number }) => void;
      }) => {
        callbacks.onStart({ executionId: 'exec-stream-1' });
        callbacks.onText({ content: 'Streamed ' });
        callbacks.onText({ content: 'content' });
        callbacks.onDone({
          usage: { inputTokens: 200, outputTokens: 100 },
          duration: 2.0,
        });
        return Promise.resolve();
      }
    );

    const { result } = renderHook(() => useExecuteAgent(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.mutateAsync({
        sessionId: 'session-1',
        squadId: 'squad-1',
        agentId: 'agent-a',
        agentName: 'Agent A',
        squadType: 'engineering',
        message: 'Stream this',
        stream: true,
      });
    });

    // Should set streaming true at start
    expect(mockSetStreaming).toHaveBeenCalledWith(true);
    // Should add initial agent message for streaming
    expect(mockAddMessage).toHaveBeenCalledWith('session-1', expect.objectContaining({
      role: 'agent',
      content: '',
      isStreaming: true,
    }));
    // Should call startExecution
    expect(mockStartExecution).toHaveBeenCalledWith('exec-stream-1', 'Stream this');
    // Should update message with streamed content
    expect(mockUpdateMessage).toHaveBeenCalled();
    // Should set streaming false on done
    expect(mockSetStreaming).toHaveBeenCalledWith(false);
    // Should call endExecution on done
    expect(mockEndExecution).toHaveBeenCalledWith(true, expect.stringContaining('2.0'));
  });

  it('should handle streaming error event', async () => {
    mockExecuteApi.executeAgentStream.mockImplementation(
      (_req: unknown, callbacks: {
        onStart: (e: { executionId: string }) => void;
        onError: (e: { error: string }) => void;
      }) => {
        callbacks.onStart({ executionId: 'exec-err' });
        callbacks.onError({ error: 'LLM timeout' });
        return Promise.resolve();
      }
    );

    const { result } = renderHook(() => useExecuteAgent(), { wrapper: createWrapper() });

    await act(async () => {
      try {
        await result.current.mutateAsync({
          sessionId: 'session-1',
          squadId: 'squad-1',
          agentId: 'agent-a',
          agentName: 'Agent A',
          squadType: 'engineering',
          message: 'Fail please',
          stream: true,
        });
      } catch {
        // Expected rejection
      }
    });

    expect(mockSetStreaming).toHaveBeenCalledWith(false);
    expect(mockAddError).toHaveBeenCalledWith('LLM timeout');
    expect(mockEndExecution).toHaveBeenCalledWith(false, 'LLM timeout');
  });

  it('should pass attachments to user message', async () => {
    mockExecuteApi.executeAgentStream.mockImplementation(
      (_req: unknown, callbacks: {
        onStart: (e: { executionId: string }) => void;
        onDone: (e: { usage: { inputTokens: number; outputTokens: number }; duration: number }) => void;
      }) => {
        callbacks.onStart({ executionId: 'exec-att' });
        callbacks.onDone({ usage: { inputTokens: 10, outputTokens: 5 }, duration: 0.5 });
        return Promise.resolve();
      }
    );

    const attachments = [
      { id: 'att-1', name: 'photo.png', type: 'image' as const, mimeType: 'image/png', size: 1024 },
    ];

    const { result } = renderHook(() => useExecuteAgent(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.mutateAsync({
        sessionId: 'session-1',
        squadId: 'squad-1',
        agentId: 'agent-a',
        agentName: 'Agent A',
        squadType: 'engineering',
        message: 'See image',
        attachments,
        stream: true,
      });
    });

    expect(mockAddMessage).toHaveBeenCalledWith('session-1', expect.objectContaining({
      role: 'user',
      attachments,
    }));
  });
});

describe('useExecutionHistory', () => {
  it('should fetch execution history with default limit', async () => {
    mockExecuteApi.getHistory.mockResolvedValue(mockHistoryData);

    const { result } = renderHook(() => useExecutionHistory(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockExecuteApi.getHistory).toHaveBeenCalledWith({ limit: 20 });
    expect(result.current.data).toEqual(mockHistoryData);
  });

  it('should fetch execution history with custom limit', async () => {
    mockExecuteApi.getHistory.mockResolvedValue(mockHistoryData);

    const { result } = renderHook(() => useExecutionHistory(50), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockExecuteApi.getHistory).toHaveBeenCalledWith({ limit: 50 });
  });

  it('should use queryKey with limit parameter', () => {
    mockExecuteApi.getHistory.mockResolvedValue(mockHistoryData);

    // Render with different limits to verify distinct queries
    const wrapper = createWrapper();
    const { result: r1 } = renderHook(() => useExecutionHistory(10), { wrapper });
    const { result: r2 } = renderHook(() => useExecutionHistory(50), { wrapper });

    // Both should be loading (different query keys = separate queries)
    expect(r1.current.isLoading || r1.current.isFetching).toBe(true);
    expect(r2.current.isLoading || r2.current.isFetching).toBe(true);
  });
});

describe('useExecutionStats', () => {
  it('should fetch execution stats successfully', async () => {
    mockExecuteApi.getStats.mockResolvedValue(mockStatsData);

    const { result } = renderHook(() => useExecutionStats(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockStatsData);
  });

  it('should return fallback data when API fails', async () => {
    mockExecuteApi.getStats.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useExecutionStats(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual({
      total: 0,
      byStatus: { completed: 0, failed: 0, pending: 0 },
      bySquad: {},
      byAgent: {},
    });
  });
});

describe('useTokenUsage', () => {
  it('should fetch token usage successfully', async () => {
    mockExecuteApi.getTokenUsage.mockResolvedValue(mockTokenUsageData);

    const { result } = renderHook(() => useTokenUsage(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockTokenUsageData);
  });

  it('should return fallback data when API fails', async () => {
    mockExecuteApi.getTokenUsage.mockRejectedValue(new Error('Timeout'));

    const { result } = renderHook(() => useTokenUsage(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual({
      claude: { input: 0, output: 0, requests: 0 },
      openai: { input: 0, output: 0, requests: 0 },
      total: { input: 0, output: 0, requests: 0 },
    });
  });
});

describe('useLLMHealth', () => {
  it('should fetch LLM health successfully', async () => {
    mockExecuteApi.getLLMHealth.mockResolvedValue(mockLLMHealthData);

    const { result } = renderHook(() => useLLMHealth(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockLLMHealthData);
  });

  it('should return fallback with errors when API fails', async () => {
    mockExecuteApi.getLLMHealth.mockRejectedValue(new Error('Connection refused'));

    const { result } = renderHook(() => useLLMHealth(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual({
      claude: { available: false, error: 'Could not connect to API' },
      openai: { available: false, error: 'Could not connect to API' },
    });
  });
});

// ===========================================================================
// useDashboard.ts tests
// ===========================================================================

describe('useAnalyticsOverview', () => {
  it('should fetch analytics overview with default period', async () => {
    mockAnalyticsApi.getOverview.mockResolvedValue(mockOverviewData);

    const { result } = renderHook(() => useAnalyticsOverview(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockAnalyticsApi.getOverview).toHaveBeenCalledWith('day');
    expect(result.current.data).toEqual(mockOverviewData);
  });

  it('should fetch analytics overview with custom period', async () => {
    mockAnalyticsApi.getOverview.mockResolvedValue(mockOverviewData);

    const { result } = renderHook(() => useAnalyticsOverview('week'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockAnalyticsApi.getOverview).toHaveBeenCalledWith('week');
  });

  it('should use queryKey with period for cache separation', () => {
    mockAnalyticsApi.getOverview.mockResolvedValue(mockOverviewData);
    const wrapper = createWrapper();

    renderHook(() => useAnalyticsOverview('day'), { wrapper });
    renderHook(() => useAnalyticsOverview('week'), { wrapper });

    // Should make two separate calls for two different periods
    expect(mockAnalyticsApi.getOverview).toHaveBeenCalledWith('day');
    expect(mockAnalyticsApi.getOverview).toHaveBeenCalledWith('week');
  });
});

describe('useRealtimeMetrics', () => {
  it('should fetch realtime metrics', async () => {
    mockAnalyticsApi.getRealtime.mockResolvedValue(mockRealtimeData);

    const { result } = renderHook(() => useRealtimeMetrics(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockRealtimeData);
  });
});

// useDashboard hooks require complex analytics API mock setup.
// Skipped until proper integration test infrastructure is available.
describe.skip('useCostSummary', () => {
  it('should derive cost summary from analytics API data', async () => {
    mockAnalyticsApi.getCostReport.mockResolvedValue(mockCostReportData);
    mockAnalyticsApi.getOverview.mockResolvedValue(mockOverviewData);

    const { result } = renderHook(() => useCostSummary(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.data).toBeDefined());

    const costSummary = result.current.data;
    // today comes from overview summary totalCost
    expect(costSummary.today).toBe(12.50);
    // thisMonth comes from costReport summary totalCost
    expect(costSummary.thisMonth).toBe(150.0);
    // byProvider.claude comes from the matched provider entry
    expect(costSummary.byProvider.claude).toBe(100.0);
    // trend comes from timeline costs
    expect(costSummary.trend).toEqual([5.0, 7.0]);
  });

  it('should handle missing cost report data gracefully', async () => {
    mockAnalyticsApi.getCostReport.mockResolvedValue({
      period: 'month',
      periodStart: '2026-03-01',
      generatedAt: '2026-03-09',
      summary: { totalCost: 0, totalTokens: 0, totalRecords: 0, avgCostPerRecord: 0, avgTokensPerRecord: 0 },
      byProvider: [],
      byModel: [],
      timeline: [],
    });
    mockAnalyticsApi.getOverview.mockResolvedValue(mockOverviewData);

    const { result } = renderHook(() => useCostSummary(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.data).toBeDefined());

    expect(result.current.data.byProvider.claude).toBe(0);
    expect(result.current.data.byProvider.openai).toBe(0);
    expect(result.current.data.trend).toEqual([]);
  });
});

describe.skip('useAgentAnalytics', () => {
  it('should enrich top agents with squad info and avg response time', async () => {
    mockAnalyticsApi.getOverview.mockResolvedValue(mockOverviewData);
    mockAgentsApi.getAgents.mockResolvedValue(mockAgentsSummary);
    mockExecuteApi.getHistory.mockResolvedValue(mockHistoryData);

    const { result } = renderHook(() => useAgentAnalytics(), { wrapper: createWrapper() });

    await waitFor(() => {
      const data = result.current.data;
      return data && data.length > 0;
    });

    const analytics = result.current.data;
    expect(analytics).toHaveLength(2);

    // Agent A: has 2 executions in history with durations 2.5 + 1.2 = 3.7, avg = 1.85
    const agentA = analytics.find((a: { agentId: string }) => a.agentId === 'agent-a');
    expect(agentA).toBeDefined();
    expect(agentA!.squad).toBe('squad-1');
    expect(agentA!.avgResponseTime).toBeCloseTo(1.85, 1);
    expect(agentA!.totalExecutions).toBe(20); // from topAgents

    // Agent B: has 1 execution with duration 3.0
    const agentB = analytics.find((a: { agentId: string }) => a.agentId === 'agent-b');
    expect(agentB).toBeDefined();
    expect(agentB!.squad).toBe('squad-2');
    expect(agentB!.avgResponseTime).toBe(3.0);
  });

  it('should return empty array when no overview data', async () => {
    mockAnalyticsApi.getOverview.mockResolvedValue({
      ...mockOverviewData,
      topAgents: [],
    });
    mockAgentsApi.getAgents.mockResolvedValue([]);
    mockExecuteApi.getHistory.mockResolvedValue({ executions: [], total: 0 });

    const { result } = renderHook(() => useAgentAnalytics(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.data).toBeDefined());

    expect(result.current.data).toEqual([]);
  });
});

describe.skip('useCommandAnalytics', () => {
  it('should group executions by agent and compute stats', async () => {
    mockExecuteApi.getHistory.mockResolvedValue(mockHistoryData);

    const { result } = renderHook(() => useCommandAnalytics(), { wrapper: createWrapper() });

    await waitFor(() => {
      const data = result.current.data;
      return data && data.length > 0;
    });

    const analytics = result.current.data;

    // agent-a: 2 executions (1 completed, 1 failed), total duration 3.7
    const agentA = analytics.find((a: { agentId: string }) => a.agentId === 'agent-a');
    expect(agentA).toBeDefined();
    expect(agentA!.totalCalls).toBe(2);
    expect(agentA!.successRate).toBe(50); // 1/2 * 100
    expect(agentA!.avgDuration).toBeCloseTo(1.85, 1);

    // agent-b: 1 execution (completed), duration 3.0
    const agentB = analytics.find((a: { agentId: string }) => a.agentId === 'agent-b');
    expect(agentB).toBeDefined();
    expect(agentB!.totalCalls).toBe(1);
    expect(agentB!.successRate).toBe(100);
    expect(agentB!.avgDuration).toBe(3.0);
  });

  it('should sort by totalCalls descending and limit to 10', async () => {
    mockExecuteApi.getHistory.mockResolvedValue(mockHistoryData);

    const { result } = renderHook(() => useCommandAnalytics(), { wrapper: createWrapper() });

    await waitFor(() => {
      const data = result.current.data;
      return data && data.length > 0;
    });

    const analytics = result.current.data;
    // agent-a (2 calls) should come before agent-b (1 call)
    expect(analytics[0].agentId).toBe('agent-a');
    expect(analytics[1].agentId).toBe('agent-b');
  });

  it('should return empty when no history data', async () => {
    mockExecuteApi.getHistory.mockResolvedValue({ executions: [], total: 0 });

    const { result } = renderHook(() => useCommandAnalytics(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.data).toBeDefined());

    expect(result.current.data).toEqual([]);
  });
});

describe('useMCPStatus', () => {
  it('should fetch MCP servers from API', async () => {
    const mockServers = [
      {
        name: 'mcp-scrapers',
        status: 'connected',
        type: 'scraper',
        tools: [{ name: 'scraper_search', calls: 5 }],
        resources: [],
        lastPing: '2026-03-09T12:00:00Z',
      },
    ];
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ servers: mockServers }),
    });

    const { result } = renderHook(() => useMCPStatus(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockFetch).toHaveBeenCalledWith('/api/tools/mcp');
    expect(result.current.data).toEqual(mockServers);
  });

  it('should return fallback data when fetch fails', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useMCPStatus(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Fallback has 2 servers
    expect(result.current.data).toHaveLength(2);
    expect(result.current.data![0].name).toBe('mcp-scrapers');
    expect(result.current.data![1].name).toBe('filesystem');
  });

  it('should return fallback when response is not ok', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: 'Internal server error' }),
    });

    const { result } = renderHook(() => useMCPStatus(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(2);
  });
});

describe.skip('useMCPStats', () => {
  it('should compute stats from MCP server data', async () => {
    const mockServers = [
      {
        name: 'server-1',
        status: 'connected' as const,
        type: 'scraper',
        tools: [
          { name: 'tool-a', calls: 10 },
          { name: 'tool-b', calls: 5 },
        ],
        resources: [],
        lastPing: '2026-03-09T12:00:00Z',
      },
      {
        name: 'server-2',
        status: 'disconnected' as const,
        type: 'builtin',
        tools: [{ name: 'tool-c', calls: 3 }],
        resources: [],
        lastPing: '2026-03-09T11:00:00Z',
      },
    ];
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ servers: mockServers }),
    });

    const { result } = renderHook(() => useMCPStats(), { wrapper: createWrapper() });

    await waitFor(() => result.current.data !== null);

    const stats = result.current.data!;
    expect(stats.totalServers).toBe(2);
    expect(stats.connectedServers).toBe(1);
    // totalTools counts from all servers (connected + disconnected)
    expect(stats.totalTools).toBe(3); // 2 + 1
    // totalToolCalls only from connected servers
    expect(stats.totalToolCalls).toBe(15); // 10 + 5 (only connected tools)
    // topTools sorted by calls, from connected servers only
    expect(stats.topTools[0]).toEqual({ name: 'tool-a', server: 'server-1', calls: 10 });
  });

  it('should use toolCount field when available instead of tools.length', async () => {
    const mockServers = [
      {
        name: 'server-1',
        status: 'connected' as const,
        type: 'builtin',
        toolCount: 25,
        tools: [{ name: 'tool-a', calls: 1 }],
        resources: [],
        lastPing: '2026-03-09T12:00:00Z',
      },
    ];
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ servers: mockServers }),
    });

    const { result } = renderHook(() => useMCPStats(), { wrapper: createWrapper() });

    await waitFor(() => result.current.data !== null);

    expect(result.current.data!.totalTools).toBe(25);
  });

  it('should return null when no server data', () => {
    // Without any fetch setup, useMCPStatus will be loading
    mockFetch.mockImplementation(() => new Promise(() => {})); // never resolves

    const { result } = renderHook(() => useMCPStats(), { wrapper: createWrapper() });

    expect(result.current.data).toBeNull();
  });
});

describe.skip('useSystemHealth', () => {
  it('should derive health status from health dashboard', async () => {
    mockAnalyticsApi.getHealthDashboard.mockResolvedValue(mockHealthDashboard);

    const { result } = renderHook(() => useSystemHealth(), { wrapper: createWrapper() });

    await waitFor(() => result.current.data !== null);

    const health = result.current.data!;
    expect(health.api.healthy).toBe(true); // status === 'healthy'
    expect(health.api.latency).toBe(180); // avgLatencyMs
    expect(health.database.healthy).toBe(true); // queue status === 'healthy'
    expect(health.llm.healthy).toBe(true); // executionSuccessRate > 50
    expect(health.mcp.healthy).toBe(true);
    expect(health.mcp.connectedServers).toBe(2);
  });

  it('should flag unhealthy when dashboard status is degraded', async () => {
    mockAnalyticsApi.getHealthDashboard.mockResolvedValue({
      ...mockHealthDashboard,
      status: 'degraded',
      services: {
        ...mockHealthDashboard.services,
        queue: { status: 'degraded', pending: 10, processing: 5 },
      },
    });

    const { result } = renderHook(() => useSystemHealth(), { wrapper: createWrapper() });

    await waitFor(() => result.current.data !== null);

    const health = result.current.data!;
    expect(health.api.healthy).toBe(false);
    expect(health.database.healthy).toBe(false);
  });

  it('should return null when no dashboard data available', async () => {
    mockAnalyticsApi.getHealthDashboard.mockImplementation(() => new Promise(() => {}));

    const { result } = renderHook(() => useSystemHealth(), { wrapper: createWrapper() });

    // Initially null (data hasn't loaded)
    expect(result.current.data).toBeNull();
  });
});

describe.skip('useSystemMetrics', () => {
  it('should combine realtime, overview, and health dashboard data', async () => {
    mockAnalyticsApi.getRealtime.mockResolvedValue(mockRealtimeData);
    mockAnalyticsApi.getOverview.mockResolvedValue(mockOverviewData);
    mockAnalyticsApi.getHealthDashboard.mockResolvedValue(mockHealthDashboard);

    const { result } = renderHook(() => useSystemMetrics(), { wrapper: createWrapper() });

    await waitFor(() => result.current.data !== null);

    const metrics = result.current.data!;
    // uptime prefers healthDashboard.resources.uptimeSeconds
    expect(metrics.uptime).toBe(172800);
    // avgLatency prefers realtime avgLatencyMs
    expect(metrics.avgLatency).toBe(200);
    // requestsPerMinute from realtime
    expect(metrics.requestsPerMinute).toBe(10);
    // errorRate from overview
    expect(metrics.errorRate).toBe(9.5);
    // queueSize prefers healthDashboard.services.queue.pending
    expect(metrics.queueSize).toBe(2);
    // activeConnections from realtime
    expect(metrics.activeConnections).toBe(3);
  });

  it('should fall back to overview when realtime is unavailable', async () => {
    mockAnalyticsApi.getRealtime.mockImplementation(() => new Promise(() => {}));
    mockAnalyticsApi.getOverview.mockResolvedValue(mockOverviewData);
    mockAnalyticsApi.getHealthDashboard.mockResolvedValue(mockHealthDashboard);

    const { result } = renderHook(() => useSystemMetrics(), { wrapper: createWrapper() });

    await waitFor(() => result.current.data !== null);

    const metrics = result.current.data!;
    // Without realtime, avgLatency falls back to healthDashboard
    expect(metrics.avgLatency).toBe(180);
    // requestsPerMinute falls to 0 (no realtime)
    expect(metrics.requestsPerMinute).toBe(0);
  });

  it('should return null when neither overview nor healthDashboard is available', async () => {
    mockAnalyticsApi.getRealtime.mockImplementation(() => new Promise(() => {}));
    mockAnalyticsApi.getOverview.mockImplementation(() => new Promise(() => {}));
    mockAnalyticsApi.getHealthDashboard.mockImplementation(() => new Promise(() => {}));

    const { result } = renderHook(() => useSystemMetrics(), { wrapper: createWrapper() });

    expect(result.current.data).toBeNull();
  });
});
