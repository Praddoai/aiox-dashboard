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
  },
  AnimatePresence: ({ children }: { children?: unknown }) => <>{children}</>,
}));

// Mock hooks
vi.mock('../../../hooks/useAgents', () => ({
  useAgents: vi.fn(() => ({
    data: [],
    refetch: vi.fn(),
    isLoading: false,
  })),
}));

vi.mock('../../../hooks/useAnalytics', () => ({
  useAgentPerformance: vi.fn(() => ({
    data: [],
  })),
  useAgentActivity: vi.fn(() => ({
    data: [],
  })),
}));

describe('Agents Monitor Components — render tests', () => {
  beforeEach(() => { vi.resetModules(); });

  describe('AgentsMonitor', () => {
    it('renders without crashing', async () => {
      const { default: AgentsMonitor } = await import('../AgentsMonitor');
      render(<AgentsMonitor />);
      // Should show the header title
      expect(screen.getAllByText(/Agent Activity/i).length).toBeGreaterThan(0);
    });

    it('shows demo badge when using fallback data', async () => {
      const { default: AgentsMonitor } = await import('../AgentsMonitor');
      render(<AgentsMonitor />);
      expect(screen.getAllByText(/Demo/i).length).toBeGreaterThan(0);
    });

    it('shows live/paused toggle', async () => {
      const { default: AgentsMonitor } = await import('../AgentsMonitor');
      render(<AgentsMonitor />);
      expect(screen.getAllByText(/Live|Paused/i).length).toBeGreaterThan(0);
    });
  });

  describe('AgentMonitorCard', () => {
    it('renders a working agent card without crashing', async () => {
      const { AgentMonitorCard } = await import('../AgentMonitorCard');
      const agent = {
        id: 'dev',
        name: 'Dex (Dev)',
        status: 'working' as const,
        phase: 'Implementing Story 3.2',
        progress: 65,
        story: 'STORY-3.2',
        lastActivity: new Date().toISOString(),
        model: 'opus',
        squad: 'aios-core',
        totalExecutions: 120,
        successRate: 95,
        avgResponseTime: 1200,
      };
      render(<AgentMonitorCard agent={agent} />);
      expect(screen.getAllByText(/Dex/i).length).toBeGreaterThan(0);
    });

    it('renders an idle agent card without crashing', async () => {
      const { AgentMonitorCard } = await import('../AgentMonitorCard');
      const agent = {
        id: 'qa',
        name: 'Quinn (QA)',
        status: 'idle' as const,
        phase: '',
        progress: 0,
        story: '',
        lastActivity: '-',
        model: 'sonnet',
        squad: 'aios-core',
      };
      render(<AgentMonitorCard agent={agent} />);
      expect(screen.getAllByText(/Quinn/i).length).toBeGreaterThan(0);
    });

    it('shows model badge', async () => {
      const { AgentMonitorCard } = await import('../AgentMonitorCard');
      const agent = {
        id: 'dev',
        name: 'Dex',
        status: 'working' as const,
        phase: 'Testing',
        progress: 40,
        story: 'STORY-1',
        lastActivity: new Date().toISOString(),
        model: 'opus',
        squad: 'aios-core',
      };
      render(<AgentMonitorCard agent={agent} />);
      expect(screen.getAllByText(/opus/i).length).toBeGreaterThan(0);
    });
  });

  describe('AgentPerformanceStats', () => {
    it('renders without crashing with agents data', async () => {
      const { AgentPerformanceStats } = await import('../AgentPerformanceStats');
      const agents = [
        {
          id: 'dev',
          name: 'Dex',
          status: 'working' as const,
          phase: 'Coding',
          progress: 50,
          story: 'STORY-1',
          lastActivity: new Date().toISOString(),
          model: 'opus',
          squad: 'aios-core',
          totalExecutions: 100,
          successRate: 95,
          avgResponseTime: 1500,
        },
        {
          id: 'qa',
          name: 'Quinn',
          status: 'idle' as const,
          phase: '',
          progress: 0,
          story: '',
          lastActivity: '-',
          model: 'sonnet',
          squad: 'aios-core',
          totalExecutions: 80,
          successRate: 92,
          avgResponseTime: 2000,
        },
      ];
      render(<AgentPerformanceStats agents={agents} />);
      // Should show stat labels
      expect(screen.getAllByText(/Total Executions/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Avg Success Rate/i).length).toBeGreaterThan(0);
    });

    it('renders with empty agents array', async () => {
      const { AgentPerformanceStats } = await import('../AgentPerformanceStats');
      render(<AgentPerformanceStats agents={[]} />);
      expect(screen.getAllByText(/Active Now/i).length).toBeGreaterThan(0);
    });
  });

  describe('AgentActivityTimeline', () => {
    it('renders without crashing with entries', async () => {
      const { AgentActivityTimeline } = await import('../AgentActivityTimeline');
      const entries = [
        {
          id: 'act-1',
          agentId: 'dev',
          timestamp: new Date().toISOString(),
          action: 'Committed feat: implement agent cards',
          status: 'success' as const,
          duration: 4500,
        },
        {
          id: 'act-2',
          agentId: 'qa',
          timestamp: new Date().toISOString(),
          action: 'QA Gate failed - accessibility check',
          status: 'error' as const,
          duration: 8700,
        },
      ];
      render(<AgentActivityTimeline entries={entries} />);
      expect(screen.getAllByText(/Committed feat/i).length).toBeGreaterThan(0);
    });

    it('renders empty state when no entries', async () => {
      const { AgentActivityTimeline } = await import('../AgentActivityTimeline');
      render(<AgentActivityTimeline entries={[]} />);
      expect(screen.getAllByText(/Nenhuma atividade recente/i).length).toBeGreaterThan(0);
    });

    it('filters entries by agentFilter', async () => {
      const { AgentActivityTimeline } = await import('../AgentActivityTimeline');
      const entries = [
        {
          id: 'act-1',
          agentId: 'dev',
          timestamp: new Date().toISOString(),
          action: 'Dev action entry',
          status: 'success' as const,
          duration: 3000,
        },
        {
          id: 'act-2',
          agentId: 'qa',
          timestamp: new Date().toISOString(),
          action: 'QA action entry',
          status: 'success' as const,
          duration: 5000,
        },
      ];
      render(<AgentActivityTimeline entries={entries} agentFilter="dev" />);
      expect(screen.getAllByText(/Dev action entry/i).length).toBeGreaterThan(0);
    });
  });
});
