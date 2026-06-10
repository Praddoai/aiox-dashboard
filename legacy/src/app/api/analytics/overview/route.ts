import { NextResponse } from 'next/server';
import { listTasks, updateTask, getTask } from '@/lib/task-store';
import { persistTask, fetchPersistedTasks } from '@/lib/task-persistence';

// Stale task threshold: tasks in running/executing status longer than this are marked failed
const STALE_TASK_THRESHOLD_MS = 60 * 60 * 1000; // 1 hour

/**
 * GET /api/analytics/overview?period=day|week|month
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const period = (searchParams.get('period') || 'day') as string;

  // Clean up stale in-memory tasks before computing analytics
  const nowMs = Date.now();
  const runningStatuses = ['executing', 'analyzing', 'planning'];
  const rawMemoryTasks = listTasks(500);
  for (const task of rawMemoryTasks) {
    if (!runningStatuses.includes(task.status)) continue;
    if (task.completedAt) continue;
    const ref = task.startedAt ? new Date(task.startedAt).getTime() : new Date(task.createdAt).getTime();
    if (nowMs - ref > STALE_TASK_THRESHOLD_MS) {
      updateTask(task.id, {
        status: 'failed',
        completedAt: new Date().toISOString(),
        error: `Task timed out: stuck in "${task.status}" status for over 1 hour without completion.`,
      });
      const updated = getTask(task.id);
      if (updated) persistTask(updated);
    }
  }

  // Merge in-memory + Supabase historical tasks
  const memoryTasks = listTasks(500);
  const memoryIds = new Set(memoryTasks.map(t => t.id));
  const dbTasks = await fetchPersistedTasks({ limit: 500, excludeIds: memoryIds });

  // Normalize to common shape
  type AnalyticsTask = {
    id: string; status: string; createdAt: string;
    startedAt?: string; completedAt?: string;
    squads: Array<{ squadId: string; chief: string; agentCount: number; agents: Array<{ id: string; name: string }> }>;
  };
  const tasks: AnalyticsTask[] = [
    ...memoryTasks.map(t => ({ id: t.id, status: t.status, createdAt: t.createdAt, startedAt: t.startedAt, completedAt: t.completedAt, squads: t.squads })),
    ...dbTasks.map(t => {
      // Also mark stale DB tasks as failed for accurate analytics
      const isStale = runningStatuses.includes(t.status)
        && !t.completedAt
        && (nowMs - new Date(t.startedAt || t.createdAt).getTime() > STALE_TASK_THRESHOLD_MS);
      return {
        id: t.id,
        status: isStale ? 'failed' : t.status,
        createdAt: t.createdAt,
        startedAt: t.startedAt,
        completedAt: isStale ? new Date().toISOString() : t.completedAt,
        squads: t.squads,
      };
    }),
  ];
  const now = new Date();

  // Filter tasks by period
  const periodMs: Record<string, number> = {
    hour: 60 * 60 * 1000,
    day: 24 * 60 * 60 * 1000,
    week: 7 * 24 * 60 * 60 * 1000,
    month: 30 * 24 * 60 * 60 * 1000,
    quarter: 90 * 24 * 60 * 60 * 1000,
    year: 365 * 24 * 60 * 60 * 1000,
  };
  const cutoff = new Date(now.getTime() - (periodMs[period] || periodMs.day));
  const filtered = tasks.filter(t => new Date(t.createdAt) >= cutoff);

  const totalExecutions = filtered.length;
  const successfulExecutions = filtered.filter(t => t.status === 'completed').length;
  const failedExecutions = filtered.filter(t => t.status === 'failed').length;
  const successRate = totalExecutions > 0 ? Math.round((successfulExecutions / totalExecutions) * 100) : 100;

  // Average duration
  const durations = filtered
    .filter(t => t.startedAt && t.completedAt)
    .map(t => new Date(t.completedAt!).getTime() - new Date(t.startedAt!).getTime());
  const averageDuration = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;

  // Memory usage
  const mem = process.memoryUsage();

  // Top agents
  const agentCounts = new Map<string, { executions: number; success: number; name: string }>();
  for (const task of filtered) {
    for (const squad of task.squads) {
      for (const agent of squad.agents) {
        const existing = agentCounts.get(agent.id) || { executions: 0, success: 0, name: agent.name };
        existing.executions++;
        if (task.status === 'completed') existing.success++;
        agentCounts.set(agent.id, existing);
      }
    }
  }
  const topAgents = Array.from(agentCounts.entries())
    .map(([agentId, data]) => ({
      agentId,
      name: data.name,
      executions: data.executions,
      successRate: data.executions > 0 ? Math.round((data.success / data.executions) * 100) : 0,
    }))
    .sort((a, b) => b.executions - a.executions)
    .slice(0, 5);

  // Top squads
  const squadCounts = new Map<string, { executions: number; cost: number }>();
  for (const task of filtered) {
    for (const squad of task.squads) {
      const existing = squadCounts.get(squad.squadId) || { executions: 0, cost: 0 };
      existing.executions++;
      squadCounts.set(squad.squadId, existing);
    }
  }
  const topSquads = Array.from(squadCounts.entries())
    .map(([squadId, data]) => ({
      squadId,
      name: squadId,
      executions: data.executions,
      cost: data.cost,
    }))
    .sort((a, b) => b.executions - a.executions)
    .slice(0, 5);

  return NextResponse.json({
    period,
    periodStart: cutoff.toISOString(),
    periodEnd: now.toISOString(),
    generatedAt: now.toISOString(),
    summary: {
      totalExecutions,
      successfulExecutions,
      failedExecutions,
      successRate,
      averageDuration: Math.round(averageDuration),
      totalRequests: totalExecutions,
      errorRate: totalExecutions > 0 ? Math.round((failedExecutions / totalExecutions) * 100) : 0,
      avgLatency: Math.round(averageDuration / 1000),
      p95Latency: Math.round((averageDuration / 1000) * 1.5),
      totalCost: 0,
      totalTokens: 0,
      avgCostPerExecution: 0,
      activeJobs: tasks.filter(t => t.status === 'executing').length,
      scheduledTasks: tasks.filter(t => t.status === 'pending' || t.status === 'awaiting_approval').length,
      activeTasks: tasks.filter(t => !['completed', 'failed'].includes(t.status)).length,
    },
    trends: {
      executions: { direction: 'stable' as const, change: 0 },
      costs: { direction: 'stable' as const, change: 0 },
      errors: { direction: 'stable' as const, change: 0 },
    },
    topAgents,
    topSquads,
    health: {
      status: 'healthy' as const,
      uptime: Math.round(process.uptime()),
      memoryUsage: {
        rss: mem.rss,
        heapTotal: mem.heapTotal,
        heapUsed: mem.heapUsed,
        external: mem.external,
        arrayBuffers: mem.arrayBuffers,
      },
    },
  });
}
