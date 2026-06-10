import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '../../../test/test-utils';
import { VoiceSettings } from '../VoiceSettings';

// Mock the voice store
const mockStore = {
  ttsProvider: 'edge' as const,
  ttsApiKey: '',
  ttsVoiceId: 'pt-BR-AntonioNeural',
  ttsEffectsEnabled: false,
  setTTSProvider: vi.fn(),
  setTTSApiKey: vi.fn(),
  setTTSVoiceId: vi.fn(),
  setTTSEffectsEnabled: vi.fn(),
  voiceBackend: 'multi-service' as const,
  geminiApiKey: '',
  geminiVoiceName: 'Kore',
  setVoiceBackend: vi.fn(),
  setGeminiApiKey: vi.fn(),
  setGeminiVoiceName: vi.fn(),
};

vi.mock('../../../stores/voiceStore', () => ({
  useVoiceStore: () => mockStore,
}));

// Mock navigator.mediaDevices
const mockEnumerateDevices = vi.fn().mockResolvedValue([]);
const mockGetUserMedia = vi.fn().mockResolvedValue({
  getTracks: () => [{ stop: vi.fn() }],
});

Object.defineProperty(navigator, 'mediaDevices', {
  value: {
    enumerateDevices: mockEnumerateDevices,
    getUserMedia: mockGetUserMedia,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  },
  writable: true,
});

const defaults = {
  isOpen: true,
  language: 'pt-BR',
  selectedDeviceId: null,
  onLanguageChange: vi.fn(),
  onDeviceChange: vi.fn(),
  onClose: vi.fn(),
};

