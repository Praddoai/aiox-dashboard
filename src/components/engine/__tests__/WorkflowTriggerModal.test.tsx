import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '../../../test/test-utils';

vi.mock('../../../lib/connection', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return { ...actual, getEngineUrl: () => 'http://localhost:4100' };
});

import WorkflowTriggerModal from '../WorkflowTriggerModal';

const mockWorkflow = { id: 'story-development-cycle', name: 'Story Development Cycle', phases: 4 };

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

describe('WorkflowTriggerModal', () => {
  it('renderiza quando workflow não é null', () => {
    render(<WorkflowTriggerModal workflow={mockWorkflow} onClose={vi.fn()} />);

    expect(screen.getByText(/Iniciar: Story Development Cycle/)).toBeInTheDocument();
    expect(screen.getByText(/4 fases/)).toBeInTheDocument();
    expect(screen.getByLabelText(/mensagem/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/parent job id/i)).toBeInTheDocument();
    expect(screen.getByText('Iniciar Workflow')).toBeInTheDocument();
  });

  it('não renderiza quando workflow é null', () => {
    render(<WorkflowTriggerModal workflow={null} onClose={vi.fn()} />);

    expect(screen.queryByText('Iniciar Workflow')).not.toBeInTheDocument();
  });

  it('mostra erro de validação sem mensagem', async () => {
    const { user } = render(<WorkflowTriggerModal workflow={mockWorkflow} onClose={vi.fn()} />);

    await user.click(screen.getByText('Iniciar Workflow'));
    expect(screen.getByText('Mensagem obrigatória')).toBeInTheDocument();
  });

  it('submete workflow com dados corretos', async () => {
    global.fetch = mockFetchSuccess({ workflowId: 'wf-1', definitionId: 'sdc', status: 'running' });
    const onClose = vi.fn();
    render(<WorkflowTriggerModal workflow={mockWorkflow} onClose={onClose} />);

    const msgInput = screen.getByLabelText(/mensagem/i);
    fireEvent.change(msgInput, { target: { value: 'Criar login page' } });
    fireEvent.click(screen.getByText('Iniciar Workflow'));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    const body = JSON.parse((global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1]?.body as string);
    expect(body.workflowId).toBe('story-development-cycle');
    expect(body.input.message).toBe('Criar login page');
  });

  it('envia parentJobId quando preenchido', async () => {
    global.fetch = mockFetchSuccess({ workflowId: 'wf-1', definitionId: 'sdc', status: 'running' });
    const onClose = vi.fn();
    render(<WorkflowTriggerModal workflow={mockWorkflow} onClose={onClose} />);

    const msgInput = screen.getByLabelText(/mensagem/i);
    const parentInput = screen.getByLabelText(/parent job id/i);
    fireEvent.change(msgInput, { target: { value: 'Test task' } });
    fireEvent.change(parentInput, { target: { value: 'job-parent-99' } });
    fireEvent.click(screen.getByText('Iniciar Workflow'));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    const body = JSON.parse((global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1]?.body as string);
    expect(body.parentJobId).toBe('job-parent-99');
  });

  it('chama onClose ao clicar Cancelar', async () => {
    const onClose = vi.fn();
    const { user } = render(<WorkflowTriggerModal workflow={mockWorkflow} onClose={onClose} />);

    await user.click(screen.getByText('Cancelar'));
    expect(onClose).toHaveBeenCalled();
  });
});
