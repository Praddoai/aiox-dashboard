import { apiClient, StreamCallbacks } from './client';
import type {
  ExecuteRequest,
  ExecuteResponse,
  ExecutionRecord,
  ExecutionHistory,
  ExecutionStats,
  OrchestrationRequest,
  OrchestrationResult,
  LLMUsage,
  LLMHealth,
  LLMModels,
} from '../../types';

export const executeApi = {
  // Execute agent (sync)
  // POST /api/execute/agent
  executeAgent: async (request: ExecuteRequest): Promise<ExecuteResponse> => {
    return apiClient.post<ExecuteResponse>('/execute/agent', request);
  },

  // Execute agent with streaming (SSE)
  // POST /api/execute/agent/stream
  executeAgentStream: async (
    request: Omit<ExecuteRequest, 'options'>,
    callbacks: StreamCallbacks,
    signal?: AbortSignal
  ): Promise<void> => {
    return apiClient.stream('/execute/agent/stream', request, callbacks, signal);
  },

  // Orchestrate multiple agents
  // POST /api/execute/orchestrate
  orchestrate: async (request: OrchestrationRequest): Promise<OrchestrationResult> => {
    return apiClient.post<OrchestrationResult>('/execute/orchestrate', request);
  },

  // Get execution status
  // GET /api/execute/status/:executionId
  getExecutionStatus: async (executionId: string): Promise<{ execution: ExecutionRecord }> => {
    return apiClient.get<{ execution: ExecutionRecord }>(`/execute/status/${executionId}`);
  },

  // Cancel execution
  // DELETE /api/execute/status/:executionId
  cancelExecution: async (executionId: string): Promise<{ executionId: string; status: string }> => {
    return apiClient.delete<{ executionId: string; status: string }>(`/execute/status/${executionId}`);
  },

  // Get execution history
  // GET /api/execute/history
  getHistory: async (params?: {
    limit?: number;
    status?: string;
    agentId?: string;
    squadId?: string;
  }): Promise<ExecutionHistory> => {
    return apiClient.get<ExecutionHistory>('/execute/history', params);
  },

  // Get execution statistics
  // GET /api/execute/stats
  getStats: async (params?: { since?: string }): Promise<ExecutionStats> => {
    return apiClient.get<ExecutionStats>('/execute/stats', params);
  },

  // LLM Health Check
  // GET /api/execute/llm/health
  getLLMHealth: async (): Promise<LLMHealth> => {
    return apiClient.get<LLMHealth>('/execute/llm/health');
  },

  // Get token usage statistics
  // GET /api/execute/llm/usage
  getTokenUsage: async (): Promise<LLMUsage> => {
    return apiClient.get<LLMUsage>('/execute/llm/usage');
  },

  // Get available LLM models
  // GET /api/execute/llm/models
  getLLMModels: async (): Promise<LLMModels> => {
    return apiClient.get<LLMModels>('/execute/llm/models');
  },

  // Database health check
  // GET /api/execute/db/health
  getDBHealth: async (): Promise<{ connected: boolean; error?: string }> => {
    return apiClient.get<{ connected: boolean; error?: string }>('/execute/db/health');
  },

  // Track external execution
  // POST /api/execute/track
  trackExecution: async (data: {
    squadId: string;
    agentId: string;
    duration?: number;
    success?: boolean;
    source?: string;
    metadata?: Record<string, unknown>;
  }): Promise<{ tracked: boolean; executionId: string; message: string }> => {
    return apiClient.post('/execute/track', data);
  },

  // Batch track executions
  // POST /api/execute/track/batch
  trackExecutionBatch: async (executions: Array<{
    squadId: string;
    agentId: string;
    duration?: number;
    success?: boolean;
    source?: string;
    timestamp?: string;
  }>): Promise<{ tracked: number; executionIds: string[] }> => {
    return apiClient.post('/execute/track/batch', { executions });
  },
};

// Helper function to build execute request
export function buildExecuteRequest(
  squadId: string,
  agentId: string,
  message: string,
  options?: {
    context?: Record<string, unknown>;
    command?: string;
    async?: boolean;
    timeout?: number;
  }
): ExecuteRequest {
  return {
    squadId,
    agentId,
    input: {
      message,
      context: options?.context,
      command: options?.command,
    },
    options: {
      async: options?.async,
      timeout: options?.timeout,
    },
  };
}
