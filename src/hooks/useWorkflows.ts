import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useCallback } from 'react';
import {
  workflowsApi,
  type WorkflowSummary,
  type Workflow,
  type WorkflowExecution,
  type WorkflowStats,
  type WorkflowSchema,
} from '../services/api';

// Get workflow schema
export function useWorkflowSchema() {
  return useQuery<WorkflowSchema>({
    queryKey: ['workflowSchema'],
    queryFn: async () => {
      return workflowsApi.getSchema();
    },
    staleTime: 60 * 60 * 1000, // 1 hour
  });
}

// List workflows
export function useWorkflows(params?: { status?: string; name?: string }) {
  return useQuery<WorkflowSummary[]>({
    queryKey: ['workflows', params],
    queryFn: async () => {
      const response = await workflowsApi.getWorkflows(params);
      return response.workflows;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - reduce API calls
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  });
}

// Get single workflow
export function useWorkflow(id: string | null) {
  return useQuery<Workflow | null>({
    queryKey: ['workflow', id],
    queryFn: async () => {
      if (!id) return null;
      return workflowsApi.getWorkflow(id);
    },
    enabled: !!id,
    staleTime: 30 * 1000,
  });
}

// Get workflow stats
export function useWorkflowStats(id: string | null) {
  return useQuery<WorkflowStats | null>({
    queryKey: ['workflowStats', id],
    queryFn: async () => {
      if (!id) return null;
      return workflowsApi.getWorkflowStats(id);
    },
    enabled: !!id,
    staleTime: 60 * 1000,
  });
}

// List executions
export function useWorkflowExecutions(params?: {
  workflowId?: string;
  status?: string;
  limit?: number;
}) {
  return useQuery<WorkflowExecution[]>({
    queryKey: ['workflowExecutions', params],
    queryFn: async () => {
      const response = await workflowsApi.getExecutions(params);
      return response.executions;
    },
    staleTime: 10 * 1000, // 10 seconds for executions
    refetchInterval: 30 * 1000, // Refetch every 30 seconds for live updates
  });
}

// Get single execution
export function useWorkflowExecution(id: string | null) {
  return useQuery<WorkflowExecution | null>({
    queryKey: ['workflowExecution', id],
    queryFn: async () => {
      if (!id) return null;
      return workflowsApi.getExecution(id);
    },
    enabled: !!id,
    staleTime: 5 * 1000, // 5 seconds
    refetchInterval: (query) => {
      // Refetch running executions more frequently
      const data = query.state.data;
      if (data?.status === 'running') return 5 * 1000;
      return false;
    },
  });
}

// Create workflow mutation
export function useCreateWorkflow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (workflow: Omit<Workflow, 'id' | 'createdAt' | 'updatedAt' | 'status'>) => {
      return workflowsApi.createWorkflow(workflow);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
    },
  });
}

// Update workflow mutation
export function useUpdateWorkflow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Workflow> }) => {
      return workflowsApi.updateWorkflow(id, updates);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
      queryClient.invalidateQueries({ queryKey: ['workflow', variables.id] });
    },
  });
}

// Delete workflow mutation
export function useDeleteWorkflow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return workflowsApi.deleteWorkflow(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
    },
  });
}

// Activate workflow mutation
export function useActivateWorkflow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return workflowsApi.activateWorkflow(id);
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
      queryClient.invalidateQueries({ queryKey: ['workflow', id] });
    },
  });
}

// Pause workflow mutation
export function usePauseWorkflow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return workflowsApi.pauseWorkflow(id);
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
      queryClient.invalidateQueries({ queryKey: ['workflow', id] });
    },
  });
}

// Execute workflow mutation
export function useExecuteWorkflow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      input,
      options,
    }: {
      id: string;
      input?: Record<string, unknown>;
      options?: { force?: boolean; metadata?: Record<string, unknown> };
    }) => {
      return workflowsApi.executeWorkflow(id, input, options);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflowExecutions'] });
    },
  });
}

// Cancel execution mutation
export function useCancelExecution() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return workflowsApi.cancelExecution(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflowExecutions'] });
    },
  });
}

// Live execution step state
export interface LiveExecutionStep {
  id: string;
  type: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  name?: string; // Step name from workflow definition
  config?: {
    squadId?: string;
    agentId?: string;
    role?: string;
    message?: string;
  };
  startedAt?: string;
  completedAt?: string;
  output?: unknown;
  error?: string;
}

// Live execution state
export interface LiveExecutionState {
  executionId: string | null;
  workflowId: string;
  workflowName: string;
  status: 'connecting' | 'created' | 'running' | 'completed' | 'failed';
  steps: LiveExecutionStep[];
  input?: Record<string, unknown>; // Input provided to the workflow
  output?: unknown;
  error?: string;
  startedAt?: string;
  completedAt?: string;
}

