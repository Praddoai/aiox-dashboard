import { apiClient } from './client';
import { engineApi } from './engine';
import { getEngineUrl } from '../../lib/connection';

export interface WorkflowSummary {
  id: string;
  name: string;
  description?: string;
  version?: string;
  status: 'draft' | 'active' | 'paused' | 'archived';
  trigger?: {
    type: 'manual' | 'schedule' | 'event' | 'webhook';
    schedule?: string;
    event?: string;
  };
  stepCount: number;
  createdAt: string;
  updatedAt?: string;
}

export interface WorkflowStep {
  id: string;
  type: 'task' | 'condition' | 'parallel' | 'loop' | 'wait' | 'subworkflow' | 'webhook' | 'transform';
  name?: string;
  handler?: string;
  input?: Record<string, unknown>;
  condition?: Record<string, unknown>;
  config?: {
    squadId?: string;
    agentId?: string;
    message?: string;
    [key: string]: unknown;
  };
  dependsOn?: string[];
  retryPolicy?: {
    maxRetries?: number;
    backoff?: string;
  };
}

export interface Workflow extends WorkflowSummary {
  steps: WorkflowStep[];
  timeout?: number;
  retryPolicy?: {
    maxRetries?: number;
    backoff?: string;
  };
  metadata?: Record<string, unknown>;
  createdBy?: string;
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  workflowName?: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'waiting';
  currentStepId?: string;
  triggeredBy?: string;
  correlationId?: string;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  startedAt: string;
  completedAt?: string;
  error?: string;
  stepResults?: Record<string, unknown>;
}

export interface WorkflowStats {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageDuration: number;
  lastExecutedAt?: string;
}

export interface WorkflowSchema {
  workflowStatus: Record<string, string>;
  executionStatus: Record<string, string>;
  stepTypes: Record<string, string>;
  triggerTypes: Record<string, string>;
}

/** Check if engine is available (URL configured) */
function hasEngine(): boolean {
  return !!getEngineUrl();
}

