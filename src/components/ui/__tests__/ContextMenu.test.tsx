import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '../../../test/test-utils';
import { ContextMenu } from '../ContextMenu';

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

const defaultItems = [
  { label: 'Editar', onClick: vi.fn() },
  { label: 'Duplicar', onClick: vi.fn() },
  { label: 'Excluir', onClick: vi.fn(), danger: true },
];

describe('ContextMenu', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    defaultItems.forEach((item) => item.onClick.mockClear());
  });

  it('renders children', () => {
    render(
      <ContextMenu items={defaultItems}>
        <div data-testid="child">Right click me</div>
      </ContextMenu>,
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('does not show menu initially', () => {
    render(
      <ContextMenu items={defaultItems}>
        <div>Content</div>
      </ContextMenu>,
    );
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('opens menu on right-click', () => {
    render(
      <ContextMenu items={defaultItems}>
        <div data-testid="target">Content</div>
      </ContextMenu>,
    );
    fireEvent.contextMenu(screen.getByTestId('target'));
    expect(screen.getByRole('menu')).toBeInTheDocument();
  });

  it('shows menu items with role="menuitem"', () => {
    render(
      <ContextMenu items={defaultItems}>
        <div data-testid="target">Content</div>
      </ContextMenu>,
    );
    fireEvent.contextMenu(screen.getByTestId('target'));

    expect(screen.getAllByRole('menuitem')).toHaveLength(3);
    expect(screen.getByText('Editar')).toBeInTheDocument();
    expect(screen.getByText('Duplicar')).toBeInTheDocument();
    expect(screen.getByText('Excluir')).toBeInTheDocument();
  });

  it('calls onClick when item clicked', () => {
    render(
      <ContextMenu items={defaultItems}>
        <div data-testid="target">Content</div>
      </ContextMenu>,
    );
    fireEvent.contextMenu(screen.getByTestId('target'));
    fireEvent.click(screen.getByText('Editar'));
    expect(defaultItems[0].onClick).toHaveBeenCalledTimes(1);
  });

  it('closes menu after item click', () => {
    render(
      <ContextMenu items={defaultItems}>
        <div data-testid="target">Content</div>
      </ContextMenu>,
    );
    fireEvent.contextMenu(screen.getByTestId('target'));
    expect(screen.getByRole('menu')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Duplicar'));
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('does not call onClick for disabled items', () => {
    const disabledItem = { label: 'Desabilitado', onClick: vi.fn(), disabled: true };
    render(
      <ContextMenu items={[...defaultItems, disabledItem]}>
        <div data-testid="target">Content</div>
      </ContextMenu>,
    );
    fireEvent.contextMenu(screen.getByTestId('target'));
    fireEvent.click(screen.getByText('Desabilitado'));
    expect(disabledItem.onClick).not.toHaveBeenCalled();
  });

  it('renders separator as non-menuitem divider', () => {
    const items = [
      { label: 'Editar', onClick: vi.fn() },
      { label: '', onClick: vi.fn(), separator: true },
      { label: 'Excluir', onClick: vi.fn(), danger: true },
    ];
    render(
      <ContextMenu items={items}>
        <div data-testid="target">Content</div>
      </ContextMenu>,
    );
    fireEvent.contextMenu(screen.getByTestId('target'));

    // Only 2 menuitems (separator is a divider, not a button)
    expect(screen.getAllByRole('menuitem')).toHaveLength(2);
    // The separator renders as a border-t div inside the menu
    const menu = screen.getByRole('menu');
    expect(menu.children.length).toBe(3); // 2 buttons + 1 divider
  });

  it('closes on Escape key', () => {
    render(
      <ContextMenu items={defaultItems}>
        <div data-testid="target">Content</div>
      </ContextMenu>,
    );
    fireEvent.contextMenu(screen.getByTestId('target'));
    expect(screen.getByRole('menu')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('has role="menu" on menu container', () => {
    render(
      <ContextMenu items={defaultItems}>
        <div data-testid="target">Content</div>
      </ContextMenu>,
    );
    fireEvent.contextMenu(screen.getByTestId('target'));
    expect(screen.getByRole('menu')).toBeInTheDocument();
  });
});
