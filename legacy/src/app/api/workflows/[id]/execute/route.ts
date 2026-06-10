import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { createTask } from '@/lib/task-store';

/**
 * POST /api/workflows/[id]/execute
 * Execute a workflow by creating a task.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const taskId = randomUUID();
  const demand = body.input?.message || `Execute workflow ${decodeURIComponent(id)}`;
  createTask(taskId, demand);

  return NextResponse.json(
    {
      executionId: taskId,
      workflowId: decodeURIComponent(id),
      status: 'queued',
    },
    { status: 201 }
  );
}
