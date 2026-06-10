import { NextResponse } from 'next/server';
import { listTasks } from '@/lib/task-store';
import { fetchPersistedTasks } from '@/lib/task-persistence';

/**
 * GET /api/events/history?limit=20
 * Returns system events derived from task execution history (in-memory + Supabase).
 * Includes agent, description, duration, success fields for useAgentActivity hook.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '20', 10);

  // Merge in-memory + Supabase historical tasks
  const memoryTasks = listTasks(100);
  const memoryIds = new Set(memoryTasks.map(t => t.id));
  const dbTasks = await fetchPersistedTasks({ limit: 100, excludeIds: memoryIds });

  const tasks = [
    ...memoryTasks.map(t => ({ id: t.id, demand: t.demand, status: t.status, squads: t.squads, createdAt: t.createdAt, startedAt: t.startedAt, completedAt: t.completedAt, error: t.error })),
    ...dbTasks.map(t => ({ id: t.id, demand: t.demand, status: t.status, squads: t.squads, createdAt: t.createdAt, startedAt: t.startedAt, completedAt: t.completedAt, error: t.error })),
  ];

  const events: Array<{
    id: string;
    timestamp: string;
    type: string;
    message: string;
    severity: 'info' | 'warning' | 'error';
    source: string;
    agent?: string;
    description?: string;
    duration?: number;
    success?: boolean;
  }> = [];

  // Generate events from task lifecycle
  for (const task of tasks) {
    // Derive agent name from the first squad's first agent, or fallback to source
    const firstAgent = task.squads?.[0]?.agents?.[0]?.name || undefined;

    // Calculate duration if both timestamps exist
    const durationMs = task.startedAt && task.completedAt
      ? new Date(task.completedAt).getTime() - new Date(task.startedAt).getTime()
      : undefined;

    events.push({
      id: `${task.id}-created`,
      timestamp: task.createdAt,
      type: 'task.created',
      message: `Task created: ${task.demand.slice(0, 80)}`,
      severity: 'info',
      source: 'orchestrator',
      agent: firstAgent,
      description: task.demand.slice(0, 120),
    });

    if (task.startedAt) {
      events.push({
        id: `${task.id}-started`,
        timestamp: task.startedAt,
        type: 'task.started',
        message: `Execution started for task ${task.id.slice(0, 8)}`,
        severity: 'info',
        source: 'executor',
        agent: firstAgent,
        description: `Started: ${task.demand.slice(0, 100)}`,
      });
    }

    if (task.status === 'completed' && task.completedAt) {
      events.push({
        id: `${task.id}-completed`,
        timestamp: task.completedAt,
        type: 'task.completed',
        message: `Task completed: ${task.demand.slice(0, 60)}`,
        severity: 'info',
        source: 'executor',
        agent: firstAgent,
        description: `Completed: ${task.demand.slice(0, 100)}`,
        duration: durationMs,
        success: true,
      });
    }

    if (task.status === 'failed') {
      events.push({
        id: `${task.id}-failed`,
        timestamp: task.completedAt || task.createdAt,
        type: 'task.failed',
        message: `Task failed: ${task.error || 'Unknown error'}`,
        severity: 'error',
        source: 'executor',
        agent: firstAgent,
        description: task.error || 'Unknown error',
        duration: durationMs,
        success: false,
      });
    }
  }

  // Sort by timestamp, most recent first
  events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const limited = events.slice(0, limit);

  return NextResponse.json({ events: limited, total: events.length });
}
