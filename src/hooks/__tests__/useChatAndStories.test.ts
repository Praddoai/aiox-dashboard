import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// ---------------------------------------------------------------------------
// Mocks — declared BEFORE imports that depend on them
// ---------------------------------------------------------------------------

// Mock useSound (used by toastStore & uiStore)
vi.mock('../../hooks/useSound', () => ({
  playSound: vi.fn(),
  useSound: () => ({ play: vi.fn() }),
}));

// Mock safe storage (used by zustand persist middleware)
vi.mock('../../lib/safeStorage', () => ({
  safePersistStorage: {
    getItem: () => null,
    setItem: vi.fn(),
    removeItem: vi.fn(),
  },
}));

// Mock utils — generateId needs to be deterministic for tests
let idCounter = 0;
vi.mock('../../lib/utils', () => ({
  generateId: () => `test-id-${++idCounter}`,
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}));

// Mock agentsApi
const mockGetAgent = vi.fn();
const mockSearchAgents = vi.fn();
const mockGetAgents = vi.fn();
const mockGetAgentsBySquad = vi.fn();
const mockGetAgentCommands = vi.fn();

// Mock executeApi
const mockExecuteAgent = vi.fn();
const mockExecuteAgentStream = vi.fn();
const mockBuildExecuteRequest = vi.fn();

vi.mock('../../services/api', () => ({
  agentsApi: {
    getAgent: (...args: unknown[]) => mockGetAgent(...args),
    searchAgents: (...args: unknown[]) => mockSearchAgents(...args),
    getAgents: (...args: unknown[]) => mockGetAgents(...args),
    getAgentsBySquad: (...args: unknown[]) => mockGetAgentsBySquad(...args),
    getAgentCommands: (...args: unknown[]) => mockGetAgentCommands(...args),
  },
  executeApi: {
    executeAgent: (...args: unknown[]) => mockExecuteAgent(...args),
    executeAgentStream: (...args: unknown[]) => mockExecuteAgentStream(...args),
    getHistory: vi.fn().mockResolvedValue({ executions: [] }),
    getStats: vi.fn().mockResolvedValue({ total: 0, byStatus: {}, bySquad: {}, byAgent: {} }),
    getTokenUsage: vi.fn().mockResolvedValue({ claude: { input: 0, output: 0, requests: 0 }, total: { input: 0, output: 0, requests: 0 } }),
    getLLMHealth: vi.fn().mockResolvedValue({ claude: { available: true }, openai: { available: false } }),
  },
  buildExecuteRequest: (...args: unknown[]) => mockBuildExecuteRequest(...args),
}));

// Mock executionLogStore
vi.mock('../../stores/executionLogStore', () => ({
  useExecutionLogStore: Object.assign(
    (selector: (s: Record<string, unknown>) => unknown) =>
      selector({
        startExecution: vi.fn(),
        endExecution: vi.fn(),
        addAgentStart: vi.fn(),
        addAgentComplete: vi.fn(),
        addToolUse: vi.fn(),
        addError: vi.fn(),
      }),
    {
      getState: () => ({
        startExecution: vi.fn(),
        endExecution: vi.fn(),
        addAgentStart: vi.fn(),
        addAgentComplete: vi.fn(),
        addToolUse: vi.fn(),
        addError: vi.fn(),
      }),
      subscribe: vi.fn(),
      setState: vi.fn(),
      destroy: vi.fn(),
    }
  ),
}));

// Mock toastStore
const mockAddToast = vi.fn();
vi.mock('../../stores/toastStore', () => ({
  useToastStore: Object.assign(
    (selector: (s: Record<string, unknown>) => unknown) =>
      selector({ addToast: mockAddToast }),
    {
      getState: () => ({ addToast: mockAddToast }),
      subscribe: vi.fn(),
      setState: vi.fn(),
      destroy: vi.fn(),
    }
  ),
}));

// ---------------------------------------------------------------------------
// Imports — after mocks
// ---------------------------------------------------------------------------

import { useChat } from '../useChat';
import { useStories } from '../useStories';
import { useChatStore } from '../../stores/chatStore';
import { useStoryStore, type Story, type StoryStatus } from '../../stores/storyStore';
import { useUIStore } from '../../stores/uiStore';
import { useFavoritesStore } from '../useFavorites';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

