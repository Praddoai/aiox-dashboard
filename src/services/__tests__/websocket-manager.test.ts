import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---- Mock WebSocket ----

class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  // Instance mirrors of static values (the real WebSocket exposes both)
  CONNECTING = MockWebSocket.CONNECTING;
  OPEN = MockWebSocket.OPEN;
  CLOSING = MockWebSocket.CLOSING;
  CLOSED = MockWebSocket.CLOSED;

  readyState = MockWebSocket.CONNECTING;
  url: string;
  protocols?: string | string[];

  onopen: ((ev: Event) => void) | null = null;
  onclose: ((ev: CloseEvent) => void) | null = null;
  onmessage: ((ev: MessageEvent) => void) | null = null;
  onerror: ((ev: Event) => void) | null = null;

  send = vi.fn();
  close = vi.fn().mockImplementation(() => {
    this.readyState = MockWebSocket.CLOSED;
  });

  constructor(url: string, protocols?: string | string[]) {
    this.url = url;
    this.protocols = protocols;
    // Store reference for test access
    MockWebSocket._lastInstance = this;
  }

  // Test helpers
  static _lastInstance: MockWebSocket | null = null;

  simulateOpen(): void {
    this.readyState = MockWebSocket.OPEN;
    this.onopen?.(new Event('open'));
  }

  simulateMessage(data: Record<string, unknown>): void {
    this.onmessage?.({ data: JSON.stringify(data) } as MessageEvent);
  }

  simulateClose(code = 1000, reason = ''): void {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.({ code, reason } as CloseEvent);
  }

  simulateError(): void {
    this.onerror?.(new Event('error'));
  }
}

vi.stubGlobal('WebSocket', MockWebSocket);

// Mock the connection module so the singleton at the bottom of the source
// file can resolve without needing real env vars / DOM.
vi.mock('../../lib/connection', () => ({
  getConnectionConfig: () => ({
    wsUrl: 'ws://localhost:4001/stream',
    httpUrl: 'http://localhost:4001',
    mode: 'local',
  }),
}));

// Now import the class under test
import { WebSocketManager } from '../websocket/WebSocketManager';
import type { WebSocketStatus } from '../websocket/WebSocketManager';

function createManager(overrides = {}): WebSocketManager {
  return new WebSocketManager({
    url: 'ws://localhost:4001/stream',
    reconnect: false, // disable auto-reconnect by default for predictable tests
    heartbeatInterval: 0, // disable heartbeat
    ...overrides,
  });
}

