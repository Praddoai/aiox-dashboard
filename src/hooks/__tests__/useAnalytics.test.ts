import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mock API dependencies
const mockGetAgentPerformance = vi.fn();
const mockGet = vi.fn();

vi.mock('../../services/api/analytics', () => ({
  analyticsApi: {
    getAgentPerformance: (...args: unknown[]) => mockGetAgentPerformance(...args),
  },
}));

vi.mock('../../services/api/client', () => ({
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
  },
}));

import { useAgentPerformance, useAgentActivity } from '../useAnalytics';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe('useAgentPerformance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch agent performance data', async () => {
    const mockData = {
      agents: [
        { id: 'agent-1', name: 'Dex', successRate: 0.95, totalExecutions: 100 },
        { id: 'agent-2', name: 'Aria', successRate: 0.88, totalExecutions: 50 },
      ],
    };
    mockGetAgentPerformance.mockResolvedValue(mockData);

    const { result } = renderHook(() => useAgentPerformance(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockData.agents);
  });

  it('should pass period and squadId params', async () => {
    mockGetAgentPerformance.mockResolvedValue({ agents: [] });

    renderHook(
      () => useAgentPerformance({ period: '7d' as never, squadId: 'core' }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(mockGetAgentPerformance).toHaveBeenCalledWith({ period: '7d', squadId: 'core' }));
  });

  it('should handle API errors', async () => {
    mockGetAgentPerformance.mockRejectedValue(new Error('API down'));

    const { result } = renderHook(() => useAgentPerformance(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('API down');
  });
});

describe('useAgentActivity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch and transform activity events', async () => {
    const mockEvents = {
      events: [
        { id: 'e1', agent: '@dex', description: 'Executed task', timestamp: '2026-01-01T00:00:00Z', type: 'execution', success: true, duration: 150 },
        { id: 'e2', agent: '@aria', description: 'Failed analysis', timestamp: '2026-01-01T01:00:00Z', type: 'error', success: false, duration: 50 },
      ],
    };
    mockGet.mockResolvedValue(mockEvents);

    const { result } = renderHook(() => useAgentActivity(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(2);
    expect(result.current.data![0]).toEqual({
      id: 'e1',
      agentId: 'dex',
      timestamp: '2026-01-01T00:00:00Z',
      action: 'Executed task',
      status: 'success',
      duration: 150,
    });
    expect(result.current.data![1].status).toBe('error');
    expect(result.current.data![1].agentId).toBe('aria');
  });

  it('should pass agentId as param when provided', async () => {
    mockGet.mockResolvedValue({ events: [] });

    renderHook(() => useAgentActivity('dex'), { wrapper: createWrapper() });

    await waitFor(() => expect(mockGet).toHaveBeenCalledWith(
      '/events/history',
      expect.objectContaining({ aios_agent: 'dex', limit: 20 }),
    ));
  });

  it('should not pass aios_agent when agentId is null', async () => {
    mockGet.mockResolvedValue({ events: [] });

    renderHook(() => useAgentActivity(null), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalled();
      const callArgs = mockGet.mock.calls[0];
      expect(callArgs[1]).not.toHaveProperty('aios_agent');
    });
  });

  it('should handle events without agent field', async () => {
    mockGet.mockResolvedValue({
      events: [{ id: 'e1', timestamp: '2026-01-01T00:00:00Z', type: 'system' }],
    });

    const { result } = renderHook(() => useAgentActivity(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data![0].agentId).toBe('system');
    expect(result.current.data![0].action).toBe('system');
    expect(result.current.data![0].duration).toBe(0);
  });

  it('should handle empty events array', async () => {
    mockGet.mockResolvedValue({ events: [] });

    const { result } = renderHook(() => useAgentActivity(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });

  it('should handle missing events key', async () => {
    mockGet.mockResolvedValue({});

    const { result } = renderHook(() => useAgentActivity(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });

  it('should generate fallback IDs for events without id', async () => {
    mockGet.mockResolvedValue({
      events: [
        { timestamp: '2026-01-01T00:00:00Z', type: 'test' },
        { timestamp: '2026-01-01T01:00:00Z', type: 'test2' },
      ],
    });

    const { result } = renderHook(() => useAgentActivity(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data![0].id).toBe('evt-0');
    expect(result.current.data![1].id).toBe('evt-1');
  });
});
