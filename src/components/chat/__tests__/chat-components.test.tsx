import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

// Use vi.hoisted so mock fns are available inside hoisted vi.mock factories
const { mockDeleteSession, mockSendMessage } = vi.hoisted(() => ({
  mockDeleteSession: vi.fn(),
  mockSendMessage: vi.fn(),
}));

vi.mock('framer-motion', () => {
  const mp = ['initial', 'animate', 'exit', 'transition', 'variants', 'whileHover', 'whileTap', 'whileFocus', 'whileInView', 'layout', 'layoutId', 'custom', 'onAnimationStart', 'onAnimationComplete'];
  const strip = (p: Record<string, unknown>) => {
    const c: Record<string, unknown> = {};
    for (const k of Object.keys(p)) if (!mp.includes(k)) c[k] = p[k];
    return c;
  };
  const tag = (T: string) =>
    ({ children, ...props }: Record<string, unknown>) => {
      const p = strip(props);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const El = T as any;
      return <El {...p}>{children}</El>;
    };
  return {
    motion: {
      div: tag('div'), button: tag('button'), span: tag('span'),
      svg: tag('svg'), circle: tag('circle'), g: tag('g'),
      tr: tag('tr'), path: tag('path'), line: tag('line'), text: tag('text'),
      img: tag('img'),
    },
    AnimatePresence: ({ children }: { children?: unknown }) => <>{children}</>,
  };
});

vi.mock('../../../stores/uiStore', () => ({
  useUIStore: Object.assign(
    vi.fn((sel?: (s: Record<string, unknown>) => unknown) => {
      const s = {
        selectedAgentId: null, selectedSquadId: null,
        setSelectedAgentId: vi.fn(), setSelectedSquadId: vi.fn(),
        setCurrentView: vi.fn(), navigateToRegistryAgent: vi.fn(),
        registryTargetAgentId: null, registryTargetWorkflowId: null,
        clearRegistryTarget: vi.fn(),
      };
      return sel ? sel(s) : s;
    }),
    { setState: vi.fn(), getState: vi.fn(() => ({})) }
  ),
}));

vi.mock('../../../stores/chatStore', () => ({
  useChatStore: Object.assign(
    vi.fn((sel?: (s: Record<string, unknown>) => unknown) => {
      const s = {
        sessions: [], activeSessionId: null, messages: [],
        isLoading: false, isStreaming: false, error: null,
        addMessage: vi.fn(), updateMessage: vi.fn(),
        createSession: vi.fn(), setActiveSession: vi.fn(),
        deleteSession: mockDeleteSession,
        clearSessions: vi.fn(), setLoading: vi.fn(),
        setStreaming: vi.fn(), stopStreaming: vi.fn(),
        setError: vi.fn(), getActiveSession: vi.fn(() => null),
        getSessionByAgent: vi.fn(),
      };
      return sel ? sel(s) : s;
    }),
    { setState: vi.fn(), getState: vi.fn(() => ({ sessions: [] })) }
  ),
}));

vi.mock('../../../hooks/useChat', () => ({
  useChat: vi.fn(() => ({
    activeSession: null, selectedAgent: null,
    isAgentLoading: false, isStreaming: false,
    sendMessage: mockSendMessage, stopStreaming: vi.fn(),
  })),
}));

vi.mock('../../../hooks/useAgents', () => ({
  useAgents: vi.fn(() => ({ data: [], isLoading: false })),
}));

vi.mock('../../../hooks/useSquads', () => ({
  useSquads: vi.fn(() => ({ data: [], isLoading: false })),
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({ data: null, isLoading: false, error: null })),
  useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
  QueryClient: vi.fn(),
  QueryClientProvider: ({ children }: { children: unknown }) => <>{children}</>,
}));

