import { randomUUID } from 'crypto';
import { createTask } from '@/lib/task-store';

export const dynamic = 'force-dynamic';

/**
 * POST /api/workflows/orchestrate/stream
 * Smart orchestration endpoint that streams progress via SSE.
 */
export async function POST(request: Request) {
  const body = await request.json();
  const taskId = randomUUID();
  const demand = body.input?.message || body.demand || 'Smart orchestration';
  createTask(taskId, demand);

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const send = (event: string, data: unknown) => {
        try {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
          );
        } catch {
          /* stream closed */
        }
      };

      send('orchestration:started', { taskId });

      setTimeout(() => {
        send('orchestration:completed', {
          taskId,
          status: 'completed',
        });
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      }, 100);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
