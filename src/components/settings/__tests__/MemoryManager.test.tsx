import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../../test/test-utils';
import { MemoryManager } from '../MemoryManager';

// Mock framer-motion
vi.mock('framer-motion', async () => {
  const React = await import('react');
  return {
    AnimatePresence: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
    motion: new Proxy(
      {},
      {
        get: (_target, prop: string) => {
          return React.forwardRef(
            (props: Record<string, unknown>, ref: React.Ref<HTMLElement>) => {
              const {
                initial,
                animate,
                exit,
                transition,
                layout,
                whileHover,
                whileTap,
                variants,
                ...rest
              } = props;
              return React.createElement(prop, { ...rest, ref });
            },
          );
        },
      },
    ),
  };
});

// Mock apiClient
vi.mock('../../../services/api/client', () => ({
  apiClient: {
    get: vi.fn().mockImplementation((url: string) => {
      if (url === '/knowledge/files/overview') {
        return Promise.resolve({
          totalFiles: 42,
          totalDirectories: 8,
          totalSize: 256000,
          byExtension: { md: 20, yaml: 12, json: 10 },
          recentFiles: [
            {
              name: 'README.md',
              path: 'README.md',
              size: 1024,
              modified: '2024-01-01',
              extension: 'md',
            },
          ],
        });
      }
      if (url === '/knowledge/files') {
        return Promise.resolve({
          path: '',
          items: [
            {
              name: 'agents',
              type: 'directory',
              size: 0,
              modified: '2024-01-01',
              extension: null,
            },
            {
              name: 'config.yaml',
              type: 'file',
              size: 512,
              modified: '2024-01-01',
              extension: 'yaml',
            },
          ],
        });
      }
      if (url === '/knowledge/agents') {
        return Promise.resolve({
          agents: [
            {
              agentId: 'agent-1',
              agentName: 'Dev Agent',
              squadId: 'dev-squad',
              knowledgePath: 'agents/dev/knowledge',
              files: 5,
            },
          ],
        });
      }
      return Promise.resolve({});
    }),
  },
}));

vi.mock('../../../hooks/useSquads', () => ({
  useSquads: () => ({
    data: [
      { id: 'dev-squad', name: 'Development Squad', icon: 'Code', agentCount: 3 },
    ],
    isLoading: false,
  }),
}));

vi.mock('../../../lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
  getSquadTheme: () => ({
    bg: 'bg-blue-500',
    bgSubtle: 'bg-blue-500/10',
    borderSubtle: 'border-blue-500/20',
    textMuted: 'text-blue-400',
  }),
}));

vi.mock('../../../types', () => ({
  getSquadType: () => 'development',
}));

describe('MemoryManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders tab buttons', () => {
    render(<MemoryManager />);
    expect(screen.getByText('Knowledge Global')).toBeInTheDocument();
    expect(screen.getByText('Knowledge por Agente')).toBeInTheDocument();
  });

  it('shows global tab active by default', () => {
    render(<MemoryManager />);
    // Stats should appear on global tab
    expect(screen.getByText('Arquivos')).toBeInTheDocument();
    expect(screen.getByText('Pastas')).toBeInTheDocument();
    expect(screen.getByText('Tamanho Total')).toBeInTheDocument();
    expect(screen.getByText('Tipos')).toBeInTheDocument();
  });

  it('renders file browser toolbar buttons', () => {
    render(<MemoryManager />);
    expect(screen.getByLabelText('Inicio')).toBeInTheDocument();
    expect(screen.getByLabelText('Voltar')).toBeInTheDocument();
    expect(screen.getByLabelText('Atualizar')).toBeInTheDocument();
  });

  it('shows breadcrumb root', () => {
    render(<MemoryManager />);
    expect(screen.getByText('data')).toBeInTheDocument();
  });

  it('shows empty file viewer prompt', () => {
    render(<MemoryManager />);
    expect(screen.getByText('Selecione um arquivo')).toBeInTheDocument();
  });

  it('disables back button at root', () => {
    render(<MemoryManager />);
    const backBtn = screen.getByLabelText('Voltar');
    expect(backBtn).toBeDisabled();
  });

  it('switches to agents tab', async () => {
    const { user } = render(<MemoryManager />);
    await user.click(screen.getByText('Knowledge por Agente'));
    // Agents tab should show stats
    expect(screen.getByText('Squads')).toBeInTheDocument();
    expect(screen.getByText('Agentes com Knowledge')).toBeInTheDocument();
    expect(screen.getByText('Total de Arquivos')).toBeInTheDocument();
  });

  it('shows agent knowledge info card on agents tab', async () => {
    const { user } = render(<MemoryManager />);
    await user.click(screen.getByText('Knowledge por Agente'));
    // Info card explains the feature
    expect(
      screen.getByText(/cada agente pode ter sua própria pasta de knowledge/i),
    ).toBeInTheDocument();
  });

  it('renders stats values from API', async () => {
    render(<MemoryManager />);
    // Wait for query to resolve
    expect(await screen.findByText('42')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
  });

  it('renders file type summary', async () => {
    render(<MemoryManager />);
    expect(await screen.findByText('Tipos de Arquivo')).toBeInTheDocument();
    expect(screen.getByText('.md (20)')).toBeInTheDocument();
    expect(screen.getByText('.yaml (12)')).toBeInTheDocument();
    expect(screen.getByText('.json (10)')).toBeInTheDocument();
  });

  it('renders directory items from API', async () => {
    render(<MemoryManager />);
    expect(await screen.findByText('agents')).toBeInTheDocument();
    expect(screen.getByText('config.yaml')).toBeInTheDocument();
  });

  it('shows recent files in file viewer', async () => {
    render(<MemoryManager />);
    expect(await screen.findByText('README.md')).toBeInTheDocument();
  });
});
