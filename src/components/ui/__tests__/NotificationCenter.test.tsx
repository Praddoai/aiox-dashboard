import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../../test/test-utils';
import { NotificationCenter } from '../NotificationCenter';

// Mock framer-motion to avoid AnimatePresence exit animation issues
vi.mock('framer-motion', async () => {
  const React = await import('react');
  return {
    AnimatePresence: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children),
    motion: new Proxy({}, {
      get: (_target, prop: string) => {
        return React.forwardRef((props: Record<string, unknown>, ref: React.Ref<HTMLElement>) => {
          const { initial, animate, exit, transition, layout, whileHover, whileTap, variants, ...rest } = props;
          return React.createElement(prop, { ...rest, ref });
        });
      },
    }),
  };
});

const mockStore = {
  notifications: [] as Array<{
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message?: string;
    timestamp: number;
    read: boolean;
  }>,
  unreadCount: 0,
  markAllRead: vi.fn(),
  clearNotifications: vi.fn(),
};

vi.mock('../../../stores/toastStore', () => ({
  useToastStore: () => mockStore,
}));

describe('NotificationCenter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.notifications = [];
    mockStore.unreadCount = 0;
  });

  it('renders bell button', () => {
    render(<NotificationCenter />);
    expect(screen.getByLabelText('Notificações')).toBeInTheDocument();
  });

  it('does not show badge when unreadCount is 0', () => {
    render(<NotificationCenter />);
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('shows badge with unread count', () => {
    mockStore.unreadCount = 5;
    render(<NotificationCenter />);
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('shows "9+" for more than 9 unread', () => {
    mockStore.unreadCount = 15;
    render(<NotificationCenter />);
    expect(screen.getByText('9+')).toBeInTheDocument();
  });

  it('shows "Nenhuma notificação" when empty and opened', async () => {
    const { user } = render(<NotificationCenter />);
    await user.click(screen.getByLabelText('Notificações'));
    expect(screen.getByText('Nenhuma notificação')).toBeInTheDocument();
  });

  it('shows notification items when opened', async () => {
    mockStore.notifications = [
      { id: '1', type: 'success', title: 'Deploy concluído', message: 'v2.0', timestamp: Date.now(), read: false },
      { id: '2', type: 'error', title: 'Falha no build', timestamp: Date.now(), read: true },
    ];
    const { user } = render(<NotificationCenter />);
    await user.click(screen.getByLabelText('Notificações'));

    expect(screen.getByText('Deploy concluído')).toBeInTheDocument();
    expect(screen.getByText('Falha no build')).toBeInTheDocument();
  });

  it('shows "Limpar tudo" when notifications exist', async () => {
    mockStore.notifications = [
      { id: '1', type: 'info', title: 'N1', timestamp: Date.now(), read: true },
    ];
    const { user } = render(<NotificationCenter />);
    await user.click(screen.getByLabelText('Notificações'));
    expect(screen.getByText('Limpar tudo')).toBeInTheDocument();
  });

  it('calls markAllRead when opening with unread items', async () => {
    mockStore.unreadCount = 3;
    mockStore.notifications = [
      { id: '1', type: 'info', title: 'Unread', timestamp: Date.now(), read: false },
    ];
    const { user } = render(<NotificationCenter />);
    await user.click(screen.getByLabelText('Notificações'));
    expect(mockStore.markAllRead).toHaveBeenCalled();
  });

  it('calls clearNotifications on "Limpar tudo" click', async () => {
    mockStore.notifications = [
      { id: '1', type: 'info', title: 'N1', timestamp: Date.now(), read: true },
    ];
    const { user } = render(<NotificationCenter />);
    await user.click(screen.getByLabelText('Notificações'));
    await user.click(screen.getByText('Limpar tudo'));
    expect(mockStore.clearNotifications).toHaveBeenCalled();
  });

  it('shows notification header', async () => {
    const { user } = render(<NotificationCenter />);
    await user.click(screen.getByLabelText('Notificações'));
    expect(screen.getByText('Notificações')).toBeInTheDocument();
  });
});
