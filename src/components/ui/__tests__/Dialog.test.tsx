import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '../../../test/test-utils';
import { Dialog } from '../Dialog';

describe('Dialog', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    children: <p>Dialog content</p>,
  };

  it('does not render when isOpen=false', () => {
    render(
      <Dialog isOpen={false} onClose={vi.fn()}>
        <p>Hidden content</p>
      </Dialog>
    );

    expect(screen.queryByText('Hidden content')).not.toBeInTheDocument();
  });

  it('renders when isOpen=true', () => {
    render(<Dialog {...defaultProps} />);

    expect(screen.getByText('Dialog content')).toBeInTheDocument();
  });

  it('shows title', () => {
    render(<Dialog {...defaultProps} title="My Dialog" />);

    expect(screen.getByText('My Dialog')).toBeInTheDocument();
  });

  it('shows description', () => {
    render(<Dialog {...defaultProps} title="Title" description="Some description" />);

    expect(screen.getByText('Some description')).toBeInTheDocument();
  });

  it('shows children content', () => {
    render(
      <Dialog {...defaultProps}>
        <span>Custom child</span>
      </Dialog>
    );

    expect(screen.getByText('Custom child')).toBeInTheDocument();
  });

  it('shows close button by default', () => {
    render(<Dialog {...defaultProps} title="Title" />);

    expect(screen.getByLabelText('Close dialog')).toBeInTheDocument();
  });

  it('calls onClose when close button clicked', async () => {
    const onClose = vi.fn();
    const { user } = render(
      <Dialog isOpen={true} onClose={onClose} title="Title">
        <p>Content</p>
      </Dialog>
    );

    await user.click(screen.getByLabelText('Close dialog'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose on Escape key', () => {
    const onClose = vi.fn();
    render(
      <Dialog isOpen={true} onClose={onClose} title="Title">
        <p>Content</p>
      </Dialog>
    );

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders footer content', () => {
    render(
      <Dialog {...defaultProps} footer={<button>Save</button>}>
        <p>Content</p>
      </Dialog>
    );

    expect(screen.getByText('Save')).toBeInTheDocument();
  });

  it('has dialog role and aria-modal', () => {
    render(<Dialog {...defaultProps} title="Accessible Dialog" />);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  it('has aria-label matching title', () => {
    render(<Dialog {...defaultProps} title="My Title" />);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-label', 'My Title');
  });

  it('hides close button when showClose=false', () => {
    render(<Dialog {...defaultProps} title="Title" showClose={false} />);

    expect(screen.queryByLabelText('Close dialog')).not.toBeInTheDocument();
  });
});
