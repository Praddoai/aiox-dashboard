import { NextResponse } from 'next/server';
import { createTask } from '@/lib/task-store';

/**
 * POST /api/execute/agent/stream
 * Creates an agent execution and returns an SSE stream of progress events.
 * Body: { squadId, agentId, input: { message }, options? }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { squadId, agentId, input } = body;

    if (!squadId || !agentId || !input?.message) {
      return NextResponse.json(
        { error: 'Missing required fields: squadId, agentId, input.message' },
        { status: 400 },
      );
    }

    const id = crypto.randomUUID();
    const task = createTask(id, input.message);

    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        const send = (event: string, data: unknown) => {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
          );
        };

        send('task:state', { taskId: task.id, status: 'queued' });
        send('task:analyzing', { taskId: task.id, message: 'Analyzing request...' });

        setTimeout(() => {
          send('task:completed', {
            taskId: task.id,
            status: 'completed',
            result: { response: 'Execution completed' },
          });
          controller.close();
        }, 100);
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('[POST /api/execute/agent/stream] Error:', error);
    return NextResponse.json(
      { error: 'Stream failed' },
      { status: 500 },
    );
  }
}
