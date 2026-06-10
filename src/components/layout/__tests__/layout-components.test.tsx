import { describe, it, expect, vi } from 'vitest';
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
    aside: tag('aside'),
  },
  AnimatePresence: ({ children }: { children?: unknown }) => <>{children}</>,
}));

// Mock uiStore
vi.mock('../../../stores/uiStore', () => ({
  useUIStore: vi.fn((selector?: (state: Record<string, unknown>) => unknown) => {
    const state = {
      currentView: 'chat',
      sidebarCollapsed: false,
      mobileMenuOpen: false,
      mobileNavOpen: false,
      activityPanelOpen: false,
      workflowViewOpen: false,
      agentExplorerOpen: false,
      focusMode: false,
      theme: 'dark',
      setCurrentView: vi.fn(),
      toggleSidebar: vi.fn(),
      toggleMobileNav: vi.fn(),
      toggleMobileMenu: vi.fn(),
      setMobileMenuOpen: vi.fn(),
      setSidebarCollapsed: vi.fn(),
      toggleActivityPanel: vi.fn(),
      toggleWorkflowView: vi.fn(),
      toggleAgentExplorer: vi.fn(),
      setAgentExplorerOpen: vi.fn(),
      setSelectedAgentId: vi.fn(),
      setSelectedSquadId: vi.fn(),
    };
    return selector ? selector(state) : state;
  }),
}));

// Mock orchestrationStore (used by Sidebar)
vi.mock('../../../stores/orchestrationStore', () => ({
  useOrchestrationStore: vi.fn((selector?: (state: Record<string, unknown>) => unknown) => {
    const state = {
      badgeCount: 0,
      isRunning: false,
      clearPending: vi.fn(),
    };
    return selector ? selector(state) : state;
  }),
}));

// Mock UI components used by Header
vi.mock('../../ui', () => ({
  GlassCard: ({ children, ...props }: Record<string, unknown>) => <div data-testid="glass-card" {...props}>{children}</div>,
  GlassButton: ({ children, ...props }: Record<string, unknown>) => {
    const { variant: _v, size: _s, ...rest } = props;
    return <button data-testid="glass-button" {...rest}>{children}</button>;
  },
  AioxLogo: ({ variant }: { variant?: string }) => <div data-testid="aiox-logo">{variant}</div>,
  ThemeToggle: () => <div data-testid="theme-toggle" />,
  ShortcutHint: ({ children }: { children?: unknown }) => <>{children}</>,
  ToastContainer: () => <div data-testid="toast-container" />,
  KeyboardShortcuts: () => <div data-testid="keyboard-shortcuts" />,
  PWAUpdatePrompt: () => <div data-testid="pwa-update" />,
  SkipLinks: () => <div data-testid="skip-links" />,
}));

// Mock sub-components used by Header
vi.mock('../../ui/NotificationCenter', () => ({
  NotificationCenter: () => <div data-testid="notification-center" />,
}));

vi.mock('../../ui/FocusModeIndicator', () => ({
  FocusToggle: () => <div data-testid="focus-toggle" />,
  FocusModeIndicator: () => <div data-testid="focus-indicator" />,
}));

vi.mock('../../ui/PresenceAvatars', () => ({
  PresenceAvatars: () => <div data-testid="presence-avatars" />,
}));

vi.mock('../../ui/LanguageToggle', () => ({
  LanguageToggle: () => <div data-testid="language-toggle" />,
}));

// Mock search (used by Header and AppLayout)
vi.mock('../../search', () => ({
  GlobalSearch: () => <div data-testid="global-search" />,
  useGlobalSearch: () => ({
    isOpen: false,
    open: vi.fn(),
    close: vi.fn(),
    toggle: vi.fn(),
  }),
}));

// Mock layout sub-components used by AppLayout
vi.mock('../ActivityPanel', () => ({
  ActivityPanel: () => <div data-testid="activity-panel" />,
}));

vi.mock('../../agents/AgentExplorer', () => ({
  AgentExplorer: () => <div data-testid="agent-explorer" />,
}));

vi.mock('../../onboarding', () => ({
  OnboardingTour: () => <div data-testid="onboarding-tour" />,
}));

vi.mock('../../status-bar/StatusBar', () => ({
  StatusBar: () => <div data-testid="status-bar" />,
}));

vi.mock('../../project-tabs/ProjectTabs', () => ({
  ProjectTabs: () => <div data-testid="project-tabs" />,
}));

vi.mock('../../voice', () => ({
  GlobalVoiceProvider: () => <div data-testid="global-voice" />,
}));

// Mock hooks used by AppLayout
vi.mock('../../../hooks/useGlobalKeyboardShortcuts', () => ({
  useGlobalKeyboardShortcuts: vi.fn(),
}));