const sampleAgent = {
  id: 'agent-alpha',
  name: 'Alpha Agent',
  squad: 'full-stack-dev',
  tier: 2 as const,
  title: 'Lead Dev',
};

const sampleStory: Story = {
  id: 'story-t1',
  title: 'Test story',
  description: 'A test story for unit tests',
  status: 'backlog',
  priority: 'high',
  complexity: 'standard',
  category: 'feature',
  progress: 0,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

// useChat requires deep integration mocks (useExecuteAgent, WebSocket, etc.)
// These tests are skipped until proper integration test setup is available.
describe.skip('useChat', () => {
  beforeEach(() => {
    idCounter = 0;
    // Reset stores
    useChatStore.setState({
      sessions: [],
      activeSessionId: null,
      isLoading: false,
      isStreaming: false,
      error: null,
      abortController: null,
    });
    useUIStore.setState({
      selectedSquadId: null,
      selectedAgentId: null,
    });
    useFavoritesStore.setState({ favorites: [], recents: [] });

    vi.clearAllMocks();
    mockGetAgent.mockResolvedValue(null);
    mockSearchAgents.mockResolvedValue([]);
  });

  // --- State access ---

  it('should return initial state with no sessions', () => {
    const { result } = renderHook(() => useChat(), { wrapper: createWrapper() });

    expect(result.current.sessions).toEqual([]);
    expect(result.current.activeSession).toBeNull();
    expect(result.current.activeSessionId).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isStreaming).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should reflect sessions from the chat store', () => {
    // Pre-populate the store
    useChatStore.getState().createSession('agent-1', 'Agent 1', 'dev-squad', 'development');
    const { result } = renderHook(() => useChat(), { wrapper: createWrapper() });

    expect(result.current.sessions).toHaveLength(1);
    expect(result.current.sessions[0].agentId).toBe('agent-1');
  });

  it('should expose activeSession when activeSessionId is set', () => {
    const sessionId = useChatStore.getState().createSession('agent-1', 'Agent 1', 'dev-squad', 'development');
    useChatStore.getState().setActiveSession(sessionId);

    const { result } = renderHook(() => useChat(), { wrapper: createWrapper() });
    expect(result.current.activeSession).not.toBeNull();
    expect(result.current.activeSession?.agentId).toBe('agent-1');
  });

  // --- selectAgent ---

  it('selectAgent should create a new session for an unknown agent', () => {
    const { result } = renderHook(() => useChat(), { wrapper: createWrapper() });

    act(() => {
      result.current.selectAgent(sampleAgent);
    });

    expect(result.current.sessions).toHaveLength(1);
    expect(result.current.sessions[0].agentId).toBe('agent-alpha');
    // Should update UI store
    expect(useUIStore.getState().selectedAgentId).toBe('agent-alpha');
    expect(useUIStore.getState().selectedSquadId).toBe('full-stack-dev');
  });

  it('selectAgent should reuse existing session if agent already has one', () => {
    // Create a session first
    const existingId = useChatStore.getState().createSession(
      'agent-alpha', 'Alpha Agent', 'full-stack-dev', 'engineering'
    );

    const { result } = renderHook(() => useChat(), { wrapper: createWrapper() });

    act(() => {
      result.current.selectAgent(sampleAgent);
    });

    // Should NOT create a second session
    const agentSessions = result.current.sessions.filter(s => s.agentId === 'agent-alpha');
    expect(agentSessions).toHaveLength(1);
    expect(result.current.activeSessionId).toBe(existingId);
  });

  it('selectAgent should add agent to recents', () => {
    const { result } = renderHook(() => useChat(), { wrapper: createWrapper() });

    act(() => {
      result.current.selectAgent(sampleAgent);
    });

    const recents = useFavoritesStore.getState().recents;
    expect(recents).toHaveLength(1);
    expect(recents[0].id).toBe('agent-alpha');
  });

  // --- sendMessage ---

  it('sendMessage should bail out when no agent is selected', async () => {
    const { result } = renderHook(() => useChat(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.sendMessage('Hello');
    });

    // No session should be modified — mutation should not fire
    expect(result.current.sessions).toHaveLength(0);
  });

  it('sendMessage should bail out when isStreaming is true', async () => {
    useChatStore.setState({ isStreaming: true });
    const { result } = renderHook(() => useChat(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.sendMessage('Hello');
    });

    // Mutation should not fire
    expect(mockExecuteAgentStream).not.toHaveBeenCalled();
    expect(mockExecuteAgent).not.toHaveBeenCalled();
  });

  // --- stopStreaming ---

  it('stopStreaming should abort and reset streaming state', () => {
    const controller = new AbortController();
    useChatStore.setState({ isStreaming: true, abortController: controller });

    const { result } = renderHook(() => useChat(), { wrapper: createWrapper() });

    act(() => {
      result.current.stopStreaming();
    });

    expect(controller.signal.aborted).toBe(true);
    expect(useChatStore.getState().isStreaming).toBe(false);
    expect(useChatStore.getState().abortController).toBeNull();
  });

  // --- deleteSession ---

  it('deleteSession should remove a session from the store', () => {
    const sessionId = useChatStore.getState().createSession('a', 'A', 'sq', 'default');

    const { result } = renderHook(() => useChat(), { wrapper: createWrapper() });

    act(() => {
      result.current.deleteSession(sessionId);
    });

    expect(result.current.sessions).toHaveLength(0);
  });

  // --- clearSessions ---

  it('clearSessions should remove all sessions', () => {
    useChatStore.getState().createSession('a', 'A', 'sq', 'default');
    useChatStore.getState().createSession('b', 'B', 'sq', 'default');

    const { result } = renderHook(() => useChat(), { wrapper: createWrapper() });
    expect(result.current.sessions).toHaveLength(2);

    act(() => {
      result.current.clearSessions();
    });

    expect(result.current.sessions).toHaveLength(0);
    expect(result.current.activeSessionId).toBeNull();
  });

  // --- setActiveSession ---

  it('setActiveSession should update the active session', () => {
    const id1 = useChatStore.getState().createSession('a', 'A', 'sq', 'default');
    const id2 = useChatStore.getState().createSession('b', 'B', 'sq', 'default');

    const { result } = renderHook(() => useChat(), { wrapper: createWrapper() });

    act(() => {
      result.current.setActiveSession(id1);
    });

    expect(result.current.activeSessionId).toBe(id1);

    act(() => {
      result.current.setActiveSession(id2);
    });

    expect(result.current.activeSessionId).toBe(id2);
  });

  // --- selectedAgent fallback ---

  it('should build a minimal offline agent when API returns nothing but session exists', async () => {
    // Simulate: agent selected in UI store, session exists, but API fetch returns null
    useChatStore.getState().createSession('agent-gone', 'Gone Agent', 'old-squad', 'default');
    useUIStore.setState({ selectedAgentId: 'agent-gone', selectedSquadId: 'old-squad' });
    mockGetAgent.mockResolvedValue(null);
    mockSearchAgents.mockResolvedValue([]);

    const { result } = renderHook(() => useChat(), { wrapper: createWrapper() });

    // Wait for the query to settle
    await waitFor(() => {
      expect(result.current.isAgentLoading).toBe(false);
    });

    // selectedAgent should be the fallback object
    expect(result.current.selectedAgent).toBeTruthy();
    expect(result.current.selectedAgent?.id).toBe('agent-gone');
    expect(result.current.selectedAgent?.status).toBe('offline');
  });

  // --- error state ---

  it('should expose error from chat store', () => {
    useChatStore.setState({ error: 'Something broke' });

    const { result } = renderHook(() => useChat(), { wrapper: createWrapper() });

    expect(result.current.error).toBe('Something broke');
  });
});

