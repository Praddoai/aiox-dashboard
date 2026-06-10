type MessageHandler = (data: unknown) => void;
type ConnectionHandler = () => void;
type ErrorHandler = (error: Event) => void;

export interface WebSocketMessage {
  type: string;
  payload: unknown;
  timestamp?: number;
  id?: string;
}

export type WebSocketStatus = 'connecting' | 'connected' | 'disconnected' | 'reconnecting';

interface WebSocketConfig {
  url: string;
  protocols?: string[];
  reconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
  messageQueueSize?: number;
}

const DEFAULT_CONFIG: Partial<WebSocketConfig> = {
  reconnect: true,
  reconnectInterval: 3000,
  maxReconnectAttempts: 10,
  heartbeatInterval: 30000,
  messageQueueSize: 100,
};

export class WebSocketManager {
  private ws: WebSocket | null = null;
  private config: WebSocketConfig;
  private status: WebSocketStatus = 'disconnected';
  private reconnectAttempts = 0;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private messageQueue: WebSocketMessage[] = [];
  private lastMessageId = 0;

  // Event handlers
  private messageHandlers = new Map<string, Set<MessageHandler>>();
  private connectionHandlers = new Set<ConnectionHandler>();
  private disconnectionHandlers = new Set<ConnectionHandler>();
  private errorHandlers = new Set<ErrorHandler>();
  private statusChangeHandlers = new Set<(status: WebSocketStatus) => void>();

  constructor(config: WebSocketConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // Status management
  private setStatus(status: WebSocketStatus) {
    if (this.status !== status) {
      this.status = status;
      this.statusChangeHandlers.forEach(handler => handler(status));
    }
  }

  getStatus(): WebSocketStatus {
    return this.status;
  }

  isConnected(): boolean {
    return this.status === 'connected' && this.ws?.readyState === WebSocket.OPEN;
  }

  // Connection management
  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN || this.ws?.readyState === WebSocket.CONNECTING) {
      console.log('[WS] Already connected or connecting');
      return;
    }

    this.setStatus('connecting');
    console.log('[WS] Connecting to', this.config.url);

