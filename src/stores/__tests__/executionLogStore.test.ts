import { describe, it, expect, beforeEach } from 'vitest';
import { useExecutionLogStore } from '../executionLogStore';

describe('executionLogStore', () => {
  beforeEach(() => {
    useExecutionLogStore.getState().clearLogs();
  });

  describe('initial state', () => {
    it('should have correct defaults', () => {
      const state = useExecutionLogStore.getState();
      expect(state.logs).toEqual([]);
      expect(state.isExecuting).toBe(false);
      expect(state.currentExecution).toEqual({
        id: null,
        startTime: null,
        command: null,
        pipelineAgents: [],
        currentStep: 0,
        totalSteps: 0,
      });
    });
  });

  describe('startExecution', () => {
    it('should set isExecuting, clear logs, and add initial log', () => {
      useExecutionLogStore.getState().startExecution('exec-1', '*develop');

      const state = useExecutionLogStore.getState();
      expect(state.isExecuting).toBe(true);
      expect(state.currentExecution.id).toBe('exec-1');
      expect(state.currentExecution.command).toBe('*develop');
      expect(state.currentExecution.startTime).toBeInstanceOf(Date);
      expect(state.currentExecution.pipelineAgents).toEqual([]);
      expect(state.currentExecution.totalSteps).toBe(1);
      expect(state.logs).toHaveLength(1);
      expect(state.logs[0].level).toBe('info');
      expect(state.logs[0].message).toContain('Iniciando');
    });

    it('should show agent names when pipeline agents provided', () => {
      useExecutionLogStore.getState().startExecution('exec-2', '*pipeline', ['Dev', 'QA', 'DevOps']);

      const state = useExecutionLogStore.getState();
      expect(state.currentExecution.pipelineAgents).toEqual(['Dev', 'QA', 'DevOps']);
      expect(state.currentExecution.totalSteps).toBe(3);
      expect(state.logs[0].message).toContain('Dev');
      expect(state.logs[0].message).toContain('QA');
      expect(state.logs[0].message).toContain('DevOps');
    });

    it('should clear previous logs when starting new execution', () => {
      useExecutionLogStore.getState().startExecution('exec-1');
      useExecutionLogStore.getState().addError('old error');
      expect(useExecutionLogStore.getState().logs.length).toBeGreaterThan(1);

      useExecutionLogStore.getState().startExecution('exec-2');
      // Only the initial log from the new execution
      expect(useExecutionLogStore.getState().logs).toHaveLength(1);
      expect(useExecutionLogStore.getState().currentExecution.id).toBe('exec-2');
    });
  });

  describe('endExecution', () => {
    it('should add success log and set isExecuting false', () => {
      useExecutionLogStore.getState().startExecution('exec-1');
      useExecutionLogStore.getState().endExecution(true);

      const state = useExecutionLogStore.getState();
      expect(state.isExecuting).toBe(false);
      expect(state.currentExecution.id).toBeNull();

      const lastLog = state.logs[state.logs.length - 1];
      expect(lastLog.level).toBe('success');
    });

    it('should add error log on failure', () => {
      useExecutionLogStore.getState().startExecution('exec-1');
      useExecutionLogStore.getState().endExecution(false, 'Pipeline crashed');

      const state = useExecutionLogStore.getState();
      expect(state.isExecuting).toBe(false);

      const lastLog = state.logs[state.logs.length - 1];
      expect(lastLog.level).toBe('error');
      expect(lastLog.message).toBe('Pipeline crashed');
    });

    it('should use default messages when none provided', () => {
      useExecutionLogStore.getState().startExecution('exec-1');
      useExecutionLogStore.getState().endExecution(true);

      const lastLog = useExecutionLogStore.getState().logs.at(-1)!;
      expect(lastLog.message).toContain('sucesso');
    });

    it('should include duration in the final log', () => {
      useExecutionLogStore.getState().startExecution('exec-1');
      useExecutionLogStore.getState().endExecution(true);

      const lastLog = useExecutionLogStore.getState().logs.at(-1)!;
      expect(lastLog.duration).toBeDefined();
      expect(typeof lastLog.duration).toBe('number');
    });
  });

  describe('addLog', () => {
    it('should generate id and timestamp', () => {
      useExecutionLogStore.getState().addLog({
        level: 'info',
        message: 'Test log entry',
      });

      const logs = useExecutionLogStore.getState().logs;
      expect(logs).toHaveLength(1);
      expect(logs[0].id).toMatch(/^log-\d+$/);
      expect(logs[0].timestamp).toBeInstanceOf(Date);
      expect(logs[0].message).toBe('Test log entry');
      expect(logs[0].level).toBe('info');
    });

    it('should increment id counter across calls', () => {
      useExecutionLogStore.getState().addLog({ level: 'info', message: 'First' });
      useExecutionLogStore.getState().addLog({ level: 'info', message: 'Second' });

      const logs = useExecutionLogStore.getState().logs;
      expect(logs).toHaveLength(2);
      // IDs should be different and incrementing
      expect(logs[0].id).not.toBe(logs[1].id);
    });
  });

  describe('addAgentStart', () => {
    it('should update currentStep and add agent log', () => {
      useExecutionLogStore.getState().addAgentStart('agent-dev', 'Dev Agent', 2, 5);

      const state = useExecutionLogStore.getState();
      expect(state.currentExecution.currentStep).toBe(2);
      expect(state.currentExecution.totalSteps).toBe(5);

      const lastLog = state.logs.at(-1)!;
      expect(lastLog.level).toBe('agent');
      expect(lastLog.agentId).toBe('agent-dev');
      expect(lastLog.agentName).toBe('Dev Agent');
      expect(lastLog.step).toBe(2);
      expect(lastLog.totalSteps).toBe(5);
      expect(lastLog.message).toContain('Dev Agent');
    });
  });

  describe('addAgentComplete', () => {
    it('should add success log with agent info', () => {
      useExecutionLogStore.getState().addAgentComplete('agent-qa', 'QA Agent', 3, 5, 1.5);

      const lastLog = useExecutionLogStore.getState().logs.at(-1)!;
      expect(lastLog.level).toBe('success');
      expect(lastLog.agentId).toBe('agent-qa');
      expect(lastLog.agentName).toBe('QA Agent');
      expect(lastLog.step).toBe(3);
      expect(lastLog.totalSteps).toBe(5);
      expect(lastLog.duration).toBe(1.5);
      expect(lastLog.message).toContain('QA Agent');
    });
  });

  describe('addToolUse', () => {
    it('should add tool log on success', () => {
      useExecutionLogStore.getState().addToolUse('grep', true, { matches: 5 });

      const lastLog = useExecutionLogStore.getState().logs.at(-1)!;
      expect(lastLog.level).toBe('tool');
      expect(lastLog.toolName).toBe('grep');
      expect(lastLog.message).toContain('grep');
      expect(lastLog.message).toContain('executado');
      expect(lastLog.details).toEqual({ result: { matches: 5 } });
    });

    it('should add error log on failure', () => {
      useExecutionLogStore.getState().addToolUse('git', false, undefined, 'Permission denied');

      const lastLog = useExecutionLogStore.getState().logs.at(-1)!;
      expect(lastLog.level).toBe('error');
      expect(lastLog.toolName).toBe('git');
      expect(lastLog.message).toContain('falhou');
      expect(lastLog.message).toContain('Permission denied');
      expect(lastLog.details).toEqual({ error: 'Permission denied' });
    });
  });

  describe('addError', () => {
    it('should add error log with details', () => {
      useExecutionLogStore.getState().addError('Network timeout', { url: '/api/data' });

      const lastLog = useExecutionLogStore.getState().logs.at(-1)!;
      expect(lastLog.level).toBe('error');
      expect(lastLog.message).toBe('Network timeout');
      expect(lastLog.details).toEqual({ url: '/api/data' });
    });
  });

  describe('clearLogs', () => {
    it('should reset logs, isExecuting, and currentExecution', () => {
      useExecutionLogStore.getState().startExecution('exec-1', '*develop', ['Dev']);
      useExecutionLogStore.getState().addError('Some error');
      expect(useExecutionLogStore.getState().logs.length).toBeGreaterThan(0);

      useExecutionLogStore.getState().clearLogs();

      const state = useExecutionLogStore.getState();
      expect(state.logs).toEqual([]);
      expect(state.isExecuting).toBe(false);
      expect(state.currentExecution).toEqual({
        id: null,
        startTime: null,
        command: null,
        pipelineAgents: [],
        currentStep: 0,
        totalSteps: 0,
      });
    });
  });
});
