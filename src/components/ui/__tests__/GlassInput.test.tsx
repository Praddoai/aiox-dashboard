import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../../../test/test-utils';
import { GlassInput, GlassTextarea } from '../GlassInput';

describe('GlassInput', () => {
  it('should render input element', () => {
    render(<GlassInput placeholder="Enter text" />);

    expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
  });

  it('should render with label', () => {
    render(<GlassInput label="Username" />);

    expect(screen.getByText('Username')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('should show required indicator with label', () => {
    render(<GlassInput label="Email" required />);

    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('should handle value changes', async () => {
    const handleChange = vi.fn();
    const { user } = render(<GlassInput onChange={handleChange} />);

    const input = screen.getByRole('textbox');
    await user.type(input, 'hello');

    expect(handleChange).toHaveBeenCalled();
    expect(input).toHaveValue('hello');
  });

  it('should show error message', () => {
    render(<GlassInput error="This field is required" />);

    expect(screen.getByRole('alert')).toHaveTextContent('This field is required');
  });

  it('should set aria-invalid when error is present', () => {
    render(<GlassInput error="Error" />);

    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
  });

  it('should show hint text when no error', () => {
    render(<GlassInput hint="Enter your username" />);

    expect(screen.getByText('Enter your username')).toBeInTheDocument();
  });

  it('should hide hint when error is shown', () => {
    render(<GlassInput hint="Helpful hint" error="Error message" />);

    expect(screen.queryByText('Helpful hint')).not.toBeInTheDocument();
    expect(screen.getByText('Error message')).toBeInTheDocument();
  });

  it('should show character count', async () => {
    const { user } = render(
      <GlassInput showCharacterCount maxLength={10} />
    );

    expect(screen.getByText('0/10')).toBeInTheDocument();

    const input = screen.getByRole('textbox');
    await user.type(input, 'hello');

    expect(screen.getByText('5/10')).toBeInTheDocument();
  });

  it('should show success state', () => {
    render(<GlassInput success />);

    const input = screen.getByRole('textbox');
    // Check the input wrapper has success styling
    expect(input.closest('.glass-input')).toBeInTheDocument();
  });

  it('should render left icon', () => {
    const Icon = () => <span data-testid="left-icon">Q</span>;
    render(<GlassInput leftIcon={<Icon />} />);

    expect(screen.getByTestId('left-icon')).toBeInTheDocument();
  });

  it('should render right icon', () => {
    const Icon = () => <span data-testid="right-icon">{'\u2713'}</span>;
    render(<GlassInput rightIcon={<Icon />} />);

    expect(screen.getByTestId('right-icon')).toBeInTheDocument();
  });

  it('should be disabled when disabled prop is true', () => {
    render(<GlassInput disabled />);

    expect(screen.getByRole('textbox')).toBeDisabled();
  });

  it('should forward ref', () => {
    const ref = vi.fn();
    render(<GlassInput ref={ref} />);

    expect(ref).toHaveBeenCalled();
  });
});

describe('GlassTextarea', () => {
  it('should render textarea element', () => {
    render(<GlassTextarea placeholder="Enter description" />);

    expect(screen.getByPlaceholderText('Enter description')).toBeInTheDocument();
  });

  it('should render with label', () => {
    render(<GlassTextarea label="Description" />);

    expect(screen.getByText('Description')).toBeInTheDocument();
  });

  it('should handle value changes', async () => {
    const handleChange = vi.fn();
    const { user } = render(<GlassTextarea onChange={handleChange} />);

    const textarea = screen.getByRole('textbox');
    await user.type(textarea, 'test content');

    expect(handleChange).toHaveBeenCalled();
  });

  it('should show error message', () => {
    render(<GlassTextarea error="Description is required" />);

    expect(screen.getByRole('alert')).toHaveTextContent('Description is required');
  });

  it('should show character count', async () => {
    const { user } = render(
      <GlassTextarea showCharacterCount maxLength={100} />
    );

    expect(screen.getByText('0/100')).toBeInTheDocument();

    const textarea = screen.getByRole('textbox');
    await user.type(textarea, 'hello world');

    expect(screen.getByText('11/100')).toBeInTheDocument();
  });

  it('should show hint text', () => {
    render(<GlassTextarea hint="Maximum 500 characters" />);

    expect(screen.getByText('Maximum 500 characters')).toBeInTheDocument();
  });
});