export const workflowsApi = {
  // Get workflow schema and types
  // GET /api/workflows/schema
  getSchema: async (): Promise<WorkflowSchema> => {
    return apiClient.get<WorkflowSchema>('/workflows/schema');
  },

  // List all workflows — engine-first for definitions, fallback to apiClient
  getWorkflows: async (params?: {
    status?: string;
    name?: string;
  }): Promise<{ total: number; workflows: WorkflowSummary[] }> => {
    if (hasEngine() && !params?.status) {
      try {
        const data = await engineApi.getRegistryWorkflows();
        let workflows: WorkflowSummary[] = data.workflows.map((w) => ({
          id: w.id,
          name: w.name,
          description: w.description,
          status: 'active' as const,
          stepCount: w.phases,
          createdAt: new Date().toISOString(),
        }));
        if (params?.name) {
          const q = params.name.toLowerCase();
          workflows = workflows.filter((w) => w.name.toLowerCase().includes(q));
        }
        return { total: workflows.length, workflows };
      } catch {
        // Engine unavailable — fall through
      }
    }
    return apiClient.get('/workflows', params);
  },

  // Get workflow by ID
  // GET /api/workflows/:id
  getWorkflow: async (id: string): Promise<Workflow> => {
    return apiClient.get<Workflow>(`/workflows/${id}`);
  },

  // Create workflow
  // POST /api/workflows
  createWorkflow: async (workflow: Omit<Workflow, 'id' | 'createdAt' | 'updatedAt' | 'status'>): Promise<Workflow> => {
    return apiClient.post<Workflow>('/workflows', workflow);
  },

  // Update workflow
  // PATCH /api/workflows/:id
  updateWorkflow: async (id: string, updates: Partial<Workflow>): Promise<Workflow> => {
    return apiClient.patch<Workflow>(`/workflows/${id}`, updates);
  },

  // Delete workflow
  // DELETE /api/workflows/:id
  deleteWorkflow: async (id: string): Promise<{ success: boolean; message: string }> => {
    return apiClient.delete(`/workflows/${id}`);
  },

  // Activate workflow
  // POST /api/workflows/:id/activate
  activateWorkflow: async (id: string): Promise<{ success: boolean; message: string; workflow: Workflow }> => {
    return apiClient.post(`/workflows/${id}/activate`);
  },

  // Pause workflow
  // POST /api/workflows/:id/pause
  pauseWorkflow: async (id: string): Promise<{ success: boolean; message: string; workflow: Workflow }> => {
    return apiClient.post(`/workflows/${id}/pause`);
  },

  // Get workflow statistics
  // GET /api/workflows/:id/stats
  getWorkflowStats: async (id: string): Promise<WorkflowStats> => {
    return apiClient.get<WorkflowStats>(`/workflows/${id}/stats`);
  },

  // Execute workflow
  // POST /api/workflows/:id/execute
  executeWorkflow: async (
    id: string,
    input?: Record<string, unknown>,
    options?: { force?: boolean; metadata?: Record<string, unknown> }
  ): Promise<{ message: string; execution: Pick<WorkflowExecution, 'id' | 'workflowId' | 'status' | 'correlationId'> }> => {
    return apiClient.post(`/workflows/${id}/execute`, { input, ...options });
  },

  // Execute workflow with real-time streaming
  // POST /api/workflows/:id/execute/stream
  executeWorkflowStream: (
    id: string,
    input?: Record<string, unknown>,
    callbacks?: {
      onConnected?: (data: { workflowId: string }) => void;
      onExecutionCreated?: (data: { executionId: string; workflowName: string; input?: unknown; steps: Array<{ id: string; type: string; status: string; name?: string; config?: unknown }> }) => void;
      onExecutionStarted?: (data: { executionId: string; status: string; startedAt: string }) => void;
      onStepStarted?: (data: { executionId: string; stepId: string; stepType: string; status: string; startedAt: string }) => void;
      onStepCompleted?: (data: { executionId: string; stepId: string; status: string; output: unknown; completedAt: string }) => void;
      onStepFailed?: (data: { executionId: string; stepId: string; status: string; error: string }) => void;
      onExecutionCompleted?: (data: { executionId: string; status: string; completedAt: string; output: unknown }) => void;
      onExecutionFailed?: (data: { executionId: string; error: string }) => void;
      onError?: (error: string) => void;
    }
  ): Promise<void> => {
    return new Promise((resolve, reject) => {
      fetch(`/api/workflows/${id}/execute/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify({ input }),
      })
        .then(async (response) => {
          if (!response.ok) {
            const error = await response.json();
            reject(new Error(error.message || 'Failed to start workflow'));
            return;
          }

          const reader = response.body?.getReader();
          if (!reader) {
            reject(new Error('No response body'));
            return;
          }

          const decoder = new TextDecoder();
          let textBuffer = ''; // Buffer for incomplete lines

          const processEvent = (eventType: string, dataStr: string) => {
            try {
              const data = JSON.parse(dataStr);
              console.log('[SSE] Event:', eventType, data);

              switch (eventType) {
                case 'connected':
                  callbacks?.onConnected?.(data);
                  break;
                case 'execution:created':
                  callbacks?.onExecutionCreated?.(data);
                  break;
                case 'execution:started':
                  callbacks?.onExecutionStarted?.(data);
                  break;
                case 'step:started':
                  callbacks?.onStepStarted?.(data);
                  break;
                case 'step:completed':
                  callbacks?.onStepCompleted?.(data);
                  break;
                case 'step:failed':
                  callbacks?.onStepFailed?.(data);
                  break;
                case 'execution:completed':
                  callbacks?.onExecutionCompleted?.(data);
                  resolve();
                  break;
                case 'execution:failed':
                  callbacks?.onExecutionFailed?.(data);
                  resolve();
                  break;
                case 'error':
                  callbacks?.onError?.(data.error || data.message || 'Unknown error');
                  reject(new Error(data.error || data.message || 'Unknown error'));
                  break;
              }
            } catch (e) {
              console.error('[SSE] Failed to parse event data:', dataStr, e);
            }
          };

          const processChunk = (text: string) => {
            // Add new text to buffer
            textBuffer += text;

            // Process complete events (separated by double newlines)
            const events = textBuffer.split('\n\n');

            // Keep the last part in buffer if it's incomplete
            textBuffer = events.pop() || '';

            for (const eventBlock of events) {
              const lines = eventBlock.split('\n');
              let eventType = '';
              let dataStr = '';

              for (const line of lines) {
                if (line.startsWith('event: ')) {
                  eventType = line.slice(7).trim();
                } else if (line.startsWith('data: ')) {
                  dataStr = line.slice(6);
                }
              }

              if (eventType && dataStr) {
                processEvent(eventType, dataStr);
              }
            }
          };

          const read = async (): Promise<void> => {
            const { done, value } = await reader.read();
            if (done) {
              // Process any remaining data in buffer
              if (textBuffer.trim()) {
                processChunk('\n\n');
              }
              resolve();
              return;
            }

            const text = decoder.decode(value, { stream: true });
            processChunk(text);

            return read();
          };

          read().catch(reject);
        })
        .catch(reject);
    });
  },

  // Smart Orchestration - Analyze demand, create dynamic workflow, and execute
  // POST /api/workflows/orchestrate/stream
  orchestrateStream: (
    demand: string,
    callbacks?: {
      onConnected?: () => void;
      onOrchestrationStarted?: (data: { phase: string; message: string }) => void;
      onOrchestrationCompleted?: (data: {
        phase: string;
        workflowId: string;
        workflowName: string;
        analysis: string;
        expectedOutputs: string[];
        steps: Array<{
          id: string;
          name: string;
          squadId: string;
          agentId: string;
          role: string;
          description: string;
        }>;
      }) => void;
      onExecutionCreated?: (data: { executionId: string; workflowName: string; input: unknown; steps: Array<{ id: string; type: string; status: string; name?: string; config?: unknown }> }) => void;
      onExecutionStarted?: (data: { executionId: string; status: string; startedAt: string }) => void;
      onStepStarted?: (data: { executionId: string; stepId: string; stepType: string; status: string; startedAt: string }) => void;
      onStepCompleted?: (data: { executionId: string; stepId: string; status: string; output: unknown; completedAt: string }) => void;
      onStepFailed?: (data: { executionId: string; stepId: string; status: string; error: string }) => void;
      onExecutionCompleted?: (data: { executionId: string; status: string; completedAt: string; output: unknown }) => void;
      onExecutionFailed?: (data: { executionId: string; error: string }) => void;
      onError?: (error: string) => void;
    }
  ): Promise<void> => {
    return new Promise((resolve, reject) => {
      fetch('/api/workflows/orchestrate/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify({ demand }),
      })
        .then(async (response) => {
          if (!response.ok) {
            const error = await response.json();
            reject(new Error(error.message || 'Failed to start orchestration'));
            return;
          }

          const reader = response.body?.getReader();
          if (!reader) {
            reject(new Error('No response body'));
            return;
          }

          const decoder = new TextDecoder();
          let textBuffer = '';
          let currentEventType = '';

          const processEvent = (eventType: string, dataStr: string) => {
            try {
              const data = JSON.parse(dataStr);
              console.log('[Orchestration SSE] Event:', eventType, data);

              switch (eventType) {
                case 'connected':
                  callbacks?.onConnected?.();
                  break;
                case 'orchestration:started':
                  callbacks?.onOrchestrationStarted?.(data);
                  break;
                case 'orchestration:completed':
                  callbacks?.onOrchestrationCompleted?.(data);
                  break;
                case 'execution:starting':
                  // Intermediate phase, no callback
                  break;
                case 'execution:created':
                  callbacks?.onExecutionCreated?.(data);
                  break;
                case 'execution:started':
                  callbacks?.onExecutionStarted?.(data);
                  break;
                case 'step:started':
                  callbacks?.onStepStarted?.(data);
                  break;
                case 'step:completed':
                  callbacks?.onStepCompleted?.(data);
                  break;
                case 'step:failed':
                  callbacks?.onStepFailed?.(data);
                  break;
                case 'execution:completed':
                  callbacks?.onExecutionCompleted?.(data);
                  resolve();
                  break;
                case 'execution:failed':
                  callbacks?.onExecutionFailed?.(data);
                  resolve();
                  break;
                case 'error':
                  callbacks?.onError?.(data.error || data.message || 'Unknown error');
                  reject(new Error(data.error || data.message || 'Unknown error'));
                  break;
              }
            } catch (e) {
              console.error('[Orchestration SSE] Failed to parse event data:', dataStr, e);
            }
          };

          const processChunk = (text: string) => {
            textBuffer += text;
            const events = textBuffer.split('\n\n');
            textBuffer = events.pop() || '';

            for (const event of events) {
              if (!event.trim()) continue;
              const lines = event.split('\n');
              for (const line of lines) {
                if (line.startsWith('event:')) {
                  currentEventType = line.slice(6).trim();
                } else if (line.startsWith('data:')) {
                  const dataStr = line.slice(5).trim();
                  if (currentEventType && dataStr) {
                    processEvent(currentEventType, dataStr);
                  }
                }
              }
            }
          };

          const read = async (): Promise<void> => {
            const { done, value } = await reader.read();
            if (done) {
              if (textBuffer.trim()) processChunk('\n\n');
              resolve();
              return;
            }
            processChunk(decoder.decode(value, { stream: true }));
            return read();
          };

          read().catch(reject);
        })
        .catch(reject);
    });
  },

  // List executions
  // GET /api/workflows/executions
  getExecutions: async (params?: {
    workflowId?: string;
    status?: string;
    limit?: number;
  }): Promise<{ total: number; executions: WorkflowExecution[] }> => {
    return apiClient.get('/workflows/executions', params);
  },

  // Get execution by ID
  // GET /api/workflows/executions/:id
  getExecution: async (id: string): Promise<WorkflowExecution> => {
    return apiClient.get<WorkflowExecution>(`/workflows/executions/${id}`);
  },

  // Cancel execution
  // POST /api/workflows/executions/:id/cancel
  cancelExecution: async (id: string): Promise<{ success: boolean; message: string; execution: WorkflowExecution }> => {
    return apiClient.post(`/workflows/executions/${id}/cancel`);
  },

  // Get executions for a specific workflow
  // GET /api/workflows/:id/executions
  getWorkflowExecutions: async (
    workflowId: string,
    params?: { status?: string; limit?: number }
  ): Promise<{ total: number; executions: WorkflowExecution[] }> => {
    return apiClient.get(`/workflows/${workflowId}/executions`, params);
  },
};
