import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../../test/test-utils';

// Mock getEngineUrl so engineAvailable() returns true
vi.mock('../../../lib/connection', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return { ...actual, getEngineUrl: () => 'http://localhost:4100' };
});

// Mock monitorStore before importing component
vi.mock('../../../stores/monitorStore', () => ({
  useMonitorStore: vi.fn((selector: (s: Record<string, unknown>) => unknown) =>
    selector({
      connected: true,
      connectionMode: 'engine',
      events: [],
    }),
  ),
}));

// Must import after mocks
import EngineWorkspace from '../EngineWorkspace';

const mockHealth = {
  status: 'ok',
  version: '0.4.0',
  uptime_ms: 60000,
  pid: 1234,
  ws_clients: 1,
};

const mockPool = {
  total: 5,
  occupied: 1,
  idle: 4,
  queue_depth: 0,
  slots: [
    { id: 0, jobId: 'j1', pid: 100, squadId: 'dev', agentId: 'dev', startedAt: '2025-01-01T00:00:00Z', status: 'running' },
    { id: 1, jobId: null, pid: null, squadId: null, agentId: null, startedAt: null, status: 'idle' },
    { id: 2, jobId: null, pid: null, squadId: null, agentId: null, startedAt: null, status: 'idle' },
    { id: 3, jobId: null, pid: null, squadId: null, agentId: null, startedAt: null, status: 'idle' },
    { id: 4, jobId: null, pid: null, squadId: null, agentId: null, startedAt: null, status: 'idle' },
  ],
};

const mockJobs = { jobs: [] };
const mockCrons = { crons: [] };

function setupFetchMock() {
  global.fetch = vi.fn().mockImplementation((url: string) => {
    const path = typeof url === 'string' ? url : '';
    let data: unknown = {};

    if (path.includes('/health')) data = mockHealth;
    else if (path.includes('/pool')) data = mockPool;
    else if (path.includes('/jobs')) data = mockJobs;
    else if (path.includes('/cron')) data = mockCrons;
    else if (path.includes('/execute/workflows')) data = { workflows: [] };
    else if (path.includes('/bundles')) data = { bundles: [], active: null };
    else if (path.includes('/authority/audit')) data = { entries: [] };

    return Promise.resolve({
      ok: true,
      status: 200,
      text: () => Promise.resolve(JSON.stringify(data)),
      json: () => Promise.resolve(data),
    });
  });
}

beforeEach(() => {
  vi.restoreAllMocks();
  setupFetchMock();
});

describe('EngineWorkspace', () => {
  it('renderiza o header com título', async () => {
    render(<EngineWorkspace />);

    expect(screen.getByText('Engine')).toBeInTheDocument();
    expect(screen.getByText('AIOS Agent Execution Engine')).toBeInTheDocument();
  });

  it('mostra badges de saúde quando engine está online', async () => {
    render(<EngineWorkspace />);

    await waitFor(() => {
      expect(screen.getByText('v0.4.0')).toBeInTheDocument();
    });
    expect(screen.getByText('1 WS')).toBeInTheDocument();
  });

  it('renderiza todas as 8 tabs', () => {
    render(<EngineWorkspace />);

    expect(screen.getByText('Pool')).toBeInTheDocument();
    expect(screen.getByText('Jobs')).toBeInTheDocument();
    expect(screen.getByText('Events')).toBeInTheDocument();
    expect(screen.getByText('Workflows')).toBeInTheDocument();
    expect(screen.getByText('Crons')).toBeInTheDocument();
    expect(screen.getByText('Bundles')).toBeInTheDocument();
    expect(screen.getByText('Audit')).toBeInTheDocument();
    expect(screen.getByText('Memory')).toBeInTheDocument();
  });

  it('mostra botão Executar quando engine está online', async () => {
    render(<EngineWorkspace />);

    await waitFor(() => {
      expect(screen.getByText('Executar')).toBeInTheDocument();
    });
  });

  it('tab Pool é ativa por padrão e mostra slots', async () => {
    render(<EngineWorkspace />);

    await waitFor(() => {
      expect(screen.getByText('Slot 0')).toBeInTheDocument();
    });
    expect(screen.getByText('Slot 1')).toBeInTheDocument();
  });

  it('navega entre tabs ao clicar', async () => {
    const { user } = render(<EngineWorkspace />);

    await user.click(screen.getByText('Jobs'));

    await waitFor(() => {
      expect(screen.getByText('All')).toBeInTheDocument();
    });
  });

  it('mostra warning quando engine está offline', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 502,
      json: () => Promise.resolve({ error: 'down' }),
    });

    render(<EngineWorkspace />);

    await waitFor(() => {
      expect(screen.getByText('Engine offline')).toBeInTheDocument();
    });
  });

  it('abre modal ExecuteAgentForm ao clicar Executar', async () => {
    const { user } = render(<EngineWorkspace />);

    await waitFor(() => {
      expect(screen.getByText('Executar')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Executar'));

    await waitFor(() => {
      expect(screen.getByText('Executar Agente')).toBeInTheDocument();
    });
  });

  it('mostra contadores nas tabs quando há dados', async () => {
    render(<EngineWorkspace />);

    await waitFor(() => {
      // Pool occupied = 1
      const poolTab = screen.getByText('Pool').closest('button');
      expect(poolTab?.textContent).toContain('1');
    });
  });
});
