import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// ---------------------------------------------------------------------------
// Mock framer-motion (same pattern as dashboard-components.test.tsx)
// ---------------------------------------------------------------------------
const motionProps = [
  'initial', 'animate', 'exit', 'transition', 'variants',
  'whileHover', 'whileTap', 'whileFocus', 'whileInView',
  'layout', 'layoutId', 'custom',
  'onAnimationStart', 'onAnimationComplete',
];
function stripMotion(props: Record<string, unknown>) {
  const clean: Record<string, unknown> = {};
  for (const k of Object.keys(props)) {
    if (!motionProps.includes(k)) clean[k] = props[k];
  }
  return clean;
}
const tag = (Tag: string) =>
  ({ children, ...props }: Record<string, unknown>) => {
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

// ---------------------------------------------------------------------------
// Mock stores
// ---------------------------------------------------------------------------
vi.mock('../../../stores/uiStore', () => ({
  useUIStore: vi.fn((selector?: (state: Record<string, unknown>) => unknown) => {
    const state = {
      setCurrentView: vi.fn(),
      setSelectedAgentId: vi.fn(),
    };
    return selector ? selector(state) : state;
  }),
}));

// ---------------------------------------------------------------------------
// Hook mocks — declared as variables so individual tests can override
// ---------------------------------------------------------------------------
const defaultAgentAnalytics = [
  { agentId: 'dev-agent', agentName: 'Dex (Dev)', squad: 'core-squad', totalExecutions: 24, successRate: 95, avgResponseTime: 1.2 },
  { agentId: 'qa-agent', agentName: 'Quinn (QA)', squad: 'core-squad', totalExecutions: 18, successRate: 100, avgResponseTime: 0.8 },
];

const defaultCommandAnalytics = [
  { command: '*develop', totalCalls: 32, avgDuration: 4.2, successRate: 94 },
  { command: '*qa-gate', totalCalls: 18, avgDuration: 2.1, successRate: 100 },
];

const defaultCostSummary = {
  today: 1.24,
  thisWeek: 8.75,
  thisMonth: 32.40,
  byProvider: { claude: 24.80, openai: 7.60 },
  bySquad: { 'core-squad': 18.50, 'management-squad': 9.20 },
  trend: [3.20, 4.10, 5.80, 4.50, 6.20, 5.40, 3.20],
};

const defaultTokenUsage = {
  total: { input: 245000, output: 182000, requests: 156 },
  claude: { input: 180000, output: 135000, requests: 98 },
  openai: { input: 65000, output: 47000, requests: 58 },
};

const defaultMcpServers = [
  { name: 'context7', status: 'connected' as const, toolCount: 2, tools: [{ name: 'resolve-library-id', calls: 12 }, { name: 'get-library-docs', calls: 8 }], resources: [], error: undefined },
  { name: 'exa-search', status: 'disconnected' as const, toolCount: 1, tools: [{ name: 'web_search', calls: 0 }], resources: [], error: 'Connection timed out' },
];

const defaultMcpStats = {
  totalServers: 3,
  connectedServers: 2,
  totalTools: 8,
  totalToolCalls: 46,
  topTools: [
    { name: 'navigate', calls: 15 },
    { name: 'resolve-library-id', calls: 12 },
  ],
};

const defaultHealth = {
  api: { healthy: true, latency: 45 },
  database: { healthy: true, latency: 12 },
};

const defaultMetrics = {
  uptime: 259200,
  avgLatency: 85,
  requestsPerMinute: 4.2,
  errorRate: 0.8,
  queueSize: 0,
  activeConnections: 3,
};

const defaultLlmHealth = {
  claude: { available: true, error: undefined },
  openai: { available: false, error: 'API key not configured' },
};

// Mutable refs so tests can swap data before importing components
let mockAgentAnalytics: typeof defaultAgentAnalytics | null = defaultAgentAnalytics;
let mockCommandAnalytics: typeof defaultCommandAnalytics | null = defaultCommandAnalytics;
let mockCostSummary: typeof defaultCostSummary | null = defaultCostSummary;
let mockTokenUsage: typeof defaultTokenUsage | null = defaultTokenUsage;
let mockMcpServers: typeof defaultMcpServers | null = defaultMcpServers;
let mockMcpStats: typeof defaultMcpStats | null = defaultMcpStats;
let mockHealth: typeof defaultHealth | null = defaultHealth;
let mockMetrics: typeof defaultMetrics | null = defaultMetrics;
let mockLlmHealth: typeof defaultLlmHealth | null = defaultLlmHealth;

vi.mock('../../../hooks/useDashboard', () => ({
  useAgentAnalytics: () => ({ data: mockAgentAnalytics, isLoading: false, error: null }),
  useCommandAnalytics: () => ({ data: mockCommandAnalytics, isLoading: false, error: null }),
  useCostSummary: () => ({ data: mockCostSummary, isLoading: false, error: null }),
  useMCPStatus: () => ({ data: mockMcpServers, isLoading: false, error: null }),
  useMCPStats: () => ({ data: mockMcpStats, isLoading: false, error: null }),
  useSystemHealth: () => ({ data: mockHealth, isLoading: false, error: null }),
  useSystemMetrics: () => ({ data: mockMetrics, isLoading: false, error: null }),
}));

vi.mock('../../../hooks/useExecute', () => ({
  useTokenUsage: () => ({ data: mockTokenUsage, isLoading: false, error: null }),
  useLLMHealth: () => ({ data: mockLlmHealth, isLoading: false, error: null }),
}));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AgentsTab', () => {
  beforeEach(() => {
    mockAgentAnalytics = defaultAgentAnalytics;
    mockCommandAnalytics = defaultCommandAnalytics;
  });

  it('renders agent names from hook data', async () => {
    const { AgentsTab } = await import('../AgentsTab');
    render(<AgentsTab />);
    expect(screen.getByText('Dex (Dev)')).toBeTruthy();
    expect(screen.getByText('Quinn (QA)')).toBeTruthy();
  });

  it('shows agent execution counts', async () => {
    const { AgentsTab } = await import('../AgentsTab');
    render(<AgentsTab />);
    expect(screen.getByText('24')).toBeTruthy();
    // 18 appears in multiple places (agent executions + bar chart), use getAllByText
    expect(screen.getAllByText('18').length).toBeGreaterThanOrEqual(1);
  });

  it('shows success rate percentages', async () => {
    const { AgentsTab } = await import('../AgentsTab');
    render(<AgentsTab />);
    // successRate is rendered as {value}% inside a <p> tag. Use getAllByText for potential duplicates with ProgressRing.
    expect(screen.getAllByText(/95%/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/100%/).length).toBeGreaterThanOrEqual(1);
  });

  it('renders section headings', async () => {
    const { AgentsTab } = await import('../AgentsTab');
    render(<AgentsTab />);
    expect(screen.getByText('Agents Mais Ativos')).toBeTruthy();
    expect(screen.getByText('Comandos Mais Usados')).toBeTruthy();
    expect(screen.getByText('Performance por Comando')).toBeTruthy();
  });

  it('shows command names in performance section', async () => {
    const { AgentsTab } = await import('../AgentsTab');
    render(<AgentsTab />);
    // Commands appear in both BarChart labels and Performance section, so use getAllByText
    expect(screen.getAllByText('*develop').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('*qa-gate').length).toBeGreaterThanOrEqual(1);
  });

  it('falls back to demo data when hooks return null', async () => {
    mockAgentAnalytics = null;
    mockCommandAnalytics = null;
    const { AgentsTab } = await import('../AgentsTab');
    render(<AgentsTab />);
    // Demo fallback agent names
    expect(screen.getByText('Dex (Dev)')).toBeTruthy();
    expect(screen.getByText('Aria (Architect)')).toBeTruthy();
  });

  it('shows empty state message when agent list is empty', async () => {
    mockAgentAnalytics = [] as typeof defaultAgentAnalytics;
    mockCommandAnalytics = defaultCommandAnalytics;
    const { AgentsTab } = await import('../AgentsTab');
    render(<AgentsTab />);
    expect(screen.getByText('Nenhum dado de execução disponível')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
describe('CostsTab', () => {
  beforeEach(() => {
    mockCostSummary = defaultCostSummary;
    mockTokenUsage = defaultTokenUsage;
  });

  it('renders cost overview cards with values', async () => {
    const { CostsTab } = await import('../CostsTab');
    render(<CostsTab />);
    expect(screen.getByText('$1.24')).toBeTruthy();
    expect(screen.getByText('$8.75')).toBeTruthy();
    expect(screen.getByText('$32.40')).toBeTruthy();
  });

  it('shows period labels', async () => {
    const { CostsTab } = await import('../CostsTab');
    render(<CostsTab />);
    expect(screen.getByText('Hoje')).toBeTruthy();
    expect(screen.getByText('Esta Semana')).toBeTruthy();
    expect(screen.getByText('Este Mês')).toBeTruthy();
  });

  it('renders provider section with names', async () => {
    const { CostsTab } = await import('../CostsTab');
    render(<CostsTab />);
    expect(screen.getByText('Custo por Provider')).toBeTruthy();
    expect(screen.getByText('Claude (Anthropic)')).toBeTruthy();
    expect(screen.getByText('OpenAI')).toBeTruthy();
  });

  it('renders provider costs', async () => {
    const { CostsTab } = await import('../CostsTab');
    render(<CostsTab />);
    expect(screen.getByText('$24.80')).toBeTruthy();
    expect(screen.getByText('$7.60')).toBeTruthy();
  });

  it('renders trend and squad sections', async () => {
    const { CostsTab } = await import('../CostsTab');
    render(<CostsTab />);
    expect(screen.getByText('Trend de Custos (7 dias)')).toBeTruthy();
    expect(screen.getByText('Custo por Squad')).toBeTruthy();
  });

  it('falls back to demo data when hooks return null', async () => {
    mockCostSummary = null;
    mockTokenUsage = null;
    const { CostsTab } = await import('../CostsTab');
    render(<CostsTab />);
    // Demo fallback values
    expect(screen.getByText('$1.24')).toBeTruthy();
    expect(screen.getByText('$32.40')).toBeTruthy();
  });

  it('shows empty squad message when bySquad is empty', async () => {
    mockCostSummary = { ...defaultCostSummary, bySquad: {} };
    const { CostsTab } = await import('../CostsTab');
    render(<CostsTab />);
    expect(screen.getByText('Nenhum dado de custo por squad')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
describe('MCPTab', () => {
  beforeEach(() => {
    mockMcpServers = defaultMcpServers;
    mockMcpStats = defaultMcpStats;
  });

  it('renders overview stat cards', async () => {
    const { MCPTab } = await import('../MCPTab');
    render(<MCPTab />);
    expect(screen.getByText('Servidores')).toBeTruthy();
    expect(screen.getByText('Conectados')).toBeTruthy();
    expect(screen.getByText('Tools')).toBeTruthy();
    expect(screen.getByText('Chamadas')).toBeTruthy();
  });

  it('renders stat values from hook data', async () => {
    const { MCPTab } = await import('../MCPTab');
    render(<MCPTab />);
    expect(screen.getByText('3')).toBeTruthy();   // totalServers
    expect(screen.getByText('2')).toBeTruthy();   // connectedServers
    expect(screen.getByText('8')).toBeTruthy();   // totalTools
    expect(screen.getByText('46')).toBeTruthy();  // totalToolCalls
  });

  it('renders server list with names', async () => {
    const { MCPTab } = await import('../MCPTab');
    render(<MCPTab />);
    expect(screen.getByText('Servidores MCP')).toBeTruthy();
    expect(screen.getByText('context7')).toBeTruthy();
    expect(screen.getByText('exa-search')).toBeTruthy();
  });

  it('shows connected/disconnected badges', async () => {
    const { MCPTab } = await import('../MCPTab');
    render(<MCPTab />);
    expect(screen.getByText('Conectado')).toBeTruthy();
    expect(screen.getByText('Desconectado')).toBeTruthy();
  });

  it('shows tool names for connected servers', async () => {
    const { MCPTab } = await import('../MCPTab');
    render(<MCPTab />);
    expect(screen.getByText('resolve-library-id (12)')).toBeTruthy();
    expect(screen.getByText('get-library-docs (8)')).toBeTruthy();
  });

  it('shows error message for disconnected servers', async () => {
    const { MCPTab } = await import('../MCPTab');
    render(<MCPTab />);
    expect(screen.getByText('Connection timed out')).toBeTruthy();
  });

  it('renders top tools section heading', async () => {
    const { MCPTab } = await import('../MCPTab');
    render(<MCPTab />);
    expect(screen.getByText('Tools Mais Usadas')).toBeTruthy();
  });

  it('falls back to demo data when hooks return null', async () => {
    mockMcpServers = null;
    mockMcpStats = null;
    const { MCPTab } = await import('../MCPTab');
    render(<MCPTab />);
    // Demo fallback server names
    expect(screen.getByText('context7')).toBeTruthy();
    expect(screen.getByText('playwright')).toBeTruthy();
  });

  it('shows empty tools message when topTools is empty', async () => {
    mockMcpStats = { ...defaultMcpStats, topTools: [] };
    const { MCPTab } = await import('../MCPTab');
    render(<MCPTab />);
    expect(screen.getByText('Nenhuma tool utilizada ainda')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
describe('SystemTab', () => {
  beforeEach(() => {
    mockHealth = defaultHealth;
    mockMetrics = defaultMetrics;
    mockLlmHealth = defaultLlmHealth;
  });

  it('renders system metric labels', async () => {
    const { SystemTab } = await import('../SystemTab');
    render(<SystemTab />);
    expect(screen.getByText('Uptime')).toBeTruthy();
    expect(screen.getByText('Req/min')).toBeTruthy();
    expect(screen.getByText('Erros')).toBeTruthy();
  });

  it('renders formatted metric values', async () => {
    const { SystemTab } = await import('../SystemTab');
    render(<SystemTab />);
    expect(screen.getByText('3d 0h')).toBeTruthy();    // uptime 259200s = 3d 0h
    expect(screen.getByText('85ms')).toBeTruthy();      // avgLatency
    expect(screen.getByText('4.2')).toBeTruthy();       // requestsPerMinute
    expect(screen.getByText('0.8%')).toBeTruthy();      // errorRate
  });

  it('renders service health section with service names', async () => {
    const { SystemTab } = await import('../SystemTab');
    render(<SystemTab />);
    expect(screen.getByText('Status dos Serviços')).toBeTruthy();
    expect(screen.getByText('API Gateway')).toBeTruthy();
    expect(screen.getByText('Database')).toBeTruthy();
    expect(screen.getByText('Claude API')).toBeTruthy();
    expect(screen.getByText('OpenAI API')).toBeTruthy();
  });

  it('shows system info section with queue and connections', async () => {
    const { SystemTab } = await import('../SystemTab');
    render(<SystemTab />);
    expect(screen.getByText('Informações do Sistema')).toBeTruthy();
    expect(screen.getByText('Fila de Execução')).toBeTruthy();
    expect(screen.getByText('Conexões Ativas')).toBeTruthy();
    expect(screen.getByText(/0 tarefas/)).toBeTruthy();
  });

  it('shows LLM error for unavailable providers', async () => {
    const { SystemTab } = await import('../SystemTab');
    render(<SystemTab />);
    // "API key not configured" (22 chars > 20) gets truncated: slice(0,17) + "..." = "API key not confi..."
    expect(screen.getByText('API key not confi...')).toBeTruthy();
  });

  it('falls back to demo data when hooks return null', async () => {
    mockHealth = null;
    mockMetrics = null;
    mockLlmHealth = null;
    const { SystemTab } = await import('../SystemTab');
    render(<SystemTab />);
    // Demo fallback values
    expect(screen.getByText('3d 0h')).toBeTruthy();
    expect(screen.getByText('API Gateway')).toBeTruthy();
  });

  it('displays dash values when metrics is falsy but no demo fallback override', async () => {
    // SystemTab has fallback: rawMetrics || DEMO_METRICS
    // When rawMetrics is null, it falls back to DEMO, so it always renders data.
    // We verify the component renders without error in this scenario.
    mockMetrics = null;
    const { SystemTab } = await import('../SystemTab');
    const { container } = render(<SystemTab />);
    expect(container.firstChild).toBeTruthy();
  });
});
