import { describe, test, expect } from 'bun:test';
import type { WSEvent } from '../../src/types';

// Test MonitorStore-compatible event formatting

interface MonitorEvent {
  id: string;
  timestamp: string;
  type: 'tool_call' | 'message' | 'error' | 'system';
  agent: string;
  description: string;
  duration?: number;
  success?: boolean;
  jobId?: string;
  squadId?: string;
}

function toMonitorFormat(event: WSEvent): MonitorEvent {
  const data = event.data;
  const typeMap: Record<string, MonitorEvent['type']> = {
    'job:created': 'system',
    'job:started': 'system',
    'job:completed': 'message',
    'job:failed': 'error',
    'job:progress': 'tool_call',
    'pool:updated': 'system',
    'workflow:phase_started': 'system',
    'workflow:phase_completed': 'message',
    'workflow:completed': 'message',
    'workflow:failed': 'error',
    'memory:stored': 'tool_call',
  };

  const monitorType = typeMap[event.type] ?? 'system';

  return {
    id: `${event.type}-test`,
    timestamp: event.timestamp,
    type: monitorType,
    agent: String(data.agentId ?? data.agent ?? 'engine'),
    description: `Test event: ${event.type}`,
    duration: data.duration_ms as number | undefined,
    success: monitorType !== 'error',
    jobId: String(data.jobId ?? ''),
    squadId: String(data.squadId ?? ''),
  };
}

describe('WebSocket Bridge — MonitorStore Format', () => {
  test('maps job:created to system type', () => {
    const event: WSEvent = {
      type: 'job:created',
      data: { jobId: 'j1', squadId: 'dev', agentId: 'dev' },
      timestamp: new Date().toISOString(),
    };
    const monitor = toMonitorFormat(event);
    expect(monitor.type).toBe('system');
    expect(monitor.agent).toBe('dev');
    expect(monitor.success).toBe(true);
  });

  test('maps job:failed to error type', () => {
    const event: WSEvent = {
      type: 'job:failed',
      data: { jobId: 'j2', agentId: 'dev', error: 'timeout' },
      timestamp: new Date().toISOString(),
    };
    const monitor = toMonitorFormat(event);
    expect(monitor.type).toBe('error');
    expect(monitor.success).toBe(false);
  });

  test('maps job:completed to message type', () => {
    const event: WSEvent = {
      type: 'job:completed',
      data: { jobId: 'j3', agentId: 'qa', duration_ms: 5000 },
      timestamp: new Date().toISOString(),
    };
    const monitor = toMonitorFormat(event);
    expect(monitor.type).toBe('message');
    expect(monitor.duration).toBe(5000);
    expect(monitor.success).toBe(true);
  });

  test('maps workflow events correctly', () => {
    const started: WSEvent = {
      type: 'workflow:phase_started',
      data: { phase: 'create', agent: 'sm' },
      timestamp: new Date().toISOString(),
    };
    expect(toMonitorFormat(started).type).toBe('system');

    const failed: WSEvent = {
      type: 'workflow:failed',
      data: { error: 'max iterations' },
      timestamp: new Date().toISOString(),
    };
    expect(toMonitorFormat(failed).type).toBe('error');
    expect(toMonitorFormat(failed).success).toBe(false);
  });

  test('extracts agent from data.agentId or data.agent', () => {
    const withAgentId: WSEvent = {
      type: 'job:created',
      data: { agentId: 'architect' },
      timestamp: new Date().toISOString(),
    };
    expect(toMonitorFormat(withAgentId).agent).toBe('architect');

    const withAgent: WSEvent = {
      type: 'workflow:phase_started',
      data: { agent: 'sm' },
      timestamp: new Date().toISOString(),
    };
    expect(toMonitorFormat(withAgent).agent).toBe('sm');
  });

  test('defaults agent to engine when missing', () => {
    const noAgent: WSEvent = {
      type: 'pool:updated',
      data: { total: 5, occupied: 2 },
      timestamp: new Date().toISOString(),
    };
    expect(toMonitorFormat(noAgent).agent).toBe('engine');
  });
});
