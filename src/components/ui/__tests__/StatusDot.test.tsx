import { describe, it, expect } from 'vitest';
import { render, screen } from '../../../test/test-utils';
import { StatusDot } from '../StatusDot';

describe('StatusDot', () => {
  const statuses = ['idle', 'working', 'waiting', 'error', 'success', 'offline'] as const;

  statuses.forEach((status) => {
    it(`renders dot for status "${status}"`, () => {
      const { container } = render(<StatusDot status={status} />);

      // Root is an inline-flex span wrapping a relative span with the dot inside
      const root = container.firstElementChild as HTMLElement;
      expect(root).toBeInTheDocument();
      expect(root.tagName).toBe('SPAN');
      expect(root).toHaveClass('inline-flex');
    });
  });

  it('renders with label text', () => {
    render(<StatusDot status="idle" label="Online" />);

    expect(screen.getByText('Online')).toBeInTheDocument();
  });

  it('does NOT show label when no label prop is provided', () => {
    const { container } = render(<StatusDot status="idle" />);

    // Root span > relative wrapper span > dot span — no label span
    const root = container.firstElementChild as HTMLElement;
    // Only child should be the relative wrapper span (no label sibling)
    expect(root.children).toHaveLength(1);
  });

  it('applies sm size classes', () => {
    const { container } = render(<StatusDot status="idle" size="sm" />);

    const dot = container.querySelector('.h-2.w-2');
    expect(dot).toBeInTheDocument();
  });

  it('applies md size classes by default', () => {
    const { container } = render(<StatusDot status="idle" />);

    const dot = container.querySelector('.rounded-full');
    expect(dot).toBeInTheDocument();
    expect(dot).toHaveClass('h-2.5', 'w-2.5');
  });

  it('applies lg size classes', () => {
    const { container } = render(<StatusDot status="idle" size="lg" />);

    const dot = container.querySelector('.h-3.w-3');
    expect(dot).toBeInTheDocument();
  });

  it('renders pulse animation for working status when pulse=true', () => {
    const { container } = render(<StatusDot status="working" pulse />);

    const pulseEl = container.querySelector('.animate-ping');
    expect(pulseEl).toBeInTheDocument();
  });

  it('renders pulse animation for waiting status when pulse=true', () => {
    const { container } = render(<StatusDot status="waiting" pulse />);

    const pulseEl = container.querySelector('.animate-ping');
    expect(pulseEl).toBeInTheDocument();
  });

  it('does NOT show pulse for idle even if pulse=true', () => {
    const { container } = render(<StatusDot status="idle" pulse />);

    const pulseEl = container.querySelector('.animate-ping');
    expect(pulseEl).not.toBeInTheDocument();
  });

  it('does NOT show pulse for error even if pulse=true', () => {
    const { container } = render(<StatusDot status="error" pulse />);

    const pulseEl = container.querySelector('.animate-ping');
    expect(pulseEl).not.toBeInTheDocument();
  });

  it('does NOT show pulse for success even if pulse=true', () => {
    const { container } = render(<StatusDot status="success" pulse />);

    const pulseEl = container.querySelector('.animate-ping');
    expect(pulseEl).not.toBeInTheDocument();
  });

  it('accepts custom className', () => {
    const { container } = render(<StatusDot status="idle" className="custom-dot" />);

    const root = container.firstElementChild as HTMLElement;
    expect(root).toHaveClass('custom-dot');
  });
});
