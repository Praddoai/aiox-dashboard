/**
 * SSE Stream Route — GET /api/tasks/[taskId]/stream
 *
 * Thin replay + subscribe handler.
 * 1. Replays all buffered events (for reconnection)
 * 2. Subscribes to live events via the task store
 * 3. Sends heartbeats every 15s to keep the connection alive
 * 4. Cleans up on client disconnect
 */

import { getTask, getEventBuffer, subscribe } from '@/lib/task-store';

export const dynamic = 'force-dynamic';

function sseEvent(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const { taskId } = await params;
  const task = getTask(taskId);

  if (!task) {
    return new Response(JSON.stringify({ error: 'Task not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const write = (event: string, data: unknown) => {
        try { controller.enqueue(encoder.encode(sseEvent(event, data))); } catch { /* closed */ }
      };

      // 1. Replay all buffered events
      const buffer = getEventBuffer(taskId);
      for (const evt of buffer) {
        write(evt.event, evt.data);
      }

      // 2. If task already terminal, send current state and close
      if (task.status === 'completed' || task.status === 'failed') {
        write('task:state', { taskId, status: task.status });
        try { controller.close(); } catch { /* already closed */ }
        return;
      }

      // 3. Subscribe to live events
      const unsubscribe = subscribe(taskId, (evt) => {
        write(evt.event, evt.data);

        // Close stream after terminal events
        if (evt.event === 'task:completed' || evt.event === 'task:failed') {
          clearInterval(heartbeat);
          unsubscribe();
          try { controller.close(); } catch { /* already closed */ }
        }
      });

      // 4. Heartbeat to keep connection alive
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': heartbeat\n\n'));
        } catch {
          // Connection gone — clean up
          clearInterval(heartbeat);
          unsubscribe();
        }
      }, 15_000);

      // 5. Handle client disconnect via AbortSignal
      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeat);
        unsubscribe();
        try { controller.close(); } catch { /* already closed */ }
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
