import { NextResponse } from 'next/server';
import { listTasks } from '@/lib/task-store';
import { fetchPersistedTasks } from '@/lib/task-persistence';

/**
 * GET /api/analytics/realtime
 */
export async function GET() {
  // Merge in-memory + Supabase
  const memoryTasks = listTasks(200);
  const memoryIds = new Set(memoryTasks.map(t => t.id));
  const dbTasks = await fetchPersistedTasks({ limit: 200, excludeIds: memoryIds });
  const tasks = [
    ...memoryTasks,
    ...dbTasks.map(t => ({
      id: t.id, status: t.status, createdAt: t.createdAt,
      startedAt: t.startedAt, completedAt: t.completedAt,
    })),
  ];

  const now = new Date();
  const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  const recentTasks = tasks.filter(t => new Date(t.createdAt) >= oneHourAgo);
  const lastMinuteTasks = tasks.filter(t => new Date(t.createdAt) >= oneMinuteAgo);
  const failedLastMinute = lastMinuteTasks.filter(t => t.status === 'failed');
  const activeExecutions = tasks.filter(t => t.status === 'executing').length;

  // Average latency from completed tasks in the last hour
  const completedRecent = recentTasks
    .filter(t => t.startedAt && t.completedAt)
    .map(t => new Date(t.completedAt!).getTime() - new Date(t.startedAt!).getTime());
  const avgLatencyMs = completedRecent.length > 0
    ? Math.round(completedRecent.reduce((a, b) => a + b, 0) / completedRecent.length)
    : 0;

  return NextResponse.json({
    timestamp: now.toISOString(),
    requestsPerMinute: lastMinuteTasks.length,
    errorsPerMinute: failedLastMinute.length,
    executionsPerMinute: lastMinuteTasks.length,
    activeExecutions,
    avgLatencyMs,
  });
}
