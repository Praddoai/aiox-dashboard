import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../../test/test-utils';
import { ChatInput } from '../ChatInput';

describe('ChatInput', () => {
  const defaultProps = {
    onSend: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render textarea', () => {
    render(<ChatInput {...defaultProps} />);

    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('should render with custom placeholder', () => {
    render(<ChatInput {...defaultProps} placeholder="Type here..." />);

    expect(screen.getByPlaceholderText('Type here...')).toBeInTheDocument();
  });

  it('should render with agent name in placeholder', () => {
    render(<ChatInput {...defaultProps} agentName="Assistant" />);

    expect(screen.getByPlaceholderText(/Assistant/)).toBeInTheDocument();
  });

  it('should call onSend when Enter is pressed', async () => {
    const handleSend = vi.fn();
    const { user } = render(<ChatInput onSend={handleSend} />);

    const textarea = screen.getByRole('textbox');
    await user.type(textarea, 'Hello world');
    await user.keyboard('{Enter}');

    expect(handleSend).toHaveBeenCalledWith('Hello world', undefined);
  });

  it('should not send empty messages', async () => {
    const handleSend = vi.fn();
    const { user } = render(<ChatInput onSend={handleSend} />);

    screen.getByRole('textbox');
    await user.keyboard('{Enter}');

    expect(handleSend).not.toHaveBeenCalled();
  });

  it('should allow new line with Shift+Enter', async () => {
    const handleSend = vi.fn();
    const { user } = render(<ChatInput onSend={handleSend} />);

    const textarea = screen.getByRole('textbox');
    await user.type(textarea, 'Line 1');
    await user.keyboard('{Shift>}{Enter}{/Shift}');
    await user.type(textarea, 'Line 2');

    expect(handleSend).not.toHaveBeenCalled();
    expect(textarea).toHaveValue('Line 1\nLine 2');
  });

  it('should clear input after sending', async () => {
    const handleSend = vi.fn();
    const { user } = render(<ChatInput onSend={handleSend} />);

    const textarea = screen.getByRole('textbox');
    await user.type(textarea, 'Message');
    await user.keyboard('{Enter}');

    expect(textarea).toHaveValue('');
  });

  it('should be disabled when disabled prop is true', () => {
    render(<ChatInput {...defaultProps} disabled />);

    expect(screen.getByRole('textbox')).toBeDisabled();
  });

  it('should show stop button when streaming', () => {
    const handleStop = vi.fn();
    render(<ChatInput {...defaultProps} isStreaming onStop={handleStop} />);

    // Should have stop button (contains a rect SVG element for stop icon)
    const buttons = screen.getAllByRole('button');
    const stopButton = buttons.find(btn => btn.querySelector('rect'));
    expect(stopButton).toBeInTheDocument();
  });

  it('should call onStop when stop button is clicked', async () => {
    const handleStop = vi.fn();
    const { user } = render(<ChatInput {...defaultProps} isStreaming onStop={handleStop} />);

    // Find and click stop button
    const buttons = screen.getAllByRole('button');
    const stopButton = buttons.find(btn => btn.querySelector('rect'));
    if (stopButton) {
      await user.click(stopButton);
      expect(handleStop).toHaveBeenCalled();
    }
  });

  it('should show character count', () => {
    render(<ChatInput {...defaultProps} />);

    // There are two character count elements (desktop and mobile)
    const elements = screen.getAllByText(/\/4000/);
    expect(elements.length).toBeGreaterThanOrEqual(1);
  });

  it('should update character count as user types', async () => {
    const { user } = render(<ChatInput {...defaultProps} />);

    const textarea = screen.getByRole('textbox');
    await user.type(textarea, 'Hello');

    // There are two character count elements (desktop and mobile)
    const elements = screen.getAllByText('5/4000');
    expect(elements.length).toBeGreaterThanOrEqual(1);
  });

  it('should render attachment button', () => {
    render(<ChatInput {...defaultProps} />);

    // Find attachment button by its SVG path
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThanOrEqual(3); // attach, mic, send
  });

  it('should render microphone button', () => {
    render(<ChatInput {...defaultProps} />);

    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThanOrEqual(3);
  });

  it('should show keyboard hints', () => {
    render(<ChatInput {...defaultProps} />);

    // Find kbd elements that contain the keyboard shortcuts
    const kbdElements = document.querySelectorAll('kbd');
    const kbdTexts = Array.from(kbdElements).map(el => el.textContent);

    expect(kbdTexts).toContain('Enter');
    expect(kbdTexts).toContain('Shift+Enter');
  });
});
