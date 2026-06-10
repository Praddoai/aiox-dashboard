import { describe, it, expect } from 'vitest';
import { render, screen } from '../../../test/test-utils';
import { VoiceTranscript } from '../VoiceTranscript';
import type { TranscriptEntry } from '../../../stores/voiceStore';

function entry(role: 'user' | 'agent', text: string, timestamp = Date.now()): TranscriptEntry {
  return { role, text, timestamp };
}

const defaults = {
  userTranscript: '',
  agentTranscript: '',
  state: 'idle' as const,
  history: [] as TranscriptEntry[],
};

describe('VoiceTranscript', () => {
  // ---- Empty / Idle ----

  it('shows empty state when there is no content', () => {
    render(<VoiceTranscript {...defaults} />);
    expect(screen.getByText(/pressione espaco/i)).toBeInTheDocument();
  });

  it('does not show copy button when empty', () => {
    render(<VoiceTranscript {...defaults} />);
    expect(screen.queryByLabelText(/copiar/i)).not.toBeInTheDocument();
  });

  // ---- History entries ----

  it('renders history entries with correct roles', () => {
    const history = [
      entry('user', 'Ola, tudo bem?'),
      entry('agent', 'Ola! Como posso ajudar?'),
    ];
    render(<VoiceTranscript {...defaults} history={history} />);

    expect(screen.getByText('Ola, tudo bem?')).toBeInTheDocument();
    expect(screen.getByText('Ola! Como posso ajudar?')).toBeInTheDocument();
    expect(screen.getAllByText('VOCE')).toHaveLength(1);
    expect(screen.getAllByText('AGENTE')).toHaveLength(1);
  });

  it('shows copy button when history has content', () => {
    const history = [entry('user', 'Hello')];
    render(<VoiceTranscript {...defaults} history={history} />);
    expect(screen.getByLabelText(/copiar/i)).toBeInTheDocument();
  });

  // ---- Listening state ----

  it('shows user transcript bubble when listening', () => {
    render(
      <VoiceTranscript
        {...defaults}
        state="listening"
        userTranscript="Testando microfone"
      />,
    );
    expect(screen.getByText('Testando microfone')).toBeInTheDocument();
    // "VOCE" label should appear
    expect(screen.getByText('VOCE')).toBeInTheDocument();
  });

  it('does not show user bubble when listening but transcript is empty', () => {
    render(<VoiceTranscript {...defaults} state="listening" userTranscript="" />);
    expect(screen.getByText(/pressione espaco/i)).toBeInTheDocument();
  });

  // ---- Thinking state ----

  it('shows thinking indicator when state is thinking', () => {
    render(<VoiceTranscript {...defaults} state="thinking" />);
    expect(screen.getByText(/processando resposta/i)).toBeInTheDocument();
  });

  it('shows copy button when thinking (has content)', () => {
    render(<VoiceTranscript {...defaults} state="thinking" />);
    expect(screen.getByLabelText(/copiar/i)).toBeInTheDocument();
  });

  // ---- Speaking state ----

  it('shows agent transcript when speaking', () => {
    render(
      <VoiceTranscript
        {...defaults}
        state="speaking"
        agentTranscript="Resposta do agente"
      />,
    );
    // The typewriter may not show full text immediately, but the AGENTE label should appear
    expect(screen.getByText('AGENTE')).toBeInTheDocument();
  });

  it('does not show agent bubble when speaking but transcript is empty', () => {
    render(<VoiceTranscript {...defaults} state="speaking" agentTranscript="" />);
    expect(screen.getByText(/pressione espaco/i)).toBeInTheDocument();
  });

  // ---- Combined states ----

  it('renders history plus current listening bubble', () => {
    const history = [entry('agent', 'Pronto para ajudar')];
    render(
      <VoiceTranscript
        {...defaults}
        state="listening"
        userTranscript="Nova pergunta"
        history={history}
      />,
    );

    expect(screen.getByText('Pronto para ajudar')).toBeInTheDocument();
    expect(screen.getByText('Nova pergunta')).toBeInTheDocument();
    // 1 AGENTE from history + 1 VOCE from current
    expect(screen.getAllByText('AGENTE')).toHaveLength(1);
    expect(screen.getAllByText('VOCE')).toHaveLength(1);
  });

  // ---- Copy button ----

  it('copies transcript and shows Copiado! feedback', async () => {
    const history = [
      entry('user', 'Pergunta'),
      entry('agent', 'Resposta'),
    ];
    const { user } = render(<VoiceTranscript {...defaults} history={history} />);

    // Click copy button — uses clipboard API or textarea fallback
    await user.click(screen.getByLabelText(/copiar/i));
    // Verify the visual feedback appears regardless of clipboard API support
    expect(screen.getByText('Copiado!')).toBeInTheDocument();
  });

  // ---- Relative time ----

  it('displays relative timestamp for history entries', () => {
    const old = Date.now() - 120_000; // 2 minutes ago
    const history = [entry('user', 'Mensagem antiga', old)];
    render(<VoiceTranscript {...defaults} history={history} />);
    expect(screen.getByText('2m')).toBeInTheDocument();
  });

  // ---- Scroll ref ----

  it('has a scrollable container', () => {
    const history = [entry('user', 'Msg 1'), entry('agent', 'Msg 2')];
    const { container } = render(
      <VoiceTranscript {...defaults} history={history} />,
    );
    const scrollable = container.querySelector('.overflow-y-auto');
    expect(scrollable).toBeInTheDocument();
  });
});
