/**
 * Server-side task persistence to Supabase.
 * Called from task-executor.ts at key lifecycle points:
 * - Task creation
 * - Task completion
 * - Task failure
 *
 * All operations are fire-and-forget (non-blocking).
 * Failures are logged but never break execution flow.
 */
import { getSupabaseServer, isSupabaseServerConfigured } from './supabase-server';
import type { StoredTask } from './task-store';

/** Convert StoredTask to Supabase row */
function taskToRow(task: StoredTask) {
  return {
    task_id: task.id,
    demand: task.demand,
    status: task.status,
    squads: task.squads,
    outputs: task.outputs,
    step_count: task.plan?.steps?.length || 0,
    completed_steps: task.outputs?.length || 0,
    total_duration_ms: task.completedAt && task.startedAt
      ? new Date(task.completedAt).getTime() - new Date(task.startedAt).getTime()
      : 0,
    error_message: task.error || null,
    started_at: task.startedAt || null,
    completed_at: task.completedAt || null,
  };
}

/**
 * Persist a task to Supabase (upsert by task_id).
 * Fire-and-forget — errors are logged, never thrown.
 */
export async function persistTask(task: StoredTask): Promise<void> {
  if (!isSupabaseServerConfigured) return;
  const supabase = getSupabaseServer();
  if (!supabase) return;

  try {
    const row = taskToRow(task);
    const { error } = await supabase
      .from('orchestration_tasks')
      .upsert(row, { onConflict: 'task_id' });

    if (error) {
      console.error(`[Supabase] Failed to persist task ${task.id}:`, error.message);
    }
  } catch (err) {
    console.error(`[Supabase] Unexpected error persisting task ${task.id}:`, err);
  }
}

/** Check if server-side persistence is available */
export function isPersistenceAvailable(): boolean {
  return isSupabaseServerConfigured;
}

/** Minimal task shape returned from Supabase reads */
export interface PersistedTask {
  id: string;
  demand: string;
  status: string;
  squads: StoredTask['squads'];
  outputs: StoredTask['outputs'];
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  totalDurationMs?: number;
  stepCount?: number;
  completedSteps?: number;
}

/** Convert Supabase row to PersistedTask */
function rowToPersistedTask(row: Record<string, unknown>): PersistedTask {
  return {
    id: row.task_id as string,
    demand: row.demand as string,
    status: row.status as string,
    squads: (row.squads as StoredTask['squads']) || [],
    outputs: (row.outputs as StoredTask['outputs']) || [],
    createdAt: row.created_at as string,
    startedAt: (row.started_at as string) || undefined,
    completedAt: (row.completed_at as string) || undefined,
    error: (row.error_message as string) || undefined,
    totalDurationMs: (row.total_duration_ms as number) || undefined,
    stepCount: (row.step_count as number) || undefined,
    completedSteps: (row.completed_steps as number) || undefined,
  };
}

/**
 * Fetch historical tasks from Supabase.
 * Used by API routes to hydrate data beyond the in-memory TTL.
 */
export async function fetchPersistedTasks(params?: {
  limit?: number;
  status?: string;
  excludeIds?: Set<string>;
}): Promise<PersistedTask[]> {
  if (!isSupabaseServerConfigured) return [];
  const supabase = getSupabaseServer();
  if (!supabase) return [];

  try {
    let query = supabase
      .from('orchestration_tasks')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(params?.limit || 100);

    if (params?.status) {
      query = query.eq('status', params.status);
    }

    const { data, error } = await query;
    if (error || !data) return [];

    let tasks = (data as Record<string, unknown>[]).map(rowToPersistedTask);

    // Exclude tasks already in memory to avoid duplicates
    if (params?.excludeIds?.size) {
      tasks = tasks.filter(t => !params.excludeIds!.has(t.id));
    }

    return tasks;
  } catch (err) {
    console.error('[Supabase] Failed to fetch persisted tasks:', err);
    return [];
  }
}

/**
 * Fetch a single task from Supabase by ID.
 */
export async function fetchPersistedTask(taskId: string): Promise<PersistedTask | null> {
  if (!isSupabaseServerConfigured) return null;
  const supabase = getSupabaseServer();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from('orchestration_tasks')
      .select('*')
      .eq('task_id', taskId)
      .single();

    if (error || !data) return null;
    return rowToPersistedTask(data as Record<string, unknown>);
  } catch {
    return null;
  }
}
