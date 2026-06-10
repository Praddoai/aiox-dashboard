import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock apiClient before importing execute module
vi.mock('../api/client', () => {
  const mockClient = {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
    stream: vi.fn(),
  };
  return { apiClient: mockClient, StreamCallbacks: {} };
});

import { executeApi, buildExecuteRequest } from '../api/execute';
import { apiClient } from '../api/client';

const mockClient = apiClient as unknown as {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  stream: ReturnType<typeof vi.fn>;
};

describe('executeApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---------- executeAgent ----------

  describe('executeAgent()', () => {
    it('should POST to /execute/agent with the request payload', async () => {
      const request = { squadId: 'sq-1', agentId: 'ag-1', input: { message: 'hello' }, options: {} };
      const expected = { executionId: 'exec-1', status: 'running' };
      mockClient.post.mockResolvedValue(expected);

      const result = await executeApi.executeAgent(request as never);

      expect(mockClient.post).toHaveBeenCalledWith('/execute/agent', request);
      expect(result).toEqual(expected);
    });
  });

  // ---------- executeAgentStream ----------

  describe('executeAgentStream()', () => {
    it('should call stream on /execute/agent/stream with callbacks and signal', async () => {
      const request = { squadId: 'sq-1', agentId: 'ag-1', input: { message: 'hello' } };
      const callbacks = { onText: vi.fn(), onDone: vi.fn() };
      const controller = new AbortController();
      mockClient.stream.mockResolvedValue(undefined);

      await executeApi.executeAgentStream(request as never, callbacks, controller.signal);

      expect(mockClient.stream).toHaveBeenCalledWith(
        '/execute/agent/stream',
        request,
        callbacks,
        controller.signal,
      );
    });
  });

  // ---------- orchestrate ----------

  describe('orchestrate()', () => {
    it('should POST to /execute/orchestrate', async () => {
      const request = { workflowId: 'wf-1', input: { message: 'go' } };
      const expected = { orchestrationId: 'orch-1' };
      mockClient.post.mockResolvedValue(expected);

      const result = await executeApi.orchestrate(request as never);

      expect(mockClient.post).toHaveBeenCalledWith('/execute/orchestrate', request);
      expect(result).toEqual(expected);
    });
  });

  // ---------- getExecutionStatus ----------

  describe('getExecutionStatus()', () => {
    it('should GET /execute/status/:executionId', async () => {
      const expected = { execution: { id: 'exec-1', status: 'completed' } };
      mockClient.get.mockResolvedValue(expected);

      const result = await executeApi.getExecutionStatus('exec-1');

      expect(mockClient.get).toHaveBeenCalledWith('/execute/status/exec-1');
      expect(result).toEqual(expected);
    });
  });

  // ---------- cancelExecution ----------

  describe('cancelExecution()', () => {
    it('should DELETE /execute/status/:executionId', async () => {
      const expected = { executionId: 'exec-1', status: 'cancelled' };
      mockClient.delete.mockResolvedValue(expected);

      const result = await executeApi.cancelExecution('exec-1');

      expect(mockClient.delete).toHaveBeenCalledWith('/execute/status/exec-1');
      expect(result).toEqual(expected);
    });
  });

  // ---------- getHistory ----------

  describe('getHistory()', () => {
    it('should GET /execute/history without params', async () => {
      mockClient.get.mockResolvedValue({ executions: [], total: 0 });

      await executeApi.getHistory();

      expect(mockClient.get).toHaveBeenCalledWith('/execute/history', undefined);
    });

    it('should GET /execute/history with filter params', async () => {
      const params = { limit: 20, status: 'completed', agentId: 'ag-1' };
      mockClient.get.mockResolvedValue({ executions: [], total: 0 });

      await executeApi.getHistory(params);

      expect(mockClient.get).toHaveBeenCalledWith('/execute/history', params);
    });
  });

  // ---------- getStats ----------

  describe('getStats()', () => {
    it('should GET /execute/stats with optional params', async () => {
      const params = { since: '2025-01-01' };
      mockClient.get.mockResolvedValue({ total: 100 });

      await executeApi.getStats(params);

      expect(mockClient.get).toHaveBeenCalledWith('/execute/stats', params);
    });
  });

  // ---------- getLLMHealth ----------

  describe('getLLMHealth()', () => {
    it('should GET /execute/llm/health', async () => {
      const expected = { healthy: true, providers: [] };
      mockClient.get.mockResolvedValue(expected);

      const result = await executeApi.getLLMHealth();

      expect(mockClient.get).toHaveBeenCalledWith('/execute/llm/health');
      expect(result).toEqual(expected);
    });
  });

  // ---------- getTokenUsage ----------

  describe('getTokenUsage()', () => {
    it('should GET /execute/llm/usage', async () => {
      mockClient.get.mockResolvedValue({ totalTokens: 5000 });

      await executeApi.getTokenUsage();

      expect(mockClient.get).toHaveBeenCalledWith('/execute/llm/usage');
    });
  });

  // ---------- getLLMModels ----------

  describe('getLLMModels()', () => {
    it('should GET /execute/llm/models', async () => {
      mockClient.get.mockResolvedValue({ models: ['gpt-4'] });

      await executeApi.getLLMModels();

      expect(mockClient.get).toHaveBeenCalledWith('/execute/llm/models');
    });
  });

  // ---------- getDBHealth ----------

  describe('getDBHealth()', () => {
    it('should GET /execute/db/health', async () => {
      const expected = { connected: true };
      mockClient.get.mockResolvedValue(expected);

      const result = await executeApi.getDBHealth();

      expect(mockClient.get).toHaveBeenCalledWith('/execute/db/health');
      expect(result).toEqual(expected);
    });
  });

  // ---------- trackExecution ----------

  describe('trackExecution()', () => {
    it('should POST to /execute/track with tracking data', async () => {
      const data = { squadId: 'sq-1', agentId: 'ag-1', duration: 1200, success: true, source: 'cli' };
      const expected = { tracked: true, executionId: 'exec-t1', message: 'ok' };
      mockClient.post.mockResolvedValue(expected);

      const result = await executeApi.trackExecution(data);

      expect(mockClient.post).toHaveBeenCalledWith('/execute/track', data);
      expect(result).toEqual(expected);
    });
  });

  // ---------- trackExecutionBatch ----------

  describe('trackExecutionBatch()', () => {
    it('should POST to /execute/track/batch wrapping executions array', async () => {
      const executions = [
        { squadId: 'sq-1', agentId: 'ag-1', success: true },
        { squadId: 'sq-2', agentId: 'ag-2', success: false },
      ];
      const expected = { tracked: 2, executionIds: ['e1', 'e2'] };
      mockClient.post.mockResolvedValue(expected);

      const result = await executeApi.trackExecutionBatch(executions);

      expect(mockClient.post).toHaveBeenCalledWith('/execute/track/batch', { executions });
      expect(result).toEqual(expected);
    });
  });
});

// ---------- buildExecuteRequest ----------

describe('buildExecuteRequest()', () => {
  it('should build a minimal request with required fields', () => {
    const result = buildExecuteRequest('sq-1', 'ag-1', 'hello');

    expect(result).toEqual({
      squadId: 'sq-1',
      agentId: 'ag-1',
      input: {
        message: 'hello',
        context: undefined,
        command: undefined,
      },
      options: {
        async: undefined,
        timeout: undefined,
      },
    });
  });

  it('should include context and command when provided', () => {
    const result = buildExecuteRequest('sq-1', 'ag-1', 'do stuff', {
      context: { key: 'value' },
      command: '*task deploy',
    });

    expect(result.input.context).toEqual({ key: 'value' });
    expect(result.input.command).toBe('*task deploy');
  });

  it('should include async and timeout options when provided', () => {
    const result = buildExecuteRequest('sq-1', 'ag-1', 'go', {
      async: true,
      timeout: 60000,
    });

    expect(result.options).toEqual({
      async: true,
      timeout: 60000,
    });
  });
});
