/**
 * Tasks API Client
 * For orchestrating user demands across squads and agents
 */

import { apiClient } from './client';

export interface TaskAgent {
  id: string;
  name: string;
}

export interface TaskSquadSelection {
  squadId: string;
  chief: string;
  agentCount: number;
  agents: TaskAgent[];
}

export interface TaskWorkflow {
  id: string;
  name: string;
  stepCount: number;
}

export interface TaskOutput {
  stepId: string;
  stepName: string;
  output: {
    content?: string;
    response?: string;
    agent?: {
      id: string;
      name: string;
      squad: string;
    };
    role?: string;
    processingTimeMs?: number;
    llmMetadata?: {
      provider: string;
      model: string;
      inputTokens?: number;
      outputTokens?: number;
    };
  };
}

export interface Task {
  id: string;
  demand: string;
  status: 'pending' | 'analyzing' | 'planning' | 'executing' | 'completed' | 'failed';
  squads: TaskSquadSelection[];
  workflow: TaskWorkflow | null;
  outputs: TaskOutput[];
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  totalTokens?: number;
  totalDuration?: number;
  stepCount?: number;
  completedSteps?: number;
  error?: string;
}

export interface TaskListResponse {
  tasks: Task[];
  total: number;
  limit: number;
  offset: number;
  dbPersistence: boolean;
}

export interface CreateTaskResponse {
  taskId: string;
  status: string;
  message: string;
  dbPersistence: boolean;
}

export const tasksApi = {
  /**
   * Create and execute a new task
   */
  createTask: async (demand: string, options?: Record<string, unknown>): Promise<CreateTaskResponse> => {
    const response = await apiClient.post<CreateTaskResponse>('/tasks', {
      demand,
      options,
    });
    return response;
  },

  /**
   * Get task status and details
   */
  getTask: async (taskId: string): Promise<Task> => {
    const response = await apiClient.get<Task>(`/tasks/${taskId}`);
    return response;
  },

  /**
   * List tasks with optional filters
   */
  listTasks: async (params?: {
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<TaskListResponse> => {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.offset) searchParams.set('offset', String(params.offset));
    const qs = searchParams.toString();
    const response = await apiClient.get<TaskListResponse>(`/tasks${qs ? `?${qs}` : ''}`);
    return response;
  },

  /**
   * Get SSE endpoint URL for task streaming
   */
  getTaskStreamUrl: (taskId: string): string => {
    return `${apiClient.getBaseUrl()}/api/tasks/${taskId}/stream`; // getBaseUrl strips /api, so /api prefix is correct here
  },

  /**
   * Get SSE endpoint URL for all tasks streaming
   */
  getAllTasksStreamUrl: (): string => {
    return `${apiClient.getBaseUrl()}/api/tasks/stream`;
  },
};

export default tasksApi;
