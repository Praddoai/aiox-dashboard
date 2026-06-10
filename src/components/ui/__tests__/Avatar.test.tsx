import { describe, it, expect } from 'vitest';
import { render, screen } from '../../../test/test-utils';
import { Avatar } from '../Avatar';

describe('Avatar', () => {
  it('should render with initials when no image', () => {
    render(<Avatar name="John Doe" />);

    // Should show initials "JD"
    expect(screen.getByText('JD')).toBeInTheDocument();
  });

  it('should render single initial for single word name', () => {
    render(<Avatar name="John" />);

    expect(screen.getByText('J')).toBeInTheDocument();
  });

  it('should render question mark when no name', () => {
    render(<Avatar />);

    expect(screen.getByText('?')).toBeInTheDocument();
  });

  it('should render with image when src provided', () => {
    render(<Avatar src="https://example.com/avatar.jpg" name="John" />);

    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', 'https://example.com/avatar.jpg');
    expect(img).toHaveAttribute('alt', 'John');
  });

  it('should use alt prop if provided', () => {
    render(<Avatar src="https://example.com/avatar.jpg" alt="User avatar" name="John" />);

    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('alt', 'User avatar');
  });

  it('should apply size classes', () => {
    const { rerender, container } = render(<Avatar name="Test" size="sm" />);
    expect(container.querySelector('.h-8')).toBeInTheDocument();

    rerender(<Avatar name="Test" size="md" />);
    expect(container.querySelector('.h-10')).toBeInTheDocument();

    rerender(<Avatar name="Test" size="lg" />);
    expect(container.querySelector('.h-12')).toBeInTheDocument();

    rerender(<Avatar name="Test" size="xl" />);
    expect(container.querySelector('.h-16')).toBeInTheDocument();
  });

  it('should show online status indicator', () => {
    const { container } = render(<Avatar name="John" status="online" />);

    const statusIndicator = container.querySelector('.status-online');
    expect(statusIndicator).toBeInTheDocument();
  });

  it('should show offline status indicator', () => {
    const { container } = render(<Avatar name="John" status="offline" />);

    const statusIndicator = container.querySelector('.status-offline');
    expect(statusIndicator).toBeInTheDocument();
  });

  it('should show busy status indicator', () => {
    const { container } = render(<Avatar name="John" status="busy" />);

    const statusIndicator = container.querySelector('.status-busy');
    expect(statusIndicator).toBeInTheDocument();
  });

  it('should not show status indicator when status not provided', () => {
    const { container } = render(<Avatar name="John" />);

    expect(container.querySelector('.status-online')).not.toBeInTheDocument();
    expect(container.querySelector('.status-offline')).not.toBeInTheDocument();
    expect(container.querySelector('.status-busy')).not.toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(<Avatar name="Test" className="custom-avatar" />);

    expect(container.firstChild).toHaveClass('custom-avatar');
  });

  it('should apply squad gradient colors via CSS variable classes', () => {
    const { container, rerender } = render(<Avatar name="Test" squadType="copywriting" />);
    expect(container.querySelector('.from-squad-copywriting')).toBeInTheDocument();

    rerender(<Avatar name="Test" squadType="design" />);
    expect(container.querySelector('.from-squad-design')).toBeInTheDocument();

    rerender(<Avatar name="Test" squadType="creator" />);
    expect(container.querySelector('.from-squad-creator')).toBeInTheDocument();

    rerender(<Avatar name="Test" squadType="orchestrator" />);
    expect(container.querySelector('.from-squad-orchestrator')).toBeInTheDocument();
  });
});