describe('WebSocketManager', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    MockWebSocket._lastInstance = null;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // ---- Constructor ----

  describe('constructor', () => {
    it('should merge provided config with defaults', () => {
      const mgr = createManager();
      expect(mgr.getStatus()).toBe('disconnected');
      expect(mgr.isConnected()).toBe(false);
    });
  });

  // ---- connect ----

  describe('connect', () => {
    it('should create a WebSocket instance and set status to connecting', () => {
      const mgr = createManager();
      mgr.connect();

      expect(MockWebSocket._lastInstance).not.toBeNull();
      expect(mgr.getStatus()).toBe('connecting');
    });

    it('should not create a second WebSocket if already connecting', () => {
      const mgr = createManager();
      mgr.connect();
      const first = MockWebSocket._lastInstance;
      mgr.connect(); // second call
      expect(MockWebSocket._lastInstance).toBe(first);
    });

    it('should set status to connected after ws.onopen fires', () => {
      const mgr = createManager();
      mgr.connect();

      MockWebSocket._lastInstance!.simulateOpen();

      expect(mgr.getStatus()).toBe('connected');
      expect(mgr.isConnected()).toBe(true);
    });
  });

  // ---- disconnect ----

  describe('disconnect', () => {
    it('should close the WebSocket and set status to disconnected', () => {
      const mgr = createManager();
      mgr.connect();
      MockWebSocket._lastInstance!.simulateOpen();

      mgr.disconnect();

      expect(MockWebSocket._lastInstance!.close).toHaveBeenCalledWith(1000, 'Client disconnect');
      expect(mgr.getStatus()).toBe('disconnected');
      expect(mgr.isConnected()).toBe(false);
    });

    it('should be safe to call when not connected', () => {
      const mgr = createManager();
      expect(() => mgr.disconnect()).not.toThrow();
      expect(mgr.getStatus()).toBe('disconnected');
    });
  });

  // ---- send ----

  describe('send', () => {
    it('should send a JSON message when connected and return true', () => {
      const mgr = createManager();
      mgr.connect();
      const ws = MockWebSocket._lastInstance!;
      ws.simulateOpen();

      const result = mgr.send({ type: 'test', payload: { foo: 'bar' } });

      expect(result).toBe(true);
      expect(ws.send).toHaveBeenCalledTimes(1);
      const sent = JSON.parse(ws.send.mock.calls[0][0] as string);
      expect(sent.type).toBe('test');
      expect(sent.payload).toEqual({ foo: 'bar' });
      expect(sent.id).toMatch(/^msg_/);
      expect(sent.timestamp).toBeTypeOf('number');
    });

    it('should queue the message and return false when not connected', () => {
      const mgr = createManager();
      // Don't connect

      const result = mgr.send({ type: 'queued', payload: null });

      expect(result).toBe(false);
    });

    it('should flush queued messages after connecting', () => {
      const mgr = createManager();
      mgr.send({ type: 'first', payload: 1 });
      mgr.send({ type: 'second', payload: 2 });

      mgr.connect();
      const ws = MockWebSocket._lastInstance!;
      ws.simulateOpen();

      // Both queued messages + no extra calls
      expect(ws.send).toHaveBeenCalledTimes(2);
    });
  });

  // ---- Message handlers ----

  describe('on / message handling', () => {
    it('should dispatch messages to type-specific handlers', () => {
      const mgr = createManager();
      const handler = vi.fn();
      mgr.on('chat', handler);

      mgr.connect();
      const ws = MockWebSocket._lastInstance!;
      ws.simulateOpen();
      ws.simulateMessage({ type: 'chat', payload: { text: 'hello' } });

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith({ text: 'hello' });
    });

    it('should dispatch to wildcard (*) handler with the full message', () => {
      const mgr = createManager();
      const wildcardHandler = vi.fn();
      mgr.on('*', wildcardHandler);

      mgr.connect();
      const ws = MockWebSocket._lastInstance!;
      ws.simulateOpen();
      ws.simulateMessage({ type: 'anything', payload: 42 });

      expect(wildcardHandler).toHaveBeenCalledTimes(1);
      expect(wildcardHandler).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'anything', payload: 42 }),
      );
    });

    it('should not dispatch pong messages to handlers', () => {
      const mgr = createManager();
      const handler = vi.fn();
      mgr.on('pong', handler);
      const wildcardHandler = vi.fn();
      mgr.on('*', wildcardHandler);

      mgr.connect();
      MockWebSocket._lastInstance!.simulateOpen();
      MockWebSocket._lastInstance!.simulateMessage({ type: 'pong', payload: {} });

      expect(handler).not.toHaveBeenCalled();
      expect(wildcardHandler).not.toHaveBeenCalled();
    });

    it('should return an unsubscribe function from on()', () => {
      const mgr = createManager();
      const handler = vi.fn();
      const unsub = mgr.on('test', handler);

      mgr.connect();
      const ws = MockWebSocket._lastInstance!;
      ws.simulateOpen();

      ws.simulateMessage({ type: 'test', payload: 1 });
      expect(handler).toHaveBeenCalledTimes(1);

      unsub();

      ws.simulateMessage({ type: 'test', payload: 2 });
      expect(handler).toHaveBeenCalledTimes(1); // still 1
    });
  });

  // ---- off ----

  describe('off', () => {
    it('should remove all handlers for a given message type', () => {
      const mgr = createManager();
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      mgr.on('chat', handler1);
      mgr.on('chat', handler2);

      mgr.off('chat');

      mgr.connect();
      const ws = MockWebSocket._lastInstance!;
      ws.simulateOpen();
      ws.simulateMessage({ type: 'chat', payload: {} });

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).not.toHaveBeenCalled();
    });
  });

  // ---- clearHandlers ----

  describe('clearHandlers', () => {
    it('should remove all message, connection, disconnection, error, and status handlers', () => {
      const mgr = createManager();
      const msgHandler = vi.fn();
      const connectHandler = vi.fn();
      const disconnectHandler = vi.fn();
      const errorHandler = vi.fn();
      const statusHandler = vi.fn();

      mgr.on('test', msgHandler);
      mgr.onConnect(connectHandler);
      mgr.onDisconnect(disconnectHandler);
      mgr.onError(errorHandler);
      mgr.onStatusChange(statusHandler);

      mgr.clearHandlers();

      mgr.connect();
      const ws = MockWebSocket._lastInstance!;
      ws.simulateOpen();
      ws.simulateMessage({ type: 'test', payload: {} });
      ws.simulateError();

      expect(msgHandler).not.toHaveBeenCalled();
      expect(connectHandler).not.toHaveBeenCalled();
      // statusHandler may have been called before clearHandlers, but not after connect
      // We check it was not called with 'connecting' or 'connected'
      expect(statusHandler).not.toHaveBeenCalledWith('connecting');
    });
  });

  // ---- onConnect / onDisconnect ----

  describe('onConnect / onDisconnect', () => {
    it('should fire onConnect handler when connection opens', () => {
      const mgr = createManager();
      const handler = vi.fn();
      mgr.onConnect(handler);

      mgr.connect();
      MockWebSocket._lastInstance!.simulateOpen();

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should fire onDisconnect handler when connection closes', () => {
      const mgr = createManager();
      const handler = vi.fn();
      mgr.onDisconnect(handler);

      mgr.connect();
      const ws = MockWebSocket._lastInstance!;
      ws.simulateOpen();
      ws.simulateClose();

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should return unsubscribe functions', () => {
      const mgr = createManager();
      const connectHandler = vi.fn();
      const disconnectHandler = vi.fn();

      const unsubConnect = mgr.onConnect(connectHandler);
      const unsubDisconnect = mgr.onDisconnect(disconnectHandler);

      unsubConnect();
      unsubDisconnect();

      mgr.connect();
      const ws = MockWebSocket._lastInstance!;
      ws.simulateOpen();
      ws.simulateClose();

      expect(connectHandler).not.toHaveBeenCalled();
      expect(disconnectHandler).not.toHaveBeenCalled();
    });
  });

  // ---- onStatusChange ----

  describe('onStatusChange', () => {
    it('should fire when status changes through the lifecycle', () => {
      const mgr = createManager();
      const statuses: WebSocketStatus[] = [];
      mgr.onStatusChange((s) => statuses.push(s));

      mgr.connect();
      MockWebSocket._lastInstance!.simulateOpen();
      mgr.disconnect();

      expect(statuses).toEqual(['connecting', 'connected', 'disconnected']);
    });
  });

  // ---- getStatus / isConnected ----

  describe('getStatus / isConnected', () => {
    it('should return disconnected initially', () => {
      const mgr = createManager();
      expect(mgr.getStatus()).toBe('disconnected');
      expect(mgr.isConnected()).toBe(false);
    });

    it('isConnected should be true only when status is connected AND readyState is OPEN', () => {
      const mgr = createManager();
      mgr.connect();
      // Still connecting (readyState = CONNECTING)
      expect(mgr.isConnected()).toBe(false);

      MockWebSocket._lastInstance!.simulateOpen();
      expect(mgr.isConnected()).toBe(true);
    });
  });

  // ---- onError ----

  describe('onError', () => {
    it('should fire error handler on WebSocket error', () => {
      const mgr = createManager();
      const handler = vi.fn();
      mgr.onError(handler);

      mgr.connect();
      MockWebSocket._lastInstance!.simulateError();

      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  // ---- Reconnect ----

  describe('reconnection', () => {
    it('should set status to reconnecting when connection is lost with reconnect enabled', () => {
      const mgr = createManager({ reconnect: true, reconnectInterval: 1000 });
      mgr.connect();
      MockWebSocket._lastInstance!.simulateOpen();

      MockWebSocket._lastInstance!.simulateClose(1006);

      expect(mgr.getStatus()).toBe('reconnecting');
    });

    it('should set status to disconnected when connection is lost with reconnect disabled', () => {
      const mgr = createManager({ reconnect: false });
      mgr.connect();
      MockWebSocket._lastInstance!.simulateOpen();

      MockWebSocket._lastInstance!.simulateClose(1006);

      expect(mgr.getStatus()).toBe('disconnected');
    });
  });
});
