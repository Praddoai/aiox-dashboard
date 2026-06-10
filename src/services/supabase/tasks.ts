/**
 * Supabase Tasks Service
 * Persistent storage layer for orchestration tasks.
 * Falls back gracefully when Supabase is not configured.
 */
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import type { Task, TaskListResponse } from '../api/tasks';

/** Row shape in the orchestration_tasks table */
interface OrchestrationTaskRow {
  id: number;
  task_id: string;
  demand: string;
  status: string;
  squads: unknown;
  outputs: unknown;
  workflow_id: string | null;
  execution_id: string | null;
  session_id: string | null;
  user_id: string | null;
  current_step: string | null;
  step_count: number;
  completed_steps: number;
  total_tokens: number;
  total_duration_ms: number;
  error_message: string | null;
  final_result: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Convert DB row to Task interface */
function rowToTask(row: OrchestrationTaskRow): Task {
  const squads = (row.squads as Task['squads']) || [];
  const outputs = (row.outputs as Task['outputs']) || [];

  return {
    id: row.task_id,
    demand: row.demand,
    status: row.status as Task['status'],
    squads,
    workflow: row.workflow_id
      ? { id: row.workflow_id, name: 'Workflow', stepCount: row.step_count }
      : null,
    outputs,
    createdAt: row.created_at,
    startedAt: row.started_at || undefined,
    completedAt: row.completed_at || undefined,
    totalTokens: row.total_tokens || undefined,
    totalDuration: row.total_duration_ms || undefined,
    stepCount: row.step_count || undefined,
    completedSteps: row.completed_steps || undefined,
    error: row.error_message || undefined,
  };
}

/** Convert Task to DB row for upsert */
function taskToRow(task: Task): Partial<OrchestrationTaskRow> {
  return {
    task_id: task.id,
    demand: task.demand,
    status: task.status,
    squads: task.squads,
    outputs: task.outputs,
    workflow_id: task.workflow?.id || null,
    step_count: task.stepCount || task.workflow?.stepCount || 0,
    completed_steps: task.completedSteps || 0,
    total_tokens: task.totalTokens || 0,
    total_duration_ms: task.totalDuration || 0,
    error_message: task.error || null,
    started_at: task.startedAt || null,
    completed_at: task.completedAt || null,
  };
}

export const supabaseTasksService = {
  /** Check if Supabase persistence is available */
  isAvailable(): boolean {
    return isSupabaseConfigured && supabase !== null;
  },

  /** Save or update a task in Supabase */
  async upsertTask(task: Task): Promise<void> {
    if (!supabase) return;

    const row = taskToRow(task);
    const { error } = await supabase
      .from('orchestration_tasks')
      .upsert(row, { onConflict: 'task_id' });

    if (error) {
      console.error('[Supabase] Failed to upsert task:', error.message);
    }
  },

  /** Fetch a single task by ID */
  async getTask(taskId: string): Promise<Task | null> {
    if (!supabase) return null;

    const { data, error } = await supabase
      .from('orchestration_tasks')
      .select('*')
      .eq('task_id', taskId)
      .single();

    if (error || !data) return null;
    return rowToTask(data as OrchestrationTaskRow);
  },

  /** List tasks with optional filters */
  async listTasks(params?: {
    status?: string;
    limit?: number;
    offset?: number;
    search?: string;
  }): Promise<TaskListResponse | null> {
    if (!supabase) return null;

    const limit = params?.limit ?? 20;
    const offset = params?.offset ?? 0;

    let query = supabase
      .from('orchestration_tasks')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (params?.status) {
      query = query.eq('status', params.status);
    }

    if (params?.search) {
      query = query.ilike('demand', `%${params.search}%`);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('[Supabase] Failed to list tasks:', error.message);
      return null;
    }

    return {
      tasks: (data as OrchestrationTaskRow[]).map(rowToTask),
      total: count || 0,
      limit,
      offset,
      dbPersistence: true,
    };
  },

  /** Save a completed task (called when orchestration finishes) */
  async persistCompletedTask(task: Task): Promise<void> {
    if (!supabase) return;

    const row = taskToRow(task);
    row.completed_at = row.completed_at || new Date().toISOString();

    const { error } = await supabase
      .from('orchestration_tasks')
      .upsert(row, { onConflict: 'task_id' });

    if (error) {
      console.error('[Supabase] Failed to persist completed task:', error.message);
    }
  },

  /** Get aggregate metrics */
  async getMetrics(): Promise<{
    total: number;
    completed: number;
    failed: number;
    avgDuration: number;
    totalTokens: number;
  } | null> {
    if (!supabase) return null;

    const { data, error } = await supabase
      .from('orchestration_tasks')
      .select('status, total_duration_ms, total_tokens');

    if (error || !data) return null;

    const rows = data as Pick<OrchestrationTaskRow, 'status' | 'total_duration_ms' | 'total_tokens'>[];
    const completed = rows.filter(r => r.status === 'completed');
    const failed = rows.filter(r => r.status === 'failed');
    const totalDurations = completed.reduce((s, r) => s + (r.total_duration_ms || 0), 0);
    const totalTokens = rows.reduce((s, r) => s + (r.total_tokens || 0), 0);

    return {
      total: rows.length,
      completed: completed.length,
      failed: failed.length,
      avgDuration: completed.length > 0 ? totalDurations / completed.length : 0,
      totalTokens,
    };
  },
};
