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

export interface Task {
  id: string;
  demand: string;
  status: 'pending' | 'analyzing' | 'planning' | 'executing' | 'completed' | 'failed';
  squads: TaskSquadSelection[];
  workflow: TaskWorkflow | null;
  outputs: unknown[];
  createdAt: string;
  error?: string;
}

export interface CreateTaskResponse {
  taskId: string;
  status: string;
  message: string;
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
