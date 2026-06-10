import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../../test/test-utils';

vi.mock('../../../lib/connection', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return { ...actual, getEngineUrl: () => 'http://localhost:4100' };
});

import JobDetailModal from '../JobDetailModal';

const mockJob = {
  job: {
    id: 'job-abc-123-def-456',
    squad_id: 'development',
    agent_id: 'dev',
    status: 'running',
    priority: 1,
    trigger_type: 'api',
    created_at: '2025-01-01T10:00:00Z',
    started_at: '2025-01-01T10:00:05Z',
    completed_at: null,
    attempt: 1,
    max_attempts: 3,
    pid: 5678,
  },
};

const mockLogs = { logs: ['[info] Starting job...', '[info] Processing...'], hasMore: false };

function setupFetchMock(jobData: unknown = mockJob) {
  global.fetch = vi.fn().mockImplementation((url: string) => {
    const path = typeof url === 'string' ? url : '';
    let data: unknown;

    if (path.includes('/logs')) data = mockLogs;
    else data = jobData;

    return Promise.resolve({
      ok: true,
      status: 200,
      text: () => Promise.resolve(JSON.stringify(data)),
      json: () => Promise.resolve(data),
    });
  });
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('JobDetailModal', () => {
  it('mostra "Carregando..." enquanto busca job', () => {
    global.fetch = vi.fn().mockReturnValue(new Promise(() => {}));
    render(<JobDetailModal jobId="job-1" onClose={vi.fn()} />);

    expect(screen.getByText('Carregando...')).toBeInTheDocument();
  });

  it('não renderiza quando jobId é null', () => {
    render(<JobDetailModal jobId={null} onClose={vi.fn()} />);

    expect(screen.queryByText('Job Detail')).not.toBeInTheDocument();
  });

  it('exibe detalhes do job quando carregado', async () => {
    setupFetchMock();
    render(<JobDetailModal jobId="job-abc-123-def-456" onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('job-abc-123-def-456')).toBeInTheDocument();
    });
    expect(screen.getByText('dev')).toBeInTheDocument();
    expect(screen.getByText('development')).toBeInTheDocument();
    expect(screen.getByText('api')).toBeInTheDocument();
    expect(screen.getByText('P1')).toBeInTheDocument();
    expect(screen.getByText('1 / 3')).toBeInTheDocument();
    expect(screen.getByText('5678')).toBeInTheDocument();
  });

  it('mostra botão "Cancelar Job" para jobs running', async () => {
    setupFetchMock();
    render(<JobDetailModal jobId="job-1" onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Cancelar Job')).toBeInTheDocument();
    });
  });

  it('não mostra cancelar para jobs done', async () => {
    const doneJob = { job: { ...mockJob.job, status: 'done' } };
    setupFetchMock(doneJob);
    render(<JobDetailModal jobId="job-1" onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('job-abc-123-def-456')).toBeInTheDocument();
    });
    expect(screen.queryByText('Cancelar Job')).not.toBeInTheDocument();
  });

  it('mostra confirmação ao clicar em "Cancelar Job"', async () => {
    setupFetchMock();
    const { user } = render(<JobDetailModal jobId="job-1" onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Cancelar Job')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Cancelar Job'));
    expect(screen.getByText('Confirmar cancelamento?')).toBeInTheDocument();
    expect(screen.getByText('Sim, cancelar')).toBeInTheDocument();
    expect(screen.getByText('Não')).toBeInTheDocument();
  });

  it('exibe erro quando job tem error_message', async () => {
    const failedJob = {
      job: { ...mockJob.job, status: 'failed', error_message: 'Out of memory' },
    };
    setupFetchMock(failedJob);
    render(<JobDetailModal jobId="job-1" onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Out of memory')).toBeInTheDocument();
    });
  });

  it('exibe output truncado quando presente', async () => {
    const jobWithOutput = {
      job: { ...mockJob.job, status: 'done', output_result: 'Resultado completo do agente' },
    };
    setupFetchMock(jobWithOutput);
    render(<JobDetailModal jobId="job-1" onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Resultado completo do agente')).toBeInTheDocument();
    });
  });

  it('tem botão para copiar ID', async () => {
    setupFetchMock();
    render(<JobDetailModal jobId="job-1" onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByLabelText('Copiar ID')).toBeInTheDocument();
    });
  });

  it('exibe logs do job', async () => {
    setupFetchMock();
    render(<JobDetailModal jobId="job-1" onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('[info] Starting job...')).toBeInTheDocument();
    });
    expect(screen.getByText('[info] Processing...')).toBeInTheDocument();
  });

  it('mostra indicador LIVE para jobs running', async () => {
    setupFetchMock();
    render(<JobDetailModal jobId="job-1" onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('LIVE')).toBeInTheDocument();
    });
  });
});
