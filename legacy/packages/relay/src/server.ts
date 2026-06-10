/**
 * AIOS Relay Server
 *
 * Cloud relay for AIOS Dashboard. Receives events from CLI via WebSocket,
 * broadcasts to connected dashboard clients in real-time.
 *
 * Phase 1 MVP: In-memory rooms, API key auth, no database.
 */

import { roomManager } from './rooms';
import { validateApiKey, extractApiKey } from './auth';
import type { WsData, CliMessage, RelayEvent, Room } from './types';

const PORT = parseInt(process.env.PORT || '8080');
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

/** Generate room ID */
function generateRoomId(userId: string, projectName: string): string {
  const random = Math.random().toString(36).slice(2, 8);
  const project = projectName.replace(/[^a-z0-9]/gi, '-').slice(0, 20).toLowerCase();
  return `room_${userId.slice(0, 8)}_${project}_${random}`;
}

/** CORS headers */
function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': CORS_ORIGIN,
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
  };
}

/** JSON response helper */
function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
  });
}

/** Error response helper */
function errorJson(message: string, status = 400): Response {
  return json({ error: message }, status);
}

/** Authenticate request middleware */
function authRequest(req: Request): { userId: string } | Response {
  const key = extractApiKey(req);
  if (!key) return errorJson('Missing API key', 401);

  const { valid, userId } = validateApiKey(key);
  if (!valid) return errorJson('Invalid API key', 403);

  return { userId };
}