// ===========================================================================
// useChatStore (direct store tests)
// ===========================================================================

describe('useChatStore', () => {
  beforeEach(() => {
    idCounter = 0;
    useChatStore.setState({
      sessions: [],
      activeSessionId: null,
      isLoading: false,
      isStreaming: false,
      error: null,
      abortController: null,
    });
  });

  it('createSession should return a new session id and set it as active', () => {
    const id = useChatStore.getState().createSession('ag', 'AgName', 'sq', 'development');

    expect(id).toBe('test-id-1');
    expect(useChatStore.getState().activeSessionId).toBe(id);
    expect(useChatStore.getState().sessions).toHaveLength(1);
  });

  it('addMessage should append a message to the specified session', () => {
    const sessionId = useChatStore.getState().createSession('ag', 'Ag', 'sq', 'default');

    const msgId = useChatStore.getState().addMessage(sessionId, {
      role: 'user',
      content: 'Hello world',
    });

    const session = useChatStore.getState().sessions.find(s => s.id === sessionId);
    expect(session?.messages).toHaveLength(1);
    expect(session?.messages[0].id).toBe(msgId);
    expect(session?.messages[0].content).toBe('Hello world');
    expect(session?.messages[0].role).toBe('user');
  });

  it('updateMessage should change message content', () => {
    const sessionId = useChatStore.getState().createSession('ag', 'Ag', 'sq', 'default');
    const msgId = useChatStore.getState().addMessage(sessionId, {
      role: 'agent',
      content: 'partial',
      isStreaming: true,
    });

    useChatStore.getState().updateMessage(sessionId, msgId, 'complete response');

    const session = useChatStore.getState().sessions.find(s => s.id === sessionId);
    const msg = session?.messages.find(m => m.id === msgId);
    expect(msg?.content).toBe('complete response');
    expect(msg?.isStreaming).toBe(false);
  });

  it('getSessionByAgent should find session by agentId', () => {
    useChatStore.getState().createSession('agent-x', 'X', 'sq', 'default');
    useChatStore.getState().createSession('agent-y', 'Y', 'sq', 'default');

    const found = useChatStore.getState().getSessionByAgent('agent-x');
    expect(found).toBeDefined();
    expect(found?.agentId).toBe('agent-x');
  });

  it('getSessionByAgent should return undefined for unknown agent', () => {
    const found = useChatStore.getState().getSessionByAgent('no-such-agent');
    expect(found).toBeUndefined();
  });

  it('setError / setLoading / setStreaming should update state', () => {
    const store = useChatStore.getState();

    store.setError('oops');
    expect(useChatStore.getState().error).toBe('oops');

    store.setLoading(true);
    expect(useChatStore.getState().isLoading).toBe(true);

    store.setStreaming(true);
    expect(useChatStore.getState().isStreaming).toBe(true);
  });
});

