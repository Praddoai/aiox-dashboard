import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../../../test/test-utils';
import {
  EmptyState,
  NoSearchResults,
  NoMessages,
  NoActivity,
  NoAgents,
  OfflineState,
  ErrorState,
} from '../EmptyState';

describe('EmptyState', () => {
  it('should render title', () => {
    render(<EmptyState title="No items found" />);

    expect(screen.getByText('No items found')).toBeInTheDocument();
  });

  it('should render description', () => {
    render(
      <EmptyState
        title="No items"
        description="There are no items to display"
      />
    );

    expect(screen.getByText('There are no items to display')).toBeInTheDocument();
  });

  it('should render action button', async () => {
    const handleClick = vi.fn();
    const { user } = render(
      <EmptyState
        title="No items"
        action={{ label: 'Add Item', onClick: handleClick }}
      />
    );

    const button = screen.getByRole('button', { name: 'Add Item' });
    await user.click(button);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should render secondary action', async () => {
    const handlePrimary = vi.fn();
    const handleSecondary = vi.fn();
    const { user } = render(
      <EmptyState
        title="No items"
        action={{ label: 'Primary', onClick: handlePrimary }}
        secondaryAction={{ label: 'Secondary', onClick: handleSecondary }}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Secondary' }));

    expect(handleSecondary).toHaveBeenCalledTimes(1);
  });

  it('should render custom icon', () => {
    render(
      <EmptyState
        type="custom"
        icon={<span data-testid="custom-icon">*</span>}
        title="Custom"
      />
    );

    expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
  });

  it('should apply compact styling', () => {
    render(<EmptyState title="Compact" compact />);

    // Compact should be present
    expect(screen.getByText('Compact')).toBeInTheDocument();
  });
});

describe('NoSearchResults', () => {
  it('should display search query', () => {
    render(<NoSearchResults query="test query" />);

    expect(screen.getByText(/test query/)).toBeInTheDocument();
  });

  it('should render clear button when onClear provided', async () => {
    const handleClear = vi.fn();
    const { user } = render(
      <NoSearchResults query="test" onClear={handleClear} />
    );

    await user.click(screen.getByRole('button', { name: 'Limpar busca' }));

    expect(handleClear).toHaveBeenCalled();
  });

  it('should not render button when onClear not provided', () => {
    render(<NoSearchResults query="test" />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});

describe('NoMessages', () => {
  it('should render with start chat action', async () => {
    const handleStart = vi.fn();
    const { user } = render(<NoMessages onStartChat={handleStart} />);

    await user.click(screen.getByRole('button', { name: 'Iniciar conversa' }));

    expect(handleStart).toHaveBeenCalled();
  });

  it('should render without action when not provided', () => {
    render(<NoMessages />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});

describe('NoActivity', () => {
  it('should render activity empty state', () => {
    render(<NoActivity />);

    expect(screen.getByText('Sem atividade recente')).toBeInTheDocument();
  });

  it('should render description', () => {
    render(<NoActivity />);

    expect(screen.getByText(/atividades dos agents/i)).toBeInTheDocument();
  });
});

describe('NoAgents', () => {
  it('should render explore action', async () => {
    const handleExplore = vi.fn();
    const { user } = render(<NoAgents onExplore={handleExplore} />);

    await user.click(screen.getByRole('button', { name: 'Explorar agents' }));

    expect(handleExplore).toHaveBeenCalled();
  });
});

describe('OfflineState', () => {
  it('should render offline message', () => {
    render(<OfflineState />);

    expect(screen.getByText('Sem conexão')).toBeInTheDocument();
  });

  it('should render retry action', async () => {
    const handleRetry = vi.fn();
    const { user } = render(<OfflineState onRetry={handleRetry} />);

    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));

    expect(handleRetry).toHaveBeenCalled();
  });
});

describe('ErrorState', () => {
  it('should render default error message', () => {
    render(<ErrorState />);

    expect(screen.getByText('Algo deu errado')).toBeInTheDocument();
  });

  it('should render custom error message', () => {
    render(<ErrorState message="Custom error occurred" />);

    expect(screen.getByText('Custom error occurred')).toBeInTheDocument();
  });

  it('should render retry action', async () => {
    const handleRetry = vi.fn();
    const { user } = render(<ErrorState onRetry={handleRetry} />);

    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));

    expect(handleRetry).toHaveBeenCalled();
  });
});
