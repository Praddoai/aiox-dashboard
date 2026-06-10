import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../../test/test-utils';

const mockEvents = [
  {
    id: 'evt-1',
    timestamp: '2025-01-01T10:00:00Z',
    type: 'system' as const,
    agent: 'orchestrator',
    description: 'Engine started',
  },
  {
    id: 'evt-2',
    timestamp: '2025-01-01T10:00:05Z',
    type: 'message' as const,
    agent: 'dev',
    description: 'Processing request',
  },
  {
    id: 'evt-3',
    timestamp: '2025-01-01T10:00:10Z',
    type: 'error' as const,
    agent: 'qa',
    description: 'Test failed',
    success: false,
  },
  {
    id: 'evt-4',
    timestamp: '2025-01-01T10:00:15Z',
    type: 'tool_call' as const,
    agent: 'dev',
    description: 'Called file_write',
    duration: 150,
  },
];

let mockStoreState = {
  connected: true,
  events: [] as typeof mockEvents,
  clearEvents: vi.fn(),
};

vi.mock('../../../stores/monitorStore', () => ({
  useMonitorStore: vi.fn((selector: (s: typeof mockStoreState) => unknown) =>
    selector(mockStoreState),
  ),
}));

// Import after mocks
import EngineEventFeed from '../EngineEventFeed';

beforeEach(() => {
  vi.restoreAllMocks();
  mockStoreState = {
    connected: true,
    events: [],
    clearEvents: vi.fn(),
  };
});

describe('EngineEventFeed', () => {
  it('mostra status conectado', () => {
    render(<EngineEventFeed />);

    expect(screen.getByText('WebSocket conectado')).toBeInTheDocument();
    expect(screen.getByText('0 eventos')).toBeInTheDocument();
  });

  it('mostra status desconectado', () => {
    mockStoreState.connected = false;
    render(<EngineEventFeed />);

    expect(screen.getByText('Desconectado')).toBeInTheDocument();
    expect(screen.getByText('Conecte ao engine para ver eventos em tempo real')).toBeInTheDocument();
  });

  it('mostra mensagem de espera quando conectado sem eventos', () => {
    render(<EngineEventFeed />);

    expect(screen.getByText('Aguardando eventos do engine...')).toBeInTheDocument();
  });

  it('renderiza eventos com tipos corretos', () => {
    mockStoreState.events = mockEvents;
    render(<EngineEventFeed />);

    expect(screen.getByText('Engine started')).toBeInTheDocument();
    expect(screen.getByText('Processing request')).toBeInTheDocument();
    expect(screen.getByText('Test failed')).toBeInTheDocument();
    expect(screen.getByText('Called file_write')).toBeInTheDocument();
  });

  it('mostra labels de tipo para cada evento', () => {
    mockStoreState.events = mockEvents;
    render(<EngineEventFeed />);

    expect(screen.getByText('System')).toBeInTheDocument();
    expect(screen.getByText('Message')).toBeInTheDocument();
    expect(screen.getByText('Error')).toBeInTheDocument();
    expect(screen.getByText('Tool')).toBeInTheDocument();
  });

  it('mostra agentes dos eventos', () => {
    mockStoreState.events = mockEvents;
    render(<EngineEventFeed />);

    expect(screen.getByText('orchestrator')).toBeInTheDocument();
    expect(screen.getAllByText('dev')).toHaveLength(2);
    expect(screen.getByText('qa')).toBeInTheDocument();
  });

  it('mostra duração quando presente', () => {
    mockStoreState.events = mockEvents;
    render(<EngineEventFeed />);

    expect(screen.getByText('150ms')).toBeInTheDocument();
  });

  it('mostra FAILED quando success=false', () => {
    mockStoreState.events = mockEvents;
    render(<EngineEventFeed />);

    expect(screen.getByText('FAILED')).toBeInTheDocument();
  });

  it('mostra contador de eventos', () => {
    mockStoreState.events = mockEvents;
    render(<EngineEventFeed />);

    expect(screen.getByText('4 eventos')).toBeInTheDocument();
  });

  it('mostra botão Limpar quando há eventos', () => {
    mockStoreState.events = mockEvents;
    render(<EngineEventFeed />);

    expect(screen.getByText('Limpar')).toBeInTheDocument();
  });

  it('não mostra botão Limpar sem eventos', () => {
    render(<EngineEventFeed />);

    expect(screen.queryByText('Limpar')).not.toBeInTheDocument();
  });
});
