import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '../../../test/test-utils';

vi.mock('../../../lib/connection', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return { ...actual, getEngineUrl: () => 'http://localhost:4100' };
});

import CronJobEditor from '../CronJobEditor';

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

describe('CronJobEditor', () => {
  it('renderiza o form quando isOpen=true', () => {
    render(<CronJobEditor isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByText('Novo Cron Job')).toBeInTheDocument();
    expect(screen.getByLabelText(/nome/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/squad id/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/agent id/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/mensagem/i)).toBeInTheDocument();
    expect(screen.getByText('Criar Cron')).toBeInTheDocument();
    expect(screen.getByText('Cancelar')).toBeInTheDocument();
  });

  it('não renderiza quando isOpen=false', () => {
    render(<CronJobEditor isOpen={false} onClose={vi.fn()} />);

    expect(screen.queryByText('Novo Cron Job')).not.toBeInTheDocument();
  });

  it('mostra erros de validação quando campos estão vazios', async () => {
    const { user } = render(<CronJobEditor isOpen={true} onClose={vi.fn()} />);

    // Limpar campos com valor padrão
    const squadInput = screen.getByLabelText(/squad id/i);
    const agentInput = screen.getByLabelText(/agent id/i);
    await user.clear(squadInput);
    await user.clear(agentInput);

    await user.click(screen.getByText('Criar Cron'));

    expect(screen.getByText('Nome obrigatório')).toBeInTheDocument();
    expect(screen.getByText('Squad obrigatório')).toBeInTheDocument();
    expect(screen.getByText('Agent obrigatório')).toBeInTheDocument();
    expect(screen.getByText('Mensagem obrigatória')).toBeInTheDocument();
  });

  it('submete cron com dados corretos', async () => {
    const cronResponse = {
      cron: { id: 'c1', name: 'test-cron', schedule: '0 9 * * *', squad_id: 'development', agent_id: 'dev', enabled: true },
    };
    global.fetch = mockFetchSuccess(cronResponse);
    const onClose = vi.fn();
    const { user } = render(<CronJobEditor isOpen={true} onClose={onClose} />);

    const nameInput = screen.getByLabelText(/nome/i);
    const msgInput = screen.getByLabelText(/mensagem/i);
    fireEvent.change(nameInput, { target: { value: 'daily-review' } });
    fireEvent.change(msgInput, { target: { value: 'Executar review diário' } });
    await user.click(screen.getByText('Criar Cron'));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(global.fetch).toHaveBeenCalled();
    const body = JSON.parse((global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1]?.body as string);
    // createCron transforms to camelCase for the engine API
    expect(body.description).toBe('daily-review');
    expect(body.squadId).toBe('development');
    expect(body.agentId).toBe('dev');
    expect(body.input.message).toBe('Executar review diário');
  });

  it('chama onClose ao clicar Cancelar', async () => {
    const onClose = vi.fn();
    const { user } = render(<CronJobEditor isOpen={true} onClose={onClose} />);

    await user.click(screen.getByText('Cancelar'));
    expect(onClose).toHaveBeenCalled();
  });

  it('tem valores padrão nos campos squad e agent', () => {
    render(<CronJobEditor isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByLabelText(/squad id/i)).toHaveValue('development');
    expect(screen.getByLabelText(/agent id/i)).toHaveValue('dev');
  });

  it('tem presets de schedule no dropdown', () => {
    render(<CronJobEditor isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByText('A cada 5 min')).toBeInTheDocument();
    expect(screen.getByText('A cada hora')).toBeInTheDocument();
    expect(screen.getByText('Diário 9h')).toBeInTheDocument();
    expect(screen.getByText('Seg-Sex 9h')).toBeInTheDocument();
  });

  it('schedule input começa com valor padrão', () => {
    render(<CronJobEditor isOpen={true} onClose={vi.fn()} />);

    const scheduleInput = screen.getByPlaceholderText('*/5 * * * *');
    expect(scheduleInput).toHaveValue('0 * * * *');
  });
});
