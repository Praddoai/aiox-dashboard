import { NextResponse } from 'next/server';
import { getTask } from '@/lib/task-store';
import { approveAndExecute } from '@/lib/task-executor';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const { taskId } = await params;
  const task = getTask(taskId);

  if (!task) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }

  if (task.status !== 'awaiting_approval') {
    return NextResponse.json(
      { error: `Task is in "${task.status}" state, expected "awaiting_approval"` },
      { status: 409 },
    );
  }

  if (!task.plan) {
    return NextResponse.json({ error: 'No plan to approve' }, { status: 400 });
  }

  // Fire-and-forget — execution runs in background
  approveAndExecute(taskId);

  return NextResponse.json({
    taskId,
    status: 'executing',
    message: 'Plan approved. Execution started.',
    stepCount: task.plan.steps.length,
  });
}
