import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../../../test/test-utils';
import { GlassCard } from '../GlassCard';

describe('GlassCard', () => {
  it('should render children', () => {
    render(<GlassCard animate={false}>Card Content</GlassCard>);

    expect(screen.getByText('Card Content')).toBeInTheDocument();
  });

  it('should apply default glass styling', () => {
    const { container } = render(<GlassCard animate={false}>Content</GlassCard>);

    expect(container.firstChild).toHaveClass('glass');
  });

  it('should apply subtle variant', () => {
    const { container } = render(<GlassCard animate={false} variant="subtle">Subtle</GlassCard>);

    expect(container.firstChild).toHaveClass('glass-subtle');
  });

  it('should apply strong variant', () => {
    const { container } = render(<GlassCard animate={false} variant="strong">Strong</GlassCard>);

    expect(container.firstChild).toHaveClass('glass-lg');
  });

  it('should be interactive when interactive prop is true', () => {
    const { container } = render(<GlassCard animate={false} interactive>Interactive</GlassCard>);

    expect(container.firstChild).toHaveClass('glass-interactive');
  });

  it('should apply custom className', () => {
    const { container } = render(<GlassCard animate={false} className="custom-class">Content</GlassCard>);

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('should apply different padding sizes', () => {
    const { rerender, container } = render(<GlassCard animate={false} padding="none">Content</GlassCard>);
    expect(container.firstChild).not.toHaveClass('p-3', 'p-4', 'p-6');

    rerender(<GlassCard animate={false} padding="sm">Content</GlassCard>);
    expect(container.firstChild).toHaveClass('p-3');

    rerender(<GlassCard animate={false} padding="md">Content</GlassCard>);
    expect(container.firstChild).toHaveClass('p-4');

    rerender(<GlassCard animate={false} padding="lg">Content</GlassCard>);
    expect(container.firstChild).toHaveClass('p-6');
  });

  it('should apply different radius sizes', () => {
    const { rerender, container } = render(<GlassCard animate={false} radius="sm">Content</GlassCard>);
    expect(container.firstChild).toHaveClass('rounded-xl');

    rerender(<GlassCard animate={false} radius="md">Content</GlassCard>);
    expect(container.firstChild).toHaveClass('rounded-[16px]');

    rerender(<GlassCard animate={false} radius="lg">Content</GlassCard>);
    expect(container.firstChild).toHaveClass('rounded-glass');

    rerender(<GlassCard animate={false} radius="xl">Content</GlassCard>);
    expect(container.firstChild).toHaveClass('rounded-glass-lg');
  });

  it('should forward ref', () => {
    const ref = vi.fn();
    render(<GlassCard animate={false} ref={ref}>Content</GlassCard>);

    expect(ref).toHaveBeenCalled();
  });

  it('should render with animation by default', () => {
    const { container } = render(<GlassCard>Animated Content</GlassCard>);

    // Framer motion adds style for animations
    expect(container.firstChild).toBeInTheDocument();
  });

  it('should pass onClick handler', async () => {
    const handleClick = vi.fn();
    const { user } = render(
      <GlassCard animate={false} onClick={handleClick}>Clickable</GlassCard>
    );

    await user.click(screen.getByText('Clickable'));

    expect(handleClick).toHaveBeenCalled();
  });
});
