import { NextResponse } from 'next/server';
import { listTasks } from '@/lib/task-store';
import { fetchPersistedTasks } from '@/lib/task-persistence';

/**
 * GET /api/analytics/performance/agents
 * Returns per-agent performance metrics from task history.
 */
export async function GET() {
  // Merge in-memory + Supabase
  const memoryTasks = listTasks(500);
  const memoryIds = new Set(memoryTasks.map(t => t.id));
  const dbTasks = await fetchPersistedTasks({ limit: 500, excludeIds: memoryIds });

  const allTasks = [
    ...memoryTasks.map(t => ({
      status: t.status, squads: t.squads,
      startedAt: t.startedAt, completedAt: t.completedAt,
    })),
    ...dbTasks.map(t => ({
      status: t.status, squads: t.squads,
      startedAt: t.startedAt, completedAt: t.completedAt,
    })),
  ];

  // Aggregate per agent
  const agentStats = new Map<string, {
    name: string; squadId: string;
    executions: number; successes: number; failures: number;
    totalDurationMs: number; durationsCount: number;
    lastActive: string;
  }>();

  for (const task of allTasks) {
    const durationMs = task.startedAt && task.completedAt
      ? new Date(task.completedAt).getTime() - new Date(task.startedAt).getTime()
      : 0;

    const taskDate = task.completedAt || task.startedAt || '';

    for (const squad of (task.squads || [])) {
      for (const agent of (squad.agents || [])) {
        const existing = agentStats.get(agent.id) || {
          name: agent.name, squadId: squad.squadId,
          executions: 0, successes: 0, failures: 0,
          totalDurationMs: 0, durationsCount: 0,
          lastActive: '',
        };
        existing.executions++;
        if (task.status === 'completed') existing.successes++;
        if (task.status === 'failed') existing.failures++;
        if (durationMs > 0) {
          existing.totalDurationMs += durationMs;
          existing.durationsCount++;
        }
        if (taskDate && taskDate > existing.lastActive) {
          existing.lastActive = taskDate;
        }
        agentStats.set(agent.id, existing);
      }
    }
  }

  const agents = Array.from(agentStats.entries())
    .map(([agentId, s]) => ({
      agentId,
      agentName: s.name,
      squad: s.squadId,
      totalExecutions: s.executions,
      successfulExecutions: s.successes,
      failedExecutions: s.failures,
      successRate: s.executions > 0 ? Math.round((s.successes / s.executions) * 100) / 100 : 1.0,
      avgDuration: s.durationsCount > 0 ? Math.round(s.totalDurationMs / s.durationsCount) : 0,
      avgTokens: 0,
      totalCost: 0,
      lastActive: s.lastActive || new Date().toISOString(),
    }))
    .sort((a, b) => b.totalExecutions - a.totalExecutions);

  const totalExec = agents.reduce((s, a) => s + a.totalExecutions, 0);
  const totalSuccess = agents.reduce((s, a) => s + a.successfulExecutions, 0);
  const avgDurations = agents.filter(a => a.avgDuration > 0);
  const avgDurationMs = avgDurations.length > 0
    ? Math.round(avgDurations.reduce((s, a) => s + a.avgDuration, 0) / avgDurations.length)
    : 0;

  return NextResponse.json({
    agents,
    summary: {
      totalExecutions: totalExec,
      avgDurationMs,
      successRate: totalExec > 0 ? Math.round((totalSuccess / totalExec) * 100) / 100 : 1.0,
    },
  });
}