    try {
      this.ws = new WebSocket(this.config.url, this.config.protocols);
      this.setupEventListeners();
    } catch (error) {
      console.error('[WS] Connection error:', error);
      this.handleDisconnect();
    }
  }

  disconnect(): void {
    console.log('[WS] Disconnecting');
    this.stopReconnect();
    this.stopHeartbeat();

    if (this.ws) {
      this.ws.onclose = null; // Prevent reconnect on intentional close
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }

    this.setStatus('disconnected');
  }

  private setupEventListeners(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      console.log('[WS] Connected');
      this.setStatus('connected');
      this.reconnectAttempts = 0;
      this.startHeartbeat();
      this.flushMessageQueue();
      this.connectionHandlers.forEach(handler => handler());
    };

    this.ws.onclose = (event) => {
      console.log('[WS] Disconnected:', event.code, event.reason);
      this.stopHeartbeat();
      this.disconnectionHandlers.forEach(handler => handler());
      this.handleDisconnect();
    };

    this.ws.onerror = (error) => {
      console.error('[WS] Error:', error);
      this.errorHandlers.forEach(handler => handler(error));
    };

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as WebSocketMessage;
        this.handleMessage(message);
      } catch (error) {
        console.error('[WS] Failed to parse message:', error);
      }
    };
  }

  private handleMessage(message: WebSocketMessage): void {
    // Handle pong (heartbeat response)
    if (message.type === 'pong') {
      return;
    }

    // Dispatch to type-specific handlers
    const handlers = this.messageHandlers.get(message.type);
    if (handlers) {
      handlers.forEach(handler => handler(message.payload));
    }

    // Also dispatch to wildcard handlers
    const wildcardHandlers = this.messageHandlers.get('*');
    if (wildcardHandlers) {
      wildcardHandlers.forEach(handler => handler(message));
    }
  }

  private handleDisconnect(): void {
    this.ws = null;

    if (!this.config.reconnect) {
      this.setStatus('disconnected');
      return;
    }

    if (this.reconnectAttempts >= (this.config.maxReconnectAttempts || 10)) {
      console.log('[WS] Max reconnect attempts reached');
      this.setStatus('disconnected');
      return;
    }

    this.setStatus('reconnecting');
    this.scheduleReconnect();
  }

  private scheduleReconnect(): void {
    const delay = this.calculateReconnectDelay();
    console.log(`[WS] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts + 1})`);

    this.reconnectTimeout = setTimeout(() => {
      this.reconnectAttempts++;
      this.connect();
    }, delay);
  }

  private calculateReconnectDelay(): number {
    // Exponential backoff with jitter
    const baseDelay = this.config.reconnectInterval || 3000;
    const exponentialDelay = Math.min(baseDelay * Math.pow(1.5, this.reconnectAttempts), 30000);
    const jitter = exponentialDelay * 0.2 * Math.random();
    return Math.floor(exponentialDelay + jitter);
  }

  private stopReconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  // Heartbeat to keep connection alive
  private startHeartbeat(): void {
    if (!this.config.heartbeatInterval) return;

    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected()) {
        this.send({ type: 'ping', payload: { timestamp: Date.now() } });
      }
    }, this.config.heartbeatInterval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // Message sending
  send(message: Omit<WebSocketMessage, 'id' | 'timestamp'>): boolean {
    const fullMessage: WebSocketMessage = {
      ...message,
      id: `msg_${++this.lastMessageId}`,
      timestamp: Date.now(),
    };

    if (this.isConnected()) {
      try {
        this.ws!.send(JSON.stringify(fullMessage));
        return true;
      } catch (error) {
        console.error('[WS] Send error:', error);
        this.queueMessage(fullMessage);
        return false;
      }
    }

    // Queue message for later if not connected
    this.queueMessage(fullMessage);
    return false;
  }

  private queueMessage(message: WebSocketMessage): void {
    const maxSize = this.config.messageQueueSize || 100;

    if (this.messageQueue.length >= maxSize) {
      this.messageQueue.shift(); // Remove oldest message
    }

    this.messageQueue.push(message);
  }

  private flushMessageQueue(): void {
    while (this.messageQueue.length > 0 && this.isConnected()) {
      const message = this.messageQueue.shift();
      if (message) {
        try {
          this.ws!.send(JSON.stringify(message));
        } catch (error) {
          console.error('[WS] Failed to flush message:', error);
          this.messageQueue.unshift(message); // Put it back
          break;
        }
      }
    }
  }

  // Event subscription
  on(type: string, handler: MessageHandler): () => void {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, new Set());
    }
    this.messageHandlers.get(type)!.add(handler);

    return () => {
      this.messageHandlers.get(type)?.delete(handler);
    };
  }

  onConnect(handler: ConnectionHandler): () => void {
    this.connectionHandlers.add(handler);
    return () => this.connectionHandlers.delete(handler);
  }

  onDisconnect(handler: ConnectionHandler): () => void {
    this.disconnectionHandlers.add(handler);
    return () => this.disconnectionHandlers.delete(handler);
  }

  onError(handler: ErrorHandler): () => void {
    this.errorHandlers.add(handler);
    return () => this.errorHandlers.delete(handler);
  }

  onStatusChange(handler: (status: WebSocketStatus) => void): () => void {
    this.statusChangeHandlers.add(handler);
    return () => this.statusChangeHandlers.delete(handler);
  }

  // Remove all handlers for a type
  off(type: string): void {
    this.messageHandlers.delete(type);
  }

  // Clear all handlers
  clearHandlers(): void {
    this.messageHandlers.clear();
    this.connectionHandlers.clear();
    this.disconnectionHandlers.clear();
    this.errorHandlers.clear();
    this.statusChangeHandlers.clear();
  }
}

// Singleton instance — uses connection config to pick the right WS URL
import { getConnectionConfig } from '../../lib/connection';

function resolveWsUrl(): string {
  try {
    return getConnectionConfig().wsUrl;
  } catch {
    // Fallback if called before DOM is ready
    return import.meta.env.VITE_WS_URL || `ws://${window.location.host}/ws`;
  }
}

export const wsManager = new WebSocketManager({
  url: resolveWsUrl(),
  reconnect: true,
  reconnectInterval: 3000,
  maxReconnectAttempts: 10,
  heartbeatInterval: 30000,
});

// React hook for WebSocket
import { useState, useEffect, useCallback } from 'react';

export function useWebSocket() {
  const [status, setStatus] = useState<WebSocketStatus>(() => wsManager.getStatus());
  const [isConnected, setIsConnected] = useState(() => wsManager.isConnected());

  useEffect(() => {
    const unsubStatus = wsManager.onStatusChange((newStatus) => {
      setStatus(newStatus);
      setIsConnected(newStatus === 'connected');
    });

    return unsubStatus;
  }, []);

  const connect = useCallback(() => wsManager.connect(), []);
  const disconnect = useCallback(() => wsManager.disconnect(), []);
  const send = useCallback((type: string, payload: unknown) => {
    return wsManager.send({ type, payload });
  }, []);

  return {
    status,
    isConnected,
    connect,
    disconnect,
    send,
  };
}

// Hook for subscribing to specific message types
export function useWebSocketMessage<T = unknown>(
  type: string,
  handler: (data: T) => void,
  deps: React.DependencyList = []
) {
  useEffect(() => {
    const unsubscribe = wsManager.on(type, handler as MessageHandler);
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, ...deps]);
}
