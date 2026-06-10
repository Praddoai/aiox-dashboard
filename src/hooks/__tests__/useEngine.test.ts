import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';

// Mock getEngineUrl to return a URL so engineAvailable() returns true
vi.mock('../../lib/connection', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return { ...actual, getEngineUrl: () => 'http://localhost:4100' };
});

import {
  useEngineHealth,
  useEnginePool,
  useEngineJobs,
  useCancelJob,
  useExecuteOnEngine,
  useStartWorkflow,
  useCreateCron,
  useDeleteCron,
  useGetJob,
  useToggleCron,
  useAuditLog,
  useRecallMemory,
  useStoreMemory,
  useTriggerOrchestrator,
  useJobLogs,
  useResizePool,
  useActiveWorkflows,
} from '../useEngine';

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

const mockHealth = {
  status: 'ok',
  version: '0.4.0',
  uptime_ms: 120000,
  pid: 1234,
  ws_clients: 2,
};

const mockPool = {
  total: 5,
  occupied: 2,
  idle: 3,
  queue_depth: 0,
  slots: [
    { id: 0, jobId: 'j1', pid: 100, squadId: 'dev', agentId: 'dev', startedAt: '2025-01-01T00:00:00Z', status: 'running' },
    { id: 1, jobId: null, pid: null, squadId: null, agentId: null, startedAt: null, status: 'idle' },
  ],
};

const mockJobs = {
  jobs: [
    { id: 'j1', squad_id: 'dev', agent_id: 'dev', status: 'running', priority: 2, trigger_type: 'api', created_at: '2025-01-01T00:00:00Z', attempt: 1 },
    { id: 'j2', squad_id: 'dev', agent_id: 'qa', status: 'done', priority: 1, trigger_type: 'cron', created_at: '2025-01-01T00:01:00Z', attempt: 1 },
  ],
};

function mockFetchSuccess(data: unknown) {
  return vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    text: () => Promise.resolve(JSON.stringify(data)),
    json: () => Promise.resolve(data),
  });
}

