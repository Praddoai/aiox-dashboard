import { NextResponse } from 'next/server';
import { createTask } from '@/lib/task-store';

/**
 * POST /api/execute/orchestrate
 * Creates an orchestrated multi-squad execution task.
 * Body: { demand, squads?, options? }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { demand, squads, options } = body;

    if (!demand) {
      return NextResponse.json(
        { error: 'demand is required' },
        { status: 400 },
      );
    }

    const id = crypto.randomUUID();
    const task = createTask(id, demand);

    return NextResponse.json({
      taskId: task.id,
      status: 'queued',
    }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/execute/orchestrate] Error:', error);
    return NextResponse.json(
      { error: 'Orchestration failed' },
      { status: 500 },
    );
  }
}
