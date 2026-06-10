import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '../../../test/test-utils';
import { CategoryManager } from '../CategoryManager';

// Mock framer-motion including Reorder
vi.mock('framer-motion', async () => {
  const React = await import('react');
  const MotionProxy = new Proxy(
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
              draggable,
              onDragStart,
              ...rest
            } = props;
            return React.createElement(prop, { ...rest, ref });
          },
        );
      },
    },
  );

  // Reorder.Group and Reorder.Item
  const ReorderGroup = React.forwardRef(
    (
      props: Record<string, unknown> & { children: React.ReactNode },
      ref: React.Ref<HTMLElement>,
    ) => {
      const { values, onReorder, axis, ...rest } = props;
      return React.createElement('div', { ...rest, ref });
    },
  );
  ReorderGroup.displayName = 'ReorderGroup';

  const ReorderItem = React.forwardRef(
    (
      props: Record<string, unknown> & { children: React.ReactNode },
      ref: React.Ref<HTMLElement>,
    ) => {
      const { value, layout, dragListener, dragControls, ...rest } = props;
      return React.createElement('div', { ...rest, ref });
    },
  );
  ReorderItem.displayName = 'ReorderItem';

  return {
    AnimatePresence: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
    motion: MotionProxy,
    Reorder: {
      Group: ReorderGroup,
      Item: ReorderItem,
    },
  };
});

// Mock stores
const mockCategoryStore = {
  categories: [
    {
      id: 'dev',
      name: 'Desenvolvimento',
      icon: 'Monitor',
      squadType: 'development' as const,
      squads: ['squad-1', 'squad-2'],
    },
    {
      id: 'design',
      name: 'Design',
      icon: 'Palette',
      squadType: 'design' as const,
      squads: [],
    },
  ],
  addCategory: vi.fn(),
  updateCategory: vi.fn(),
  deleteCategory: vi.fn(),
  moveSquadToCategory: vi.fn(),
  reorderSquadsInCategory: vi.fn(),
  reorderCategories: vi.fn(),
  getSquadCategory: vi.fn().mockReturnValue(null),
  resetToDefaults: vi.fn(),
};

vi.mock('../../../stores/categoryStore', () => ({
  useCategoryStore: () => mockCategoryStore,
}));

vi.mock('../../../hooks/useSquads', () => ({
  useSquads: () => ({
    data: [
      { id: 'squad-1', name: 'Full Stack Dev', icon: 'Code', agentCount: 3 },
      { id: 'squad-2', name: 'AIOS Core Dev', icon: 'Terminal', agentCount: 2 },
      { id: 'squad-3', name: 'Unassigned', icon: 'Package', agentCount: 1 },
    ],
    isLoading: false,
  }),
}));

const mockToast = { success: vi.fn(), error: vi.fn() };
vi.mock('../../ui/Toast', () => ({
  useToast: () => mockToast,
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

vi.mock('../../../lib/icons', () => ({
  getIconComponent: () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { forwardRef, createElement } = require('react');
    return forwardRef((props: Record<string, unknown>, ref: unknown) =>
      createElement('span', { ...props, ref }, 'icon'),
    );
  },
  ICON_SIZES: { sm: 14, md: 16, lg: 20, xl: 24 },
}));

describe('CategoryManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders header title', () => {
    render(<CategoryManager />);
    expect(screen.getByText('Organização de Categorias')).toBeInTheDocument();
  });

  it('renders subtitle', () => {
    render(<CategoryManager />);
    expect(
      screen.getByText('Arraste para reorganizar categorias e squads'),
    ).toBeInTheDocument();
  });

  it('renders Nova Categoria button', () => {
    render(<CategoryManager />);
    expect(screen.getByText('Nova Categoria')).toBeInTheDocument();
  });

  it('renders Resetar button', () => {
    render(<CategoryManager />);
    expect(screen.getByText('Resetar')).toBeInTheDocument();
  });

  it('renders category names', () => {
    render(<CategoryManager />);
    expect(screen.getByText('Desenvolvimento')).toBeInTheDocument();
    expect(screen.getByText('Design')).toBeInTheDocument();
  });

  it('shows squad count for each category', () => {
    render(<CategoryManager />);
    expect(screen.getByText('(2)')).toBeInTheDocument(); // dev has 2 squads
    expect(screen.getByText('(0)')).toBeInTheDocument(); // design has 0 squads
  });

  it('renders edit buttons for categories', () => {
    render(<CategoryManager />);
    const editButtons = screen.getAllByLabelText('Editar');
    expect(editButtons.length).toBeGreaterThanOrEqual(2);
  });

  it('renders delete buttons for categories', () => {
    render(<CategoryManager />);
    const deleteButtons = screen.getAllByLabelText('Excluir');
    expect(deleteButtons.length).toBeGreaterThanOrEqual(2);
  });

  it('calls resetToDefaults when Resetar clicked', async () => {
    const { user } = render(<CategoryManager />);
    await user.click(screen.getByText('Resetar'));
    expect(mockCategoryStore.resetToDefaults).toHaveBeenCalled();
    expect(mockToast.success).toHaveBeenCalledWith(
      'Reset',
      'Categorias restauradas para o padrão',
    );
  });

  it('shows new category form when Nova Categoria clicked', async () => {
    const { user } = render(<CategoryManager />);
    await user.click(screen.getByText('Nova Categoria'));
    expect(screen.getByPlaceholderText('Nome da categoria')).toBeInTheDocument();
    expect(screen.getByText('Criar')).toBeInTheDocument();
    expect(screen.getByText('Cancelar')).toBeInTheDocument();
  });

  it('shows uncategorized squads section', () => {
    // squad-3 is not in any category
    mockCategoryStore.getSquadCategory.mockImplementation((id: string) => {
      if (id === 'squad-1' || id === 'squad-2') return 'dev';
      return null;
    });
    render(<CategoryManager />);
    expect(screen.getByText(/Squads sem Categoria/)).toBeInTheDocument();
    expect(screen.getByText('Unassigned')).toBeInTheDocument();
  });

  it('shows error when creating category without name', async () => {
    const { user } = render(<CategoryManager />);
    await user.click(screen.getByText('Nova Categoria'));
    await user.click(screen.getByText('Criar'));
    expect(mockToast.error).toHaveBeenCalledWith(
      'Erro',
      'Nome da categoria é obrigatório',
    );
  });

  it('calls addCategory with form data', async () => {
    const { user } = render(<CategoryManager />);
    await user.click(screen.getByText('Nova Categoria'));

    const nameInput = screen.getByPlaceholderText('Nome da categoria');
    fireEvent.change(nameInput, { target: { value: 'Nova Cat' } });
    await user.click(screen.getByText('Criar'));

    expect(mockCategoryStore.addCategory).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Nova Cat' }),
    );
    expect(mockToast.success).toHaveBeenCalled();
  });

  it('disables delete button for category with squads', () => {
    render(<CategoryManager />);
    // The first delete button is for 'dev' which has 2 squads — should be disabled
    const deleteButtons = screen.getAllByLabelText('Excluir');
    expect(deleteButtons[0]).toBeDisabled();
  });

  it('allows deleting empty category', async () => {
    const { user } = render(<CategoryManager />);
    // The second delete button is for 'design' which has 0 squads
    const deleteButtons = screen.getAllByLabelText('Excluir');
    await user.click(deleteButtons[1]);
    expect(mockCategoryStore.deleteCategory).toHaveBeenCalledWith('design');
    expect(mockToast.success).toHaveBeenCalled();
  });
});
