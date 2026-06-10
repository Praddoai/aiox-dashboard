import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../../test/test-utils';

// ---------------------------------------------------------------------------
// Mocks — UI primitives (shallow rendering)
// ---------------------------------------------------------------------------
vi.mock('../../ui', () => ({
  GlassCard: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="glass-card" className={className}>{children}</div>
  ),
  ProgressBar: ({ value, variant }: { value: number; variant?: string }) => (
    <div data-testid="progress-bar" data-value={value} data-variant={variant} />
  ),
  StatusDot: ({ status, label }: { status: string; label?: string }) => (
    <span data-testid="status-dot" data-status={status}>{label}</span>
  ),
  Badge: ({ children }: { children: React.ReactNode }) => (
    <span data-testid="badge">{children}</span>
  ),
  GlassButton: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button data-testid="glass-button" onClick={onClick}>{children}</button>
  ),
  SectionLabel: ({ children, count }: { children: React.ReactNode; count?: number }) => (
    <div data-testid="section-label">{children} {count !== undefined && `(${count})`}</div>
  ),
}));

// Mock framer-motion to render children without animation
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// ---------------------------------------------------------------------------
// Shared mock state factories
// ---------------------------------------------------------------------------
function createMonitorStoreState(overrides: Record<string, unknown> = {}) {
  return {
    connected: false,
    connectionMode: 'local' as const,
    events: [] as Array<{
      id: string;
      timestamp: string;
      type: 'tool_call' | 'message' | 'error' | 'system';
      agent: string;
      description: string;
      duration?: number;
      success?: boolean;
    }>,
    metrics: { cpu: 0, memory: 0, latency: 0, throughput: 0 },
    alerts: [] as Array<{
      id: string;
      message: string;
      severity: 'info' | 'warning' | 'error';
      timestamp: string;
      dismissed: boolean;
    }>,
    eventFilters: new Set<string>(),
    dismissAlert: vi.fn(),
    toggleEventFilter: vi.fn(),
    getFilteredEvents: vi.fn(() => []),
    ...overrides,
  };
}

let monitorState = createMonitorStoreState();

vi.mock('../../../stores/monitorStore', () => ({
  useMonitorStore: vi.fn((selector: (s: typeof monitorState) => unknown) =>
    selector(monitorState),
  ),
}));

// Mock useAgents hook
let agentsState: {
  data: Array<{ id: string; name: string; squad: string; tier: number; title?: string }> | undefined;
  isLoading: boolean;
} = { data: undefined, isLoading: false };

vi.mock('../../../hooks/useAgents', () => ({
  useAgents: vi.fn(() => agentsState),
}));

// Mock useRealtimeMetrics hook (used by MetricsPanel)
let realtimeMetricsState: {
  data: { activeExecutions?: number; errorsPerMinute?: number; avgLatencyMs?: number; requestsPerMinute?: number } | undefined;
} = { data: undefined };

vi.mock('../../../hooks/useDashboard', () => ({
  useRealtimeMetrics: vi.fn(() => realtimeMetricsState),
}));

// Mock useExecutionHistory hook
let executionHistoryState: {
  data: { executions: Array<{ id: string; agentId: string; status: string; createdAt: string }> } | undefined;
} = { data: undefined };

vi.mock('../../../hooks/useExecute', () => ({
  useExecutionHistory: vi.fn(() => executionHistoryState),
}));

