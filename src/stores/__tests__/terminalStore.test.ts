import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useTerminalStore } from '../terminalStore';

vi.mock('../../lib/safeStorage', () => ({
  safePersistStorage: {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
  },
}));

vi.mock('../../components/terminals/TerminalCard', () => ({}));

describe('terminalStore', () => {
  beforeEach(() => {
    useTerminalStore.setState({
      sessions: [],
      activeSessionId: null,
    });
  });

  it('should have correct initial state', () => {
    const state = useTerminalStore.getState();
    expect(state.sessions).toEqual([]);
    expect(state.activeSessionId).toBeNull();
  });

  it('should add a session', () => {
    useTerminalStore.getState().addSession({
      id: 'term-1',
      agent: 'dev',
      status: 'idle',
      dir: '/home/project',
      story: 'story-1',
      output: [],
    });

    const { sessions } = useTerminalStore.getState();
    expect(sessions).toHaveLength(1);
    expect(sessions[0].id).toBe('term-1');
    expect(sessions[0].agent).toBe('dev');
    expect(sessions[0].status).toBe('idle');
  });

  it('should remove a session and clear activeSessionId if it matches', () => {
    useTerminalStore.setState({
      sessions: [
        { id: 'term-1', agent: 'dev', status: 'idle', dir: '/a', story: 's1', output: [] },
        { id: 'term-2', agent: 'qa', status: 'working', dir: '/b', story: 's2', output: [] },
      ],
      activeSessionId: 'term-1',
    });

    useTerminalStore.getState().removeSession('term-1');

    const state = useTerminalStore.getState();
    expect(state.sessions).toHaveLength(1);
    expect(state.sessions[0].id).toBe('term-2');
    expect(state.activeSessionId).toBeNull();
  });

  it('should remove a session without changing activeSessionId if it does not match', () => {
    useTerminalStore.setState({
      sessions: [
        { id: 'term-1', agent: 'dev', status: 'idle', dir: '/a', story: 's1', output: [] },
        { id: 'term-2', agent: 'qa', status: 'working', dir: '/b', story: 's2', output: [] },
      ],
      activeSessionId: 'term-2',
    });

    useTerminalStore.getState().removeSession('term-1');

    expect(useTerminalStore.getState().activeSessionId).toBe('term-2');
  });

  it('should set active session', () => {
    useTerminalStore.getState().setActiveSession('term-5');
    expect(useTerminalStore.getState().activeSessionId).toBe('term-5');

    useTerminalStore.getState().setActiveSession(null);
    expect(useTerminalStore.getState().activeSessionId).toBeNull();
  });

  it('should append output lines to the correct session', () => {
    useTerminalStore.setState({
      sessions: [
        { id: 'term-1', agent: 'dev', status: 'idle', dir: '/a', story: 's1', output: ['line-1'] },
        { id: 'term-2', agent: 'qa', status: 'idle', dir: '/b', story: 's2', output: [] },
      ],
    });

    useTerminalStore.getState().appendOutput('term-1', ['line-2', 'line-3']);

    const session = useTerminalStore.getState().sessions.find((s) => s.id === 'term-1')!;
    expect(session.output).toEqual(['line-1', 'line-2', 'line-3']);

    // Other session unaffected
    const other = useTerminalStore.getState().sessions.find((s) => s.id === 'term-2')!;
    expect(other.output).toEqual([]);
  });

  it('should trim output to MAX_OUTPUT_LINES (500) when exceeded', () => {
    const existingLines = Array.from({ length: 498 }, (_, i) => `existing-${i}`);
    useTerminalStore.setState({
      sessions: [
        { id: 'term-1', agent: 'dev', status: 'idle', dir: '/a', story: 's1', output: existingLines },
      ],
    });

    const newLines = Array.from({ length: 10 }, (_, i) => `new-${i}`);
    useTerminalStore.getState().appendOutput('term-1', newLines);

    const session = useTerminalStore.getState().sessions.find((s) => s.id === 'term-1')!;
    expect(session.output).toHaveLength(500);
    // The last line should be the last of the new lines
    expect(session.output[499]).toBe('new-9');
    // The first line should NOT be existing-0 since we trimmed from the front
    expect(session.output[0]).not.toBe('existing-0');
  });

  it('should clear output for a session', () => {
    useTerminalStore.setState({
      sessions: [
        { id: 'term-1', agent: 'dev', status: 'idle', dir: '/a', story: 's1', output: ['a', 'b', 'c'] },
      ],
    });

    useTerminalStore.getState().clearOutput('term-1');

    const session = useTerminalStore.getState().sessions.find((s) => s.id === 'term-1')!;
    expect(session.output).toEqual([]);
  });

  it('should replace all sessions with setSessions', () => {
    useTerminalStore.setState({
      sessions: [
        { id: 'old-1', agent: 'dev', status: 'idle', dir: '/a', story: 's1', output: [] },
      ],
    });

    const newSessions = [
      { id: 'new-1', agent: 'qa', status: 'working' as const, dir: '/x', story: 's5', output: ['hello'] },
      { id: 'new-2', agent: 'dev', status: 'idle' as const, dir: '/y', story: 's6', output: [] },
    ];

    useTerminalStore.getState().setSessions(newSessions);

    const { sessions } = useTerminalStore.getState();
    expect(sessions).toHaveLength(2);
    expect(sessions[0].id).toBe('new-1');
    expect(sessions[1].id).toBe('new-2');
  });
});