// Hook for streaming workflow execution
export function useExecuteWorkflowStream() {
  const queryClient = useQueryClient();
  const [state, setState] = useState<LiveExecutionState | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);

  const execute = useCallback(async (workflowId: string, input?: Record<string, unknown>) => {
    setIsExecuting(true);
    setState({
      executionId: null,
      workflowId,
      workflowName: '',
      status: 'connecting',
      steps: [],
      input, // Store the input for display in the UI
    });

    try {
      await workflowsApi.executeWorkflowStream(workflowId, input, {
        onConnected: (data) => {
          console.log('[LiveExecution] Connected:', data);
        },
        onExecutionCreated: (data) => {
          console.log('[LiveExecution] Execution created:', data);
          const dataRecord = data as Record<string, unknown>;
          setState((prev) => prev ? {
            ...prev,
            executionId: data.executionId,
            workflowName: data.workflowName,
            status: 'created',
            input: (dataRecord.input as Record<string, unknown>) || prev.input, // Use input from server if available
            steps: data.steps.map((s) => {
              const step = s as Record<string, unknown>;
              return {
                id: s.id,
                type: s.type,
                status: s.status as LiveExecutionStep['status'],
                name: step.name as string | undefined, // Step name from workflow definition
                config: step.config as LiveExecutionStep['config'], // Agent config (squadId, agentId, role)
              };
            }),
          } : null);
        },
        onExecutionStarted: (data) => {
          console.log('[LiveExecution] Execution started:', data);
          setState((prev) => prev ? {
            ...prev,
            status: 'running',
            startedAt: data.startedAt,
          } : null);
        },
        onStepStarted: (data) => {
          console.log('[LiveExecution] Step started:', data);
          setState((prev) => {
            if (!prev) return null;
            return {
              ...prev,
              steps: prev.steps.map((s) =>
                s.id === data.stepId
                  ? { ...s, status: 'running', startedAt: data.startedAt }
                  : s
              ),
            };
          });
        },
        onStepCompleted: (data) => {
          console.log('[LiveExecution] Step completed:', data);
          setState((prev) => {
            if (!prev) return null;
            return {
              ...prev,
              steps: prev.steps.map((s) =>
                s.id === data.stepId
                  ? { ...s, status: 'completed', completedAt: data.completedAt, output: data.output }
                  : s
              ),
            };
          });
        },
        onStepFailed: (data) => {
          console.log('[LiveExecution] Step failed:', data);
          setState((prev) => {
            if (!prev) return null;
            return {
              ...prev,
              steps: prev.steps.map((s) =>
                s.id === data.stepId
                  ? { ...s, status: 'failed', error: data.error }
                  : s
              ),
            };
          });
        },
        onExecutionCompleted: (data) => {
          console.log('[LiveExecution] Execution completed:', data);
          setState((prev) => prev ? {
            ...prev,
            status: 'completed',
            completedAt: data.completedAt,
            output: data.output,
          } : null);
          setIsExecuting(false);
          queryClient.invalidateQueries({ queryKey: ['workflowExecutions'] });
        },
        onExecutionFailed: (data) => {
          console.log('[LiveExecution] Execution failed:', data);
          setState((prev) => prev ? {
            ...prev,
            status: 'failed',
            error: data.error,
          } : null);
          setIsExecuting(false);
          queryClient.invalidateQueries({ queryKey: ['workflowExecutions'] });
        },
        onError: (error) => {
          console.error('[LiveExecution] Error:', error);
          setState((prev) => prev ? {
            ...prev,
            status: 'failed',
            error,
          } : null);
          setIsExecuting(false);
        },
      });
    } catch (error) {
      console.error('[LiveExecution] Failed to start:', error);
      setState((prev) => prev ? {
        ...prev,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Failed to start execution',
      } : null);
      setIsExecuting(false);
    }
  }, [queryClient]);

  const reset = useCallback(() => {
    setState(null);
    setIsExecuting(false);
  }, []);

  return {
    state,
    isExecuting,
    execute,
    reset,
  };
}

// Orchestration plan step type
export interface OrchestrationPlanStep {
  id: string;
  name: string;
  squadId: string;
  agentId: string;
  role: string;
  description: string;
}

// Orchestration state
export interface OrchestrationState {
  phase: 'idle' | 'analyzing' | 'planning' | 'executing' | 'completed' | 'failed';
  demand: string;
  workflowId: string | null;
  workflowName: string | null;
  analysis: string | null;
  expectedOutputs: string[];
  planSteps: OrchestrationPlanStep[];
  executionState: LiveExecutionState | null;
  error: string | null;
}

