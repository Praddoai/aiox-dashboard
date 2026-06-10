import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../../test/test-utils';
import { WorkflowManager } from '../WorkflowManager';

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
const mockWorkflows = {
  workflows: [
    {
      id: 'wf-1',
      name: 'Campanha Marketing',
      description: 'Workflow de criacao de campanha',
      version: '1.0.0',
      status: 'active',
      trigger: { type: 'manual' },
      stepCount: 3,
      createdAt: '2024-01-01',
      updatedAt: '2024-01-02',
    },
    {
      id: 'wf-2',
      name: 'Deploy Pipeline',
      description: 'Pipeline de deploy automatizado',
      version: '2.0.0',
      status: 'inactive',
      trigger: { type: 'manual' },
      stepCount: 5,
      createdAt: '2024-01-01',
      updatedAt: '2024-01-03',
    },
  ],
  total: 2,
};

vi.mock('../../../services/api/client', () => ({
  apiClient: {
    get: vi.fn().mockImplementation((url: string) => {
      if (url === '/workflows') return Promise.resolve(mockWorkflows);
      if (url.startsWith('/workflows/')) {
        return Promise.resolve({
          ...mockWorkflows.workflows[0],
          steps: [
            {
              id: 'step-1',
              name: 'Análise',
              type: 'agent',
              handler: 'agent:execute',
              config: { squadId: 'marketing', agentId: 'analyst-1' },
            },
            {
              id: 'step-2',
              name: 'Criação',
              type: 'agent',
              handler: 'agent:execute',
              dependsOn: ['step-1'],
              config: { squadId: 'content', agentId: 'creator-1' },
            },
          ],
          output: { expected: ['report.md', 'campaign.json'] },
        });
      }
      if (url === '/squads') return Promise.resolve({ data: [] });
      if (url === '/agents') return Promise.resolve({ data: [] });
      return Promise.resolve({});
    }),
    post: vi.fn().mockResolvedValue({ id: 'new-wf' }),
  },
}));

vi.mock('../../ui/Toast', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn() }),
}));

vi.mock('../../../lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
  getSquadTheme: () => ({
    bg: 'bg-purple-500',
    bgSubtle: 'bg-purple-500/10',
    borderSubtle: 'border-purple-500/20',
    textMuted: 'text-purple-400',
  }),
  squadThemes: new Proxy(
    {},
    {
      get: () => ({
        bg: 'bg-gray-500',
        bgSubtle: 'bg-gray-500/10',
        borderSubtle: 'border-gray-500/20',
        textMuted: 'text-gray-400',
      }),
    },
  ),
}));

vi.mock('../../../types', () => ({
  getSquadType: () => 'default',
}));

describe('WorkflowManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders stat cards', async () => {
    render(<WorkflowManager />);
    expect(screen.getByText('Workflows')).toBeInTheDocument();
    expect(screen.getByText('Ativos')).toBeInTheDocument();
    expect(screen.getByText('Total de Steps')).toBeInTheDocument();
  });

  it('renders header title', () => {
    render(<WorkflowManager />);
    expect(screen.getByText('Workflows Disponíveis')).toBeInTheDocument();
  });

  it('renders Criar Workflow button', () => {
    render(<WorkflowManager />);
    expect(screen.getByText('Criar Workflow')).toBeInTheDocument();
  });

  it('renders refresh button', () => {
    render(<WorkflowManager />);
    expect(screen.getByLabelText('Atualizar')).toBeInTheDocument();
  });

  it('renders workflow names from API', async () => {
    render(<WorkflowManager />);
    expect(await screen.findByText('Campanha Marketing')).toBeInTheDocument();
    expect(screen.getByText('Deploy Pipeline')).toBeInTheDocument();
  });

  it('shows workflow descriptions', async () => {
    render(<WorkflowManager />);
    expect(
      await screen.findByText('Workflow de criacao de campanha'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Pipeline de deploy automatizado'),
    ).toBeInTheDocument();
  });

  it('shows step counts', async () => {
    render(<WorkflowManager />);
    expect(await screen.findByText('3 steps')).toBeInTheDocument();
    expect(screen.getByText('5 steps')).toBeInTheDocument();
  });

  it('shows version numbers', async () => {
    render(<WorkflowManager />);
    expect(await screen.findByText('v1.0.0')).toBeInTheDocument();
    expect(screen.getByText('v2.0.0')).toBeInTheDocument();
  });

  it('shows status badges', async () => {
    render(<WorkflowManager />);
    expect(await screen.findByText('active')).toBeInTheDocument();
    expect(screen.getByText('inactive')).toBeInTheDocument();
  });

  it('shows stat values after loading', async () => {
    render(<WorkflowManager />);
    // 2 workflows
    expect(await screen.findByText('2')).toBeInTheDocument();
    // 1 active
    expect(screen.getByText('1')).toBeInTheDocument();
    // 8 total steps (3 + 5)
    expect(screen.getByText('8')).toBeInTheDocument();
  });

  it('expands workflow on click', async () => {
    const { user } = render(<WorkflowManager />);
    const workflowButton = await screen.findByText('Campanha Marketing');
    await user.click(workflowButton);
    // After expand, should show action buttons
    expect(await screen.findByText('Executar')).toBeInTheDocument();
    expect(screen.getByText('Editar')).toBeInTheDocument();
  });
});
