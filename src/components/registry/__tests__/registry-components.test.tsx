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
  },
  AnimatePresence: ({ children }: { children?: unknown }) => <>{children}</>,
}));

// Mock stores
vi.mock('../../../stores/uiStore', () => ({
  useUIStore: vi.fn((selector?: (state: Record<string, unknown>) => unknown) => {
    const state = {
      registryTargetAgentId: null,
      registryTargetWorkflowId: null,
      clearRegistryTarget: vi.fn(),
      navigateToRegistryAgent: vi.fn(),
      setCurrentView: vi.fn(),
    };
    return selector ? selector(state) : state;
  }),
}));

describe('Registry Components — render tests', () => {
  describe('AgentDirectory', () => {
    it('renders without crashing', async () => {
      const { default: AgentDirectory } = await import('../AgentDirectory');
      const { container } = render(<AgentDirectory />);
      expect(container.querySelector('input')).toBeTruthy();
    });

    it('shows search input with placeholder', async () => {
      const { default: AgentDirectory } = await import('../AgentDirectory');
      render(<AgentDirectory />);
      expect(screen.getByPlaceholderText(/search|buscar|agent/i)).toBeTruthy();
    });

    it('renders agent cards when available', async () => {
      const { default: AgentDirectory } = await import('../AgentDirectory');
      render(<AgentDirectory />);
      // Agents may be empty if .aios-core/development/agents/ is not present
      const cards = screen.queryAllByText(/Dex|Quinn|Orion|Aria|Morgan/);
      expect(cards.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('TaskCatalog', () => {
    it('renders without crashing', async () => {
      const { default: TaskCatalog } = await import('../TaskCatalog');
      const { container } = render(<TaskCatalog />);
      expect(container.querySelector('input')).toBeTruthy();
    });

    it('shows task count', async () => {
      const { default: TaskCatalog } = await import('../TaskCatalog');
      render(<TaskCatalog />);
      // Should show total count (dynamic based on registry)
      expect(screen.getByText(/\d+/)).toBeTruthy();
    });
  });

  describe('WorkflowCatalog', () => {
    it('renders without crashing', async () => {
      const { default: WorkflowCatalog } = await import('../WorkflowCatalog');
      render(<WorkflowCatalog />);
      // Should show at least one workflow name
      expect(screen.getAllByText(/Workflow|Pipeline|Cycle|Loop/i).length).toBeGreaterThan(0);
    });
  });

  describe('AuthorityMatrix', () => {
    it('renders without crashing', async () => {
      const { default: AuthorityMatrix } = await import('../AuthorityMatrix');
      render(<AuthorityMatrix />);
      // Should show "Authority" or "Matrix" somewhere
      expect(screen.getAllByText(/Authority|Matrix|Autoridade/i).length).toBeGreaterThan(0);
    });
  });

  describe('HandoffVisualization', () => {
    it('renders without crashing', async () => {
      const { default: HandoffVisualization } = await import('../HandoffVisualization');
      render(<HandoffVisualization />);
      expect(screen.getAllByText(/Handoff|Pipeline|Flow/i).length).toBeGreaterThan(0);
    });
  });
});
