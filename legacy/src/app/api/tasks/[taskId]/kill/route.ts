import { NextResponse } from 'next/server';
import { getTask, updateTask, killTask, pushEvent } from '@/lib/task-store';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const { taskId } = await params;
  const task = getTask(taskId);

  if (!task) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }

  if (task.status === 'completed' || task.status === 'failed') {
    return NextResponse.json({ error: 'Task already finished' }, { status: 409 });
  }

  const killed = killTask(taskId);
  if (killed) {
    updateTask(taskId, { status: 'failed', error: 'Cancelado pelo usuário' });
    pushEvent(taskId, 'task:failed', { error: 'Cancelado pelo usuário' });
  }

  return NextResponse.json({ taskId, killed });
}