describe('VoiceSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.ttsProvider = 'edge';
    mockStore.ttsApiKey = '';
    mockStore.voiceBackend = 'multi-service';
    mockStore.geminiApiKey = '';
    mockStore.ttsEffectsEnabled = false;
  });

  // ---- Visibility ----

  it('returns null when not open', () => {
    const { container } = render(<VoiceSettings {...defaults} isOpen={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders panel when open', () => {
    render(<VoiceSettings {...defaults} />);
    expect(screen.getByText(/configuracoes de voz/i)).toBeInTheDocument();
  });

  // ---- Close ----

  it('renders close button and calls onClose', async () => {
    const onClose = vi.fn();
    const { user } = render(
      <VoiceSettings {...defaults} onClose={onClose} />,
    );

    await user.click(screen.getByLabelText(/fechar configuracoes/i));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes on Escape key', () => {
    const onClose = vi.fn();
    render(<VoiceSettings {...defaults} onClose={onClose} />);

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // ---- Voice backend dropdown ----

  it('shows voice backend selector', () => {
    render(<VoiceSettings {...defaults} />);
    expect(screen.getByText(/modo de voz/i)).toBeInTheDocument();
  });

  it('shows multi-service as default backend', () => {
    render(<VoiceSettings {...defaults} />);
    expect(screen.getByText('Multi-servico')).toBeInTheDocument();
  });

  it('switches to gemini-live backend', async () => {
    const { user } = render(<VoiceSettings {...defaults} />);

    await user.click(screen.getByText('Multi-servico'));
    await user.click(screen.getByText('Gemini Live'));

    expect(mockStore.setVoiceBackend).toHaveBeenCalledWith('gemini-live');
  });

  // ---- TTS Provider (multi-service mode) ----

  it('shows TTS provider selector in multi-service mode', () => {
    render(<VoiceSettings {...defaults} />);
    expect(screen.getByText(/motor de voz/i)).toBeInTheDocument();
  });

  it('shows Edge TTS as default provider', () => {
    render(<VoiceSettings {...defaults} />);
    expect(screen.getByText(/edge tts/i)).toBeInTheDocument();
  });

  // ---- Gemini mode config ----

  it('shows Gemini API key input when in gemini-live mode', () => {
    mockStore.voiceBackend = 'gemini-live';
    render(<VoiceSettings {...defaults} />);

    expect(screen.getByText(/api key — google gemini/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText('AIza...')).toBeInTheDocument();
  });

  it('shows Gemini voice selector when in gemini-live mode', () => {
    mockStore.voiceBackend = 'gemini-live';
    render(<VoiceSettings {...defaults} />);

    expect(screen.getByText(/voz gemini/i)).toBeInTheDocument();
  });

  it('hides TTS provider when in gemini-live mode', () => {
    mockStore.voiceBackend = 'gemini-live';
    render(<VoiceSettings {...defaults} />);

    expect(screen.queryByText(/motor de voz/i)).not.toBeInTheDocument();
  });

  it('shows Gemini native audio info note', () => {
    mockStore.voiceBackend = 'gemini-live';
    render(<VoiceSettings {...defaults} />);

    // The info paragraph contains "sem STT/TTS separados" — unique text
    expect(screen.getByText(/sem stt\/tts separados/i)).toBeInTheDocument();
  });

  // ---- API Key input ----

  it('shows API key input for cloud providers', () => {
    mockStore.ttsProvider = 'elevenlabs';
    render(<VoiceSettings {...defaults} />);

    expect(screen.getByText(/api key — elevenlabs/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText('xi-...')).toBeInTheDocument();
  });

  it('does not show API key input for edge provider', () => {
    mockStore.ttsProvider = 'edge';
    render(<VoiceSettings {...defaults} />);

    expect(screen.queryByText(/api key — elevenlabs/i)).not.toBeInTheDocument();
  });

  it('toggles API key visibility', async () => {
    mockStore.ttsProvider = 'elevenlabs';
    const { user } = render(<VoiceSettings {...defaults} />);

    const input = screen.getByPlaceholderText('xi-...');
    expect(input).toHaveAttribute('type', 'password');

    // Find the SHOW button adjacent to the API key input
    const showBtn = screen.getAllByText('SHOW').find(
      (btn) => btn.closest('.px-4')?.querySelector('input[placeholder="xi-..."]'),
    )!;
    await user.click(showBtn);
    expect(input).toHaveAttribute('type', 'text');
  });

  // ---- Language selector ----

  it('shows language selector', () => {
    render(<VoiceSettings {...defaults} />);
    expect(screen.getByText(/idioma de reconhecimento/i)).toBeInTheDocument();
    expect(screen.getByText('Portugues (BR)')).toBeInTheDocument();
  });

  it('opens language dropdown and calls onLanguageChange', async () => {
    const onLanguageChange = vi.fn();
    const { user } = render(
      <VoiceSettings {...defaults} onLanguageChange={onLanguageChange} />,
    );

    await user.click(screen.getByText('Portugues (BR)'));
    await user.click(screen.getByText('English (US)'));

    expect(onLanguageChange).toHaveBeenCalledWith('en-US');
  });

  // ---- Audio device selector ----

  it('shows audio device selector', () => {
    render(<VoiceSettings {...defaults} />);
    expect(screen.getByText(/dispositivo de audio/i)).toBeInTheDocument();
    expect(screen.getByText(/padrao do sistema/i)).toBeInTheDocument();
  });

  // ---- Jarvis effects toggle ----

  it('shows Jarvis effects toggle for non-browser providers', () => {
    mockStore.ttsProvider = 'edge';
    render(<VoiceSettings {...defaults} />);

    const toggles = screen.getAllByLabelText(/efeito jarvis/i);
    expect(toggles.length).toBeGreaterThanOrEqual(1);
  });

  it('toggles Jarvis effects', async () => {
    mockStore.ttsProvider = 'edge';
    const { user } = render(<VoiceSettings {...defaults} />);

    const toggle = screen.getAllByLabelText(/efeito jarvis/i)[0];
    await user.click(toggle);
    expect(mockStore.setTTSEffectsEnabled).toHaveBeenCalledWith(true);
  });

  // ---- Info footer ----

  it('shows TTS info in multi-service mode', () => {
    render(<VoiceSettings {...defaults} />);
    expect(screen.getByText(/stt: web speech api/i)).toBeInTheDocument();
  });

  it('shows Gemini info in gemini-live mode', () => {
    mockStore.voiceBackend = 'gemini-live';
    render(<VoiceSettings {...defaults} />);
    expect(screen.getByText(/modo: gemini live/i)).toBeInTheDocument();
  });
});
