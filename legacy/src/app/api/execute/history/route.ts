import { NextResponse } from 'next/server';
import { listTasks } from '@/lib/task-store';
import { fetchPersistedTasks } from '@/lib/task-persistence';

/**
 * GET /api/execute/history
 * Returns execution history from in-memory task store + Supabase persistence.
 * Query params: limit, status, agentId, squadId
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '50', 10);
  const statusFilter = searchParams.get('status');
  const agentIdFilter = searchParams.get('agentId');
  const squadIdFilter = searchParams.get('squadId');

  // Merge in-memory tasks with Supabase historical data
  const memoryTasks = listTasks(limit);
  const memoryIds = new Set(memoryTasks.map(t => t.id));
  const dbTasks = await fetchPersistedTasks({ limit, excludeIds: memoryIds });

  // Combine and normalize to same shape
  let tasks = [
    ...memoryTasks,
    ...dbTasks.map(t => ({
      id: t.id,
      demand: t.demand,
      status: t.status,
      squads: t.squads || [],
      outputs: t.outputs || [],
      createdAt: t.createdAt,
      startedAt: t.startedAt,
      completedAt: t.completedAt,
      error: t.error,
      plan: null as null,
    })),
  ];

  // Filter by status
  if (statusFilter) {
    tasks = tasks.filter(t => t.status === statusFilter);
  }

  // Filter by squadId
  if (squadIdFilter) {
    tasks = tasks.filter(t =>
      t.squads.some(s => s.squadId === squadIdFilter)
    );
  }

  // Filter by agentId
  if (agentIdFilter) {
    tasks = tasks.filter(t =>
      t.squads.some(s => s.agents.some(a => a.id === agentIdFilter))
    );
  }

  // Map to ExecutionRecord format expected by the frontend
  const executions = tasks.map(task => {
    const firstSquad = task.squads[0];
    const firstAgent = firstSquad?.agents[0];
    const lastOutput = task.outputs[task.outputs.length - 1];
    const outputData = lastOutput?.output as Record<string, unknown> | undefined;

    return {
      id: task.id,
      agentId: firstAgent?.id || 'master',
      squadId: firstSquad?.squadId || 'orchestrator',
      status: mapStatus(task.status),
      createdAt: task.createdAt,
      completedAt: task.completedAt,
      input: {
        message: task.demand,
      },
      result: task.status === 'completed' ? {
        agentId: firstAgent?.id || 'master',
        agentName: firstAgent?.name || firstAgent?.id || 'Master',
        message: outputData?.response as string || task.outputs.map(o => {
          const out = o.output as Record<string, unknown>;
          return out?.response || '';
        }).join('\n\n---\n\n'),
        metadata: {
          squad: firstSquad?.squadId || 'orchestrator',
          tier: 0 as const,
          provider: 'claude',
          model: 'claude-max',
          usage: { inputTokens: 0, outputTokens: 0 },
          duration: task.startedAt && task.completedAt
            ? new Date(task.completedAt).getTime() - new Date(task.startedAt).getTime()
            : 0,
          processedAt: task.completedAt || new Date().toISOString(),
          stepsCompleted: task.outputs.length,
          squadsUsed: task.squads.length,
          plan: task.plan ? {
            summary: task.plan.summary,
            totalSteps: task.plan.steps.length,
          } : undefined,
        },
      } : undefined,
      error: task.error ? {
        code: 'EXECUTION_ERROR',
        message: task.error,
      } : undefined,
      tokensUsed: 0,
      duration: task.startedAt && task.completedAt
        ? new Date(task.completedAt).getTime() - new Date(task.startedAt).getTime()
        : undefined,
    };
  });

  return NextResponse.json({
    executions,
    total: executions.length,
  });
}

function mapStatus(status: string): string {
  switch (status) {
    case 'pending':
    case 'analyzing':
    case 'planning':
    case 'awaiting_approval':
      return 'pending';
    case 'executing':
      return 'running';
    case 'completed':
      return 'completed';
    case 'failed':
      return 'failed';
    default:
      return status;
  }
}
