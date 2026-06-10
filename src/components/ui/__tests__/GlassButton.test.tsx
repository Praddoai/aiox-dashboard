import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../../../test/test-utils';
import { GlassButton } from '../GlassButton';

describe('GlassButton', () => {
  it('should render with children', () => {
    render(<GlassButton>Click me</GlassButton>);

    expect(screen.getByRole('button')).toHaveTextContent('Click me');
  });

  it('should handle click events', async () => {
    const handleClick = vi.fn();
    const { user } = render(<GlassButton onClick={handleClick}>Click</GlassButton>);

    await user.click(screen.getByRole('button'));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should be disabled when disabled prop is true', () => {
    render(<GlassButton disabled>Disabled</GlassButton>);

    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('should not call onClick when disabled', async () => {
    const handleClick = vi.fn();
    const { user } = render(
      <GlassButton onClick={handleClick} disabled>
        Disabled
      </GlassButton>
    );

    await user.click(screen.getByRole('button'));

    expect(handleClick).not.toHaveBeenCalled();
  });

  it('should render with left icon', () => {
    const Icon = () => <span data-testid="icon">F</span>;
    render(<GlassButton leftIcon={<Icon />}>With Icon</GlassButton>);

    expect(screen.getByTestId('icon')).toBeInTheDocument();
    expect(screen.getByRole('button')).toHaveTextContent('With Icon');
  });

  it('should render with right icon', () => {
    const Icon = () => <span data-testid="icon">→</span>;
    render(<GlassButton rightIcon={<Icon />}>With Icon</GlassButton>);

    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });

  it('should apply variant classes', () => {
    const { rerender } = render(<GlassButton variant="primary">Primary</GlassButton>);
    expect(screen.getByRole('button')).toHaveClass('glass-button-primary');

    rerender(<GlassButton variant="ghost">Ghost</GlassButton>);
    // Ghost variant should not have primary class
    expect(screen.getByRole('button')).not.toHaveClass('glass-button-primary');
  });

  it('should show loading state', () => {
    render(<GlassButton loading>Loading</GlassButton>);

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    // Loading spinner should be present
    expect(button.querySelector('svg')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    render(<GlassButton className="custom-class">Custom</GlassButton>);

    expect(screen.getByRole('button')).toHaveClass('custom-class');
  });

  it('should forward ref', () => {
    const ref = vi.fn();
    render(<GlassButton ref={ref}>Ref Button</GlassButton>);

    expect(ref).toHaveBeenCalled();
  });

  it('should render as icon button with size="icon"', () => {
    render(
      <GlassButton size="icon" aria-label="Icon button">
        <span>Q</span>
      </GlassButton>
    );

    const button = screen.getByRole('button');
    // Icon size buttons have specific dimensions
    expect(button).toBeInTheDocument();
  });
});
