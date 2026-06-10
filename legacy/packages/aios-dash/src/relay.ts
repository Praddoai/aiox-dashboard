/**
 * Relay Connection
 *
 * Manages WebSocket connection to the relay server with:
 * - Exponential backoff reconnection
 * - Local event buffering during disconnection
 * - Bulk event backfill on reconnect
 * - Ping/pong keepalive
 */

const MAX_LOCAL_BUFFER = 100;
const KEEPALIVE_INTERVAL_MS = 30_000;
const BACKOFF_DELAYS = [1000, 2000, 5000, 10_000, 30_000];

export interface RelayConnectionOptions {
  relayUrl: string;
  apiKey: string;
  roomId: string;
  onConnected?: (room: unknown) => void;
  onDisconnected?: () => void;
  onError?: (error: string) => void;
}

export class RelayConnection {
  private ws: WebSocket | null = null;
  private options: RelayConnectionOptions;
  private localBuffer: unknown[] = [];
  private reconnectAttempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private keepaliveTimer: ReturnType<typeof setInterval> | null = null;
  private intentionalClose = false;
  private _connected = false;

  constructor(options: RelayConnectionOptions) {
    this.options = options;
  }

  get connected(): boolean {
    return this._connected;
  }

  /** Connect to relay server */
  connect(): void {
    this.intentionalClose = false;
    this.reconnectAttempt = 0;
    this.openConnection();
  }

  /** Disconnect from relay */
  disconnect(): void {
    this.intentionalClose = true;
    this.cleanup();
    this._connected = false;
    this.options.onDisconnected?.();
  }

  /** Send an event to the relay */
  sendEvent(event: unknown): void {
    const message = JSON.stringify({ type: 'event', event });

    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(message);
    } else {
      // Buffer locally while disconnected
      this.localBuffer.push(event);
      if (this.localBuffer.length > MAX_LOCAL_BUFFER) {
        this.localBuffer = this.localBuffer.slice(-MAX_LOCAL_BUFFER);
      }
    }
  }

  private openConnection(): void {
    const { relayUrl, apiKey, roomId } = this.options;
    const wsUrl = `${relayUrl}/cli?token=${encodeURIComponent(apiKey)}&room=${encodeURIComponent(roomId)}`;

    try {
      this.ws = new WebSocket(wsUrl);
    } catch (err) {
      console.error('[Relay] Failed to create WebSocket:', err);
      this.scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      this._connected = true;
      this.reconnectAttempt = 0;
      this.startKeepalive();

      // Flush local buffer on reconnect
      if (this.localBuffer.length > 0) {
        const events = [...this.localBuffer];
        this.localBuffer = [];
        this.ws?.send(JSON.stringify({ type: 'bulk_events', events }));
      }
    };

    this.ws.onmessage = (msg) => {
      try {
        const data = JSON.parse(msg.data);

        if (data.type === 'connected') {
          this.options.onConnected?.(data.room);
        }

        if (data.type === 'pong') {
          // Keepalive acknowledged
        }
      } catch {
        // Ignore malformed
      }
    };

    this.ws.onclose = () => {
      this._connected = false;
      this.stopKeepalive();

      if (!this.intentionalClose) {
        this.options.onDisconnected?.();
        this.scheduleReconnect();
      }
    };

    this.ws.onerror = () => {
      this.options.onError?.('WebSocket error');
    };
  }

  private scheduleReconnect(): void {
    if (this.intentionalClose) return;

    const delay = BACKOFF_DELAYS[Math.min(this.reconnectAttempt, BACKOFF_DELAYS.length - 1)];
    this.reconnectAttempt++;

    console.log(`[Relay] Reconnecting in ${delay / 1000}s (attempt ${this.reconnectAttempt})...`);
    this.reconnectTimer = setTimeout(() => this.openConnection(), delay);
  }

  private startKeepalive(): void {
    this.stopKeepalive();
    this.keepaliveTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, KEEPALIVE_INTERVAL_MS);
  }

  private stopKeepalive(): void {
    if (this.keepaliveTimer) {
      clearInterval(this.keepaliveTimer);
      this.keepaliveTimer = null;
    }
  }

  private cleanup(): void {
    this.stopKeepalive();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.onerror = null;
      this.ws.close();
      this.ws = null;
    }
  }
}
