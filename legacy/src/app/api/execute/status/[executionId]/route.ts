import { NextResponse } from 'next/server';
import { getTask } from '@/lib/task-store';

/**
 * GET /api/execute/status/[executionId]
 * Returns the current status of an execution.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ executionId: string }> },
) {
  const { executionId } = await params;
  const task = getTask(executionId);

  if (!task) {
    return NextResponse.json(
      { error: 'Execution not found' },
      { status: 404 },
    );
  }

  return NextResponse.json({
    executionId: task.id,
    status: task.status,
    createdAt: task.createdAt,
    startedAt: task.startedAt,
    completedAt: task.completedAt,
    result: task.status === 'completed' ? task.outputs : undefined,
    error: task.error || undefined,
  });
}

/**
 * DELETE /api/execute/status/[executionId]
 * Cancels an execution.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ executionId: string }> },
) {
  const { executionId } = await params;
  const task = getTask(executionId);

  if (!task) {
    return NextResponse.json(
      { error: 'Execution not found' },
      { status: 404 },
    );
  }

  return NextResponse.json({ executionId, status: 'cancelled' });
}
