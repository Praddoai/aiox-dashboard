import { NextResponse } from 'next/server';
import { listTasks } from '@/lib/task-store';
import { fetchPersistedTasks } from '@/lib/task-persistence';

/**
 * GET /api/events/recent?limit=50
 * Returns recent system events derived from task lifecycle.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '50', 10);

  // Merge in-memory + Supabase historical tasks
  const memoryTasks = listTasks(100);
  const memoryIds = new Set(memoryTasks.map((t) => t.id));
  const dbTasks = await fetchPersistedTasks({ limit: 100, excludeIds: memoryIds });

  const allTasks = [
    ...memoryTasks.map((t) => ({
      id: t.id,
      demand: t.demand,
      status: t.status,
      createdAt: t.createdAt,
      startedAt: t.startedAt,
      completedAt: t.completedAt,
      error: t.error,
    })),
    ...dbTasks.map((t) => ({
      id: t.id,
      demand: t.demand,
      status: t.status,
      createdAt: t.createdAt,
      startedAt: t.startedAt,
      completedAt: t.completedAt,
      error: t.error,
    })),
  ];

  const events: Array<{
    id: string;
    type: string;
    timestamp: string;
    data: Record<string, unknown>;
  }> = [];

  for (const task of allTasks) {
    events.push({
      id: `${task.id}-created`,
      type: 'task:created',
      timestamp: task.createdAt,
      data: { taskId: task.id, demand: task.demand },
    });

    if (task.startedAt) {
      events.push({
        id: `${task.id}-started`,
        type: 'task:started',
        timestamp: task.startedAt,
        data: { taskId: task.id },
      });
    }

    if (task.completedAt) {
      events.push({
        id: `${task.id}-${task.status === 'completed' ? 'completed' : 'failed'}`,
        type: task.status === 'completed' ? 'task:completed' : 'task:failed',
        timestamp: task.completedAt,
        data: {
          taskId: task.id,
          ...(task.error ? { error: task.error } : {}),
        },
      });
    }
  }

  // Sort by timestamp, most recent first
  events.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const limited = events.slice(0, limit);

  return NextResponse.json({ events: limited, total: events.length });
}
