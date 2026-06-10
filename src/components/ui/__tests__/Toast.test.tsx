import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../../test/test-utils';

// Mock framer-motion
const motionProps = ['initial', 'animate', 'exit', 'transition', 'variants', 'whileHover', 'whileTap', 'layout', 'layoutId'];
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
    li: tag('li'), p: tag('p'),
  },
  AnimatePresence: ({ children }: { children?: unknown }) => <>{children}</>,
}));

// Mock store
const mockRemoveToast = vi.fn();
const mockToasts: Array<{
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  action?: { label: string; onClick: () => void };
}> = [];

vi.mock('../../../stores/toastStore', () => ({
  useToastStore: () => ({
    toasts: mockToasts,
    removeToast: mockRemoveToast,
  }),
  useToast: () => ({ addToast: vi.fn() }),
}));

describe('ToastContainer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockToasts.length = 0;
  });

  it('renders empty when no toasts', async () => {
    const { ToastContainer } = await import('../Toast');
    const { container } = render(<ToastContainer />);
    expect(container.querySelectorAll('[role="alert"]')).toHaveLength(0);
  });

  it('renders toast with title', async () => {
    mockToasts.push({ id: '1', type: 'success', title: 'Operação concluída' });
    const { ToastContainer } = await import('../Toast');
    render(<ToastContainer />);
    expect(screen.getByText('Operação concluída')).toBeInTheDocument();
  });

  it('renders toast with message', async () => {
    mockToasts.push({ id: '1', type: 'info', title: 'Info', message: 'Detalhes aqui' });
    const { ToastContainer } = await import('../Toast');
    render(<ToastContainer />);
    expect(screen.getByText('Detalhes aqui')).toBeInTheDocument();
  });

  it('renders close button', async () => {
    mockToasts.push(
      { id: '1', type: 'success', title: 'T1' },
      { id: '2', type: 'error', title: 'T2' },
    );
    const { ToastContainer } = await import('../Toast');
    render(<ToastContainer />);
    expect(screen.getAllByLabelText('Fechar notificacao')).toHaveLength(2);
  });

  it('calls removeToast on close click', async () => {
    mockToasts.push({ id: 'toast-1', type: 'success', title: 'Sucesso' });
    const { ToastContainer } = await import('../Toast');
    const { user } = render(<ToastContainer />);
    await user.click(screen.getByLabelText('Fechar notificacao'));
    expect(mockRemoveToast).toHaveBeenCalledWith('toast-1');
  });

  it('renders action button', async () => {
    mockToasts.push({
      id: '1', type: 'info', title: 'Ação',
      action: { label: 'Desfazer', onClick: vi.fn() },
    });
    const { ToastContainer } = await import('../Toast');
    render(<ToastContainer />);
    expect(screen.getByText('Desfazer')).toBeInTheDocument();
  });

  it('has role="alert"', async () => {
    mockToasts.push({ id: '1', type: 'success', title: 'Alerta' });
    const { ToastContainer } = await import('../Toast');
    render(<ToastContainer />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it.each(['success', 'error', 'warning', 'info'] as const)(
    'renders %s type toast',
    async (type) => {
      mockToasts.push({ id: '1', type, title: `Toast ${type}` });
      const { ToastContainer } = await import('../Toast');
      render(<ToastContainer />);
      expect(screen.getByText(`Toast ${type}`)).toBeInTheDocument();
    },
  );
});
