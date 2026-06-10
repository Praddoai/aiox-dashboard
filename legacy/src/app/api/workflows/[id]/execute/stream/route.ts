import { randomUUID } from 'crypto';
import { createTask } from '@/lib/task-store';

export const dynamic = 'force-dynamic';

/**
 * POST /api/workflows/[id]/execute/stream
 * Execute a workflow and stream progress via SSE.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const taskId = randomUUID();
  const decodedId = decodeURIComponent(id);
  const demand = body.input?.message || `Execute workflow ${decodedId}`;
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

      send('workflow:started', {
        executionId: taskId,
        workflowId: decodedId,
      });

      setTimeout(() => {
        send('workflow:completed', {
          executionId: taskId,
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
