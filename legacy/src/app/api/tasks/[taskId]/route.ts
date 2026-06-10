import { NextResponse } from 'next/server';
import { getTask } from '@/lib/task-store';
import { fetchPersistedTask } from '@/lib/task-persistence';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const { taskId } = await params;

  // Try in-memory first (live/recent tasks)
  const task = getTask(taskId);
  if (task) {
    return NextResponse.json({
      id: task.id,
      demand: task.demand,
      status: task.status,
      squads: task.squads,
      workflow: null,
      outputs: task.outputs,
      plan: task.plan || null,
      createdAt: task.createdAt,
      startedAt: task.startedAt,
      completedAt: task.completedAt,
      error: task.error,
    });
  }

  // Fallback to Supabase for historical tasks
  const persisted = await fetchPersistedTask(taskId);
  if (persisted) {
    return NextResponse.json({
      id: persisted.id,
      demand: persisted.demand,
      status: persisted.status,
      squads: persisted.squads,
      workflow: null,
      outputs: persisted.outputs,
      plan: null,
      createdAt: persisted.createdAt,
      startedAt: persisted.startedAt,
      completedAt: persisted.completedAt,
      error: persisted.error,
      source: 'database',
    });
  }

  return NextResponse.json({ error: 'Task not found' }, { status: 404 });
}