const server = Bun.serve<WsData>({
  port: PORT,

  async fetch(req: Request, server: any) {
    const url = new URL(req.url);

    // CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders() });
    }

    // === WebSocket Upgrades ===

    // CLI WebSocket: /cli?token=KEY&room=ROOM_ID
    if (url.pathname === '/cli') {
      const token = url.searchParams.get('token');
      const roomId = url.searchParams.get('room');

      if (!token) return errorJson('Missing token', 401);
      if (!roomId) return errorJson('Missing room', 400);

      const { valid, userId } = validateApiKey(token);
      if (!valid) return errorJson('Invalid token', 403);

      // Verify room belongs to user
      const room = roomManager.getRoom(roomId);
      if (room && room.userId !== userId) {
        return errorJson('Room access denied', 403);
      }

      const upgraded = server.upgrade(req, {
        data: { roomId, userId, role: 'cli' as const },
      });
      if (!upgraded) return errorJson('WebSocket upgrade failed', 400);
      return undefined;
    }

    // Dashboard WebSocket: /dashboard?token=KEY&room=ROOM_ID
    if (url.pathname === '/dashboard') {
      const token = url.searchParams.get('token');
      const roomId = url.searchParams.get('room');

      if (!token) return errorJson('Missing token', 401);
      if (!roomId) return errorJson('Missing room', 400);

      const { valid, userId } = validateApiKey(token);
      if (!valid) return errorJson('Invalid token', 403);

      // Verify room belongs to user
      const room = roomManager.getRoom(roomId);
      if (room && room.userId !== userId) {
        return errorJson('Room access denied', 403);
      }

      const upgraded = server.upgrade(req, {
        data: { roomId, userId, role: 'dashboard' as const },
      });
      if (!upgraded) return errorJson('WebSocket upgrade failed', 400);
      return undefined;
    }

    // === REST API ===

    // Health check (no auth)
    if (url.pathname === '/health') {
      return json({
        status: 'ok',
        rooms: roomManager.totalRooms,
        uptime: process.uptime(),
      });
    }

    // Root — API info (no auth)
    if (url.pathname === '/') {
      return json({
        name: 'AIOS Relay Server',
        version: '0.1.0',
        endpoints: {
          'GET /health': 'Health check',
          'POST /rooms': 'Create a room',
          'GET /rooms': 'List your rooms',
          'GET /rooms/:id': 'Room details',
          'DELETE /rooms/:id': 'Delete a room',
          'GET /rooms/:id/events': 'Get buffered events',
          'GET /rooms/:id/stats': 'Room statistics',
          'WSS /cli?token=&room=': 'CLI WebSocket',
          'WSS /dashboard?token=&room=': 'Dashboard WebSocket',
        },
      });
    }

    // --- Authenticated endpoints ---

    // POST /rooms — Create room
    if (url.pathname === '/rooms' && req.method === 'POST') {
      const auth = authRequest(req);
      if (auth instanceof Response) return auth;

      const body = await req.json().catch(() => ({})) as {
        projectName?: string;
        projectPath?: string;
        roomId?: string;
      };
      const projectName = body.projectName || 'unknown';
      const roomId = body.roomId || generateRoomId(auth.userId, projectName);

      const room = roomManager.createRoom(roomId, auth.userId, projectName, body.projectPath);
      return json({ room }, 201);
    }

    // GET /rooms — List user's rooms
    if (url.pathname === '/rooms' && req.method === 'GET') {
      const auth = authRequest(req);
      if (auth instanceof Response) return auth;

      const rooms = roomManager.getUserRooms(auth.userId);
      return json({ rooms });
    }

    // Room-specific endpoints: /rooms/:id/...
    const roomMatch = url.pathname.match(/^\/rooms\/([^/]+)(\/.*)?$/);
    if (roomMatch) {
      const auth = authRequest(req);
      if (auth instanceof Response) return auth;

      const roomId = roomMatch[1];
      const subPath = roomMatch[2] || '';
      const room = roomManager.getRoom(roomId);

      if (!room) return errorJson('Room not found', 404);
      if (room.userId !== auth.userId) return errorJson('Room access denied', 403);

      // GET /rooms/:id — Room details
      if (!subPath && req.method === 'GET') {
        return json({ room });
      }

      // DELETE /rooms/:id — Delete room
      if (!subPath && req.method === 'DELETE') {
        roomManager.deleteRoom(roomId);
        return json({ ok: true });
      }

      // GET /rooms/:id/events — Buffered events
      if (subPath === '/events' && req.method === 'GET') {
        const events = roomManager.getEvents(roomId);
        return json({ events });
      }

      // GET /rooms/:id/stats — Room stats
      if (subPath === '/stats' && req.method === 'GET') {
        const stats = roomManager.getStats(roomId);
        return json({ room, stats });
      }
    }

    return new Response('Not found', { status: 404, headers: corsHeaders() });
  },

  websocket: {
    open(ws: any) {
      const { roomId, userId, role } = ws.data;

      if (role === 'cli') {
        // CLI connected — mark room as active
        roomManager.setCliConnected(roomId, true);
        const room = roomManager.getRoom(roomId);

        // Subscribe to room topic for receiving dashboard messages
        ws.subscribe(`room:${roomId}`);

        // Send confirmation
        ws.send(JSON.stringify({ type: 'connected', room }));
        console.log(`[CLI] Connected to room ${roomId} (user: ${userId})`);
      }

      if (role === 'dashboard') {
        // Dashboard connected — send buffer replay
        ws.subscribe(`room:${roomId}`);
        roomManager.addDashboardClient(roomId);

        const events = roomManager.getEvents(roomId);
        const room = roomManager.getRoom(roomId);

        ws.send(JSON.stringify({
          type: 'init',
          events,
          room,
        }));
        console.log(`[Dashboard] Connected to room ${roomId} (user: ${userId})`);
      }
    },

    message(ws: any, message: string | Buffer) {
      const { roomId, role } = ws.data;
      const raw = typeof message === 'string' ? message : new TextDecoder().decode(message as unknown as ArrayBuffer);

      // Handle ping/pong
      if (raw === 'ping') {
        ws.send('pong');
        return;
      }

      let parsed: CliMessage;
      try {
        parsed = JSON.parse(raw);
      } catch {
        return; // Ignore malformed messages
      }

      if (parsed.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong' }));
        return;
      }

      if (role === 'cli') {
        // CLI sends events → buffer + broadcast
        if (parsed.type === 'event' && parsed.event) {
          roomManager.addEvent(roomId, parsed.event);
          // Broadcast to all dashboard clients in the room
          server.publish(`room:${roomId}`, JSON.stringify({
            type: 'event',
            event: parsed.event,
          }));
        }

        if (parsed.type === 'bulk_events' && parsed.events) {
          roomManager.addBulkEvents(roomId, parsed.events);
          // Send bulk as individual events to dashboards
          for (const event of parsed.events) {
            server.publish(`room:${roomId}`, JSON.stringify({
              type: 'event',
              event,
            }));
          }
        }
      }

      // Dashboard clients are read-only in Phase 1
    },

    close(ws: any) {
      const { roomId, userId, role } = ws.data;

      if (role === 'cli') {
        roomManager.setCliConnected(roomId, false);
        // Notify dashboards that CLI disconnected
        const room = roomManager.getRoom(roomId);
        server.publish(`room:${roomId}`, JSON.stringify({
          type: 'room_update',
          room,
        }));
        console.log(`[CLI] Disconnected from room ${roomId}`);
      }

      if (role === 'dashboard') {
        roomManager.removeDashboardClient(roomId);
        console.log(`[Dashboard] Disconnected from room ${roomId}`);
      }

      ws.unsubscribe(`room:${roomId}`);
    },
  },
});

console.log(`
╔══════════════════════════════════════════════════════════════╗
║              AIOS RELAY SERVER v0.1.0                       ║
╠══════════════════════════════════════════════════════════════╣
║  Server:     http://localhost:${PORT}                           ║
║  WebSocket:  ws://localhost:${PORT}/cli                         ║
║              ws://localhost:${PORT}/dashboard                   ║
╠══════════════════════════════════════════════════════════════╣
║  REST Endpoints:                                             ║
║  GET    /health              Health check                    ║
║  POST   /rooms               Create room                    ║
║  GET    /rooms               List rooms                      ║
║  GET    /rooms/:id           Room details                    ║
║  DELETE /rooms/:id           Delete room                     ║
║  GET    /rooms/:id/events    Buffered events                 ║
║  GET    /rooms/:id/stats     Room statistics                 ║
╠══════════════════════════════════════════════════════════════╣
║  WebSocket:                                                  ║
║  WSS /cli?token=&room=       CLI → Relay                     ║
║  WSS /dashboard?token=&room= Dashboard ← Relay              ║
╚══════════════════════════════════════════════════════════════╝
`);
