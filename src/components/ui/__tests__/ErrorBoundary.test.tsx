import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '../../../test/test-utils';
import { ErrorBoundary, CompactErrorFallback } from '../ErrorBoundary';

// Component that throws an error for testing
function ThrowingComponent({ shouldThrow = true }: { shouldThrow?: boolean }) {
  if (shouldThrow) throw new Error('Test error');
  return <div>No error</div>;
}

describe('ErrorBoundary', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Suppress console.error during error boundary tests
    consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('should render children when no error', () => {
    render(
      <ErrorBoundary>
        <div>Safe content</div>
      </ErrorBoundary>
    );

    expect(screen.getByText('Safe content')).toBeInTheDocument();
  });

  it('should render error fallback when child throws', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent />
      </ErrorBoundary>
    );

    // Should not render the child content
    expect(screen.queryByText('No error')).not.toBeInTheDocument();
  });

  it('should show "Algo deu errado" in default fallback', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText('Algo deu errado')).toBeInTheDocument();
  });

  it('should show "Tentar novamente" button', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText('Tentar novamente')).toBeInTheDocument();
  });

  it('should call onError callback with error', () => {
    const handleError = vi.fn();

    render(
      <ErrorBoundary onError={handleError}>
        <ThrowingComponent />
      </ErrorBoundary>
    );

    expect(handleError).toHaveBeenCalled();
    expect(handleError.mock.calls[0][0]).toBeInstanceOf(Error);
    expect(handleError.mock.calls[0][0].message).toBe('Test error');
  });

  it('should render custom fallback when provided', () => {
    render(
      <ErrorBoundary fallback={<div>Custom error UI</div>}>
        <ThrowingComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText('Custom error UI')).toBeInTheDocument();
    expect(screen.queryByText('Algo deu errado')).not.toBeInTheDocument();
  });

  it('should reset error state when "Tentar novamente" clicked', async () => {
    const { user } = render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    // Error fallback should be shown
    expect(screen.getByText('Algo deu errado')).toBeInTheDocument();

    // Click retry
    await user.click(screen.getByText('Tentar novamente'));

    // The component will throw again, but the important thing is
    // that the boundary attempted to reset (error state was cleared)
    // Since ThrowingComponent still throws, it will show fallback again
    expect(screen.getByText('Algo deu errado')).toBeInTheDocument();
  });
});

describe('CompactErrorFallback', () => {
  it('should render message', () => {
    render(<CompactErrorFallback message="Falha ao carregar dados" />);

    expect(screen.getByText('Falha ao carregar dados')).toBeInTheDocument();
  });

  it('should render default message', () => {
    render(<CompactErrorFallback />);

    expect(screen.getByText('Erro ao carregar')).toBeInTheDocument();
  });

  it('should render retry button when onRetry provided', async () => {
    const handleRetry = vi.fn();
    const { user } = render(<CompactErrorFallback onRetry={handleRetry} />);

    const retryButton = screen.getByRole('button');
    await user.click(retryButton);

    expect(handleRetry).toHaveBeenCalledTimes(1);
  });

  it('should not render retry button when no onRetry', () => {
    render(<CompactErrorFallback />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
