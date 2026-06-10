import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../../test/test-utils';
import { SettingsPage } from '../SettingsPage';

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

// Mock child components to isolate SettingsPage tests
vi.mock('../CategoryManager', () => ({
  CategoryManager: () => <div data-testid="category-manager">CategoryManager</div>,
}));
vi.mock('../MemoryManager', () => ({
  MemoryManager: () => <div data-testid="memory-manager">MemoryManager</div>,
}));
vi.mock('../WorkflowManager', () => ({
  WorkflowManager: () => <div data-testid="workflow-manager">WorkflowManager</div>,
}));

// Mock stores
const mockUIStore = {
  settingsSection: 'dashboard' as string,
  setSettingsSection: vi.fn(),
  theme: 'dark' as const,
  setTheme: vi.fn(),
};

vi.mock('../../../stores/uiStore', () => ({
  useUIStore: (selector?: (state: typeof mockUIStore) => unknown) =>
    selector ? selector(mockUIStore) : mockUIStore,
}));

const mockSettingsStore = {
  autoRefresh: true,
  refreshInterval: 30,
  storiesPath: 'docs/stories',
  agentColors: [
    { id: 'dev', label: 'Dev', color: '#22c55e' },
    { id: 'qa', label: 'QA', color: '#a855f7' },
  ],
  setAutoRefresh: vi.fn(),
  setRefreshInterval: vi.fn(),
  setStoriesPath: vi.fn(),
  setAgentColor: vi.fn(),
  resetToDefaults: vi.fn(),
};

vi.mock('../../../stores/settingsStore', () => ({
  useSettingsStore: (selector?: (state: typeof mockSettingsStore) => unknown) =>
    selector ? selector(mockSettingsStore) : mockSettingsStore,
}));

vi.mock('../../../stores/notificationPrefsStore', () => ({
  useNotificationPrefsStore: (selector?: (state: Record<string, unknown>) => unknown) => {
    const state = {
      pushEnabled: true,
      soundEnabled: false,
      executionComplete: true,
      errors: true,
      agentMessages: true,
      systemUpdates: false,
      dailySummary: false,
      criticalAlerts: true,
      setPref: vi.fn(),
      resetPrefs: vi.fn(),
    };
    return selector ? selector(state) : state;
  },
}));

vi.mock('../../../stores/toastStore', () => ({
  useToastStore: Object.assign(
    (selector?: (state: Record<string, unknown>) => unknown) => {
      const state = {
        enableDesktopNotifications: vi.fn(),
        setDesktopNotifications: vi.fn(),
      };
      return selector ? selector(state) : state;
    },
    {
      getState: () => ({
        setDesktopNotifications: vi.fn(),
      }),
    },
  ),
}));

vi.mock('../../ui/Toast', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn() }),
}));

vi.mock('../../../services/api/client', () => ({
  apiClient: { get: vi.fn().mockResolvedValue({}) },
}));

vi.mock('../../../lib/icons', () => ({
  ThemeIcons: new Proxy(
    {},
    {
      get: () => {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { forwardRef, createElement } = require('react');
        return forwardRef((props: Record<string, unknown>, ref: unknown) =>
          createElement('span', { ...props, ref }, 'icon'),
        );
      },
    },
  ),
  getIconComponent: () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { forwardRef, createElement } = require('react');
    return forwardRef((props: Record<string, unknown>, ref: unknown) =>
      createElement('span', { ...props, ref }, 'icon'),
    );
  },
  ICON_SIZES: { sm: 14, md: 16, lg: 20, xl: 24 },
}));