// Mock icons utility
vi.mock('../../../lib/icons', () => ({
  ICON_SIZES: { sm: 14, md: 16, lg: 20, xl: 24 },
  getIconComponent: vi.fn(),
}));

// Mock utils
vi.mock('../../../lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}));

describe('Layout Components — render tests', () => {
  describe('Sidebar', () => {
    it('renders without crashing', async () => {
      const { Sidebar } = await import('../Sidebar');
      const { container } = render(<Sidebar />);
      expect(container.querySelector('aside')).toBeTruthy();
    });

    it('renders navigation items', async () => {
      const { Sidebar } = await import('../Sidebar');
      render(<Sidebar />);
      // Check for key navigation labels that exist in navItems
      expect(screen.getAllByText(/Chat|Dashboard|World|Agents|Bob|Terminals|Monitor|Settings/).length).toBeGreaterThan(0);
    });

    it('renders the AIOX logo', async () => {
      const { Sidebar } = await import('../Sidebar');
      render(<Sidebar />);
      expect(screen.getAllByTestId('aiox-logo').length).toBeGreaterThan(0);
    });
  });

  describe('MobileMenuButton', () => {
    it('renders without crashing', async () => {
      const { MobileMenuButton } = await import('../Sidebar');
      render(<MobileMenuButton />);
      expect(screen.getByLabelText('Open menu')).toBeTruthy();
    });
  });

  describe('Header', () => {
    it('renders without crashing', async () => {
      const { Header } = await import('../Header');
      const { container } = render(<Header />);
      expect(container.querySelector('header')).toBeTruthy();
    });

    it('renders search button', async () => {
      const { Header } = await import('../Header');
      render(<Header />);
      expect(screen.getByLabelText(/Buscar/)).toBeTruthy();
    });

    it('renders AIOS Master button', async () => {
      const { Header } = await import('../Header');
      render(<Header />);
      expect(screen.getByLabelText('Falar com AIOS Master')).toBeTruthy();
    });

    it('renders user menu button', async () => {
      const { Header } = await import('../Header');
      render(<Header />);
      expect(screen.getByLabelText(/Menu do usu/)).toBeTruthy();
    });
  });

  describe('MobileNav', () => {
    it('renders without crashing', async () => {
      const { MobileNav } = await import('../MobileNav');
      const { container } = render(<MobileNav />);
      expect(container.querySelector('nav')).toBeTruthy();
    });

    it('renders mobile navigation items', async () => {
      const { MobileNav } = await import('../MobileNav');
      render(<MobileNav />);
      // MobileNav has: Agents button + Chat, World, Tarefas, Painel, Config
      expect(screen.getAllByText(/Chat|World|Tarefas|Painel|Config|Agents/).length).toBeGreaterThan(0);
    });

    it('has correct aria label', async () => {
      const { MobileNav } = await import('../MobileNav');
      render(<MobileNav />);
      expect(screen.getByLabelText('Navegacao mobile')).toBeTruthy();
    });
  });

  describe('MobileHeader', () => {
    it('renders without crashing', async () => {
      const { MobileHeader } = await import('../MobileNav');
      const { container } = render(<MobileHeader title="Test Title" />);
      expect(container.querySelector('header')).toBeTruthy();
    });

    it('renders title when provided', async () => {
      const { MobileHeader } = await import('../MobileNav');
      render(<MobileHeader title="Test Page" />);
      expect(screen.getByText('Test Page')).toBeTruthy();
    });

    it('renders back button when onBack is provided', async () => {
      const { MobileHeader } = await import('../MobileNav');
      render(<MobileHeader title="Details" onBack={vi.fn()} />);
      expect(screen.getByLabelText('Voltar')).toBeTruthy();
    });
  });

  describe('AppLayout', () => {
    it('renders without crashing', async () => {
      const { AppLayout } = await import('../AppLayout');
      const { container } = render(
        <AppLayout>
          <div data-testid="child-content">Hello</div>
        </AppLayout>
      );
      expect(container.querySelector('main')).toBeTruthy();
    });

    it('renders children content', async () => {
      const { AppLayout } = await import('../AppLayout');
      render(
        <AppLayout>
          <div data-testid="child-content">Hello World</div>
        </AppLayout>
      );
      expect(screen.getByTestId('child-content')).toBeTruthy();
      expect(screen.getByText('Hello World')).toBeTruthy();
    });

    it('renders main content area with correct aria label', async () => {
      const { AppLayout } = await import('../AppLayout');
      render(
        <AppLayout>
          <div>Content</div>
        </AppLayout>
      );
      expect(screen.getByLabelText(/Conte.*do principal/)).toBeTruthy();
    });
  });
});