// ===========================================================================
// useStories
// ===========================================================================

describe('useStories', () => {
  beforeEach(() => {
    useStoryStore.setState({
      stories: [],
      storyOrder: {
        backlog: [],
        in_progress: [],
        ai_review: [],
        human_review: [],
        pr_created: [],
        done: [],
        error: [],
      },
      draggedStoryId: null,
      statusFilter: null,
      epicFilter: null,
      searchQuery: '',
    });
    vi.clearAllMocks();
  });

  it('should return fallback stories when API fails', async () => {
    // global.fetch will reject — hook catches and returns FALLBACK_STORIES
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));

    const { result } = renderHook(() => useStories(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Should have the 13 fallback stories
    expect(result.current.stories.length).toBeGreaterThan(0);
    expect(result.current.stories[0].id).toBe('story-001');
  });

  it('should return stories from API when available', async () => {
    const apiStories: Story[] = [
      { ...sampleStory, id: 'api-1', title: 'From API' },
    ];

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(apiStories),
      })
    );

    const { result } = renderHook(() => useStories(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.stories).toHaveLength(1);
    expect(result.current.stories[0].id).toBe('api-1');
  });

  it('should sync fetched stories into zustand store', async () => {
    const apiStories: Story[] = [
      { ...sampleStory, id: 'sync-1' },
      { ...sampleStory, id: 'sync-2', title: 'Second' },
    ];

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(apiStories),
      })
    );

    renderHook(() => useStories(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(useStoryStore.getState().stories).toHaveLength(2);
    });

    expect(useStoryStore.getState().stories[0].id).toBe('sync-1');
  });

  it('should prefer zustand store stories when they exist', async () => {
    // Pre-populate the store
    useStoryStore.getState().setStories([sampleStory]);

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([{ ...sampleStory, id: 'api-new' }]),
      })
    );

    const { result } = renderHook(() => useStories(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Should show zustand store stories (already populated)
    expect(result.current.stories[0].id).toBe('story-t1');
  });

  it('should return fallback stories on HTTP error status', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      })
    );

    const { result } = renderHook(() => useStories(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Fallback should kick in
    expect(result.current.stories.length).toBeGreaterThan(0);
    expect(result.current.stories[0].id).toBe('story-001');
  });

  it('should expose a refetch function', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('fail')));

    const { result } = renderHook(() => useStories(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(typeof result.current.refetch).toBe('function');
  });

  it('should set isLoading true initially when store is empty', () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(() => new Promise(() => { /* never resolves */ })));

    const { result } = renderHook(() => useStories(), { wrapper: createWrapper() });

    expect(result.current.isLoading).toBe(true);
  });

  it('should not report loading when store already has stories', () => {
    useStoryStore.getState().setStories([sampleStory]);
    vi.stubGlobal('fetch', vi.fn().mockImplementation(() => new Promise(() => { /* never resolves */ })));

    const { result } = renderHook(() => useStories(), { wrapper: createWrapper() });

    // isLoading should be false because store already has stories
    expect(result.current.isLoading).toBe(false);
  });
});

