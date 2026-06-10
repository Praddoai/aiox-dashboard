import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { createTask, listTasks, getTask, updateTask } from '@/lib/task-store';
import { startTaskExecution } from '@/lib/task-executor';
import { persistTask, isPersistenceAvailable, fetchPersistedTasks } from '@/lib/task-persistence';

// Stale task threshold: tasks in running/executing status longer than this are marked failed
const STALE_TASK_THRESHOLD_MS = 60 * 60 * 1000; // 1 hour

/**
 * Mark stale in-memory tasks as failed.
 * A task is considered stale if it has been in a running-like status
 * (executing, analyzing, planning) for longer than STALE_TASK_THRESHOLD_MS
 * without a completedAt timestamp.
 */
function cleanupStaleTasks(): void {
  const now = Date.now();
  const runningStatuses = ['executing', 'analyzing', 'planning'];
  const allTasks = listTasks(500);

  for (const task of allTasks) {
    if (!runningStatuses.includes(task.status)) continue;
    if (task.completedAt) continue;

    // Use startedAt if available, otherwise createdAt
    const referenceTime = task.startedAt
      ? new Date(task.startedAt).getTime()
      : new Date(task.createdAt).getTime();

    if (now - referenceTime > STALE_TASK_THRESHOLD_MS) {
      updateTask(task.id, {
        status: 'failed',
        completedAt: new Date().toISOString(),
        error: `Task timed out: stuck in "${task.status}" status for over 1 hour without completion.`,
      });
      // Persist the failure to Supabase
      const updated = getTask(task.id);
      if (updated) persistTask(updated);
    }
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const limit = parseInt(url.searchParams.get('limit') || '50', 10);
  const status = url.searchParams.get('status') || undefined;

  // Clean up stale tasks before returning results
  cleanupStaleTasks();

  // Get live tasks from in-memory store
  let memoryTasks = listTasks(limit);
  if (status) {
    memoryTasks = memoryTasks.filter((t) => t.status === status);
  }

  // Hydrate with historical tasks from Supabase
  const memoryIds = new Set(memoryTasks.map(t => t.id));
  const dbTasks = await fetchPersistedTasks({
    limit,
    status,
    excludeIds: memoryIds,
  });

  // Also clean up stale DB tasks in the response
  const now = Date.now();
  const dbRunningStatuses = ['executing', 'analyzing', 'planning'];

  // Merge: in-memory tasks first (more complete), then DB historical
  const allTasks = [
    ...memoryTasks.map(t => ({
      id: t.id,
      demand: t.demand,
      status: t.status,
      squads: t.squads,
      outputs: t.outputs,
      createdAt: t.createdAt,
      startedAt: t.startedAt,
      completedAt: t.completedAt,
      error: t.error,
    })),
    ...dbTasks.map(t => {
      // Check if this DB task is stale
      const isStale = dbRunningStatuses.includes(t.status)
        && !t.completedAt
        && (now - new Date(t.startedAt || t.createdAt).getTime() > STALE_TASK_THRESHOLD_MS);

      return {
        id: t.id,
        demand: t.demand,
        status: isStale ? 'failed' : t.status,
        squads: t.squads,
        outputs: t.outputs,
        createdAt: t.createdAt,
        startedAt: t.startedAt,
        completedAt: isStale ? new Date().toISOString() : t.completedAt,
        error: isStale ? `Task timed out: stuck in "${t.status}" status for over 1 hour without completion.` : t.error,
        source: 'database' as const,
      };
    }),
  ];

  // Sort by creation date, most recent first, then trim to limit
  allTasks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const limited = allTasks.slice(0, limit);

  return NextResponse.json({
    tasks: limited,
    total: allTasks.length,
    limit,
    offset: 0,
    dbPersistence: isPersistenceAvailable(),
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const demand = body.demand as string;

    if (!demand?.trim()) {
      return NextResponse.json({ error: 'demand is required' }, { status: 400 });
    }

    const taskId = randomUUID();
    createTask(taskId, demand.trim());

    // Persist initial state to Supabase (fire-and-forget)
    const task = getTask(taskId);
    if (task) persistTask(task);

    // Fire-and-forget — execution runs in the background
    startTaskExecution(taskId);

    return NextResponse.json({
      taskId,
      status: 'created',
      message: `Task created. Connect to /api/tasks/${taskId}/stream for real-time updates.`,
      dbPersistence: isPersistenceAvailable(),
    });
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
