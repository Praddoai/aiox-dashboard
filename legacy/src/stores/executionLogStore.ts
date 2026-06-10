/**
 * Execution Log Store
 *
 * Stores detailed execution logs for debugging and monitoring.
 * Shows pipeline progress, tool usage, errors, and timing.
 */

import { create } from 'zustand';

export type LogLevel = 'info' | 'success' | 'warning' | 'error' | 'tool' | 'agent';

export interface ExecutionLogEntry {
  id: string;
  timestamp: Date;
  level: LogLevel;
  message: string;
  details?: Record<string, unknown>;
  agentId?: string;
  agentName?: string;
  step?: number;
  totalSteps?: number;
  toolName?: string;
  duration?: number;
}

export interface ExecutionLogState {
  // Current execution logs
  logs: ExecutionLogEntry[];

  // Is an execution currently running?
  isExecuting: boolean;

  // Current execution metadata
  currentExecution: {
    id: string | null;
    startTime: Date | null;
    command: string | null;
    pipelineAgents: string[];
    currentStep: number;
    totalSteps: number;
  };

  // Actions
  startExecution: (executionId: string, command?: string, pipelineAgents?: string[]) => void;
  endExecution: (success: boolean, message?: string) => void;
  addLog: (entry: Omit<ExecutionLogEntry, 'id' | 'timestamp'>) => void;
  addAgentStart: (agentId: string, agentName: string, step: number, totalSteps: number) => void;
  addAgentComplete: (agentId: string, agentName: string, step: number, totalSteps: number, duration?: number) => void;
  addToolUse: (toolName: string, success: boolean, result?: unknown, error?: string) => void;
  addError: (message: string, details?: Record<string, unknown>) => void;
  clearLogs: () => void;
}

let logIdCounter = 0;

export const useExecutionLogStore = create<ExecutionLogState>((set, get) => ({
  logs: [],
  isExecuting: false,
  currentExecution: {
    id: null,
    startTime: null,
    command: null,
    pipelineAgents: [],
    currentStep: 0,
    totalSteps: 0,
  },

  startExecution: (executionId, command, pipelineAgents = []) => {
    set({
      logs: [],
      isExecuting: true,
      currentExecution: {
        id: executionId,
        startTime: new Date(),
        command: command || null,
        pipelineAgents,
        currentStep: 0,
        totalSteps: pipelineAgents.length || 1,
      },
    });

    // Add initial log
    get().addLog({
      level: 'info',
      message: pipelineAgents.length > 0
        ? `Iniciando pipeline: ${pipelineAgents.join(' → ')}`
        : 'Iniciando execução...',
      details: command ? { command } : undefined,
    });
  },

  endExecution: (success, message) => {
    const { currentExecution } = get();
    const duration = currentExecution.startTime
      ? (Date.now() - currentExecution.startTime.getTime()) / 1000
      : 0;

    get().addLog({
      level: success ? 'success' : 'error',
      message: message || (success ? 'Execução concluída com sucesso' : 'Execução falhou'),
      duration,
    });

    set({
      isExecuting: false,
      currentExecution: {
        ...currentExecution,
        id: null,
      },
    });
  },

  addLog: (entry) => {
    const newEntry: ExecutionLogEntry = {
      ...entry,
      id: `log-${++logIdCounter}`,
      timestamp: new Date(),
    };

    set((state) => ({
      logs: [...state.logs, newEntry],
    }));
  },

  addAgentStart: (agentId, agentName, step, totalSteps) => {
    set((state) => ({
      currentExecution: {
        ...state.currentExecution,
        currentStep: step,
        totalSteps,
      },
    }));

    get().addLog({
      level: 'agent',
      message: `${agentName} iniciando...`,
      agentId,
      agentName,
      step,
      totalSteps,
    });
  },

  addAgentComplete: (agentId, agentName, step, totalSteps, duration) => {
    get().addLog({
      level: 'success',
      message: `${agentName} concluído`,
      agentId,
      agentName,
      step,
      totalSteps,
      duration,
    });
  },

  addToolUse: (toolName, success, result, error) => {
    get().addLog({
      level: success ? 'tool' : 'error',
      message: success
        ? `[tool] ${toolName} executado`
        : `[tool] ${toolName} falhou: ${error}`,
      toolName,
      details: result ? { result } : error ? { error } : undefined,
    });
  },

  addError: (message, details) => {
    get().addLog({
      level: 'error',
      message,
      details,
    });
  },

  clearLogs: () => {
    set({
      logs: [],
      isExecuting: false,
      currentExecution: {
        id: null,
        startTime: null,
        command: null,
        pipelineAgents: [],
        currentStep: 0,
        totalSteps: 0,
      },
    });
  },
}));
