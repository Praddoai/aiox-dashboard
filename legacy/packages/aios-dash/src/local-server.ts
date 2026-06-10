/**
 * Local Server
 *
 * HTTP server on port 4001 that accepts POST /events from Claude Code hooks.
 * Acts as a drop-in replacement for the monitor server — same interface,
 * but forwards events to the relay instead of storing locally.
 */

const PORT = parseInt(process.env.MONITOR_PORT || '4001');

export interface LocalServerOptions {
  port?: number;
  onEvent: (event: unknown) => void;
}

export function startLocalServer(options: LocalServerOptions): { port: number; stop: () => void } {
  const port = options.port || PORT;

  const server = Bun.serve({
    port,

    async fetch(req: Request) {
      const url = new URL(req.url);

      // CORS
      const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      };

      if (req.method === 'OPTIONS') {
        return new Response(null, { headers });
      }

      // POST /events — receive events from Claude Code hooks
      if (url.pathname === '/events' && req.method === 'POST') {
        try {
          const payload = await req.json();

          // Build event in the same format as server/server.ts
          const event = {
            id: crypto.randomUUID(),
            type: payload.type,
            timestamp: payload.timestamp || Date.now(),
            session_id: payload.data?.session_id || 'unknown',
            project: payload.data?.project,
            cwd: payload.data?.cwd,
            tool_name: payload.data?.tool_name,
            tool_input: payload.data?.tool_input,
            tool_result: payload.data?.tool_result,
            is_error: payload.data?.is_error,
            aios_agent: payload.data?.aios_agent,
            aios_story_id: payload.data?.aios_story_id,
            aios_task_id: payload.data?.aios_task_id,
            data: payload.data,
          };

          // Forward to relay
          options.onEvent(event);

          return new Response(
            JSON.stringify({ ok: true, id: event.id }),
            { headers: { ...headers, 'Content-Type': 'application/json' } }
          );
        } catch {
          return new Response(
            JSON.stringify({ error: 'Invalid payload' }),
            { status: 400, headers: { ...headers, 'Content-Type': 'application/json' } }
          );
        }
      }

      // GET /health — health check
      if (url.pathname === '/health') {
        return new Response(
          JSON.stringify({ status: 'ok', mode: 'relay-proxy', uptime: process.uptime() }),
          { headers: { ...headers, 'Content-Type': 'application/json' } }
        );
      }

      // Root — info
      if (url.pathname === '/') {
        return new Response(
          JSON.stringify({
            name: 'AIOS Dashboard CLI (relay proxy)',
            version: '0.1.0',
            mode: 'relay',
          }),
          { headers: { ...headers, 'Content-Type': 'application/json' } }
        );
      }

      return new Response('Not found', { status: 404 });
    },
  });

  return {
    port: server.port ?? port,
    stop: () => server.stop(),
  };
}