// Hook for smart orchestration
export function useSmartOrchestration() {
  const queryClient = useQueryClient();
  const [state, setState] = useState<OrchestrationState>({
    phase: 'idle',
    demand: '',
    workflowId: null,
    workflowName: null,
    analysis: null,
    expectedOutputs: [],
    planSteps: [],
    executionState: null,
    error: null,
  });
  const [isOrchestrating, setIsOrchestrating] = useState(false);

  const orchestrate = useCallback(async (demand: string) => {
    setIsOrchestrating(true);
    setState({
      phase: 'analyzing',
      demand,
      workflowId: null,
      workflowName: null,
      analysis: null,
      expectedOutputs: [],
      planSteps: [],
      executionState: null,
      error: null,
    });

    try {
      await workflowsApi.orchestrateStream(demand, {
        onConnected: () => {
          console.log('[SmartOrchestration] Connected');
        },
        onOrchestrationStarted: (data) => {
          console.log('[SmartOrchestration] Started:', data);
          setState((prev) => ({ ...prev, phase: 'planning' }));
        },
        onOrchestrationCompleted: (data) => {
          console.log('[SmartOrchestration] Plan completed:', data);
          setState((prev) => ({
            ...prev,
            phase: 'executing',
            workflowId: data.workflowId,
            workflowName: data.workflowName,
            analysis: data.analysis,
            expectedOutputs: data.expectedOutputs || [],
            planSteps: data.steps || [],
          }));
        },
        onExecutionCreated: (data) => {
          console.log('[SmartOrchestration] Execution created:', data);
          setState((prev) => ({
            ...prev,
            executionState: {
              executionId: data.executionId,
              workflowId: prev.workflowId || '',
              workflowName: data.workflowName || prev.workflowName || '',
              status: 'created',
              steps: data.steps.map((s) => ({
                id: s.id,
                type: s.type,
                status: s.status as LiveExecutionStep['status'],
                name: s.name,
                config: s.config as LiveExecutionStep['config'],
              })),
              input: data.input as Record<string, unknown>,
            },
          }));
        },
        onExecutionStarted: (data) => {
          console.log('[SmartOrchestration] Execution started:', data);
          setState((prev) => prev.executionState ? {
            ...prev,
            executionState: {
              ...prev.executionState,
              status: 'running',
              startedAt: data.startedAt,
            },
          } : prev);
        },
        onStepStarted: (data) => {
          console.log('[SmartOrchestration] Step started:', data);
          setState((prev) => {
            if (!prev.executionState) return prev;
            return {
              ...prev,
              executionState: {
                ...prev.executionState,
                steps: prev.executionState.steps.map((s) =>
                  s.id === data.stepId
                    ? { ...s, status: 'running', startedAt: data.startedAt }
                    : s
                ),
              },
            };
          });
        },
        onStepCompleted: (data) => {
          console.log('[SmartOrchestration] Step completed:', data);
          setState((prev) => {
            if (!prev.executionState) return prev;
            return {
              ...prev,
              executionState: {
                ...prev.executionState,
                steps: prev.executionState.steps.map((s) =>
                  s.id === data.stepId
                    ? { ...s, status: 'completed', completedAt: data.completedAt, output: data.output }
                    : s
                ),
              },
            };
          });
        },
        onStepFailed: (data) => {
          console.log('[SmartOrchestration] Step failed:', data);
          setState((prev) => {
            if (!prev.executionState) return prev;
            return {
              ...prev,
              executionState: {
                ...prev.executionState,
                steps: prev.executionState.steps.map((s) =>
                  s.id === data.stepId
                    ? { ...s, status: 'failed', error: data.error }
                    : s
                ),
              },
            };
          });
        },
        onExecutionCompleted: (data) => {
          console.log('[SmartOrchestration] Execution completed:', data);
          setState((prev) => ({
            ...prev,
            phase: 'completed',
            executionState: prev.executionState ? {
              ...prev.executionState,
              status: 'completed',
              completedAt: data.completedAt,
              output: data.output,
            } : null,
          }));
          setIsOrchestrating(false);
          queryClient.invalidateQueries({ queryKey: ['workflowExecutions'] });
          queryClient.invalidateQueries({ queryKey: ['workflows'] });
        },
        onExecutionFailed: (data) => {
          console.log('[SmartOrchestration] Execution failed:', data);
          setState((prev) => ({
            ...prev,
            phase: 'failed',
            error: data.error,
            executionState: prev.executionState ? {
              ...prev.executionState,
              status: 'failed',
              error: data.error,
            } : null,
          }));
          setIsOrchestrating(false);
          queryClient.invalidateQueries({ queryKey: ['workflowExecutions'] });
        },
        onError: (error) => {
          console.error('[SmartOrchestration] Error:', error);
          setState((prev) => ({
            ...prev,
            phase: 'failed',
            error,
          }));
          setIsOrchestrating(false);
        },
      });
    } catch (error) {
      console.error('[SmartOrchestration] Failed to start:', error);
      setState((prev) => ({
        ...prev,
        phase: 'failed',
        error: error instanceof Error ? error.message : 'Failed to start orchestration',
      }));
      setIsOrchestrating(false);
    }
  }, [queryClient]);

  const reset = useCallback(() => {
    setState({
      phase: 'idle',
      demand: '',
      workflowId: null,
      workflowName: null,
      analysis: null,
      expectedOutputs: [],
      planSteps: [],
      executionState: null,
      error: null,
    });
    setIsOrchestrating(false);
  }, []);

  return {
    state,
    isOrchestrating,
    orchestrate,
    reset,
  };
}
