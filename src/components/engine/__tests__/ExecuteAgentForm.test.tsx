import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../../test/test-utils';

vi.mock('../../../lib/connection', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return { ...actual, getEngineUrl: () => 'http://localhost:4100' };
});

import ExecuteAgentForm from '../ExecuteAgentForm';

function mockFetchSuccess(data: unknown) {
  return vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    text: () => Promise.resolve(JSON.stringify(data)),
    json: () => Promise.resolve(data),
  });
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('ExecuteAgentForm', () => {
  it('renderiza o form quando isOpen=true', () => {
    render(<ExecuteAgentForm isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByText('Executar Agente')).toBeInTheDocument();
    expect(screen.getByLabelText(/squad id/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/agent id/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/mensagem/i)).toBeInTheDocument();
    expect(screen.getByText('Executar')).toBeInTheDocument();
    expect(screen.getByText('Cancelar')).toBeInTheDocument();
  });

  it('não renderiza quando isOpen=false', () => {
    render(<ExecuteAgentForm isOpen={false} onClose={vi.fn()} />);

    expect(screen.queryByText('Executar Agente')).not.toBeInTheDocument();
  });

  it('mostra erros de validação quando campos estão vazios', async () => {
    const { user } = render(<ExecuteAgentForm isOpen={true} onClose={vi.fn()} />);

    // Limpar campos preenchidos por padrão
    const squadInput = screen.getByLabelText(/squad id/i);
    const agentInput = screen.getByLabelText(/agent id/i);
    await user.clear(squadInput);
    await user.clear(agentInput);

    await user.click(screen.getByText('Executar'));

    expect(screen.getByText('Squad obrigatório')).toBeInTheDocument();
    expect(screen.getByText('Agent obrigatório')).toBeInTheDocument();
    expect(screen.getByText('Mensagem obrigatória')).toBeInTheDocument();
  });

  it('submete job com dados corretos', async () => {
    global.fetch = mockFetchSuccess({ executionId: 'e1', status: 'pending' });
    const onClose = vi.fn();
    const { user } = render(<ExecuteAgentForm isOpen={true} onClose={onClose} />);

    const msgInput = screen.getByLabelText(/mensagem/i);
    // fireEvent para evitar truncamento de user.type com delay por keystroke
    const { fireEvent } = await import('@testing-library/react');
    fireEvent.change(msgInput, { target: { value: 'Implementar feature X' } });
    await user.click(screen.getByText('Executar'));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(global.fetch).toHaveBeenCalled();
    const body = JSON.parse((global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1]?.body as string);
    expect(body.squadId).toBe('development');
    expect(body.agentId).toBe('dev');
    expect(body.input.message).toBe('Implementar feature X');
  });

  it('chama onClose ao clicar Cancelar', async () => {
    const onClose = vi.fn();
    const { user } = render(<ExecuteAgentForm isOpen={true} onClose={onClose} />);

    await user.click(screen.getByText('Cancelar'));
    expect(onClose).toHaveBeenCalled();
  });

  it('tem campos com valores padrão', () => {
    render(<ExecuteAgentForm isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByLabelText(/squad id/i)).toHaveValue('development');
    expect(screen.getByLabelText(/agent id/i)).toHaveValue('dev');
  });

  it('tem seletor de prioridade com 4 opções', () => {
    render(<ExecuteAgentForm isOpen={true} onClose={vi.fn()} />);

    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
    expect(select.querySelectorAll('option')).toHaveLength(4);
  });
});