function mockFetchError(status: number, message: string) {
  return vi.fn().mockResolvedValue({
    ok: false,
    status,
    json: () => Promise.resolve({ error: message }),
  });
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('useEngineHealth', () => {
  it('retorna health data com sucesso', async () => {
    global.fetch = mockFetchSuccess(mockHealth);
    const { result } = renderHook(() => useEngineHealth(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockHealth);
    expect(result.current.data?.status).toBe('ok');
    expect(result.current.data?.version).toBe('0.4.0');
  });

  it('lida com engine offline', async () => {
    global.fetch = mockFetchError(502, 'Engine unavailable');
    const { result } = renderHook(() => useEngineHealth(), { wrapper: createWrapper() });

    // retry: 1 no hook causa ~1s de backoff antes do isError
    await waitFor(() => expect(result.current.isError).toBe(true), { timeout: 5000 });
  });
});

describe('useEnginePool', () => {
  it('retorna pool status', async () => {
    global.fetch = mockFetchSuccess(mockPool);
    const { result } = renderHook(() => useEnginePool(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.total).toBe(5);
    expect(result.current.data?.occupied).toBe(2);
    expect(result.current.data?.slots).toHaveLength(2);
  });
});

describe('useEngineJobs', () => {
  it('retorna lista de jobs', async () => {
    global.fetch = mockFetchSuccess(mockJobs);
    const { result } = renderHook(() => useEngineJobs({ limit: 10 }), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.jobs).toHaveLength(2);
    expect(result.current.data?.jobs[0].status).toBe('running');
  });

  it('passa filtro de status na query', async () => {
    global.fetch = mockFetchSuccess({ jobs: [] });
    renderHook(() => useEngineJobs({ status: 'failed', limit: 5 }), { wrapper: createWrapper() });

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const url = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(url).toContain('status=failed');
    expect(url).toContain('limit=5');
  });
});

describe('useCancelJob', () => {
  it('cancela job com DELETE', async () => {
    global.fetch = mockFetchSuccess({ status: 'cancelled' });
    const { result } = renderHook(() => useCancelJob(), { wrapper: createWrapper() });

    result.current.mutate('job-123');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const call = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(call[0]).toContain('/jobs/job-123');
    expect(call[1]?.method).toBe('DELETE');
  });
});

describe('useExecuteOnEngine', () => {
  it('submete job com POST', async () => {
    global.fetch = mockFetchSuccess({ executionId: 'exec-1', status: 'pending' });
    const { result } = renderHook(() => useExecuteOnEngine(), { wrapper: createWrapper() });

    result.current.mutate({
      squadId: 'development',
      agentId: 'dev',
      message: 'fix the bug',
      priority: 1,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const call = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(call[0]).toContain('/execute/agent');
    const body = JSON.parse(call[1]?.body as string);
    expect(body.squadId).toBe('development');
    expect(body.agentId).toBe('dev');
    expect(body.input.message).toBe('fix the bug');
  });
});

describe('useStartWorkflow', () => {
  it('inicia workflow com POST', async () => {
    global.fetch = mockFetchSuccess({ workflowId: 'wf-1', definitionId: 'sdc', status: 'running' });
    const { result } = renderHook(() => useStartWorkflow(), { wrapper: createWrapper() });

    result.current.mutate({
      workflowId: 'story-development-cycle',
      input: { message: 'create login page' },
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const body = JSON.parse((global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1]?.body as string);
    expect(body.workflowId).toBe('story-development-cycle');
  });
});

describe('useCreateCron', () => {
  it('cria cron com POST', async () => {
    global.fetch = mockFetchSuccess({ cron: { id: 'c1', name: 'daily', schedule: '0 9 * * *', squad_id: 'dev', agent_id: 'dev', enabled: true } });
    const { result } = renderHook(() => useCreateCron(), { wrapper: createWrapper() });

    result.current.mutate({
      name: 'daily',
      schedule: '0 9 * * *',
      squad_id: 'dev',
      agent_id: 'dev',
      message: 'run daily check',
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const call = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(call[0]).toContain('/cron');
    expect(call[1]?.method).toBe('POST');
  });
});

describe('useDeleteCron', () => {
  it('deleta cron com DELETE', async () => {
    global.fetch = mockFetchSuccess({ status: 'deleted' });
    const { result } = renderHook(() => useDeleteCron(), { wrapper: createWrapper() });

    result.current.mutate('cron-42');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const call = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(call[0]).toContain('/cron/cron-42');
    expect(call[1]?.method).toBe('DELETE');
  });
});

describe('useGetJob', () => {
  it('busca job por ID', async () => {
    const mockJob = { job: { id: 'j1', squad_id: 'dev', agent_id: 'dev', status: 'running', priority: 2, trigger_type: 'api', created_at: '2025-01-01T00:00:00Z', attempt: 1 } };
    global.fetch = mockFetchSuccess(mockJob);
    const { result } = renderHook(() => useGetJob('j1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.job.id).toBe('j1');
    expect(result.current.data?.job.status).toBe('running');
  });

  it('não busca quando id é null', () => {
    global.fetch = mockFetchSuccess({});
    renderHook(() => useGetJob(null), { wrapper: createWrapper() });

    expect(global.fetch).not.toHaveBeenCalled();
  });
});

describe('useToggleCron', () => {
  it('toggle cron com PATCH', async () => {
    global.fetch = mockFetchSuccess({ cron: { id: 'c1', enabled: false } });
    const { result } = renderHook(() => useToggleCron(), { wrapper: createWrapper() });

    result.current.mutate({ id: 'c1', enabled: false });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const call = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(call[0]).toContain('/cron/c1/toggle');
    expect(call[1]?.method).toBe('PATCH');
    const body = JSON.parse(call[1]?.body as string);
    expect(body.enabled).toBe(false);
  });
});

describe('useTriggerOrchestrator', () => {
  it('envia trigger com POST', async () => {
    global.fetch = mockFetchSuccess({ job_id: 'j99', routed_to: { squad: 'dev', agent: 'dev' } });
    const { result } = renderHook(() => useTriggerOrchestrator(), { wrapper: createWrapper() });

    result.current.mutate({ message: 'deploy to staging', priority: 0 });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const call = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(call[0]).toContain('/webhook/orchestrator');
    expect(call[1]?.method).toBe('POST');
  });
});

describe('useAuditLog', () => {
  it('busca audit log com limite', async () => {
    const mockAudit = { entries: [{ id: 'a1', action: 'execute', agent: 'dev' }] };
    global.fetch = mockFetchSuccess(mockAudit);
    const { result } = renderHook(() => useAuditLog(20), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.entries).toHaveLength(1);
    const url = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(url).toContain('limit=20');
  });
});

describe('useRecallMemory', () => {
  it('busca memórias por scope e query', async () => {
    const mockMemories = { memories: [{ id: 'm1', content: 'test memory', score: 0.95 }] };
    global.fetch = mockFetchSuccess(mockMemories);
    const { result } = renderHook(() => useRecallMemory('global', 'test', 5), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.memories).toHaveLength(1);
    expect(result.current.data?.memories[0].score).toBe(0.95);
  });

  it('não busca sem query', () => {
    global.fetch = mockFetchSuccess({});
    renderHook(() => useRecallMemory('global', '', 10), { wrapper: createWrapper() });

    expect(global.fetch).not.toHaveBeenCalled();
  });
});

describe('useStoreMemory', () => {
  it('armazena memória com POST', async () => {
    global.fetch = mockFetchSuccess({ id: 'mem-1' });
    const { result } = renderHook(() => useStoreMemory(), { wrapper: createWrapper() });

    result.current.mutate({ scope: 'development', content: 'important fact' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const call = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(call[0]).toContain('/memory/development');
    expect(call[1]?.method).toBe('POST');
    const body = JSON.parse(call[1]?.body as string);
    expect(body.content).toBe('important fact');
  });
});

describe('useJobLogs', () => {
  it('busca logs de um job', async () => {
    const mockLogs = { logs: ['line1', 'line2'], hasMore: false };
    global.fetch = mockFetchSuccess(mockLogs);
    const { result } = renderHook(() => useJobLogs('j1', 100), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.logs).toHaveLength(2);
    expect(result.current.data?.hasMore).toBe(false);
    const url = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(url).toContain('/jobs/j1/logs');
    expect(url).toContain('tail=100');
  });

  it('não busca sem jobId', () => {
    global.fetch = mockFetchSuccess({});
    renderHook(() => useJobLogs(null), { wrapper: createWrapper() });

    expect(global.fetch).not.toHaveBeenCalled();
  });
});

describe('useResizePool', () => {
  it('redimensiona pool com POST', async () => {
    global.fetch = mockFetchSuccess(mockPool);
    const { result } = renderHook(() => useResizePool(), { wrapper: createWrapper() });

    result.current.mutate(8);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const call = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(call[0]).toContain('/pool/resize');
    expect(call[1]?.method).toBe('POST');
    const body = JSON.parse(call[1]?.body as string);
    expect(body.size).toBe(8);
  });
});

describe('useActiveWorkflows', () => {
  it('busca workflows ativos', async () => {
    const mockActive = {
      workflows: [
        { id: 'wf-1', workflowId: 'wf-wf-1', definitionId: 'sdc', status: 'running', currentPhase: 'phase-2', iterationCount: 0, createdAt: '2025-01-01T10:00:00Z', updatedAt: '2025-01-01T10:00:00Z' },
      ],
    };
    global.fetch = mockFetchSuccess(mockActive);
    const { result } = renderHook(() => useActiveWorkflows(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.workflows).toHaveLength(1);
    expect(result.current.data?.workflows[0].currentPhase).toBe('phase-2');
  });
});
