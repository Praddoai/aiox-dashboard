import { NextResponse } from 'next/server';
import { listTasks } from '@/lib/task-store';
import { fetchPersistedTasks } from '@/lib/task-persistence';
import { formatName } from '@/lib/squad-api-utils';

/**
 * GET /api/analytics/performance/squads
 * Returns performance metrics grouped by squad.
 */
export async function GET() {
  // Merge in-memory + Supabase historical tasks
  const memoryTasks = listTasks(500);
  const memoryIds = new Set(memoryTasks.map((t) => t.id));
  const dbTasks = await fetchPersistedTasks({ limit: 500, excludeIds: memoryIds });

  // Normalize to common shape
  const allTasks = [
    ...memoryTasks.map((t) => ({
      status: t.status,
      squads: t.squads,
      startedAt: t.startedAt,
      completedAt: t.completedAt,
    })),
    ...dbTasks.map((t) => ({
      status: t.status,
      squads: t.squads,
      startedAt: t.startedAt,
      completedAt: t.completedAt,
    })),
  ];

  const squadMap = new Map<
    string,
    {
      total: number;
      success: number;
      failed: number;
      durations: number[];
      agentIds: Set<string>;
      agentExecutions: Map<string, { name: string; executions: number }>;
    }
  >();

  for (const task of allTasks) {
    for (const squad of task.squads) {
      const entry = squadMap.get(squad.squadId) || {
        total: 0,
        success: 0,
        failed: 0,
        durations: [],
        agentIds: new Set<string>(),
        agentExecutions: new Map<string, { name: string; executions: number }>(),
      };
      entry.total++;
      if (task.status === 'completed') entry.success++;
      if (task.status === 'failed') entry.failed++;
      if (task.startedAt && task.completedAt) {
        entry.durations.push(
          new Date(task.completedAt).getTime() - new Date(task.startedAt).getTime()
        );
      }
      // Track agents
      for (const agent of (squad.agents || [])) {
        entry.agentIds.add(agent.id);
        const agentEntry = entry.agentExecutions.get(agent.id) || { name: agent.name, executions: 0 };
        agentEntry.executions++;
        entry.agentExecutions.set(agent.id, agentEntry);
      }
      squadMap.set(squad.squadId, entry);
    }
  }

  const squads = Array.from(squadMap.entries())
    .map(([squadId, data]) => {
      // Top agents by execution count (max 5)
      const topAgents = Array.from(data.agentExecutions.entries())
        .map(([agentId, info]) => ({ agentId, agentName: info.name, executions: info.executions }))
        .sort((a, b) => b.executions - a.executions)
        .slice(0, 5);

      return {
        squadId,
        squadName: formatName(squadId),
        totalExecutions: data.total,
        successRate:
          data.total > 0 ? Math.round((data.success / data.total) * 100) : 0,
        failedExecutions: data.failed,
        avgDuration:
          data.durations.length
            ? Math.round(
                data.durations.reduce((a, b) => a + b, 0) / data.durations.length
              )
            : 0,
        agentCount: data.agentIds.size,
        totalCost: 0,
        topAgents,
      };
    })
    .sort((a, b) => b.totalExecutions - a.totalExecutions);

  return NextResponse.json({ squads, total: squads.length });
}