vi.mock('../../../services/api/client', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

vi.mock('../ExportChat', () => ({ ExportChatModal: () => null }));
vi.mock('../../agents/AgentSkills', () => ({
  AgentSkills: () => <div data-testid="agent-skills">Skills</div>,
}));
vi.mock('../../agents/AgentProfileModal', () => ({ AgentProfileModal: () => null }));
vi.mock('../CommandsModal', () => ({ CommandsModal: () => null }));

// Mock MarkdownRenderer to prevent React.lazy Suspense hangs in MessageBubble
vi.mock('../MarkdownRenderer', () => ({
  MarkdownRenderer: ({ content }: { content: string }) => (
    <div data-testid="markdown-renderer">{content}</div>
  ),
}));

vi.mock('../chatSuggestions', () => ({
  getSuggestionsForAgent: () => [
    {
      icon: (props: Record<string, unknown>) => <svg data-testid="sug-icon" {...props} />,
      label: 'Suggestion 1',
      prompt: 'Do something cool',
    },
    {
      icon: (props: Record<string, unknown>) => <svg data-testid="sug-icon" {...props} />,
      label: 'Suggestion 2',
      prompt: 'Help me with a task',
    },
  ],
}));

vi.mock('lucide-react', () => {
  const icon = ({ children, ...props }: Record<string, unknown>) => <svg {...props}>{children}</svg>;
  return {
    Lightbulb: icon,
    Search: icon,
    X: icon,
    ChevronDown: icon,
    ChevronRight: icon,
    ChevronLeft: icon,
    Send: icon,
    Mic: icon,
    Copy: icon,
    Check: icon,
    Terminal: icon,
    Code: icon,
    FileText: icon,
    MessageSquare: icon,
    Settings: icon,
    Plus: icon,
    Minus: icon,
    Edit: icon,
    Trash: icon,
    Download: icon,
    Upload: icon,
    ExternalLink: icon,
    ArrowLeft: icon,
    ArrowRight: icon,
    Zap: icon,
    Activity: icon,
    BarChart: icon,
    GitBranch: icon,
    Bug: icon,
    HelpCircle: icon,
    AlertCircle: icon,
    Info: icon,
    Star: icon,
    Users: icon,
    Bot: icon,
    Workflow: icon,
    Sparkles: icon,
    Shield: icon,
    Cpu: icon,
    Database: icon,
    Globe: icon,
    Eye: icon,
    Pause: icon,
    Play: icon,
    Square: icon,
    MoreVertical: icon,
    MoreHorizontal: icon,
    Menu: icon,
    Filter: icon,
    RefreshCw: icon,
    Loader2: icon,
    Clock: icon,
    Calendar: icon,
    Hash: icon,
    Tag: icon,
    Bookmark: icon,
    Heart: icon,
    ThumbsUp: icon,
    ThumbsDown: icon,
  };
});

vi.mock('../../ui', () => ({
  Avatar: ({ name }: { name?: string }) => <div data-testid="avatar">{name}</div>,
  Badge: ({ children }: { children?: unknown }) => <span data-testid="badge">{children}</span>,
  GlassButton: ({ children, ...props }: Record<string, unknown>) => <button {...props}>{children}</button>,
  GlassInput: (props: Record<string, unknown>) => <input {...props} />,
}));

vi.mock('../../../lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
  formatRelativeTime: (date: string | Date) => String(date),
  squadLabels: { development: 'Development', design: 'Design', orchestrator: 'Orchestrator' },
  getTierTheme: () => ({ bg: '', text: '', border: '' }),
  getSquadTheme: () => ({ bg: '', text: '', border: '', dot: 'bg-gray-500' }),
}));

vi.mock('../../../lib/icons', () => ({
  ICON_SIZES: { sm: 14, md: 18, lg: 24 },
  getIconComponent: () => () => <svg data-testid="icon" />,
}));

vi.mock('../../../lib/agent-avatars', () => ({ getSquadImageUrl: () => null }));

vi.mock('../../../types', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('../../../types');
  return { ...actual, getSquadType: () => 'default' };
});

// =============================================================================
// Helper
// =============================================================================
function createMockAgent(overrides: Record<string, unknown> = {}) {
  return {
    id: 'dev-agent', name: 'Dex', title: 'Senior Developer',
    role: 'Full Stack Developer', icon: 'code', tier: 'T1' as const,
    squad: 'development', squadType: 'development' as const,
    status: 'online' as const,
    description: 'A skilled full-stack developer agent',
    whenToUse: 'Use me for coding tasks and debugging',
    ...overrides,
  };
}

// Suppress React 19 act() warnings from lazy/Suspense in test env
const origConsoleError = console.error;

beforeEach(() => {
  vi.clearAllMocks();
  console.error = (...args: unknown[]) => {
    const msg = typeof args[0] === 'string' ? args[0] : '';
    if (msg.includes('suspended resource') || msg.includes('not wrapped in act')) return;
    origConsoleError.call(console, ...args);
  };
});

afterEach(() => {
  cleanup();
  console.error = origConsoleError;
});

// =============================================================================
// Tests
// =============================================================================

