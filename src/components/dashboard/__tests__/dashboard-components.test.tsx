import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock framer-motion to avoid animation issues in tests
const motionProps = ['initial', 'animate', 'exit', 'transition', 'variants', 'whileHover', 'whileTap', 'whileFocus', 'whileInView', 'layout', 'layoutId', 'custom', 'onAnimationStart', 'onAnimationComplete'];
function stripMotion(props: Record<string, unknown>) {
  const clean: Record<string, unknown> = {};
  for (const k of Object.keys(props)) {
    if (!motionProps.includes(k)) clean[k] = props[k];
  }
  return clean;
}
const tag = (Tag: string) => ({ children, ...props }: Record<string, unknown>) => {
  const p = stripMotion(props);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const El = Tag as any;
  return <El {...p}>{children}</El>;
};
vi.mock('framer-motion', () => ({
  motion: {
    div: tag('div'), button: tag('button'), span: tag('span'),
    svg: tag('svg'), circle: tag('circle'), g: tag('g'),
    tr: tag('tr'), path: tag('path'), line: tag('line'), text: tag('text'),
    rect: tag('rect'), polygon: tag('polygon'), polyline: tag('polyline'),
  },
  AnimatePresence: ({ children }: { children?: unknown }) => <>{children}</>,
  useSpring: (val: number) => ({ set: vi.fn(), get: () => val }),
  useTransform: (_spring: unknown, fn: (v: number) => string) => ({
    on: (_event: string, cb: (v: string) => void) => { cb(fn(0)); return vi.fn(); },
  }),
}));

// Mock stores
vi.mock('../../../stores/uiStore', () => ({
  useUIStore: vi.fn((selector?: (state: Record<string, unknown>) => unknown) => {
    const state = {
      setCurrentView: vi.fn(),
      setSelectedAgentId: vi.fn(),
    };
    return selector ? selector(state) : state;
  }),
}));

vi.mock('../../../stores/dashboardWidgetStore', () => ({
  useDashboardWidgetStore: vi.fn((selector?: (state: Record<string, unknown>) => unknown) => {
    const state = {
      widgets: [
        { id: 'metrics', label: 'Metric Cards', visible: true, order: 0 },
        { id: 'executionChart', label: 'Execution Trend', visible: true, order: 1 },
        { id: 'statusDonut', label: 'Status Distribution', visible: true, order: 2 },
      ],
      customizing: false,
      setCustomizing: vi.fn(),
      toggleWidget: vi.fn(),
      moveWidget: vi.fn(),
      resetWidgets: vi.fn(),
      isVisible: () => true,
    };
    return selector ? selector(state) : state;
  }),
}));

// Mock hooks
vi.mock('../../../hooks/useSquads', () => ({
  useSquads: () => ({ data: [{ id: 'core-squad', name: 'Core Squad' }], isLoading: false, error: null }),
}));

vi.mock('../../../hooks/useAgents', () => ({
  useAgents: () => ({ data: [{ id: 'dev-agent', name: 'Dex' }], isLoading: false, error: null }),
}));

vi.mock('../../../hooks/useExecute', () => ({
  useExecutionHistory: () => ({
    data: { executions: [{ status: 'completed', createdAt: new Date().toISOString().split('T')[0] }] },
    isLoading: false,
    error: null,
  }),
  useTokenUsage: () => ({
    data: { total: { input: 1000, output: 500, requests: 10 }, claude: { input: 800, output: 400, requests: 7 }, openai: { input: 200, output: 100, requests: 3 } },
    isLoading: false,
    error: null,
  }),
  useLLMHealth: () => ({
    data: { claude: { available: true }, openai: { available: false, error: 'API key not configured' } },
    isLoading: false,
    error: null,
  }),
}));

