import { describe, it, expect } from 'vitest';
import { render, screen } from '../../../test/test-utils';
import { ProgressBar } from '../ProgressBar';

describe('ProgressBar', () => {
  it('renders progressbar role', () => {
    render(<ProgressBar value={50} />);

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('sets aria-valuenow to value', () => {
    render(<ProgressBar value={75} />);

    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '75');
  });

  it('sets aria-valuemin and aria-valuemax', () => {
    render(<ProgressBar value={50} />);

    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuemin', '0');
    expect(bar).toHaveAttribute('aria-valuemax', '100');
  });

  it('clamps value below 0 to 0', () => {
    render(<ProgressBar value={-20} />);

    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '0');
  });

  it('clamps value above 100 to 100', () => {
    render(<ProgressBar value={150} />);

    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '100');
  });

  it('shows percentage when showLabel=true', () => {
    render(<ProgressBar value={42} showLabel />);

    expect(screen.getByText('42%')).toBeInTheDocument();
  });

  it('shows label text when label is provided', () => {
    render(<ProgressBar value={60} label="Loading..." />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('has correct aria-label from label prop', () => {
    render(<ProgressBar value={60} label="Progress" />);

    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-label', 'Progress');
  });

  it('has correct aria-label fallback when no label', () => {
    render(<ProgressBar value={60} />);

    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-label', '60% complete');
  });

  it('renders sm size', () => {
    render(<ProgressBar value={50} size="sm" />);

    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveClass('h-1');
  });

  it('renders md size by default', () => {
    render(<ProgressBar value={50} />);

    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveClass('h-2');
  });

  it('renders lg size', () => {
    render(<ProgressBar value={50} size="lg" />);

    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveClass('h-3');
  });

  it('accepts custom className', () => {
    const { container } = render(<ProgressBar value={50} className="custom-progress" />);

    const root = container.firstElementChild as HTMLElement;
    expect(root).toHaveClass('custom-progress');
  });
});
