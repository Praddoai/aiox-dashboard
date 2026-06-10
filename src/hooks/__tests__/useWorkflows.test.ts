import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';
import type {
  WorkflowSummary,
  Workflow,
  WorkflowExecution,
  WorkflowStats,
  WorkflowSchema,
} from '../../services/api';

// Mock the entire API module
vi.mock('../../services/api', () => ({
  workflowsApi: {
    getSchema: vi.fn(),
    getWorkflows: vi.fn(),
    getWorkflow: vi.fn(),
    getWorkflowStats: vi.fn(),
    getExecutions: vi.fn(),
    getExecution: vi.fn(),
    createWorkflow: vi.fn(),
    updateWorkflow: vi.fn(),
    deleteWorkflow: vi.fn(),
    activateWorkflow: vi.fn(),
    pauseWorkflow: vi.fn(),
    executeWorkflow: vi.fn(),
    cancelExecution: vi.fn(),
    executeWorkflowStream: vi.fn(),
    orchestrateStream: vi.fn(),
  },
}));

import { workflowsApi } from '../../services/api';
import {
  useWorkflowSchema,
  useWorkflows,
  useWorkflow,
  useWorkflowStats,
  useWorkflowExecutions,
  useWorkflowExecution,
  useCreateWorkflow,
  useUpdateWorkflow,
  useDeleteWorkflow,
  useActivateWorkflow,
  usePauseWorkflow,
  useExecuteWorkflow,
  useCancelExecution,
  useExecuteWorkflowStream,
  useSmartOrchestration,
} from '../useWorkflows';

const mockApi = workflowsApi as {
  [K in keyof typeof workflowsApi]: ReturnType<typeof vi.fn>;
};

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

const mockSchema: WorkflowSchema = {
  workflowStatus: { draft: 'Draft', active: 'Active', paused: 'Paused', archived: 'Archived' },
  executionStatus: { pending: 'Pending', running: 'Running', completed: 'Completed', failed: 'Failed' },
  stepTypes: { task: 'Task', condition: 'Condition', parallel: 'Parallel' },
  triggerTypes: { manual: 'Manual', schedule: 'Schedule', event: 'Event' },
};

const mockWorkflowSummary: WorkflowSummary = {
  id: 'wf-1',
  name: 'Test Workflow',
  description: 'A test workflow',
  version: '1.0.0',
  status: 'active',
  trigger: { type: 'manual' },
  stepCount: 3,
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-02T00:00:00Z',
};

const mockWorkflowSummary2: WorkflowSummary = {
  id: 'wf-2',
  name: 'Deploy Pipeline',
  status: 'draft',
  stepCount: 5,
  createdAt: '2025-01-03T00:00:00Z',
};

const mockWorkflow: Workflow = {
  ...mockWorkflowSummary,
  steps: [
    { id: 'step-1', type: 'task', name: 'Analyze', handler: 'analyze' },
    { id: 'step-2', type: 'task', name: 'Build', handler: 'build', dependsOn: ['step-1'] },
    { id: 'step-3', type: 'task', name: 'Deploy', handler: 'deploy', dependsOn: ['step-2'] },
  ],
  timeout: 60000,
  metadata: { owner: 'team-a' },
};

const mockExecution: WorkflowExecution = {
  id: 'exec-1',
  workflowId: 'wf-1',
  workflowName: 'Test Workflow',
  status: 'running',
  currentStepId: 'step-2',
  triggeredBy: 'user-1',
  input: { key: 'value' },
  startedAt: '2025-01-10T10:00:00Z',
};

const mockCompletedExecution: WorkflowExecution = {
  id: 'exec-2',
  workflowId: 'wf-1',
  workflowName: 'Test Workflow',
  status: 'completed',
  output: { result: 'success' },
  startedAt: '2025-01-10T09:00:00Z',
  completedAt: '2025-01-10T09:05:00Z',
};

const mockStats: WorkflowStats = {
  totalExecutions: 42,
  successfulExecutions: 38,
  failedExecutions: 4,
  averageDuration: 12500,
  lastExecutedAt: '2025-01-10T10:00:00Z',
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.restoreAllMocks();
});

// ---- useWorkflowSchema ---------------------------------------------------