vi.mock('../../../hooks/useDashboard', () => ({
  useCostSummary: () => ({
    data: { today: 1.24, thisWeek: 8.75, thisMonth: 32.40, byProvider: { claude: 24.80, openai: 7.60 }, bySquad: { 'core-squad': 18.50 }, trend: [3, 4, 5, 4, 6, 5, 3] },
    isLoading: false,
    error: null,
  }),
  useAgentAnalytics: () => ({
    data: [{ agentId: 'dev-agent', agentName: 'Dex (Dev)', squad: 'core-squad', totalExecutions: 24, successRate: 95, avgResponseTime: 1.2 }],
    isLoading: false,
    error: null,
  }),
  useCommandAnalytics: () => ({
    data: [{ command: '*develop', totalCalls: 32, avgDuration: 4.2, successRate: 94 }],
    isLoading: false,
    error: null,
  }),
  useMCPStatus: () => ({
    data: [{ name: 'context7', status: 'connected', toolCount: 2, tools: [{ name: 'resolve-library-id', calls: 12 }], resources: [] }],
    isLoading: false,
    error: null,
  }),
  useMCPStats: () => ({
    data: { totalServers: 3, connectedServers: 2, totalTools: 8, totalToolCalls: 46, topTools: [{ name: 'navigate', calls: 15 }] },
    isLoading: false,
    error: null,
  }),
  useSystemHealth: () => ({
    data: { api: { healthy: true, latency: 45 }, database: { healthy: true, latency: 12 } },
    isLoading: false,
    error: null,
  }),
  useSystemMetrics: () => ({
    data: { uptime: 259200, avgLatency: 85, requestsPerMinute: 4.2, errorRate: 0.8, queueSize: 0, activeConnections: 3 },
    isLoading: false,
    error: null,
  }),
}));

// Mock CockpitDashboard and InsightsView since DashboardWorkspace imports them
vi.mock('../CockpitDashboard', () => ({
  default: ({ viewToggle }: { viewToggle?: unknown }) => <div data-testid="cockpit">{viewToggle as React.ReactNode}</div>,
}));

vi.mock('../../insights/InsightsView', () => ({
  default: ({ viewToggle }: { viewToggle?: unknown }) => <div data-testid="insights">{viewToggle as React.ReactNode}</div>,
}));