describe('SettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUIStore.settingsSection = 'dashboard';
  });

  it('renders sidebar navigation', () => {
    render(<SettingsPage />);
    expect(screen.getByRole('navigation', { name: /secoes de configuracao/i })).toBeInTheDocument();
  });

  it('shows all section labels in sidebar', () => {
    render(<SettingsPage />);
    const nav = screen.getByRole('navigation', { name: /secoes de configuracao/i });
    // Dashboard appears both in sidebar and header — check nav contains it
    expect(nav).toHaveTextContent('Dashboard');
    expect(nav).toHaveTextContent('Categorias & Squads');
    expect(nav).toHaveTextContent('Workflows');
    expect(nav).toHaveTextContent('Perfil');
    expect(nav).toHaveTextContent('API Keys');
    expect(nav).toHaveTextContent('Privacidade');
    expect(nav).toHaveTextContent('Sobre');
  });

  it('shows section header with description', () => {
    render(<SettingsPage />);
    expect(screen.getByText('Demo mode, refresh e cores de agentes')).toBeInTheDocument();
  });

  it('renders DashboardSettings by default', () => {
    render(<SettingsPage />);
    expect(screen.getByText('Auto Refresh')).toBeInTheDocument();
  });

  it('calls setSettingsSection when clicking nav item', async () => {
    const { user } = render(<SettingsPage />);
    await user.click(screen.getByText('Perfil'));
    expect(mockUIStore.setSettingsSection).toHaveBeenCalledWith('profile');
  });

  it('renders CategoryManager when categories section active', () => {
    mockUIStore.settingsSection = 'categories';
    render(<SettingsPage />);
    expect(screen.getByTestId('category-manager')).toBeInTheDocument();
  });

  it('renders MemoryManager when memory section active', () => {
    mockUIStore.settingsSection = 'memory';
    render(<SettingsPage />);
    expect(screen.getByTestId('memory-manager')).toBeInTheDocument();
  });

  it('renders WorkflowManager when workflows section active', () => {
    mockUIStore.settingsSection = 'workflows';
    render(<SettingsPage />);
    expect(screen.getByTestId('workflow-manager')).toBeInTheDocument();
  });

  it('renders About section with version info', () => {
    mockUIStore.settingsSection = 'about';
    render(<SettingsPage />);
    expect(screen.getByText('AIOS Core')).toBeInTheDocument();
    expect(screen.getByText('Platform v1.0.0')).toBeInTheDocument();
  });

  it('renders DashboardSettings with agent colors', () => {
    render(<SettingsPage />);
    expect(screen.getByText('Cores dos Agentes')).toBeInTheDocument();
    expect(screen.getByLabelText('Cor do agente Dev')).toBeInTheDocument();
    expect(screen.getByLabelText('Cor do agente QA')).toBeInTheDocument();
  });

  it('renders auto refresh toggle', () => {
    render(<SettingsPage />);
    expect(
      screen.getByRole('switch', { name: /atualização automática/i }),
    ).toBeInTheDocument();
  });

  it('renders refresh interval options', () => {
    render(<SettingsPage />);
    expect(screen.getByText('10s')).toBeInTheDocument();
    expect(screen.getByText('30s')).toBeInTheDocument();
    expect(screen.getByText('1 min')).toBeInTheDocument();
    expect(screen.getByText('5 min')).toBeInTheDocument();
  });

  it('renders Appearance section with theme options', () => {
    mockUIStore.settingsSection = 'appearance';
    render(<SettingsPage />);
    expect(screen.getByText('Tema')).toBeInTheDocument();
    expect(screen.getByText('Claro')).toBeInTheDocument();
    expect(screen.getByText('Escuro')).toBeInTheDocument();
    expect(screen.getByText('Liquid Glass')).toBeInTheDocument();
    expect(screen.getByText('Matrix')).toBeInTheDocument();
    expect(screen.getByText('AIOX Cockpit')).toBeInTheDocument();
  });

  it('renders Notification section with toggles', () => {
    mockUIStore.settingsSection = 'notifications';
    render(<SettingsPage />);
    expect(screen.getByText('Notificações Push')).toBeInTheDocument();
    expect(
      screen.getByRole('switch', { name: /ativar notificações/i }),
    ).toBeInTheDocument();
  });

  it('renders Privacy section with data management', () => {
    mockUIStore.settingsSection = 'privacy';
    render(<SettingsPage />);
    expect(screen.getByText('Dados e Privacidade')).toBeInTheDocument();
    expect(screen.getByText('Exportar dados')).toBeInTheDocument();
    expect(screen.getByText('Limpar histórico')).toBeInTheDocument();
    expect(screen.getByText('Excluir conta')).toBeInTheDocument();
  });
});
