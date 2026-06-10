import { NextResponse } from 'next/server';
import { getTask } from '@/lib/task-store';
import { revisePlan } from '@/lib/task-executor';

export async function POST(
  request: Request,
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

  const body = await request.json().catch(() => ({}));
  const feedback = (body as Record<string, unknown>).feedback as string;

  if (!feedback?.trim()) {
    return NextResponse.json({ error: 'feedback is required' }, { status: 400 });
  }

  // Fire-and-forget — re-planning runs in background
  revisePlan(taskId, feedback.trim());

  return NextResponse.json({
    taskId,
    status: 're-planning',
    message: 'Feedback received. Re-planning in progress.',
  });
}
