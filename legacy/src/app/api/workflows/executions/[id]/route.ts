import { NextResponse } from 'next/server';
import { getTask } from '@/lib/task-store';
import { fetchPersistedTask } from '@/lib/task-persistence';

/**
 * GET /api/workflows/executions/[id]
 * Returns a single workflow execution by ID.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Try in-memory first
  const task = getTask(id);
  if (task) {
    return NextResponse.json({
      id: task.id,
      status: task.status,
      demand: task.demand,
      createdAt: task.createdAt,
      startedAt: task.startedAt,
      completedAt: task.completedAt,
      outputs: task.outputs,
      squads: task.squads,
      plan: task.plan || null,
      error: task.error,
    });
  }

  // Fallback to Supabase
  const persisted = await fetchPersistedTask(id);
  if (persisted) {
    return NextResponse.json({
      id: persisted.id,
      status: persisted.status,
      demand: persisted.demand,
      createdAt: persisted.createdAt,
      startedAt: persisted.startedAt,
      completedAt: persisted.completedAt,
      outputs: persisted.outputs,
      squads: persisted.squads,
      plan: null,
      error: persisted.error,
      source: 'database',
    });
  }

  return NextResponse.json({ error: 'Execution not found' }, { status: 404 });
}
