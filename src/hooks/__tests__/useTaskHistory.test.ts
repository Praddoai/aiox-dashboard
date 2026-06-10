import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';
import { useTaskHistory, useTaskDetail } from '../useTaskHistory';

// Mock the tasks API
vi.mock('../../services/api/tasks', () => ({
  tasksApi: {
    listTasks: vi.fn(),
    getTask: vi.fn(),
  },
}));

import { tasksApi } from '../../services/api/tasks';

const mockListTasks = tasksApi.listTasks as ReturnType<typeof vi.fn>;
const mockGetTask = tasksApi.getTask as ReturnType<typeof vi.fn>;

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
    },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

const mockTaskListResponse = {
  tasks: [
    {
      id: 'task-1',
      demand: 'Build landing page',
      status: 'completed' as const,
      squads: [],
      workflow: null,
      outputs: [],
      createdAt: '2025-01-01T00:00:00Z',
    },
    {
      id: 'task-2',
      demand: 'Fix login bug',
      status: 'executing' as const,
      squads: [],
      workflow: null,
      outputs: [],
      createdAt: '2025-01-02T00:00:00Z',
    },
  ],
  total: 2,
  limit: 20,
  offset: 0,
  dbPersistence: true,
};

const mockTask = {
  id: 'task-1',
  demand: 'Build landing page',
  status: 'completed' as const,
  squads: [
    { squadId: 'design', chief: 'Brad', agentCount: 1, agents: [{ id: 'brad', name: 'Brad' }] },
  ],
  workflow: { id: 'wf-1', name: 'Design Workflow', stepCount: 3 },
  outputs: [],
  createdAt: '2025-01-01T00:00:00Z',
  completedAt: '2025-01-01T01:00:00Z',
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useTaskHistory', () => {
  it('fetches task list with default params', async () => {
    mockListTasks.mockResolvedValueOnce(mockTaskListResponse);
    const { result } = renderHook(() => useTaskHistory(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockListTasks).toHaveBeenCalledWith({ limit: 20, offset: 0, status: undefined });
    expect(result.current.data!.tasks).toHaveLength(2);
    expect(result.current.data!.total).toBe(2);
  });

  it('passes custom params to API', async () => {
    mockListTasks.mockResolvedValueOnce({ ...mockTaskListResponse, tasks: [] });
    const { result } = renderHook(
      () => useTaskHistory({ status: 'completed', limit: 10, offset: 5 }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockListTasks).toHaveBeenCalledWith({ limit: 10, offset: 5, status: 'completed' });
  });

  it('handles API error', async () => {
    mockListTasks.mockRejectedValueOnce(new Error('Network error'));
    const { result } = renderHook(() => useTaskHistory(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(Error);
  });
});

describe('useTaskDetail', () => {
  it('fetches task detail when taskId is provided', async () => {
    mockGetTask.mockResolvedValueOnce(mockTask);
    const { result } = renderHook(() => useTaskDetail('task-1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGetTask).toHaveBeenCalledWith('task-1');
    expect(result.current.data!.id).toBe('task-1');
    expect(result.current.data!.demand).toBe('Build landing page');
  });

  it('does not fetch when taskId is null', () => {
    const { result } = renderHook(() => useTaskDetail(null), { wrapper: createWrapper() });
    expect(result.current.fetchStatus).toBe('idle');
    expect(mockGetTask).not.toHaveBeenCalled();
  });

  it('handles detail fetch error', async () => {
    mockGetTask.mockRejectedValueOnce(new Error('Not found'));
    const { result } = renderHook(() => useTaskDetail('bad-id'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
