/**
 * useTaskHistory — React Query hooks for fetching task orchestration history.
 * Uses Supabase when configured, falls back to API.
 */
import { useQuery } from '@tanstack/react-query';
import { tasksApi, type Task, type TaskListResponse } from '../services/api/tasks';
import { supabaseTasksService } from '../services/supabase/tasks';

async function fetchTaskList(params?: {
  status?: string;
  limit?: number;
  offset?: number;
  search?: string;
}): Promise<TaskListResponse> {
  // Try Supabase first
  if (supabaseTasksService.isAvailable()) {
    const result = await supabaseTasksService.listTasks(params);
    if (result) return result;
  }

  // Fallback to API
  return tasksApi.listTasks({
    limit: params?.limit ?? 20,
    offset: params?.offset ?? 0,
    status: params?.status,
  });
}

async function fetchTaskDetail(taskId: string): Promise<Task> {
  // Try Supabase first
  if (supabaseTasksService.isAvailable()) {
    const task = await supabaseTasksService.getTask(taskId);
    if (task) return task;
  }

  // Fallback to API
  return tasksApi.getTask(taskId);
}

export function useTaskHistory(params?: {
  status?: string;
  limit?: number;
  offset?: number;
  search?: string;
}) {
  return useQuery<TaskListResponse>({
    queryKey: ['taskHistory', params],
    queryFn: () => fetchTaskList(params),
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
}

export function useTaskDetail(taskId: string | null) {
  return useQuery<Task>({
    queryKey: ['taskDetail', taskId],
    queryFn: () => fetchTaskDetail(taskId!),
    enabled: !!taskId,
    staleTime: 10_000,
  });
}
