/**
 * Relay Server Types
 *
 * Shared types for the relay server, CLI, and dashboard communication.
 */

// Re-export event types from server (same format)
export type EventType =
  | 'PreToolUse'
  | 'PostToolUse'
  | 'UserPromptSubmit'
  | 'Stop'
  | 'SubagentStop'
  | 'Notification'
  | 'PreCompact'
  | 'SessionStart';

export interface RelayEvent {
  id: string;
  type: EventType;
  timestamp: number;
  session_id: string;
  project?: string;
  cwd?: string;
  agent?: string;
  tool_name?: string;
  tool_input?: Record<string, unknown>;
  tool_result?: string;
  is_error?: boolean;
  duration_ms?: number;
  aios_agent?: string;
  aios_story_id?: string;
  aios_task_id?: string;
  data?: Record<string, unknown>;
}

export interface Room {
  id: string;
  userId: string;
  projectName: string;
  projectPath?: string;
  status: 'active' | 'idle' | 'closed';
  createdAt: number;
  lastActivity: number;
  cliConnected: boolean;
  dashboardClients: number;
}

/** Messages from CLI → Relay */
export type CliMessage =
  | { type: 'event'; event: RelayEvent }
  | { type: 'bulk_events'; events: RelayEvent[] }
  | { type: 'ping' };

/** Messages from Relay → Dashboard */
export type DashboardMessage =
  | { type: 'init'; events: RelayEvent[]; room: Room }
  | { type: 'event'; event: RelayEvent }
  | { type: 'room_update'; room: Room }
  | { type: 'pong' };

/** Messages from Relay → CLI */
export type RelayToCliMessage =
  | { type: 'connected'; room: Room }
  | { type: 'pong' };

/** WebSocket connection data */
export interface WsData {
  roomId: string;
  userId: string;
  role: 'cli' | 'dashboard';
}