describe('Chat Components', () => {
  // ---------------------------------------------------------------------------
  // ChatHeader
  // ---------------------------------------------------------------------------
  describe('ChatHeader', () => {
    it('renders agent name and role', async () => {
      const { ChatHeader } = await import('../ChatHeader');
      render(<ChatHeader agent={createMockAgent()} session={null} />);
      // "Dex" appears in both avatar and h2
      expect(screen.getAllByText('Dex').length).toBeGreaterThanOrEqual(2);
      expect(screen.getByText('Full Stack Developer')).toBeTruthy();
    });

    it('renders avatar with agent name', async () => {
      const { ChatHeader } = await import('../ChatHeader');
      render(<ChatHeader agent={createMockAgent()} session={null} />);
      expect(screen.getByTestId('avatar').textContent).toBe('Dex');
    });

    it('renders squad badge', async () => {
      const { ChatHeader } = await import('../ChatHeader');
      render(<ChatHeader agent={createMockAgent()} session={null} />);
      expect(screen.getByTestId('badge').textContent).toBe('Development');
    });

    it('renders back button', async () => {
      const { ChatHeader } = await import('../ChatHeader');
      render(<ChatHeader agent={createMockAgent()} session={null} />);
      expect(screen.getByLabelText('Voltar')).toBeTruthy();
    });

    it('hides sidebar toggle when sidebar is open', async () => {
      const { ChatHeader } = await import('../ChatHeader');
      render(
        <ChatHeader agent={createMockAgent()} session={null} chatSidebarOpen={true} onToggleSidebar={vi.fn()} />
      );
      expect(screen.queryByLabelText('Abrir conversas')).toBeNull();
    });

    it('shows sidebar toggle and fires handler when sidebar is closed', async () => {
      const { ChatHeader } = await import('../ChatHeader');
      const onToggle = vi.fn();
      render(
        <ChatHeader agent={createMockAgent()} session={null} chatSidebarOpen={false} onToggleSidebar={onToggle} />
      );
      fireEvent.click(screen.getByLabelText('Abrir conversas'));
      expect(onToggle).toHaveBeenCalledTimes(1);
    });

    it('renders search, menu, and commands buttons', async () => {
      const { ChatHeader } = await import('../ChatHeader');
      render(<ChatHeader agent={createMockAgent()} session={null} />);
      expect(screen.getByLabelText('Buscar')).toBeTruthy();
      expect(screen.getByLabelText('Menu')).toBeTruthy();
      expect(screen.getByLabelText('Comandos disponíveis')).toBeTruthy();
    });

    it('renders AgentSkills', async () => {
      const { ChatHeader } = await import('../ChatHeader');
      render(<ChatHeader agent={createMockAgent()} session={null} />);
      expect(screen.getByTestId('agent-skills')).toBeTruthy();
    });
  });

  // ---------------------------------------------------------------------------
  // MessageBubble
  // ---------------------------------------------------------------------------
  describe('MessageBubble', () => {
    it('renders a user message', async () => {
      const { MessageBubble } = await import('../MessageBubble');
      render(
        <MessageBubble
          message={{ id: 'msg-1', role: 'user', content: 'Hello from user', timestamp: new Date().toISOString() }}
        />
      );
      expect(screen.getByText('Hello from user')).toBeTruthy();
    });

    it('renders an agent message with agent name', async () => {
      const { MessageBubble } = await import('../MessageBubble');
      render(
        <MessageBubble
          message={{
            id: 'msg-2', role: 'assistant', content: 'Agent reply',
            agentName: 'Dex', agentId: 'dev', squadType: 'development',
            timestamp: new Date().toISOString(),
          }}
        />
      );
      expect(screen.getAllByText('Dex').length).toBeGreaterThan(0);
    });

    it('renders a system message', async () => {
      const { MessageBubble } = await import('../MessageBubble');
      render(
        <MessageBubble
          message={{ id: 'msg-3', role: 'system', content: 'Session started', timestamp: new Date().toISOString() }}
        />
      );
      expect(screen.getByText('Session started')).toBeTruthy();
    });

    it('shows typing dots when streaming with empty content', async () => {
      const { MessageBubble } = await import('../MessageBubble');
      const { container } = render(
        <MessageBubble
          message={{ id: 'msg-4', role: 'assistant', content: '', isStreaming: true, timestamp: new Date().toISOString() }}
        />
      );
      expect(container.querySelectorAll('.typing-dot').length).toBe(3);
    });

    it('hides avatar when showAvatar is false', async () => {
      const { MessageBubble } = await import('../MessageBubble');
      const { container } = render(
        <MessageBubble
          message={{ id: 'msg-5', role: 'assistant', content: 'Hi', agentName: 'Dex', timestamp: new Date().toISOString() }}
          showAvatar={false}
        />
      );
      expect(container.querySelectorAll('[data-testid="avatar"]').length).toBe(0);
    });

    it('hides copy button while streaming', async () => {
      const { MessageBubble } = await import('../MessageBubble');
      const { container } = render(
        <MessageBubble
          message={{ id: 'msg-6', role: 'assistant', content: 'Streaming...', isStreaming: true, timestamp: new Date().toISOString() }}
        />
      );
      expect(container.querySelector('button[title="Copiar mensagem"]')).toBeNull();
    });

    it('shows copy button when done streaming', async () => {
      const { MessageBubble } = await import('../MessageBubble');
      const { container } = render(
        <MessageBubble
          message={{ id: 'msg-7', role: 'assistant', content: 'Done', isStreaming: false, timestamp: new Date().toISOString() }}
        />
      );
      expect(container.querySelector('button[title="Copiar mensagem"]')).toBeTruthy();
    });

    it('renders timestamp by default', async () => {
      const { MessageBubble } = await import('../MessageBubble');
      const ts = '2025-01-15T10:30:00.000Z';
      render(
        <MessageBubble
          message={{ id: 'msg-8', role: 'user', content: 'Timestamped', timestamp: ts }}
        />
      );
      expect(screen.getByText(ts)).toBeTruthy();
    });
  });

  // ---------------------------------------------------------------------------
  // WelcomeMessage
  // ---------------------------------------------------------------------------
  describe('WelcomeMessage', () => {
    it('renders agent name', async () => {
      const { WelcomeMessage } = await import('../WelcomeMessage');
      render(<WelcomeMessage agent={createMockAgent()} />);
      expect(screen.getAllByText('Dex').length).toBeGreaterThan(0);
    });

    it('renders agent title when available', async () => {
      const { WelcomeMessage } = await import('../WelcomeMessage');
      render(<WelcomeMessage agent={createMockAgent({ title: 'Senior Developer' })} />);
      expect(screen.getByText('Senior Developer')).toBeTruthy();
    });

    it('falls back to role when title is missing', async () => {
      const { WelcomeMessage } = await import('../WelcomeMessage');
      render(<WelcomeMessage agent={createMockAgent({ title: undefined })} />);
      expect(screen.getByText('Full Stack Developer')).toBeTruthy();
    });

    it('renders whenToUse description', async () => {
      const { WelcomeMessage } = await import('../WelcomeMessage');
      render(<WelcomeMessage agent={createMockAgent()} />);
      expect(screen.getByText('Use me for coding tasks and debugging')).toBeTruthy();
    });

    it('does not render placeholder description', async () => {
      const { WelcomeMessage } = await import('../WelcomeMessage');
      render(<WelcomeMessage agent={createMockAgent({ whenToUse: undefined, description: '[TODO]' })} />);
      expect(screen.queryByText('[TODO]')).toBeNull();
    });

    it('renders suggestion prompts', async () => {
      const { WelcomeMessage } = await import('../WelcomeMessage');
      render(<WelcomeMessage agent={createMockAgent()} />);
      expect(screen.getByText(/O que posso fazer/)).toBeTruthy();
      expect(screen.getByText('Suggestion 1')).toBeTruthy();
      expect(screen.getByText('Suggestion 2')).toBeTruthy();
    });

    it('renders avatar', async () => {
      const { WelcomeMessage } = await import('../WelcomeMessage');
      render(<WelcomeMessage agent={createMockAgent()} />);
      expect(screen.getAllByTestId('avatar').length).toBeGreaterThan(0);
    });

    it('renders AgentSkills', async () => {
      const { WelcomeMessage } = await import('../WelcomeMessage');
      render(<WelcomeMessage agent={createMockAgent()} />);
      expect(screen.getByTestId('agent-skills')).toBeTruthy();
    });

    it('sends message when clicking a suggestion', async () => {
      const { WelcomeMessage } = await import('../WelcomeMessage');
      render(<WelcomeMessage agent={createMockAgent()} />);
      const btn = screen.getByText('Suggestion 1').closest('button');
      expect(btn).toBeTruthy();
      fireEvent.click(btn!);
      expect(mockSendMessage).toHaveBeenCalledWith('Do something cool');
    });
  });
});
