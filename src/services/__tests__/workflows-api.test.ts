import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../api/client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

import { apiClient } from '../api/client';
import { workflowsApi } from '../api/workflows';

const mockGet = apiClient.get as ReturnType<typeof vi.fn>;
const mockPost = apiClient.post as ReturnType<typeof vi.fn>;
const mockPatch = apiClient.patch as ReturnType<typeof vi.fn>;
const mockDelete = apiClient.delete as ReturnType<typeof vi.fn>;

describe('workflowsApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- getSchema ---

  describe('getSchema', () => {
    it('should call GET /workflows/schema', async () => {
      const schema = {
        workflowStatus: { draft: 'Draft', active: 'Active' },
        executionStatus: { pending: 'Pending' },
        stepTypes: { task: 'Task' },
        triggerTypes: { manual: 'Manual' },
      };
      mockGet.mockResolvedValue(schema);

      const result = await workflowsApi.getSchema();

      expect(mockGet).toHaveBeenCalledWith('/workflows/schema');
      expect(result).toEqual(schema);
    });
  });

  // --- getWorkflows ---

  describe('getWorkflows', () => {
    it('should call GET /workflows without params', async () => {
      const response = { total: 0, workflows: [] };
      mockGet.mockResolvedValue(response);

      const result = await workflowsApi.getWorkflows();

      expect(mockGet).toHaveBeenCalledWith('/workflows', undefined);
      expect(result).toEqual(response);
    });

    it('should call GET /workflows with filter params', async () => {
      const params = { status: 'active', name: 'deploy' };
      const response = { total: 1, workflows: [{ id: 'wf-1', name: 'deploy' }] };
      mockGet.mockResolvedValue(response);

      const result = await workflowsApi.getWorkflows(params);

      expect(mockGet).toHaveBeenCalledWith('/workflows', params);
      expect(result).toEqual(response);
    });
  });

  // --- getWorkflow ---

  describe('getWorkflow', () => {
    it('should call GET /workflows/:id', async () => {
      const workflow = { id: 'wf-1', name: 'Deploy Pipeline', steps: [], status: 'active', stepCount: 3, createdAt: '2025-01-01T00:00:00Z' };
      mockGet.mockResolvedValue(workflow);

      const result = await workflowsApi.getWorkflow('wf-1');

      expect(mockGet).toHaveBeenCalledWith('/workflows/wf-1');
      expect(result).toEqual(workflow);
    });
  });

  // --- createWorkflow ---

  describe('createWorkflow', () => {
    it('should call POST /workflows with workflow data', async () => {
      const input = { name: 'New Workflow', description: 'A test workflow', steps: [], stepCount: 0 };
      const response = { id: 'wf-new', ...input, status: 'draft', createdAt: '2025-01-01T00:00:00Z' };
      mockPost.mockResolvedValue(response);

      const result = await workflowsApi.createWorkflow(input as Parameters<typeof workflowsApi.createWorkflow>[0]);

      expect(mockPost).toHaveBeenCalledWith('/workflows', input);
      expect(result).toEqual(response);
    });
  });

  // --- updateWorkflow ---

  describe('updateWorkflow', () => {
    it('should call PATCH /workflows/:id with updates', async () => {
      const updates = { name: 'Updated Name', description: 'Updated description' };
      const response = { id: 'wf-1', name: 'Updated Name', description: 'Updated description', steps: [], status: 'draft', stepCount: 0, createdAt: '2025-01-01T00:00:00Z' };
      mockPatch.mockResolvedValue(response);

      const result = await workflowsApi.updateWorkflow('wf-1', updates);

      expect(mockPatch).toHaveBeenCalledWith('/workflows/wf-1', updates);
      expect(result).toEqual(response);
    });
  });

  // --- deleteWorkflow ---

  describe('deleteWorkflow', () => {
    it('should call DELETE /workflows/:id', async () => {
      const response = { success: true, message: 'Workflow deleted' };
      mockDelete.mockResolvedValue(response);

      const result = await workflowsApi.deleteWorkflow('wf-1');

      expect(mockDelete).toHaveBeenCalledWith('/workflows/wf-1');
      expect(result).toEqual(response);
    });
  });

  // --- activateWorkflow ---

  describe('activateWorkflow', () => {
    it('should call POST /workflows/:id/activate', async () => {
      const response = { success: true, message: 'Workflow activated', workflow: { id: 'wf-1', status: 'active' } };
      mockPost.mockResolvedValue(response);

      const result = await workflowsApi.activateWorkflow('wf-1');

      expect(mockPost).toHaveBeenCalledWith('/workflows/wf-1/activate');
      expect(result).toEqual(response);
    });
  });

  // --- pauseWorkflow ---

  describe('pauseWorkflow', () => {
    it('should call POST /workflows/:id/pause', async () => {
      const response = { success: true, message: 'Workflow paused', workflow: { id: 'wf-1', status: 'paused' } };
      mockPost.mockResolvedValue(response);

      const result = await workflowsApi.pauseWorkflow('wf-1');

      expect(mockPost).toHaveBeenCalledWith('/workflows/wf-1/pause');
      expect(result).toEqual(response);
    });
  });

  // --- getWorkflowStats ---

  describe('getWorkflowStats', () => {
    it('should call GET /workflows/:id/stats', async () => {
      const stats = { totalExecutions: 42, successfulExecutions: 38, failedExecutions: 4, averageDuration: 12500, lastExecutedAt: '2025-06-01T12:00:00Z' };
      mockGet.mockResolvedValue(stats);

      const result = await workflowsApi.getWorkflowStats('wf-1');

      expect(mockGet).toHaveBeenCalledWith('/workflows/wf-1/stats');
      expect(result).toEqual(stats);
    });
  });

  // --- executeWorkflow ---

  describe('executeWorkflow', () => {
    it('should call POST /workflows/:id/execute with input only', async () => {
      const input = { key: 'value' };
      const response = { message: 'Execution started', execution: { id: 'exec-1', workflowId: 'wf-1', status: 'pending', correlationId: 'corr-1' } };
      mockPost.mockResolvedValue(response);

      const result = await workflowsApi.executeWorkflow('wf-1', input);

      expect(mockPost).toHaveBeenCalledWith('/workflows/wf-1/execute', { input });
      expect(result).toEqual(response);
    });

    it('should call POST /workflows/:id/execute with input and options', async () => {
      const input = { data: 'test' };
      const options = { force: true, metadata: { source: 'manual' } };
      const response = { message: 'Execution started', execution: { id: 'exec-2', workflowId: 'wf-1', status: 'pending', correlationId: 'corr-2' } };
      mockPost.mockResolvedValue(response);

      const result = await workflowsApi.executeWorkflow('wf-1', input, options);

      expect(mockPost).toHaveBeenCalledWith('/workflows/wf-1/execute', { input, force: true, metadata: { source: 'manual' } });
      expect(result).toEqual(response);
    });

    it('should call POST /workflows/:id/execute without input or options', async () => {
      const response = { message: 'Execution started', execution: { id: 'exec-3', workflowId: 'wf-1', status: 'pending', correlationId: 'corr-3' } };
      mockPost.mockResolvedValue(response);

      const result = await workflowsApi.executeWorkflow('wf-1');

      expect(mockPost).toHaveBeenCalledWith('/workflows/wf-1/execute', { input: undefined });
      expect(result).toEqual(response);
    });
  });

  // --- getExecutions ---

  describe('getExecutions', () => {
    it('should call GET /workflows/executions without params', async () => {
      const response = { total: 0, executions: [] };
      mockGet.mockResolvedValue(response);

      const result = await workflowsApi.getExecutions();

      expect(mockGet).toHaveBeenCalledWith('/workflows/executions', undefined);
      expect(result).toEqual(response);
    });

    it('should call GET /workflows/executions with params', async () => {
      const params = { workflowId: 'wf-1', status: 'running', limit: 10 };
      const response = { total: 1, executions: [{ id: 'exec-1', workflowId: 'wf-1', status: 'running', startedAt: '2025-01-01T00:00:00Z' }] };
      mockGet.mockResolvedValue(response);

      const result = await workflowsApi.getExecutions(params);

      expect(mockGet).toHaveBeenCalledWith('/workflows/executions', params);
      expect(result).toEqual(response);
    });
  });

  // --- getExecution ---

  describe('getExecution', () => {
    it('should call GET /workflows/executions/:id', async () => {
      const execution = { id: 'exec-1', workflowId: 'wf-1', status: 'completed', startedAt: '2025-01-01T00:00:00Z', completedAt: '2025-01-01T00:01:00Z' };
      mockGet.mockResolvedValue(execution);

      const result = await workflowsApi.getExecution('exec-1');

      expect(mockGet).toHaveBeenCalledWith('/workflows/executions/exec-1');
      expect(result).toEqual(execution);
    });
  });

  // --- cancelExecution ---

  describe('cancelExecution', () => {
    it('should call POST /workflows/executions/:id/cancel', async () => {
      const response = { success: true, message: 'Execution cancelled', execution: { id: 'exec-1', workflowId: 'wf-1', status: 'cancelled', startedAt: '2025-01-01T00:00:00Z' } };
      mockPost.mockResolvedValue(response);

      const result = await workflowsApi.cancelExecution('exec-1');

      expect(mockPost).toHaveBeenCalledWith('/workflows/executions/exec-1/cancel');
      expect(result).toEqual(response);
    });
  });

  // --- getWorkflowExecutions ---

  describe('getWorkflowExecutions', () => {
    it('should call GET /workflows/:id/executions without params', async () => {
      const response = { total: 0, executions: [] };
      mockGet.mockResolvedValue(response);

      const result = await workflowsApi.getWorkflowExecutions('wf-1');

      expect(mockGet).toHaveBeenCalledWith('/workflows/wf-1/executions', undefined);
      expect(result).toEqual(response);
    });

    it('should call GET /workflows/:id/executions with params', async () => {
      const params = { status: 'failed', limit: 5 };
      const response = { total: 2, executions: [{ id: 'exec-1', workflowId: 'wf-1', status: 'failed', startedAt: '2025-01-01T00:00:00Z' }] };
      mockGet.mockResolvedValue(response);

      const result = await workflowsApi.getWorkflowExecutions('wf-1', params);

      expect(mockGet).toHaveBeenCalledWith('/workflows/wf-1/executions', params);
      expect(result).toEqual(response);
    });
  });
});
