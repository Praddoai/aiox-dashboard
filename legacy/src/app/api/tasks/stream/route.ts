import { listTasks } from '@/lib/task-store';

export const dynamic = 'force-dynamic';

/**
 * GET /api/tasks/stream
 * Global SSE stream for all tasks. Sends a snapshot of current tasks
 * and keeps the connection alive with heartbeats.
 */
export async function GET(request: Request) {
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

      // Send current tasks snapshot
      const tasks = listTasks(50);
      send('snapshot', {
        tasks: tasks.map((t) => ({
          id: t.id,
          status: t.status,
          demand: t.demand,
          createdAt: t.createdAt,
        })),
      });

      // Keep alive with heartbeat
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': heartbeat\n\n'));
        } catch {
          clearInterval(heartbeat);
        }
      }, 15_000);

      // Clean up on client disconnect
      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeat);
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      });
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