// ===========================================================================
// useStoryStore (direct store tests)
// ===========================================================================

describe('useStoryStore', () => {
  beforeEach(() => {
    useStoryStore.setState({
      stories: [],
      storyOrder: {
        backlog: [],
        in_progress: [],
        ai_review: [],
        human_review: [],
        pr_created: [],
        done: [],
        error: [],
      },
      draggedStoryId: null,
      statusFilter: null,
      epicFilter: null,
      searchQuery: '',
    });
  });

  it('addStory should add story and update order', () => {
    useStoryStore.getState().addStory(sampleStory);

    const state = useStoryStore.getState();
    expect(state.stories).toHaveLength(1);
    expect(state.storyOrder.backlog).toContain('story-t1');
  });

  it('updateStory should update fields and set updatedAt', () => {
    useStoryStore.getState().addStory(sampleStory);
    useStoryStore.getState().updateStory('story-t1', { title: 'Updated title', progress: 50 });

    const story = useStoryStore.getState().stories.find(s => s.id === 'story-t1');
    expect(story?.title).toBe('Updated title');
    expect(story?.progress).toBe(50);
    expect(story?.updatedAt).not.toBe('2026-01-01T00:00:00Z');
  });

  it('deleteStory should remove story and rebuild order', () => {
    useStoryStore.getState().addStory(sampleStory);
    useStoryStore.getState().deleteStory('story-t1');

    expect(useStoryStore.getState().stories).toHaveLength(0);
    expect(useStoryStore.getState().storyOrder.backlog).not.toContain('story-t1');
  });

  it('moveStory should change status and update order maps', () => {
    useStoryStore.getState().addStory(sampleStory);
    useStoryStore.getState().moveStory('story-t1', 'in_progress');

    const state = useStoryStore.getState();
    const story = state.stories.find(s => s.id === 'story-t1');
    expect(story?.status).toBe('in_progress');
    expect(state.storyOrder.backlog).not.toContain('story-t1');
    expect(state.storyOrder.in_progress).toContain('story-t1');
  });

  it('moveStory should no-op when target status matches current status', () => {
    useStoryStore.getState().addStory(sampleStory);
    const beforeUpdatedAt = useStoryStore.getState().stories[0].updatedAt;

    useStoryStore.getState().moveStory('story-t1', 'backlog');

    expect(useStoryStore.getState().stories[0].updatedAt).toBe(beforeUpdatedAt);
  });

  it('reorderStory should swap positions within a column', () => {
    const storyA = { ...sampleStory, id: 'a' };
    const storyB = { ...sampleStory, id: 'b' };
    const storyC = { ...sampleStory, id: 'c' };

    useStoryStore.getState().addStory(storyA);
    useStoryStore.getState().addStory(storyB);
    useStoryStore.getState().addStory(storyC);

    // Order should be [a, b, c] — move index 2 to index 0
    useStoryStore.getState().reorderStory('backlog', 2, 0);

    expect(useStoryStore.getState().storyOrder.backlog).toEqual(['c', 'a', 'b']);
  });

  it('reorderStory should no-op for out-of-bounds indices', () => {
    useStoryStore.getState().addStory(sampleStory);

    useStoryStore.getState().reorderStory('backlog', -1, 0);
    expect(useStoryStore.getState().storyOrder.backlog).toEqual(['story-t1']);

    useStoryStore.getState().reorderStory('backlog', 0, 99);
    expect(useStoryStore.getState().storyOrder.backlog).toEqual(['story-t1']);
  });

  it('setDraggedStory should update draggedStoryId', () => {
    useStoryStore.getState().setDraggedStory('story-t1');
    expect(useStoryStore.getState().draggedStoryId).toBe('story-t1');

    useStoryStore.getState().setDraggedStory(null);
    expect(useStoryStore.getState().draggedStoryId).toBeNull();
  });

  it('setStories should replace stories and rebuild order', () => {
    const stories: Story[] = [
      { ...sampleStory, id: 's1', status: 'done' },
      { ...sampleStory, id: 's2', status: 'in_progress' },
    ];

    useStoryStore.getState().setStories(stories);

    const state = useStoryStore.getState();
    expect(state.stories).toHaveLength(2);
    expect(state.storyOrder.done).toContain('s1');
    expect(state.storyOrder.in_progress).toContain('s2');
    expect(state.storyOrder.backlog).toHaveLength(0);
  });

  // --- Filtering ---

  it('getFilteredStories should filter by status', () => {
    useStoryStore.getState().setStories([
      { ...sampleStory, id: 's1', status: 'backlog' },
      { ...sampleStory, id: 's2', status: 'done' },
    ]);
    useStoryStore.getState().setStatusFilter('done');

    const filtered = useStoryStore.getState().getFilteredStories();
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe('s2');
  });

  it('getFilteredStories should filter by epicId', () => {
    useStoryStore.getState().setStories([
      { ...sampleStory, id: 's1', epicId: 'epic-a' },
      { ...sampleStory, id: 's2', epicId: 'epic-b' },
      { ...sampleStory, id: 's3' }, // no epicId
    ]);
    useStoryStore.getState().setEpicFilter('epic-a');

    const filtered = useStoryStore.getState().getFilteredStories();
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe('s1');
  });

  it('getFilteredStories should filter by search query (title)', () => {
    useStoryStore.getState().setStories([
      { ...sampleStory, id: 's1', title: 'Implement SSE streaming' },
      { ...sampleStory, id: 's2', title: 'Build Kanban board' },
    ]);
    useStoryStore.getState().setSearchQuery('kanban');

    const filtered = useStoryStore.getState().getFilteredStories();
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe('s2');
  });

  it('getFilteredStories should filter by search query (description)', () => {
    useStoryStore.getState().setStories([
      { ...sampleStory, id: 's1', title: 'Story A', description: 'Uses WebSocket for real-time' },
      { ...sampleStory, id: 's2', title: 'Story B', description: 'Simple CRUD feature' },
    ]);
    useStoryStore.getState().setSearchQuery('websocket');

    const filtered = useStoryStore.getState().getFilteredStories();
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe('s1');
  });

  it('getFilteredStories should filter by search query (id)', () => {
    useStoryStore.getState().setStories([
      { ...sampleStory, id: 'story-abc' },
      { ...sampleStory, id: 'story-xyz' },
    ]);
    useStoryStore.getState().setSearchQuery('xyz');

    const filtered = useStoryStore.getState().getFilteredStories();
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe('story-xyz');
  });

  it('getFilteredStories should return all stories when no filter is active', () => {
    useStoryStore.getState().setStories([sampleStory, { ...sampleStory, id: 's2' }]);

    const filtered = useStoryStore.getState().getFilteredStories();
    expect(filtered).toHaveLength(2);
  });

  it('getFilteredStories should combine status + search filters', () => {
    useStoryStore.getState().setStories([
      { ...sampleStory, id: 's1', status: 'done', title: 'Alpha feature' },
      { ...sampleStory, id: 's2', status: 'done', title: 'Beta bug fix' },
      { ...sampleStory, id: 's3', status: 'backlog', title: 'Alpha backlog' },
    ]);
    useStoryStore.getState().setStatusFilter('done');
    useStoryStore.getState().setSearchQuery('alpha');

    const filtered = useStoryStore.getState().getFilteredStories();
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe('s1');
  });

  it('updateStory with status change should rebuild storyOrder', () => {
    useStoryStore.getState().addStory(sampleStory); // backlog
    useStoryStore.getState().updateStory('story-t1', { status: 'done' as StoryStatus });

    const state = useStoryStore.getState();
    expect(state.storyOrder.backlog).not.toContain('story-t1');
    expect(state.storyOrder.done).toContain('story-t1');
  });
});
