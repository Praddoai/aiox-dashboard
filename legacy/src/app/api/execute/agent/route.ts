import { NextResponse } from 'next/server';
import { createTask } from '@/lib/task-store';

/**
 * POST /api/execute/agent
 * Creates a new agent execution task.
 * Body: { squadId, agentId, input: { message }, options? }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { squadId, agentId, input, options } = body;

    if (!squadId || !agentId || !input?.message) {
      return NextResponse.json(
        { error: 'Missing required fields: squadId, agentId, input.message' },
        { status: 400 },
      );
    }

    const id = crypto.randomUUID();
    const task = createTask(id, input.message);

    return NextResponse.json({
      executionId: task.id,
      status: 'queued',
      squadId,
      agentId,
    }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/execute/agent] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create execution' },
      { status: 500 },
    );
  }
}