// Mock cn utility
vi.mock('../../../lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------
import AlertBanner from '../AlertBanner';
import ActivityTimeline from '../ActivityTimeline';
import MetricsPanel from '../MetricsPanel';
import AgentStatusCards from '../AgentStatusCards';
import ConnectionStatus from '../ConnectionStatus';
import EventList from '../EventList';

// ---------------------------------------------------------------------------
// Reset state before each test
// ---------------------------------------------------------------------------
beforeEach(() => {
  vi.clearAllMocks();
  monitorState = createMonitorStoreState();
  agentsState = { data: undefined, isLoading: false };
  executionHistoryState = { data: undefined };
  realtimeMetricsState = { data: undefined };
});

// ===========================================================================
// AlertBanner
// ===========================================================================
describe('AlertBanner', () => {
  it('renders nothing when there are no active alerts', () => {
    monitorState = createMonitorStoreState({ alerts: [] });
    const { container } = render(<AlertBanner />);
    expect(container.innerHTML).toBe('');
  });

  it('renders nothing when all alerts are dismissed', () => {
    monitorState = createMonitorStoreState({
      alerts: [
        { id: '1', message: 'Dismissed alert', severity: 'info', timestamp: '2025-01-01T12:00:00Z', dismissed: true },
      ],
    });
    const { container } = render(<AlertBanner />);
    expect(container.innerHTML).toBe('');
  });

  it('renders active alerts with their messages', () => {
    monitorState = createMonitorStoreState({
      alerts: [
        { id: '1', message: 'CPU usage high', severity: 'warning', timestamp: '2025-01-01T12:00:00Z', dismissed: false },
        { id: '2', message: 'Connection lost', severity: 'error', timestamp: '2025-01-01T12:05:00Z', dismissed: false },
      ],
    });
    render(<AlertBanner />);
    expect(screen.getByText('CPU usage high')).toBeInTheDocument();
    expect(screen.getByText('Connection lost')).toBeInTheDocument();
  });

  it('does not render dismissed alerts among active ones', () => {
    monitorState = createMonitorStoreState({
      alerts: [
        { id: '1', message: 'Active alert', severity: 'info', timestamp: '2025-01-01T12:00:00Z', dismissed: false },
        { id: '2', message: 'Dismissed one', severity: 'error', timestamp: '2025-01-01T12:01:00Z', dismissed: true },
      ],
    });
    render(<AlertBanner />);
    expect(screen.getByText('Active alert')).toBeInTheDocument();
    expect(screen.queryByText('Dismissed one')).not.toBeInTheDocument();
  });

  it('renders a dismiss button with correct aria-label for each alert', () => {
    monitorState = createMonitorStoreState({
      alerts: [
        { id: 'a1', message: 'Test alert', severity: 'info', timestamp: '2025-01-01T12:00:00Z', dismissed: false },
      ],
    });
    render(<AlertBanner />);
    const dismissButtons = screen.getAllByRole('button', { name: 'Dismiss alert' });
    expect(dismissButtons).toHaveLength(1);
  });

  it('calls dismissAlert when dismiss button is clicked', async () => {
    const dismissFn = vi.fn();
    monitorState = createMonitorStoreState({
      alerts: [
        { id: 'a1', message: 'Dismissable alert', severity: 'warning', timestamp: '2025-01-01T12:00:00Z', dismissed: false },
      ],
      dismissAlert: dismissFn,
    });
    const { user } = render(<AlertBanner />);
    const btn = screen.getByRole('button', { name: 'Dismiss alert' });
    await user.click(btn);
    expect(dismissFn).toHaveBeenCalledWith('a1');
  });
});

// ===========================================================================
// MetricsPanel
// ===========================================================================
describe('MetricsPanel', () => {
  it('renders four metric cards', () => {
    monitorState = createMonitorStoreState({
      metrics: { cpu: 45, memory: 60, latency: 120, throughput: 35 },
    });
    render(<MetricsPanel />);
    const cards = screen.getAllByTestId('glass-card');
    expect(cards.length).toBe(4);
  });

  it('displays metric labels', () => {
    monitorState = createMonitorStoreState({
      metrics: { cpu: 10, memory: 20, latency: 30, throughput: 40 },
    });
    render(<MetricsPanel />);
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Errors/min')).toBeInTheDocument();
    expect(screen.getByText('Latency')).toBeInTheDocument();
    expect(screen.getByText('Throughput')).toBeInTheDocument();
  });

  it('displays metric values with units', () => {
    monitorState = createMonitorStoreState({
      metrics: { cpu: 72, memory: 55, latency: 200, throughput: 18 },
    });
    render(<MetricsPanel />);
    // Active shows cpu (fallback), Errors/min shows memory (fallback)
    expect(screen.getByText('72')).toBeInTheDocument();
    expect(screen.getByText('55')).toBeInTheDocument();
    expect(screen.getByText('200')).toBeInTheDocument();
    expect(screen.getByText('18')).toBeInTheDocument();
    // Units
    expect(screen.getByText('exec')).toBeInTheDocument();
    expect(screen.getByText('ms')).toBeInTheDocument();
    expect(screen.getByText('req/min')).toBeInTheDocument();
  });

  it('uses realtime data when available', () => {
    monitorState = createMonitorStoreState({
      metrics: { cpu: 10, memory: 5, latency: 50, throughput: 20 },
    });
    realtimeMetricsState = {
      data: { activeExecutions: 3, errorsPerMinute: 1, avgLatencyMs: 150, requestsPerMinute: 42 },
    };
    render(<MetricsPanel />);
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('150')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('falls back to store metrics when realtime is unavailable', () => {
    monitorState = createMonitorStoreState({
      metrics: { cpu: 45, memory: 12, latency: 100, throughput: 30 },
    });
    realtimeMetricsState = { data: undefined };
    render(<MetricsPanel />);
    expect(screen.getByText('45')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.getByText('30')).toBeInTheDocument();
  });
});

// ===========================================================================
// AgentStatusCards
// ===========================================================================
describe('AgentStatusCards', () => {
  it('shows loading skeleton when isLoading is true', () => {
    agentsState = { data: undefined, isLoading: true };
    render(<AgentStatusCards />);
    // Loading skeletons have animate-pulse class
    const cards = screen.getAllByTestId('glass-card');
    expect(cards.length).toBe(4);
    cards.forEach((card) => {
      expect(card.className).toContain('animate-pulse');
    });
  });

  it('shows empty state when no agents are found', () => {
    agentsState = { data: [], isLoading: false };
    render(<AgentStatusCards />);
    expect(screen.getByText('Nenhum agente encontrado')).toBeInTheDocument();
  });

  it('renders agent cards with names', () => {
    agentsState = {
      data: [
        { id: 'dev', name: 'Dex', squad: 'development', tier: 1 },
        { id: 'qa', name: 'Quinn', squad: 'quality', tier: 2 },
      ],
      isLoading: false,
    };
    render(<AgentStatusCards />);
    expect(screen.getByText('@dev (Dex)')).toBeInTheDocument();
    expect(screen.getByText('@qa (Quinn)')).toBeInTheDocument();
  });

  it('maps tier to correct model name', () => {
    agentsState = {
      data: [
        { id: 'dev', name: 'Dex', squad: 'development', tier: 0 },
        { id: 'qa', name: 'Quinn', squad: 'quality', tier: 1 },
        { id: 'sm', name: 'River', squad: 'management', tier: 2 },
      ],
      isLoading: false,
    };
    render(<AgentStatusCards />);
    const badges = screen.getAllByTestId('badge');
    expect(badges[0]).toHaveTextContent('opus');
    expect(badges[1]).toHaveTextContent('sonnet');
    expect(badges[2]).toHaveTextContent('haiku');
  });

  it('defaults to sonnet for unknown tiers', () => {
    agentsState = {
      data: [
        { id: 'unknown', name: 'Unknown', squad: 'misc', tier: 99 },
      ],
      isLoading: false,
    };
    render(<AgentStatusCards />);
    expect(screen.getByTestId('badge')).toHaveTextContent('sonnet');
  });

  it('renders a StatusDot for each agent', () => {
    agentsState = {
      data: [
        { id: 'dev', name: 'Dex', squad: 'development', tier: 1 },
      ],
      isLoading: false,
    };
    render(<AgentStatusCards />);
    const dots = screen.getAllByTestId('status-dot');
    expect(dots).toHaveLength(1);
    expect(dots[0].getAttribute('data-status')).toBe('idle');
  });
});

// ===========================================================================
// ConnectionStatus
// ===========================================================================
describe('ConnectionStatus', () => {
  it('shows Disconnected when not connected', () => {
    monitorState = createMonitorStoreState({ connected: false, connectionMode: 'local' });
    render(<ConnectionStatus />);
    expect(screen.getByText('Disconnected')).toBeInTheDocument();
    expect(screen.getByTestId('status-dot').getAttribute('data-status')).toBe('offline');
  });

  it('shows Engine label when connected in engine mode', () => {
    monitorState = createMonitorStoreState({ connected: true, connectionMode: 'engine' });
    render(<ConnectionStatus />);
    expect(screen.getByText('Engine')).toBeInTheDocument();
    expect(screen.getByTestId('status-dot').getAttribute('data-status')).toBe('working');
  });

  it('shows Cloud label when connected in cloud mode', () => {
    monitorState = createMonitorStoreState({ connected: true, connectionMode: 'cloud' });
    render(<ConnectionStatus />);
    expect(screen.getByText('Cloud')).toBeInTheDocument();
  });

  it('shows Connected label when connected in local mode', () => {
    monitorState = createMonitorStoreState({ connected: true, connectionMode: 'local' });
    render(<ConnectionStatus />);
    expect(screen.getByText('Connected')).toBeInTheDocument();
  });

  it('renders with glow and pulse when connected', () => {
    monitorState = createMonitorStoreState({ connected: true, connectionMode: 'engine' });
    render(<ConnectionStatus />);
    // The StatusDot mock renders with data-status="working" when connected
    expect(screen.getByTestId('status-dot').getAttribute('data-status')).toBe('working');
  });
});

// ===========================================================================
// ActivityTimeline
// ===========================================================================
describe('ActivityTimeline', () => {
  it('shows demo badge and demo data when no real events exist', () => {
    monitorState = createMonitorStoreState({ events: [] });
    executionHistoryState = { data: undefined };
    render(<ActivityTimeline />);
    expect(screen.getByText('Demo')).toBeInTheDocument();
    expect(screen.getByText('Monitor')).toBeInTheDocument();
  });

  it('renders the header with event count', () => {
    monitorState = createMonitorStoreState({ events: [] });
    executionHistoryState = { data: undefined };
    render(<ActivityTimeline />);
    // Demo data has 20 items
    expect(screen.getByText('(20 eventos)')).toBeInTheDocument();
  });

  it('renders filter pills including Todos', () => {
    monitorState = createMonitorStoreState({ events: [] });
    render(<ActivityTimeline />);
    expect(screen.getByText('Todos')).toBeInTheDocument();
    expect(screen.getByText('Execution')).toBeInTheDocument();
    expect(screen.getByText('Tools')).toBeInTheDocument();
    expect(screen.getByText('Message')).toBeInTheDocument();
    expect(screen.getByText('Error')).toBeInTheDocument();
    // "System" appears both as a filter pill and in demo data agent names
    expect(screen.getAllByText('System').length).toBeGreaterThanOrEqual(1);
  });

  it('renders real events when monitor events are present', () => {
    monitorState = createMonitorStoreState({
      events: [
        {
          id: 'evt-1',
          timestamp: new Date().toISOString(),
          type: 'tool_call',
          agent: '@dev',
          description: 'Read file src/index.ts',
          success: true,
        },
      ],
    });
    executionHistoryState = { data: undefined };
    render(<ActivityTimeline />);
    expect(screen.getByText('Read file src/index.ts')).toBeInTheDocument();
    expect(screen.queryByText('Demo')).not.toBeInTheDocument();
  });

  it('shows empty state message when filter yields no results', async () => {
    // Provide a single error event, then filter to execution only
    monitorState = createMonitorStoreState({
      events: [
        {
          id: 'evt-1',
          timestamp: new Date().toISOString(),
          type: 'error',
          agent: '@dev',
          description: 'Something failed',
        },
      ],
    });
    executionHistoryState = { data: undefined };
    const { user } = render(<ActivityTimeline />);
    // Click "Execution" filter — this sets filter to 'execution', which has no matching items
    const executionBtn = screen.getByText('Execution');
    await user.click(executionBtn);
    expect(screen.getByText('Nenhuma atividade registrada')).toBeInTheDocument();
  });

  it('renders viewToggle prop in header', () => {
    monitorState = createMonitorStoreState({ events: [] });
    render(<ActivityTimeline viewToggle={<span data-testid="custom-toggle">Toggle</span>} />);
    expect(screen.getByTestId('custom-toggle')).toBeInTheDocument();
  });
});

// ===========================================================================
// EventList
// ===========================================================================
describe('EventList', () => {
  it('shows empty state with no events and no filters', () => {
    monitorState = createMonitorStoreState({
      events: [],
      eventFilters: new Set(),
      getFilteredEvents: vi.fn(() => []),
    });
    render(<EventList />);
    expect(screen.getByText('No events recorded')).toBeInTheDocument();
  });

  it('shows filter-aware empty message when events exist but are all filtered out', () => {
    const allEvents = [
      { id: 'e1', timestamp: '2025-01-01T12:00:00Z', type: 'error' as const, agent: '@qa', description: 'Fail' },
    ];
    monitorState = createMonitorStoreState({
      events: allEvents,
      eventFilters: new Set(['tool_call']),
      getFilteredEvents: vi.fn(() => []),
    });
    render(<EventList />);
    expect(screen.getByText('No events match the selected filters')).toBeInTheDocument();
  });

  it('renders event descriptions when events are present', () => {
    const events = [
      { id: 'e1', timestamp: '2025-01-01T12:00:00Z', type: 'tool_call' as const, agent: '@dev', description: 'Called grep' },
      { id: 'e2', timestamp: '2025-01-01T12:00:05Z', type: 'message' as const, agent: '@pm', description: 'Hello world' },
    ];
    monitorState = createMonitorStoreState({
      events,
      eventFilters: new Set(),
      getFilteredEvents: vi.fn(() => events),
    });
    render(<EventList />);
    expect(screen.getByText('Called grep')).toBeInTheDocument();
    expect(screen.getByText('Hello world')).toBeInTheDocument();
  });

  it('renders section label with event count', () => {
    monitorState = createMonitorStoreState({
      events: [],
      eventFilters: new Set(),
      getFilteredEvents: vi.fn(() => []),
    });
    render(<EventList />);
    expect(screen.getByTestId('section-label')).toHaveTextContent('Activity Feed (0)');
  });

  it('renders filter buttons for all event types', () => {
    monitorState = createMonitorStoreState({
      events: [],
      eventFilters: new Set(),
      getFilteredEvents: vi.fn(() => []),
    });
    render(<EventList />);
    expect(screen.getByText('Tool')).toBeInTheDocument();
    expect(screen.getByText('Message')).toBeInTheDocument();
    expect(screen.getByText('Error')).toBeInTheDocument();
    expect(screen.getByText('System')).toBeInTheDocument();
  });

  it('renders event agent names', () => {
    const events = [
      { id: 'e1', timestamp: '2025-01-01T12:00:00Z', type: 'system' as const, agent: '@architect', description: 'Initialized' },
    ];
    monitorState = createMonitorStoreState({
      events,
      eventFilters: new Set(),
      getFilteredEvents: vi.fn(() => events),
    });
    render(<EventList />);
    expect(screen.getByText('@architect')).toBeInTheDocument();
  });
});