describe('useWorkflowSchema', () => {
  it('returns schema data on success', async () => {
    mockApi.getSchema.mockResolvedValue(mockSchema);
    const { result } = renderHook(() => useWorkflowSchema(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockSchema);
    expect(result.current.data?.stepTypes).toHaveProperty('task');
  });

  it('handles error from getSchema', async () => {
    mockApi.getSchema.mockRejectedValue(new Error('Schema fetch failed'));
    const { result } = renderHook(() => useWorkflowSchema(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeDefined();
  });
});

// ---- useWorkflows ---------------------------------------------------------

describe('useWorkflows', () => {
  it('returns a list of workflows', async () => {
    mockApi.getWorkflows.mockResolvedValue({
      total: 2,
      workflows: [mockWorkflowSummary, mockWorkflowSummary2],
    });
    const { result } = renderHook(() => useWorkflows(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(2);
    expect(result.current.data?.[0].id).toBe('wf-1');
    expect(result.current.data?.[1].id).toBe('wf-2');
  });

  it('passes filter params to API', async () => {
    mockApi.getWorkflows.mockResolvedValue({ total: 1, workflows: [mockWorkflowSummary] });
    renderHook(() => useWorkflows({ status: 'active', name: 'Test' }), { wrapper: createWrapper() });

    await waitFor(() => expect(mockApi.getWorkflows).toHaveBeenCalledWith({ status: 'active', name: 'Test' }));
  });

  it('returns empty array when no workflows match', async () => {
    mockApi.getWorkflows.mockResolvedValue({ total: 0, workflows: [] });
    const { result } = renderHook(() => useWorkflows({ status: 'archived' }), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });

  it('handles API error', async () => {
    mockApi.getWorkflows.mockRejectedValue(new Error('Network error'));
    const { result } = renderHook(() => useWorkflows(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

// ---- useWorkflow ----------------------------------------------------------

describe('useWorkflow', () => {
  it('returns a single workflow by ID', async () => {
    mockApi.getWorkflow.mockResolvedValue(mockWorkflow);
    const { result } = renderHook(() => useWorkflow('wf-1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.id).toBe('wf-1');
    expect(result.current.data?.steps).toHaveLength(3);
  });

  it('does not fetch when id is null', () => {
    mockApi.getWorkflow.mockResolvedValue(mockWorkflow);
    const { result } = renderHook(() => useWorkflow(null), { wrapper: createWrapper() });

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockApi.getWorkflow).not.toHaveBeenCalled();
  });

  it('handles error for single workflow', async () => {
    mockApi.getWorkflow.mockRejectedValue(new Error('Not found'));
    const { result } = renderHook(() => useWorkflow('wf-999'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

// ---- useWorkflowStats -----------------------------------------------------

describe('useWorkflowStats', () => {
  it('returns stats for a workflow', async () => {
    mockApi.getWorkflowStats.mockResolvedValue(mockStats);
    const { result } = renderHook(() => useWorkflowStats('wf-1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.totalExecutions).toBe(42);
    expect(result.current.data?.successfulExecutions).toBe(38);
    expect(result.current.data?.averageDuration).toBe(12500);
  });

  it('does not fetch when id is null', () => {
    mockApi.getWorkflowStats.mockResolvedValue(mockStats);
    const { result } = renderHook(() => useWorkflowStats(null), { wrapper: createWrapper() });

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockApi.getWorkflowStats).not.toHaveBeenCalled();
  });
});

// ---- useWorkflowExecutions ------------------------------------------------

describe('useWorkflowExecutions', () => {
  it('returns a list of executions', async () => {
    mockApi.getExecutions.mockResolvedValue({
      total: 2,
      executions: [mockExecution, mockCompletedExecution],
    });
    const { result } = renderHook(() => useWorkflowExecutions(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(2);
    expect(result.current.data?.[0].status).toBe('running');
    expect(result.current.data?.[1].status).toBe('completed');
  });

  it('passes filter params to the API', async () => {
    mockApi.getExecutions.mockResolvedValue({ total: 0, executions: [] });
    renderHook(
      () => useWorkflowExecutions({ workflowId: 'wf-1', status: 'failed', limit: 10 }),
      { wrapper: createWrapper() },
    );

    await waitFor(() =>
      expect(mockApi.getExecutions).toHaveBeenCalledWith({ workflowId: 'wf-1', status: 'failed', limit: 10 }),
    );
  });
});

// ---- useWorkflowExecution -------------------------------------------------

describe('useWorkflowExecution', () => {
  it('returns a single execution by ID', async () => {
    mockApi.getExecution.mockResolvedValue(mockExecution);
    const { result } = renderHook(() => useWorkflowExecution('exec-1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.id).toBe('exec-1');
    expect(result.current.data?.workflowId).toBe('wf-1');
  });

  it('does not fetch when id is null', () => {
    mockApi.getExecution.mockResolvedValue(mockExecution);
    const { result } = renderHook(() => useWorkflowExecution(null), { wrapper: createWrapper() });

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockApi.getExecution).not.toHaveBeenCalled();
  });

  it('handles error for single execution', async () => {
    mockApi.getExecution.mockRejectedValue(new Error('Execution not found'));
    const { result } = renderHook(() => useWorkflowExecution('exec-missing'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

// ---- useCreateWorkflow ----------------------------------------------------

describe('useCreateWorkflow', () => {
  it('calls createWorkflow API and returns created workflow', async () => {
    mockApi.createWorkflow.mockResolvedValue(mockWorkflow);
    const { result } = renderHook(() => useCreateWorkflow(), { wrapper: createWrapper() });

    const input = {
      name: 'Test Workflow',
      description: 'A test workflow',
      steps: mockWorkflow.steps,
      stepCount: 3,
      trigger: { type: 'manual' as const },
    };

    act(() => {
      result.current.mutate(input);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApi.createWorkflow).toHaveBeenCalledWith(input);
    expect(result.current.data?.id).toBe('wf-1');
  });

  it('handles creation error', async () => {
    mockApi.createWorkflow.mockRejectedValue(new Error('Validation failed'));
    const { result } = renderHook(() => useCreateWorkflow(), { wrapper: createWrapper() });

    act(() => {
      result.current.mutate({
        name: '',
        steps: [],
        stepCount: 0,
      });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('Validation failed');
  });
});

// ---- useUpdateWorkflow ----------------------------------------------------

describe('useUpdateWorkflow', () => {
  it('calls updateWorkflow API with id and updates', async () => {
    const updatedWorkflow = { ...mockWorkflow, name: 'Updated Workflow' };
    mockApi.updateWorkflow.mockResolvedValue(updatedWorkflow);
    const { result } = renderHook(() => useUpdateWorkflow(), { wrapper: createWrapper() });

    act(() => {
      result.current.mutate({ id: 'wf-1', updates: { name: 'Updated Workflow' } });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApi.updateWorkflow).toHaveBeenCalledWith('wf-1', { name: 'Updated Workflow' });
    expect(result.current.data?.name).toBe('Updated Workflow');
  });

  it('handles update error', async () => {
    mockApi.updateWorkflow.mockRejectedValue(new Error('Update failed'));
    const { result } = renderHook(() => useUpdateWorkflow(), { wrapper: createWrapper() });

    act(() => {
      result.current.mutate({ id: 'wf-1', updates: { name: '' } });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

// ---- useDeleteWorkflow ----------------------------------------------------

describe('useDeleteWorkflow', () => {
  it('calls deleteWorkflow API with id', async () => {
    mockApi.deleteWorkflow.mockResolvedValue({ success: true, message: 'Deleted' });
    const { result } = renderHook(() => useDeleteWorkflow(), { wrapper: createWrapper() });

    act(() => {
      result.current.mutate('wf-1');
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApi.deleteWorkflow).toHaveBeenCalledWith('wf-1');
  });

  it('handles delete error', async () => {
    mockApi.deleteWorkflow.mockRejectedValue(new Error('Cannot delete active workflow'));
    const { result } = renderHook(() => useDeleteWorkflow(), { wrapper: createWrapper() });

    act(() => {
      result.current.mutate('wf-1');
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('Cannot delete active workflow');
  });
});

// ---- useActivateWorkflow --------------------------------------------------

describe('useActivateWorkflow', () => {
  it('calls activateWorkflow API with id', async () => {
    const activatedWf = { ...mockWorkflow, status: 'active' as const };
    mockApi.activateWorkflow.mockResolvedValue({ success: true, message: 'Activated', workflow: activatedWf });
    const { result } = renderHook(() => useActivateWorkflow(), { wrapper: createWrapper() });

    act(() => {
      result.current.mutate('wf-1');
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApi.activateWorkflow).toHaveBeenCalledWith('wf-1');
  });
});

// ---- usePauseWorkflow -----------------------------------------------------

describe('usePauseWorkflow', () => {
  it('calls pauseWorkflow API with id', async () => {
    const pausedWf = { ...mockWorkflow, status: 'paused' as const };
    mockApi.pauseWorkflow.mockResolvedValue({ success: true, message: 'Paused', workflow: pausedWf });
    const { result } = renderHook(() => usePauseWorkflow(), { wrapper: createWrapper() });

    act(() => {
      result.current.mutate('wf-1');
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApi.pauseWorkflow).toHaveBeenCalledWith('wf-1');
  });
});

// ---- useExecuteWorkflow ---------------------------------------------------

describe('useExecuteWorkflow', () => {
  it('calls executeWorkflow with id, input, and options', async () => {
    mockApi.executeWorkflow.mockResolvedValue({
      message: 'Workflow started',
      execution: { id: 'exec-3', workflowId: 'wf-1', status: 'pending', correlationId: 'corr-1' },
    });
    const { result } = renderHook(() => useExecuteWorkflow(), { wrapper: createWrapper() });

    act(() => {
      result.current.mutate({
        id: 'wf-1',
        input: { key: 'value' },
        options: { force: true, metadata: { source: 'test' } },
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApi.executeWorkflow).toHaveBeenCalledWith(
      'wf-1',
      { key: 'value' },
      { force: true, metadata: { source: 'test' } },
    );
  });

  it('executes without input or options', async () => {
    mockApi.executeWorkflow.mockResolvedValue({
      message: 'Workflow started',
      execution: { id: 'exec-4', workflowId: 'wf-1', status: 'pending' },
    });
    const { result } = renderHook(() => useExecuteWorkflow(), { wrapper: createWrapper() });

    act(() => {
      result.current.mutate({ id: 'wf-1' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApi.executeWorkflow).toHaveBeenCalledWith('wf-1', undefined, undefined);
  });

  it('handles execution error', async () => {
    mockApi.executeWorkflow.mockRejectedValue(new Error('Workflow is paused'));
    const { result } = renderHook(() => useExecuteWorkflow(), { wrapper: createWrapper() });

    act(() => {
      result.current.mutate({ id: 'wf-1' });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('Workflow is paused');
  });
});

// ---- useCancelExecution ---------------------------------------------------

describe('useCancelExecution', () => {
  it('calls cancelExecution API with id', async () => {
    mockApi.cancelExecution.mockResolvedValue({
      success: true,
      message: 'Cancelled',
      execution: { ...mockExecution, status: 'cancelled' },
    });
    const { result } = renderHook(() => useCancelExecution(), { wrapper: createWrapper() });

    act(() => {
      result.current.mutate('exec-1');
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApi.cancelExecution).toHaveBeenCalledWith('exec-1');
  });

  it('handles cancel error', async () => {
    mockApi.cancelExecution.mockRejectedValue(new Error('Execution already completed'));
    const { result } = renderHook(() => useCancelExecution(), { wrapper: createWrapper() });

    act(() => {
      result.current.mutate('exec-2');
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

// ---- useExecuteWorkflowStream ---------------------------------------------

describe('useExecuteWorkflowStream', () => {
  it('starts with null state and not executing', () => {
    const { result } = renderHook(() => useExecuteWorkflowStream(), { wrapper: createWrapper() });

    expect(result.current.state).toBeNull();
    expect(result.current.isExecuting).toBe(false);
    expect(typeof result.current.execute).toBe('function');
    expect(typeof result.current.reset).toBe('function');
  });

  it('sets connecting state when execute is called', async () => {
    // Make the stream hang so we can observe intermediate state
    mockApi.executeWorkflowStream.mockImplementation(() => new Promise(() => {}));
    const { result } = renderHook(() => useExecuteWorkflowStream(), { wrapper: createWrapper() });

    act(() => {
      result.current.execute('wf-1', { key: 'value' });
    });

    await waitFor(() => {
      expect(result.current.isExecuting).toBe(true);
      expect(result.current.state?.status).toBe('connecting');
      expect(result.current.state?.workflowId).toBe('wf-1');
      expect(result.current.state?.input).toEqual({ key: 'value' });
    });
  });

  it('processes stream callbacks and updates state', async () => {
    mockApi.executeWorkflowStream.mockImplementation(async (_id: string, _input: unknown, callbacks: Record<string, (...args: unknown[]) => void>) => {
      callbacks.onExecutionCreated({
        executionId: 'exec-stream-1',
        workflowName: 'Test Workflow',
        steps: [
          { id: 'step-1', type: 'task', status: 'pending' },
          { id: 'step-2', type: 'task', status: 'pending' },
        ],
      });
      callbacks.onExecutionStarted({ executionId: 'exec-stream-1', status: 'running', startedAt: '2025-01-10T10:00:00Z' });
      callbacks.onStepStarted({ executionId: 'exec-stream-1', stepId: 'step-1', startedAt: '2025-01-10T10:00:01Z' });
      callbacks.onStepCompleted({ executionId: 'exec-stream-1', stepId: 'step-1', completedAt: '2025-01-10T10:00:05Z', output: { data: 'step1-result' } });
      callbacks.onExecutionCompleted({ executionId: 'exec-stream-1', completedAt: '2025-01-10T10:00:10Z', output: { final: 'result' } });
    });

    const { result } = renderHook(() => useExecuteWorkflowStream(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.execute('wf-1');
    });

    await waitFor(() => {
      expect(result.current.state?.status).toBe('completed');
      expect(result.current.state?.executionId).toBe('exec-stream-1');
      expect(result.current.state?.output).toEqual({ final: 'result' });
      expect(result.current.isExecuting).toBe(false);
    });
  });

  it('handles step failure in stream', async () => {
    mockApi.executeWorkflowStream.mockImplementation(async (_id: string, _input: unknown, callbacks: Record<string, (...args: unknown[]) => void>) => {
      callbacks.onExecutionCreated({
        executionId: 'exec-fail',
        workflowName: 'Fail Workflow',
        steps: [{ id: 'step-1', type: 'task', status: 'pending' }],
      });
      callbacks.onStepFailed({ executionId: 'exec-fail', stepId: 'step-1', error: 'Step timed out' });
      callbacks.onExecutionFailed({ executionId: 'exec-fail', error: 'Workflow failed' });
    });

    const { result } = renderHook(() => useExecuteWorkflowStream(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.execute('wf-1');
    });

    await waitFor(() => {
      expect(result.current.state?.status).toBe('failed');
      expect(result.current.state?.error).toBe('Workflow failed');
      expect(result.current.state?.steps[0].status).toBe('failed');
      expect(result.current.state?.steps[0].error).toBe('Step timed out');
      expect(result.current.isExecuting).toBe(false);
    });
  });

  it('handles exception thrown by executeWorkflowStream', async () => {
    mockApi.executeWorkflowStream.mockRejectedValue(new Error('Connection refused'));
    const { result } = renderHook(() => useExecuteWorkflowStream(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.execute('wf-1');
    });

    await waitFor(() => {
      expect(result.current.state?.status).toBe('failed');
      expect(result.current.state?.error).toBe('Connection refused');
      expect(result.current.isExecuting).toBe(false);
    });
  });

  it('handles non-Error exception thrown by executeWorkflowStream', async () => {
    mockApi.executeWorkflowStream.mockRejectedValue('some string error');
    const { result } = renderHook(() => useExecuteWorkflowStream(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.execute('wf-1');
    });

    await waitFor(() => {
      expect(result.current.state?.status).toBe('failed');
      expect(result.current.state?.error).toBe('Failed to start execution');
      expect(result.current.isExecuting).toBe(false);
    });
  });

  it('resets state when reset is called', async () => {
    mockApi.executeWorkflowStream.mockImplementation(async (_id: string, _input: unknown, callbacks: Record<string, (...args: unknown[]) => void>) => {
      callbacks.onExecutionCreated({
        executionId: 'exec-reset',
        workflowName: 'Reset Test',
        steps: [],
      });
      callbacks.onExecutionCompleted({ executionId: 'exec-reset', completedAt: '2025-01-10T10:00:00Z', output: {} });
    });

    const { result } = renderHook(() => useExecuteWorkflowStream(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.execute('wf-1');
    });

    await waitFor(() => expect(result.current.state?.status).toBe('completed'));

    act(() => {
      result.current.reset();
    });

    expect(result.current.state).toBeNull();
    expect(result.current.isExecuting).toBe(false);
  });
});

// ---- useSmartOrchestration ------------------------------------------------

describe('useSmartOrchestration', () => {
  it('starts with idle state', () => {
    const { result } = renderHook(() => useSmartOrchestration(), { wrapper: createWrapper() });

    expect(result.current.state.phase).toBe('idle');
    expect(result.current.state.demand).toBe('');
    expect(result.current.state.workflowId).toBeNull();
    expect(result.current.state.planSteps).toEqual([]);
    expect(result.current.isOrchestrating).toBe(false);
  });

  it('sets analyzing state when orchestrate is called', async () => {
    mockApi.orchestrateStream.mockImplementation(() => new Promise(() => {}));
    const { result } = renderHook(() => useSmartOrchestration(), { wrapper: createWrapper() });

    act(() => {
      result.current.orchestrate('Build a dashboard');
    });

    await waitFor(() => {
      expect(result.current.isOrchestrating).toBe(true);
      expect(result.current.state.phase).toBe('analyzing');
      expect(result.current.state.demand).toBe('Build a dashboard');
    });
  });

  it('processes orchestration stream through all phases', async () => {
    mockApi.orchestrateStream.mockImplementation(async (_demand: string, callbacks: Record<string, (...args: unknown[]) => void>) => {
      callbacks.onOrchestrationStarted({ phase: 'planning', message: 'Analyzing demand...' });
      callbacks.onOrchestrationCompleted({
        phase: 'ready',
        workflowId: 'wf-dynamic-1',
        workflowName: 'Dynamic Workflow',
        analysis: 'This requires frontend + backend work',
        expectedOutputs: ['Dashboard component', 'API endpoint'],
        steps: [
          { id: 's1', name: 'Design', squadId: 'design', agentId: 'designer', role: 'ui-design', description: 'Design the dashboard' },
          { id: 's2', name: 'Develop', squadId: 'dev', agentId: 'dev', role: 'developer', description: 'Implement the dashboard' },
        ],
      });
      callbacks.onExecutionCreated({
        executionId: 'orch-exec-1',
        workflowName: 'Dynamic Workflow',
        input: { demand: 'Build a dashboard' },
        steps: [
          { id: 's1', type: 'task', status: 'pending', name: 'Design' },
          { id: 's2', type: 'task', status: 'pending', name: 'Develop' },
        ],
      });
      callbacks.onExecutionStarted({ executionId: 'orch-exec-1', status: 'running', startedAt: '2025-01-10T10:00:00Z' });
      callbacks.onStepStarted({ executionId: 'orch-exec-1', stepId: 's1', startedAt: '2025-01-10T10:00:01Z' });
      callbacks.onStepCompleted({ executionId: 'orch-exec-1', stepId: 's1', completedAt: '2025-01-10T10:00:10Z', output: { design: 'done' } });
      callbacks.onStepStarted({ executionId: 'orch-exec-1', stepId: 's2', startedAt: '2025-01-10T10:00:11Z' });
      callbacks.onStepCompleted({ executionId: 'orch-exec-1', stepId: 's2', completedAt: '2025-01-10T10:00:20Z', output: { code: 'done' } });
      callbacks.onExecutionCompleted({ executionId: 'orch-exec-1', completedAt: '2025-01-10T10:00:20Z', output: { dashboard: 'built' } });
    });

    const { result } = renderHook(() => useSmartOrchestration(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.orchestrate('Build a dashboard');
    });

    await waitFor(() => {
      expect(result.current.state.phase).toBe('completed');
      expect(result.current.state.workflowId).toBe('wf-dynamic-1');
      expect(result.current.state.workflowName).toBe('Dynamic Workflow');
      expect(result.current.state.analysis).toBe('This requires frontend + backend work');
      expect(result.current.state.expectedOutputs).toEqual(['Dashboard component', 'API endpoint']);
      expect(result.current.state.planSteps).toHaveLength(2);
      expect(result.current.state.executionState?.status).toBe('completed');
      expect(result.current.state.executionState?.steps[0].status).toBe('completed');
      expect(result.current.state.executionState?.steps[1].status).toBe('completed');
      expect(result.current.isOrchestrating).toBe(false);
    });
  });

  it('handles execution failure during orchestration', async () => {
    mockApi.orchestrateStream.mockImplementation(async (_demand: string, callbacks: Record<string, (...args: unknown[]) => void>) => {
      callbacks.onOrchestrationStarted({ phase: 'planning', message: 'Analyzing...' });
      callbacks.onOrchestrationCompleted({
        phase: 'ready',
        workflowId: 'wf-fail',
        workflowName: 'Failing Workflow',
        analysis: 'Will fail',
        expectedOutputs: [],
        steps: [],
      });
      callbacks.onExecutionCreated({
        executionId: 'orch-fail-1',
        workflowName: 'Failing Workflow',
        input: {},
        steps: [{ id: 's1', type: 'task', status: 'pending' }],
      });
      callbacks.onStepFailed({ executionId: 'orch-fail-1', stepId: 's1', error: 'Agent unavailable' });
      callbacks.onExecutionFailed({ executionId: 'orch-fail-1', error: 'Execution failed' });
    });

    const { result } = renderHook(() => useSmartOrchestration(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.orchestrate('Do something impossible');
    });

    await waitFor(() => {
      expect(result.current.state.phase).toBe('failed');
      expect(result.current.state.error).toBe('Execution failed');
      expect(result.current.state.executionState?.status).toBe('failed');
      expect(result.current.isOrchestrating).toBe(false);
    });
  });

  it('handles exception thrown by orchestrateStream', async () => {
    mockApi.orchestrateStream.mockRejectedValue(new Error('Server unreachable'));
    const { result } = renderHook(() => useSmartOrchestration(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.orchestrate('anything');
    });

    await waitFor(() => {
      expect(result.current.state.phase).toBe('failed');
      expect(result.current.state.error).toBe('Server unreachable');
      expect(result.current.isOrchestrating).toBe(false);
    });
  });

  it('handles non-Error exception thrown by orchestrateStream', async () => {
    mockApi.orchestrateStream.mockRejectedValue(42);
    const { result } = renderHook(() => useSmartOrchestration(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.orchestrate('anything');
    });

    await waitFor(() => {
      expect(result.current.state.phase).toBe('failed');
      expect(result.current.state.error).toBe('Failed to start orchestration');
    });
  });

  it('resets to idle state', async () => {
    mockApi.orchestrateStream.mockImplementation(async (_demand: string, callbacks: Record<string, (...args: unknown[]) => void>) => {
      callbacks.onOrchestrationStarted({ phase: 'planning', message: 'Analyzing...' });
      callbacks.onOrchestrationCompleted({
        phase: 'ready',
        workflowId: 'wf-1',
        workflowName: 'WF',
        analysis: 'done',
        expectedOutputs: [],
        steps: [],
      });
      callbacks.onExecutionCreated({ executionId: 'e1', workflowName: 'WF', input: {}, steps: [] });
      callbacks.onExecutionCompleted({ executionId: 'e1', completedAt: '2025-01-10T10:00:00Z', output: {} });
    });

    const { result } = renderHook(() => useSmartOrchestration(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.orchestrate('Build something');
    });

    await waitFor(() => expect(result.current.state.phase).toBe('completed'));

    act(() => {
      result.current.reset();
    });

    expect(result.current.state.phase).toBe('idle');
    expect(result.current.state.demand).toBe('');
    expect(result.current.state.workflowId).toBeNull();
    expect(result.current.state.executionState).toBeNull();
    expect(result.current.isOrchestrating).toBe(false);
  });
});
