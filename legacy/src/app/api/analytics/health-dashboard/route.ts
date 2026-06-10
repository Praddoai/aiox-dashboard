import { NextResponse } from 'next/server';
import { listTasks } from '@/lib/task-store';
import { fetchPersistedTasks } from '@/lib/task-persistence';

/**
 * GET /api/analytics/health-dashboard
 */
export async function GET() {
  // Merge in-memory + Supabase
  const memoryTasks = listTasks(100);
  const memoryIds = new Set(memoryTasks.map(t => t.id));
  const dbTasks = await fetchPersistedTasks({ limit: 100, excludeIds: memoryIds });
  const tasks = [
    ...memoryTasks.map(t => ({ id: t.id, status: t.status, createdAt: t.createdAt, startedAt: t.startedAt, completedAt: t.completedAt })),
    ...dbTasks.map(t => ({ id: t.id, status: t.status, createdAt: t.createdAt, startedAt: t.startedAt, completedAt: t.completedAt })),
  ];
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  const recentTasks = tasks.filter(t => new Date(t.createdAt) >= oneHourAgo);
  const completedRecent = recentTasks.filter(t => t.status === 'completed');
  const failedRecent = recentTasks.filter(t => t.status === 'failed');

  const durations = recentTasks
    .filter(t => t.startedAt && t.completedAt)
    .map(t => new Date(t.completedAt!).getTime() - new Date(t.startedAt!).getTime());
  const avgLatencyMs = durations.length > 0
    ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
    : 0;
  const sortedDurations = [...durations].sort((a, b) => a - b);
  const p95LatencyMs = sortedDurations.length > 0
    ? sortedDurations[Math.floor(sortedDurations.length * 0.95)] || avgLatencyMs
    : 0;

  const uptimeSeconds = Math.round(process.uptime());
  const hours = Math.floor(uptimeSeconds / 3600);
  const minutes = Math.floor((uptimeSeconds % 3600) / 60);
  const mem = process.memoryUsage();

  const executionSuccessRate = recentTasks.length > 0
    ? Math.round((completedRecent.length / recentTasks.length) * 100)
    : 100;

  const activeTasks = tasks.filter(t => !['completed', 'failed'].includes(t.status));
  const pendingTasks = tasks.filter(t => t.status === 'pending' || t.status === 'awaiting_approval');

  return NextResponse.json({
    timestamp: now.toISOString(),
    status: failedRecent.length > recentTasks.length / 2 ? 'unhealthy' : failedRecent.length > 0 ? 'degraded' : 'healthy',
    availability: recentTasks.length > 0
      ? Math.round(((recentTasks.length - failedRecent.length) / recentTasks.length) * 1000) / 10
      : 100,
    performance: {
      requestsLastHour: recentTasks.length,
      errorsLastHour: failedRecent.length,
      avgLatencyMs,
      p95LatencyMs,
      executionsLastHour: recentTasks.length,
      executionSuccessRate,
    },
    resources: {
      memoryUsedMB: Math.round(mem.heapUsed / 1024 / 1024),
      memoryTotalMB: Math.round(mem.heapTotal / 1024 / 1024),
      memoryPercentage: Math.round((mem.heapUsed / mem.heapTotal) * 100),
      uptimeSeconds,
      uptimeFormatted: `${hours}h ${minutes}m`,
    },
    services: {
      queue: {
        status: 'healthy',
        pending: pendingTasks.length,
        processing: activeTasks.filter(t => t.status === 'executing').length,
      },
      scheduler: {
        status: 'healthy',
        activeTasks: activeTasks.length,
        totalTasks: tasks.length,
      },
    },
  });
}
