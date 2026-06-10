/**
 * Connection Mode Detection
 *
 * Detects whether the dashboard is running in local mode (direct to monitor server)
 * or cloud mode (connected to relay server via room).
 */

export type ConnectionMode = 'local' | 'cloud' | 'engine';

export interface ConnectionConfig {
  mode: ConnectionMode;
  /** WebSocket URL for event streaming */
  wsUrl: string;
  /** HTTP URL for REST API calls */
  httpUrl: string;
  /** Room ID (cloud mode only) */
  roomId?: string;
  /** Auth token (cloud mode only) */
  token?: string;
}

const MONITOR_URL = import.meta.env.VITE_MONITOR_URL || 'http://localhost:4001';
const ENGINE_URL = import.meta.env.VITE_ENGINE_URL as string | undefined;
const RELAY_URL = import.meta.env.VITE_RELAY_URL as string | undefined;
const RELAY_HTTP_URL = import.meta.env.VITE_RELAY_HTTP_URL as string | undefined;

/** Check if we're in cloud mode */
export function isCloudMode(): boolean {
  return !!RELAY_URL;
}

/** Get connection config based on URL params and env */
export function getConnectionConfig(): ConnectionConfig {
  // Check URL for room parameter
  const urlParams = new URLSearchParams(window.location.search);
  const roomId = urlParams.get('room') || undefined;
  let storedToken: string | null = null;
  try { storedToken = localStorage.getItem('aios_token'); } catch { /* storage unavailable */ }
  const token = urlParams.get('token') || storedToken || undefined;

  // Cloud mode: relay URL configured and room ID provided
  if (RELAY_URL && roomId && token) {
    return {
      mode: 'cloud',
      wsUrl: `${RELAY_URL}/dashboard?room=${encodeURIComponent(roomId)}&token=${encodeURIComponent(token)}`,
      httpUrl: RELAY_HTTP_URL || RELAY_URL.replace(/^ws/, 'http'),
      roomId,
      token,
    };
  }

  // Engine mode: direct to execution engine (port 4002, WS at /live)
  if (ENGINE_URL) {
    return {
      mode: 'engine',
      wsUrl: `${ENGINE_URL.replace(/^http/, 'ws')}/live`,
      httpUrl: ENGINE_URL,
    };
  }

  // Local mode: direct to monitor server
  return {
    mode: 'local',
    wsUrl: `${MONITOR_URL.replace(/^http/, 'ws')}/stream`,
    httpUrl: MONITOR_URL,
  };
}

/** Get the engine HTTP URL (for direct engine API calls) */
export function getEngineUrl(): string | undefined {
  return ENGINE_URL;
}

/** Store auth token */
export function setAuthToken(token: string): void {
  try { localStorage.setItem('aios_token', token); } catch { /* storage unavailable */ }
}

/** Get stored auth token */
export function getAuthToken(): string | null {
  try { return localStorage.getItem('aios_token'); } catch { return null; }
}

/** Clear auth token */
export function clearAuthToken(): void {
  try { localStorage.removeItem('aios_token'); } catch { /* storage unavailable */ }
}