describe('Dashboard Components — render tests', () => {
  beforeEach(() => { vi.resetModules(); });

  describe('DashboardWorkspace', () => {
    it('renders without crashing', async () => {
      const { default: DashboardWorkspace } = await import('../DashboardWorkspace');
      const { container } = render(<DashboardWorkspace />);
      expect(container.firstChild).toBeTruthy();
    });

    it('shows view toggle buttons', async () => {
      const { default: DashboardWorkspace } = await import('../DashboardWorkspace');
      render(<DashboardWorkspace />);
      expect(screen.getByLabelText(/dashboard padrão/i)).toBeTruthy();
      expect(screen.getByLabelText(/dashboard cockpit/i)).toBeTruthy();
      expect(screen.getByLabelText(/dashboard insights/i)).toBeTruthy();
    });
  });

  describe('DashboardOverview', () => {
    it('renders without crashing', async () => {
      const { DashboardOverview } = await import('../DashboardOverview');
      const { container } = render(<DashboardOverview />);
      expect(container.firstChild).toBeTruthy();
    });

    it('shows the Dashboard heading', async () => {
      const { DashboardOverview } = await import('../DashboardOverview');
      render(<DashboardOverview />);
      expect(screen.getAllByText(/Dashboard/i).length).toBeGreaterThan(0);
    });

    it('shows tab navigation', async () => {
      const { DashboardOverview } = await import('../DashboardOverview');
      render(<DashboardOverview />);
      expect(screen.getAllByRole('tab').length).toBeGreaterThan(0);
    });

    it('shows Atualizar button', async () => {
      const { DashboardOverview } = await import('../DashboardOverview');
      render(<DashboardOverview />);
      expect(screen.getAllByText(/Atualizar/i).length).toBeGreaterThan(0);
    });
  });

  describe('LiveMetricCard', () => {
    it('renders without crashing', async () => {
      const { LiveMetricCard } = await import('../LiveMetricCard');
      const { container } = render(
        <LiveMetricCard
          label="Test Metric"
          value={42}
          icon={<span>icon</span>}
          color="#3B82F6"
        />
      );
      expect(container.firstChild).toBeTruthy();
    });

    it('displays the label', async () => {
      const { LiveMetricCard } = await import('../LiveMetricCard');
      render(
        <LiveMetricCard
          label="Squads"
          value={5}
          icon={<span>icon</span>}
          color="#10B981"
        />
      );
      expect(screen.getByText('Squads')).toBeTruthy();
    });

    it('renders with percent format', async () => {
      const { LiveMetricCard } = await import('../LiveMetricCard');
      const { container } = render(
        <LiveMetricCard
          label="Sucesso"
          value={95}
          format="percent"
          icon={<span>icon</span>}
          color="#10B981"
        />
      );
      expect(container.firstChild).toBeTruthy();
      expect(screen.getByText('Sucesso')).toBeTruthy();
    });

    it('renders with trend indicator', async () => {
      const { LiveMetricCard } = await import('../LiveMetricCard');
      render(
        <LiveMetricCard
          label="Agents"
          value={12}
          icon={<span>icon</span>}
          color="#10B981"
          trend="up"
          trendValue="Online"
        />
      );
      expect(screen.getByText('Online')).toBeTruthy();
    });
  });

  describe('WidgetCustomizer', () => {
    it('renders without crashing', async () => {
      const { WidgetCustomizer } = await import('../WidgetCustomizer');
      const { container } = render(<WidgetCustomizer />);
      expect(container.firstChild).toBeTruthy();
    });

    it('shows Personalizar button', async () => {
      const { WidgetCustomizer } = await import('../WidgetCustomizer');
      render(<WidgetCustomizer />);
      expect(screen.getAllByText(/Personalizar/i).length).toBeGreaterThan(0);
    });
  });

  describe('Charts', () => {
    it('LineChart renders without crashing', async () => {
      const { LineChart } = await import('../Charts');
      const { container } = render(
        <LineChart data={[1, 3, 2, 5, 4]} height={100} />
      );
      expect(container.firstChild).toBeTruthy();
    });

    it('BarChart renders horizontal bars', async () => {
      const { BarChart } = await import('../Charts');
      const { container } = render(
        <BarChart
          data={[
            { label: 'Alpha', value: 10 },
            { label: 'Beta', value: 20 },
          ]}
          horizontal
          height={100}
        />
      );
      expect(container.firstChild).toBeTruthy();
      expect(screen.getByText('Alpha')).toBeTruthy();
      expect(screen.getByText('Beta')).toBeTruthy();
    });

    it('BarChart renders vertical bars', async () => {
      const { BarChart } = await import('../Charts');
      const { container } = render(
        <BarChart
          data={[
            { label: 'One', value: 5 },
            { label: 'Two', value: 15 },
          ]}
          height={120}
        />
      );
      expect(container.firstChild).toBeTruthy();
    });

    it('DonutChart renders with center text', async () => {
      const { DonutChart } = await import('../Charts');
      render(
        <DonutChart
          data={[
            { label: 'Success', value: 80 },
            { label: 'Failure', value: 20 },
          ]}
          size={100}
          thickness={12}
          centerText="80%"
          centerSubtext="sucesso"
        />
      );
      expect(screen.getByText('80%')).toBeTruthy();
      expect(screen.getByText('sucesso')).toBeTruthy();
    });

    it('ProgressRing renders with percentage', async () => {
      const { ProgressRing } = await import('../Charts');
      render(<ProgressRing value={75} size={48} thickness={4} />);
      expect(screen.getByText('75%')).toBeTruthy();
    });

    it('Sparkline renders without crashing', async () => {
      const { Sparkline } = await import('../Charts');
      const { container } = render(
        <Sparkline data={[2, 4, 3, 6, 5]} height={24} width={60} />
      );
      expect(container.querySelector('svg')).toBeTruthy();
    });

    it('BarChart returns null for empty data', async () => {
      const { BarChart } = await import('../Charts');
      const { container } = render(<BarChart data={[]} />);
      expect(container.innerHTML).toBe('');
    });

    it('Sparkline returns null for single data point', async () => {
      const { Sparkline } = await import('../Charts');
      const { container } = render(<Sparkline data={[5]} />);
      expect(container.innerHTML).toBe('');
    });
  });
});
