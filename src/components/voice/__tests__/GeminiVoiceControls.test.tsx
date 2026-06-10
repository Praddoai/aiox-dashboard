import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '../../../test/test-utils';
import { GeminiVoiceControls } from '../GeminiVoiceControls';

const defaults = {
  isConnected: false,
  isSpeaking: false,
  onConnect: vi.fn(),
  onDisconnect: vi.fn(),
  onClose: vi.fn(),
  onToggleMute: vi.fn(),
  onToggleSettings: vi.fn(),
  onPttDown: vi.fn(),
  onPttUp: vi.fn(),
  state: 'idle' as const,
  isMuted: false,
  showSettings: false,
  inputLevel: 0,
};

describe('GeminiVoiceControls', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---- Rendering ----

  it('renders connect button when disconnected', () => {
    render(<GeminiVoiceControls {...defaults} />);
    expect(screen.getByLabelText(/conectar gemini live/i)).toBeInTheDocument();
  });

  it('renders disconnect button when connected', () => {
    render(<GeminiVoiceControls {...defaults} isConnected={true} />);
    expect(screen.getByLabelText(/desconectar gemini live/i)).toBeInTheDocument();
  });

  it('renders close button', () => {
    render(<GeminiVoiceControls {...defaults} />);
    expect(screen.getByLabelText(/fechar modo voz/i)).toBeInTheDocument();
  });

  it('renders mute button', () => {
    render(<GeminiVoiceControls {...defaults} />);
    expect(screen.getByLabelText(/silenciar microfone/i)).toBeInTheDocument();
  });

  it('renders settings button', () => {
    render(<GeminiVoiceControls {...defaults} />);
    expect(screen.getByLabelText(/configuracoes de voz/i)).toBeInTheDocument();
  });

  it('renders Gemini badge', () => {
    render(<GeminiVoiceControls {...defaults} />);
    expect(screen.getByText(/gemini live/i)).toBeInTheDocument();
  });

  // ---- State labels ----

  it('shows "CLIQUE PARA CONECTAR" when disconnected', () => {
    render(<GeminiVoiceControls {...defaults} />);
    expect(screen.getByText('CLIQUE PARA CONECTAR')).toBeInTheDocument();
  });

  it('shows "SEGURE SPACE PARA FALAR" when connected and idle', () => {
    render(<GeminiVoiceControls {...defaults} isConnected={true} />);
    expect(screen.getByText('SEGURE SPACE PARA FALAR')).toBeInTheDocument();
  });

  it('shows "GRAVANDO... SOLTE PARA ENVIAR" when speaking (recording)', () => {
    render(
      <GeminiVoiceControls {...defaults} isConnected={true} isSpeaking={true} />,
    );
    expect(screen.getByText('GRAVANDO... SOLTE PARA ENVIAR')).toBeInTheDocument();
  });

  it('shows "GEMINI RESPONDENDO..." when state is speaking', () => {
    render(
      <GeminiVoiceControls {...defaults} isConnected={true} state="speaking" />,
    );
    expect(screen.getByText('GEMINI RESPONDENDO...')).toBeInTheDocument();
  });

  it('shows "PROCESSANDO..." when state is thinking', () => {
    render(
      <GeminiVoiceControls {...defaults} isConnected={true} state="thinking" />,
    );
    expect(screen.getByText('PROCESSANDO...')).toBeInTheDocument();
  });

  it('shows "MICROFONE SILENCIADO" when connected and muted', () => {
    render(
      <GeminiVoiceControls
        {...defaults}
        isConnected={true}
        isMuted={true}
      />,
    );
    expect(screen.getByText('MICROFONE SILENCIADO')).toBeInTheDocument();
  });

  // ---- Button interactions ----

  it('calls onConnect when main button clicked while disconnected', async () => {
    const onConnect = vi.fn();
    const { user } = render(
      <GeminiVoiceControls {...defaults} onConnect={onConnect} />,
    );

    await user.click(screen.getByLabelText(/conectar gemini live/i));
    expect(onConnect).toHaveBeenCalledTimes(1);
  });

  it('calls onDisconnect when main button clicked while connected', async () => {
    const onDisconnect = vi.fn();
    const { user } = render(
      <GeminiVoiceControls
        {...defaults}
        isConnected={true}
        onDisconnect={onDisconnect}
      />,
    );

    await user.click(screen.getByLabelText(/desconectar gemini live/i));
    expect(onDisconnect).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when close button is clicked', async () => {
    const onClose = vi.fn();
    const { user } = render(
      <GeminiVoiceControls {...defaults} onClose={onClose} />,
    );

    await user.click(screen.getByLabelText(/fechar modo voz/i));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onToggleMute when mute button is clicked', async () => {
    const onToggleMute = vi.fn();
    const { user } = render(
      <GeminiVoiceControls {...defaults} onToggleMute={onToggleMute} />,
    );

    await user.click(screen.getByLabelText(/silenciar microfone/i));
    expect(onToggleMute).toHaveBeenCalledTimes(1);
  });

  it('shows "Ativar microfone" label when muted', () => {
    render(<GeminiVoiceControls {...defaults} isMuted={true} />);
    expect(screen.getByLabelText(/ativar microfone/i)).toBeInTheDocument();
  });

  it('calls onToggleSettings when settings button is clicked', async () => {
    const onToggleSettings = vi.fn();
    const { user } = render(
      <GeminiVoiceControls {...defaults} onToggleSettings={onToggleSettings} />,
    );

    await user.click(screen.getByLabelText(/configuracoes de voz/i));
    expect(onToggleSettings).toHaveBeenCalledTimes(1);
  });

  it('sets aria-expanded on settings button', () => {
    const { rerender } = render(
      <GeminiVoiceControls {...defaults} showSettings={false} />,
    );
    expect(screen.getByLabelText(/configuracoes de voz/i)).toHaveAttribute(
      'aria-expanded',
      'false',
    );

    rerender(<GeminiVoiceControls {...defaults} showSettings={true} />);
    expect(screen.getByLabelText(/configuracoes de voz/i)).toHaveAttribute(
      'aria-expanded',
      'true',
    );
  });

  // ---- Keyboard shortcuts ----

  it('calls onClose on Escape key', () => {
    const onClose = vi.fn();
    render(<GeminiVoiceControls {...defaults} onClose={onClose} />);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onConnect on Space key when disconnected', () => {
    const onConnect = vi.fn();
    render(
      <GeminiVoiceControls {...defaults} onConnect={onConnect} />,
    );

    fireEvent.keyDown(window, { key: ' ' });
    expect(onConnect).toHaveBeenCalledTimes(1);
  });

  it('calls onPttDown/onPttUp on Space hold when connected', () => {
    const onPttDown = vi.fn();
    const onPttUp = vi.fn();
    render(
      <GeminiVoiceControls
        {...defaults}
        isConnected={true}
        onPttDown={onPttDown}
        onPttUp={onPttUp}
      />,
    );

    fireEvent.keyDown(window, { key: ' ' });
    expect(onPttDown).toHaveBeenCalledTimes(1);

    fireEvent.keyUp(window, { key: ' ' });
    expect(onPttUp).toHaveBeenCalledTimes(1);
  });

  it('ignores Space in input elements', () => {
    const onConnect = vi.fn();
    render(<GeminiVoiceControls {...defaults} onConnect={onConnect} />);

    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();

    // Dispatch native KeyboardEvent on input (RTL fireEvent adds value setter logic that fails on window)
    const event = new KeyboardEvent('keydown', { key: ' ', bubbles: true });
    input.dispatchEvent(event);
    expect(onConnect).not.toHaveBeenCalled();

    document.body.removeChild(input);
  });

  // ---- Keyboard hints ----

  it('shows keyboard hints initially', () => {
    render(<GeminiVoiceControls {...defaults} />);
    expect(screen.getByText('SPACE')).toBeInTheDocument();
    expect(screen.getByText('ESC')).toBeInTheDocument();
  });

  it('shows correct Space hint based on connection state', () => {
    const { rerender } = render(
      <GeminiVoiceControls {...defaults} />,
    );
    expect(screen.getByText('CONECTAR')).toBeInTheDocument();

    rerender(<GeminiVoiceControls {...defaults} isConnected={true} />);
    expect(screen.getByText(/segure p\/ falar/i)).toBeInTheDocument();
  });
});
