import { NextResponse } from 'next/server';
import { listTasks } from '@/lib/task-store';
import { fetchPersistedTasks } from '@/lib/task-persistence';

/**
 * GET /api/execute/stats
 * Returns aggregate execution statistics.
 * Query params: since (ISO date string, defaults to epoch)
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const since = searchParams.get('since') || '1970-01-01';

  const memoryTasks = listTasks(500);
  const memoryIds = new Set(memoryTasks.map(t => t.id));
  const dbTasks = await fetchPersistedTasks({ limit: 500, excludeIds: memoryIds });

  const cutoff = new Date(since);
  const all = [...memoryTasks, ...dbTasks].filter(
    t => new Date(t.createdAt) >= cutoff,
  );

  const total = all.length;

  // Build byStatus map
  const byStatus: Record<string, number> = {};
  for (const t of all) {
    byStatus[t.status] = (byStatus[t.status] || 0) + 1;
  }

  // Build bySquad map
  const bySquad: Record<string, number> = {};
  for (const t of all) {
    const squads = (t as unknown as { squads: Array<{ squadId: string }> }).squads || [];
    for (const squad of squads) {
      bySquad[squad.squadId] = (bySquad[squad.squadId] || 0) + 1;
    }
  }

  // Build byAgent map
  const byAgent: Record<string, number> = {};
  for (const t of all) {
    const squads = (t as unknown as { squads: Array<{ agents?: Array<{ id: string }> }> }).squads || [];
    for (const squad of squads) {
      for (const agent of (squad.agents || [])) {
        byAgent[agent.id] = (byAgent[agent.id] || 0) + 1;
      }
    }
  }

  const completed = byStatus['completed'] || 0;
  const successRate = total > 0 ? parseFloat(((completed / total) * 100).toFixed(1)) : 0;

  return NextResponse.json({
    total,
    byStatus,
    bySquad,
    byAgent,
    successRate,
  });
}
