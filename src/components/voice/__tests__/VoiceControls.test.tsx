import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '../../../test/test-utils';
import { VoiceControls } from '../VoiceControls';

const defaults = {
  onPTTDown: vi.fn(),
  onPTTUp: vi.fn(),
  onClose: vi.fn(),
  onToggleMute: vi.fn(),
  onToggleSettings: vi.fn(),
  state: 'idle' as const,
  isSupported: true,
  isMuted: false,
  showSettings: false,
  inputLevel: 0,
};

describe('VoiceControls', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---- Rendering ----

  it('renders PTT button with correct idle label', () => {
    render(<VoiceControls {...defaults} />);
    expect(screen.getByLabelText(/clique para falar/i)).toBeInTheDocument();
  });

  it('renders close button', () => {
    render(<VoiceControls {...defaults} />);
    expect(screen.getByLabelText(/fechar modo voz/i)).toBeInTheDocument();
  });

  it('renders mute button', () => {
    render(<VoiceControls {...defaults} />);
    expect(screen.getByLabelText(/silenciar microfone/i)).toBeInTheDocument();
  });

  it('renders settings button', () => {
    render(<VoiceControls {...defaults} />);
    expect(screen.getByLabelText(/configuracoes de voz/i)).toBeInTheDocument();
  });

  // ---- State labels ----

  it('shows "CLIQUE PARA FALAR" when idle', () => {
    render(<VoiceControls {...defaults} />);
    expect(screen.getByText('CLIQUE PARA FALAR')).toBeInTheDocument();
  });

  it('shows "OUVINDO..." when listening', () => {
    render(<VoiceControls {...defaults} state="listening" />);
    expect(screen.getByText('OUVINDO...')).toBeInTheDocument();
  });

  it('shows "PROCESSANDO..." when thinking', () => {
    render(<VoiceControls {...defaults} state="thinking" />);
    expect(screen.getByText('PROCESSANDO...')).toBeInTheDocument();
  });

  it('shows "REPRODUZINDO..." when speaking', () => {
    render(<VoiceControls {...defaults} state="speaking" />);
    expect(screen.getByText('REPRODUZINDO...')).toBeInTheDocument();
  });

  it('shows "NAVEGADOR NAO SUPORTADO" when not supported', () => {
    render(<VoiceControls {...defaults} isSupported={false} />);
    expect(screen.getByText('NAVEGADOR NAO SUPORTADO')).toBeInTheDocument();
  });

  it('shows "MICROFONE SILENCIADO" when muted', () => {
    render(<VoiceControls {...defaults} isMuted={true} />);
    expect(screen.getByText('MICROFONE SILENCIADO')).toBeInTheDocument();
  });

  // ---- Button interactions ----

  it('calls onPTTDown on first click and onPTTUp on second click', async () => {
    const onPTTDown = vi.fn();
    const onPTTUp = vi.fn();

    const { rerender } = render(
      <VoiceControls {...defaults} onPTTDown={onPTTDown} onPTTUp={onPTTUp} />,
    );

    // First click → start listening
    fireEvent.click(screen.getByLabelText(/clique para falar/i));
    expect(onPTTDown).toHaveBeenCalledTimes(1);

    // Rerender as listening state (simulating state change)
    rerender(
      <VoiceControls {...defaults} state="listening" onPTTDown={onPTTDown} onPTTUp={onPTTUp} />,
    );

    // Second click → stop
    fireEvent.click(screen.getByLabelText(/gravando/i));
    expect(onPTTUp).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when close button is clicked', async () => {
    const onClose = vi.fn();
    const { user } = render(<VoiceControls {...defaults} onClose={onClose} />);

    await user.click(screen.getByLabelText(/fechar modo voz/i));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onToggleMute when mute button is clicked', async () => {
    const onToggleMute = vi.fn();
    const { user } = render(
      <VoiceControls {...defaults} onToggleMute={onToggleMute} />,
    );

    await user.click(screen.getByLabelText(/silenciar microfone/i));
    expect(onToggleMute).toHaveBeenCalledTimes(1);
  });

  it('shows "Ativar microfone" label when muted', () => {
    render(<VoiceControls {...defaults} isMuted={true} />);
    expect(screen.getByLabelText(/ativar microfone/i)).toBeInTheDocument();
  });

  it('calls onToggleSettings when settings button is clicked', async () => {
    const onToggleSettings = vi.fn();
    const { user } = render(
      <VoiceControls {...defaults} onToggleSettings={onToggleSettings} />,
    );

    await user.click(screen.getByLabelText(/configuracoes de voz/i));
    expect(onToggleSettings).toHaveBeenCalledTimes(1);
  });

  it('sets aria-expanded on settings button', () => {
    const { rerender } = render(
      <VoiceControls {...defaults} showSettings={false} />,
    );
    expect(screen.getByLabelText(/configuracoes de voz/i)).toHaveAttribute(
      'aria-expanded',
      'false',
    );

    rerender(<VoiceControls {...defaults} showSettings={true} />);
    expect(screen.getByLabelText(/configuracoes de voz/i)).toHaveAttribute(
      'aria-expanded',
      'true',
    );
  });

  // ---- Disabled states ----

  it('disables PTT button when thinking', () => {
    render(<VoiceControls {...defaults} state="thinking" />);
    expect(screen.getByLabelText(/clique para falar/i)).toBeDisabled();
  });

  it('disables PTT button when speaking', () => {
    render(<VoiceControls {...defaults} state="speaking" />);
    expect(screen.getByLabelText(/clique para falar/i)).toBeDisabled();
  });

  it('disables PTT button when not supported', () => {
    render(<VoiceControls {...defaults} isSupported={false} />);
    expect(screen.getByLabelText(/clique para falar/i)).toBeDisabled();
  });

  it('does not call onPTTDown when disabled', () => {
    const onPTTDown = vi.fn();
    render(
      <VoiceControls {...defaults} state="thinking" onPTTDown={onPTTDown} />,
    );

    fireEvent.click(screen.getByLabelText(/clique para falar/i));
    expect(onPTTDown).not.toHaveBeenCalled();
  });

  // ---- Keyboard shortcuts ----

  it('calls onClose on Escape key', () => {
    const onClose = vi.fn();
    render(<VoiceControls {...defaults} onClose={onClose} />);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onPTTDown on Space keydown and onPTTUp on Space keyup', () => {
    const onPTTDown = vi.fn();
    const onPTTUp = vi.fn();
    render(
      <VoiceControls {...defaults} onPTTDown={onPTTDown} onPTTUp={onPTTUp} />,
    );

    fireEvent.keyDown(window, { key: ' ' });
    expect(onPTTDown).toHaveBeenCalledTimes(1);

    fireEvent.keyUp(window, { key: ' ' });
    expect(onPTTUp).toHaveBeenCalledTimes(1);
  });

  it('does not trigger Space PTT when disabled', () => {
    const onPTTDown = vi.fn();
    render(
      <VoiceControls {...defaults} state="thinking" onPTTDown={onPTTDown} />,
    );

    fireEvent.keyDown(window, { key: ' ' });
    expect(onPTTDown).not.toHaveBeenCalled();
  });

  it('does not repeat Space when held down', () => {
    const onPTTDown = vi.fn();
    render(
      <VoiceControls {...defaults} onPTTDown={onPTTDown} />,
    );

    fireEvent.keyDown(window, { key: ' ' });
    fireEvent.keyDown(window, { key: ' ', repeat: true });
    fireEvent.keyDown(window, { key: ' ', repeat: true });
    expect(onPTTDown).toHaveBeenCalledTimes(1);
  });

  // ---- Keyboard hints ----

  it('shows keyboard hints initially', () => {
    render(<VoiceControls {...defaults} />);
    expect(screen.getByText('ESPACO')).toBeInTheDocument();
    expect(screen.getByText('ESC')).toBeInTheDocument();
  });
});
