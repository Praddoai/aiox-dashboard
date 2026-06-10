import { NextResponse } from 'next/server';
import { getTask, updateTask, killTask } from '@/lib/task-store';

/**
 * POST /api/workflows/executions/[id]/cancel
 * Cancel a running workflow execution.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const task = getTask(id);

  if (!task) {
    return NextResponse.json({ error: 'Execution not found' }, { status: 404 });
  }

  // Attempt to kill the running process
  killTask(id);

  updateTask(id, {
    status: 'failed',
    error: 'Cancelled by user',
    completedAt: new Date().toISOString(),
  });

  return NextResponse.json({ id, status: 'cancelled' });
}
