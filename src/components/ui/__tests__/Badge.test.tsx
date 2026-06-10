import { describe, it, expect } from 'vitest';
import { render, screen } from '../../../test/test-utils';
import { Badge } from '../Badge';

describe('Badge', () => {
  it('should render with text', () => {
    render(<Badge>New</Badge>);

    expect(screen.getByText('New')).toBeInTheDocument();
  });

  it('should apply default variant class', () => {
    render(<Badge>Default</Badge>);

    expect(screen.getByText('Default')).toHaveClass('glass-badge');
  });

  it('should apply squad variant with squad type', () => {
    const { rerender, container } = render(
      <Badge variant="squad" squadType="copywriting">Copy</Badge>
    );
    expect(container.querySelector('.bg-orange-500\\/15')).toBeInTheDocument();

    rerender(<Badge variant="squad" squadType="design">Design</Badge>);
    expect(container.querySelector('.bg-purple-500\\/15')).toBeInTheDocument();

    rerender(<Badge variant="squad" squadType="creator">Creator</Badge>);
    expect(container.querySelector('.bg-green-500\\/15')).toBeInTheDocument();

    rerender(<Badge variant="squad" squadType="orchestrator">Orch</Badge>);
    expect(container.querySelector('.bg-cyan-500\\/15')).toBeInTheDocument();
  });

  it('should apply status variant styles', () => {
    const { rerender, container } = render(
      <Badge variant="status" status="online">Online</Badge>
    );
    expect(container.querySelector('.text-green-500')).toBeInTheDocument();

    rerender(<Badge variant="status" status="busy">Busy</Badge>);
    expect(container.querySelector('.text-orange-500')).toBeInTheDocument();

    rerender(<Badge variant="status" status="offline">Offline</Badge>);
    expect(container.querySelector('.text-gray-500')).toBeInTheDocument();

    rerender(<Badge variant="status" status="success">Success</Badge>);
    expect(container.querySelector('.text-green-500')).toBeInTheDocument();

    rerender(<Badge variant="status" status="error">Error</Badge>);
    expect(container.querySelector('.text-red-500')).toBeInTheDocument();

    rerender(<Badge variant="status" status="warning">Warning</Badge>);
    expect(container.querySelector('.text-yellow-500, .text-yellow-600')).toBeInTheDocument();
  });

  it('should apply count variant style', () => {
    render(<Badge variant="count">5</Badge>);

    const badge = screen.getByText('5');
    expect(badge).toHaveClass('bg-[var(--badge-count-bg)]', 'text-[var(--badge-count-text)]', 'rounded-full');
  });

  it('should apply size classes', () => {
    const { rerender } = render(<Badge size="sm">Small</Badge>);
    expect(screen.getByText('Small')).toHaveClass('text-[10px]');

    rerender(<Badge size="md">Medium</Badge>);
    expect(screen.getByText('Medium')).toHaveClass('text-xs');
  });

  it('should apply custom className', () => {
    render(<Badge className="custom-badge">Custom</Badge>);

    expect(screen.getByText('Custom')).toHaveClass('custom-badge');
  });

  it('should have proper base classes', () => {
    render(<Badge>Test</Badge>);

    const badge = screen.getByText('Test');
    expect(badge).toHaveClass('inline-flex', 'items-center', 'justify-center', 'font-medium', 'rounded-md');
  });
});
