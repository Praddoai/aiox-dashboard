import { describe, it, expect, vi, beforeEach } from 'vitest';
import { executeToolCall, AIOS_TOOL_DECLARATIONS } from '../voice-task-router';

// Mock the engine API
vi.mock('../api/engine', () => ({
  engineApi: {
    triggerOrchestrator: vi.fn(),
    startWorkflow: vi.fn(),
    getJob: vi.fn(),
    listJobs: vi.fn(),
    cancelJob: vi.fn(),
    health: vi.fn(),
    pool: vi.fn(),
    createCron: vi.fn(),
    checkAuthority: vi.fn(),
  },
}));

import { engineApi } from '../api/engine';

const mockEngine = engineApi as unknown as {
  [K in keyof typeof engineApi]: ReturnType<typeof vi.fn>;
};

describe('voice-task-router', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('AIOS_TOOL_DECLARATIONS', () => {
    it('should export 8 tool declarations', () => {
      expect(AIOS_TOOL_DECLARATIONS).toHaveLength(8);
    });

    it('should have all expected tool names', () => {
      const names = AIOS_TOOL_DECLARATIONS.map((t) => t.name);
      expect(names).toEqual([
        'execute_task',
        'start_workflow',
        'check_job_status',
        'list_jobs',
        'cancel_job',
        'check_engine_health',
        'create_cron',
        'check_authority',
      ]);
    });

    it('should NOT have execute_agent or orchestrate_task (AIOS authority compliance)', () => {
      const names = AIOS_TOOL_DECLARATIONS.map((t) => t.name);
      expect(names).not.toContain('execute_agent');
      expect(names).not.toContain('orchestrate_task');
    });

    it('execute_task should require only message parameter', () => {
      const tool = AIOS_TOOL_DECLARATIONS.find((t) => t.name === 'execute_task');
      expect(tool?.parameters.required).toEqual(['message']);
    });
  });

  describe('executeToolCall', () => {
    describe('execute_task', () => {
      it('should route through triggerOrchestrator (not executeAgent)', async () => {
        mockEngine.triggerOrchestrator.mockResolvedValue({
          job_id: 'job-123',
          routed_to: { squad: 'development', agent: 'dev' },
        });

        const result = await executeToolCall('execute_task', {
          message: 'Criar componente de login',
          priority: 1,
        });

        expect(mockEngine.triggerOrchestrator).toHaveBeenCalledWith({
          message: 'Criar componente de login',
          priority: 1,
        });
        expect(result.success).toBe(true);
        expect(result.summary).toContain('job-123');
        expect(result.summary).toContain('@dev');
        expect(result.summary).toContain('development');
      });

      it('should default priority to 2 when not provided', async () => {
        mockEngine.triggerOrchestrator.mockResolvedValue({
          job_id: 'job-456',
          routed_to: { squad: 'orchestrator', agent: 'architect' },
        });

        await executeToolCall('execute_task', {
          message: 'Revisar arquitetura',
        });

        expect(mockEngine.triggerOrchestrator).toHaveBeenCalledWith({
          message: 'Revisar arquitetura',
          priority: 2,
        });
      });
    });

    describe('start_workflow', () => {
      it('should start a workflow with correct parameters', async () => {
        mockEngine.startWorkflow.mockResolvedValue({
          workflowId: 'wf-789',
          definitionId: 'story-development-cycle',
          status: 'running',
        });

        const result = await executeToolCall('start_workflow', {
          workflow_id: 'story-development-cycle',
          message: 'Implementar feature de busca',
        });

        expect(mockEngine.startWorkflow).toHaveBeenCalledWith({
          workflowId: 'story-development-cycle',
          input: { message: 'Implementar feature de busca' },
        });
        expect(result.success).toBe(true);
        expect(result.summary).toContain('story-development-cycle');
        expect(result.summary).toContain('wf-789');
      });
    });

    describe('check_job_status', () => {
      it('should return job status with duration', async () => {
        const startedAt = new Date(Date.now() - 30000).toISOString(); // 30s ago
        mockEngine.getJob.mockResolvedValue({
          job: {
            id: 'job-abcdef123456',
            status: 'running',
            agent_id: 'dev',
            squad_id: 'development',
            started_at: startedAt,
          },
        });

        const result = await executeToolCall('check_job_status', {
          job_id: 'job-abcdef123456',
        });

        expect(result.success).toBe(true);
        expect(result.summary).toContain('job-abcdef12');
        expect(result.summary).toContain('running');
        expect(result.summary).toContain('@dev');
        expect(result.summary).toMatch(/\d+s/);
      });

      it('should show error message when present', async () => {
        mockEngine.getJob.mockResolvedValue({
          job: {
            id: 'job-fail123456',
            status: 'failed',
            agent_id: 'dev',
            squad_id: 'development',
            started_at: null,
            error_message: 'Timeout exceeded',
          },
        });

        const result = await executeToolCall('check_job_status', {
          job_id: 'job-fail123456',
        });

        expect(result.summary).toContain('Erro: Timeout exceeded');
      });

      it('should show "nao iniciado" when no started_at', async () => {
        mockEngine.getJob.mockResolvedValue({
          job: {
            id: 'job-pending12345',
            status: 'pending',
            agent_id: 'qa',
            squad_id: 'development',
            started_at: null,
          },
        });

        const result = await executeToolCall('check_job_status', {
          job_id: 'job-pending12345',
        });

        expect(result.summary).toContain('nao iniciado');
      });
    });

    describe('list_jobs', () => {
      it('should list jobs with summaries', async () => {
        mockEngine.listJobs.mockResolvedValue({
          jobs: [
            { id: 'job-111aaa', agent_id: 'dev', squad_id: 'development', status: 'running' },
            { id: 'job-222bbb', agent_id: 'qa', squad_id: 'development', status: 'done' },
          ],
        });

        const result = await executeToolCall('list_jobs', { status: 'running', limit: 5 });

        expect(mockEngine.listJobs).toHaveBeenCalledWith({ status: 'running', limit: 5 });
        expect(result.success).toBe(true);
        expect(result.summary).toContain('2 jobs encontrados');
        expect(result.summary).toContain('@dev/development');
      });

      it('should return empty message when no jobs found', async () => {
        mockEngine.listJobs.mockResolvedValue({ jobs: [] });

        const result = await executeToolCall('list_jobs', {});

        expect(result.success).toBe(true);
        expect(result.summary).toContain('Nenhum job encontrado');
      });

      it('should show status-specific message when filtering', async () => {
        mockEngine.listJobs.mockResolvedValue({ jobs: [] });

        const result = await executeToolCall('list_jobs', { status: 'failed' });

        expect(result.summary).toContain('status failed');
      });

      it('should default limit to 10', async () => {
        mockEngine.listJobs.mockResolvedValue({ jobs: [] });

        await executeToolCall('list_jobs', {});

        expect(mockEngine.listJobs).toHaveBeenCalledWith({ status: undefined, limit: 10 });
      });
    });

    describe('cancel_job', () => {
      it('should cancel a job', async () => {
        mockEngine.cancelJob.mockResolvedValue({ status: 'cancelled' });

        const result = await executeToolCall('cancel_job', {
          job_id: 'job-cancel12345',
        });

        expect(mockEngine.cancelJob).toHaveBeenCalledWith('job-cancel12345');
        expect(result.success).toBe(true);
        expect(result.summary).toContain('job-cancel12');
        expect(result.summary).toContain('cancelado');
      });
    });

    describe('check_engine_health', () => {
      it('should combine health and pool data', async () => {
        mockEngine.health.mockResolvedValue({
          status: 'ok',
          version: '0.4.0',
          uptime_ms: 3600000,
          ws_clients: 2,
        });
        mockEngine.pool.mockResolvedValue({
          total: 5,
          occupied: 2,
          idle: 3,
          queue_depth: 1,
        });

        const result = await executeToolCall('check_engine_health', {});

        expect(result.success).toBe(true);
        expect(result.summary).toContain('0.4.0');
        expect(result.summary).toContain('60 minutos');
        expect(result.summary).toContain('2 clientes WebSocket');
        expect(result.summary).toContain('2 de 5 slots');
        expect(result.summary).toContain('1 jobs na fila');
      });
    });

    describe('create_cron', () => {
      it('should create cron with orchestrator defaults', async () => {
        mockEngine.createCron.mockResolvedValue({
          cron: { id: 'cron-abc', name: 'daily-review' },
        });

        const result = await executeToolCall('create_cron', {
          name: 'daily-review',
          schedule: '0 9 * * *',
          message: 'Revisar PRs pendentes',
        });

        expect(mockEngine.createCron).toHaveBeenCalledWith({
          name: 'daily-review',
          schedule: '0 9 * * *',
          squad_id: 'orchestrator',
          agent_id: 'orchestrator',
          message: 'Revisar PRs pendentes',
        });
        expect(result.success).toBe(true);
        expect(result.summary).toContain('daily-review');
        expect(result.summary).toContain('0 9 * * *');
        expect(result.summary).toContain('cron-abc');
      });
    });

    describe('check_authority', () => {
      it('should report allowed operations', async () => {
        mockEngine.checkAuthority.mockResolvedValue({
          allowed: true,
          reason: 'Exclusive operation for devops',
        });

        const result = await executeToolCall('check_authority', {
          agent_id: 'devops',
          operation: 'git-push',
          squad_id: 'development',
        });

        expect(mockEngine.checkAuthority).toHaveBeenCalledWith(
          'devops',
          'git-push',
          'development',
        );
        expect(result.success).toBe(true);
        expect(result.summary).toContain('TEM permissao');
        expect(result.summary).toContain('git-push');
      });

      it('should report denied operations with suggestion', async () => {
        mockEngine.checkAuthority.mockResolvedValue({
          allowed: false,
          reason: 'Only devops can push',
          suggestAgent: 'devops',
        });

        const result = await executeToolCall('check_authority', {
          agent_id: 'dev',
          operation: 'git-push',
          squad_id: 'development',
        });

        expect(result.success).toBe(true);
        expect(result.summary).toContain('NAO tem permissao');
        expect(result.summary).toContain('delegue para @devops');
      });

      it('should report denied without suggestion', async () => {
        mockEngine.checkAuthority.mockResolvedValue({
          allowed: false,
          reason: 'Operation not allowed',
        });

        const result = await executeToolCall('check_authority', {
          agent_id: 'qa',
          operation: 'deploy',
          squad_id: 'development',
        });

        expect(result.summary).toContain('NAO tem permissao');
        expect(result.summary).not.toContain('delegue para');
      });
    });

    describe('unknown tool', () => {
      it('should return error for unknown tool names', async () => {
        const result = await executeToolCall('unknown_tool', {});

        expect(result.success).toBe(false);
        expect(result.summary).toContain('Ferramenta desconhecida');
        expect(result.summary).toContain('unknown_tool');
      });
    });

    describe('error handling', () => {
      it('should catch and report API errors', async () => {
        mockEngine.triggerOrchestrator.mockRejectedValue(
          new Error('Engine offline'),
        );

        const result = await executeToolCall('execute_task', {
          message: 'Test task',
        });

        expect(result.success).toBe(false);
        expect(result.summary).toContain('Erro ao executar execute_task');
        expect(result.summary).toContain('Engine offline');
      });

      it('should handle non-Error exceptions', async () => {
        mockEngine.health.mockRejectedValue('network failure');

        const result = await executeToolCall('check_engine_health', {});

        expect(result.success).toBe(false);
        expect(result.summary).toContain('Erro desconhecido');
      });
    });
  });
});
