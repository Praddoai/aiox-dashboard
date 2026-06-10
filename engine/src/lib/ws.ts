import type { ServerWebSocket } from 'bun';
import type { WSEvent, WSEventType } from '../types';
import { log } from './logger';

// ============================================================
// WebSocket Bridge — Story 4.3
// Compatible with MonitorStore, WebSocketManager, AgentActivityStore
// ============================================================

interface WSData {
  id: string;
  connectedAt: number;
}

const clients = new Set<ServerWebSocket<WSData>>();
const eventBuffer: WSEvent[] = [];
const MAX_BUFFER = 100;

let clientIdCounter = 0;
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

export function initWSHeartbeat(): void {
  // Ping every 30s — compatible with WebSocketManager heartbeat
  heartbeatTimer = setInterval(() => {
    for (const ws of clients) {
      try {
        ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
      } catch {
        clients.delete(ws);
      }
    }
  }, 30_000);
}

export function stopWSHeartbeat(): void {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
}

export function handleWSOpen(ws: ServerWebSocket<WSData>): void {
  clients.add(ws);
  log.info('WebSocket client connected', { id: ws.data.id, total: clients.size });

  // Send init with buffered events — MonitorStore expects { type: 'init', events: [] }
  if (eventBuffer.length > 0) {
    ws.send(JSON.stringify({
      type: 'init',
      events: eventBuffer.map(e => toMonitorFormat(e)),
    }));
  }

  // Send room_update for MonitorStore CLI connection status
  ws.send(JSON.stringify({
    type: 'room_update',
    payload: { connected: true, engine: true },
    timestamp: Date.now(),
  }));
}

export function handleWSClose(ws: ServerWebSocket<WSData>): void {
  clients.delete(ws);
  log.debug('WebSocket client disconnected', { id: ws.data.id, total: clients.size });
}

export function handleWSMessage(ws: ServerWebSocket<WSData>, message: string | Buffer): void {
  const msg = typeof message === 'string' ? message : message.toString();

  // Handle heartbeat — WebSocketManager sends 'ping', expects 'pong'
  if (msg === 'ping') {
    ws.send('pong');
    return;
  }

  // Handle JSON messages from WebSocketManager
  try {
    const parsed = JSON.parse(msg);
    if (parsed.type === 'ping') {
      ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
      return;
    }

    // Client can subscribe to specific event types
    if (parsed.type === 'subscribe') {
      // Future: per-client event filtering
      return;
    }
  } catch {
    // Not JSON, ignore
  }
}

// Broadcast to all connected clients
export function broadcast(type: WSEventType, data: Record<string, unknown>): void {
  const event: WSEvent = {
    type,
    data,
    timestamp: new Date().toISOString(),
  };

  // Buffer for replay on reconnect
  eventBuffer.push(event);
  if (eventBuffer.length > MAX_BUFFER) {
    eventBuffer.shift();
  }

  // Send in MonitorStore-compatible format
  const monitorEvent = toMonitorFormat(event);
  const eventPayload = JSON.stringify({
    type: 'event',
    event: monitorEvent,
  });

  // Also send raw event for other consumers
  const _rawPayload = JSON.stringify(event);

  for (const ws of clients) {
    try {
      // Send MonitorStore format (primary)
      ws.send(eventPayload);
    } catch {
      clients.delete(ws);
    }
  }
}

export function getWSClientCount(): number {
  return clients.size;
}

export function createWSData(): WSData {
  return {
    id: `ws-${++clientIdCounter}`,
    connectedAt: Date.now(),
  };
}

// -- MonitorStore Compatibility --
// MonitorStore expects events with:
// { id, timestamp, type, agent, description, duration?, success? }

interface MonitorEvent {
  id: string;
  timestamp: string;
  type: 'tool_call' | 'message' | 'error' | 'system';
  agent: string;
  description: string;
  duration?: number;
  success?: boolean;
  // Extra fields for richer data
  aios_agent?: string;
  tool_name?: string;
  tool_result?: string;
  is_error?: boolean;
  jobId?: string;
  squadId?: string;
}

function toMonitorFormat(event: WSEvent): MonitorEvent {
  const data = event.data;

  // Map engine event types to MonitorStore types
  const typeMap: Record<string, MonitorEvent['type']> = {
    'job:created': 'system',
    'job:started': 'system',
    'job:completed': 'message',
    'job:failed': 'error',
    'job:progress': 'tool_call',
    'pool:updated': 'system',
    'workflow:phase_started': 'system',
    'workflow:phase_completed': 'message',
    'workflow:phase_changed': 'system',
    'workflow:completed': 'message',
    'workflow:failed': 'error',
    'memory:stored': 'tool_call',
  };

  const monitorType = typeMap[event.type] ?? 'system';

  // Build description based on event type
  const description = buildDescription(event.type, data);

  return {
    id: `${event.type}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: event.timestamp,
    type: monitorType,
    agent: String(data.agentId ?? data.agent ?? 'engine'),
    description,
    duration: data.duration_ms as number | undefined,
    success: monitorType !== 'error',
    aios_agent: String(data.agentId ?? data.agent ?? ''),
    tool_name: event.type,
    jobId: String(data.jobId ?? ''),
    squadId: String(data.squadId ?? ''),
    is_error: monitorType === 'error',
  };
}

function buildDescription(type: string, data: Record<string, unknown>): string {
  switch (type) {
    case 'job:created':
      return `Job created for ${data.agentId ?? 'agent'} in ${data.squadId ?? 'squad'}`;
    case 'job:started':
      return `Agent ${data.agentId ?? ''} started (slot ${data.slot ?? '?'})`;
    case 'job:completed':
      return `Agent ${data.agentId ?? ''} completed (${data.duration_ms ?? 0}ms, ${data.files_changed ?? 0} files)`;
    case 'job:failed':
      return `Agent ${data.agentId ?? ''} failed: ${String(data.error ?? 'unknown').slice(0, 100)}`;
    case 'job:progress':
      return `Progress: ${data.type ?? 'update'}`;
    case 'pool:updated':
      return `Pool: ${data.occupied ?? 0}/${data.total ?? 0} slots occupied`;
    case 'workflow:phase_started':
      return `Workflow phase "${data.phase ?? ''}" started (${data.agent ?? ''})`;
    case 'workflow:phase_completed':
      return `Workflow phase "${data.phase ?? ''}" ${data.result ?? 'completed'}`;
    case 'workflow:completed':
      return `Workflow completed (${data.totalPhases ?? 0} phases)`;
    case 'workflow:failed':
      return `Workflow failed: ${String(data.error ?? 'unknown').slice(0, 100)}`;
    case 'memory:stored':
      return `Memory stored in scope ${data.scope ?? 'global'}`;
    default:
      return `${type}: ${JSON.stringify(data).slice(0, 100)}`;
  }
}
