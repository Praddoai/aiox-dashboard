import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { engineApi } from '../services/api/engine';
import { getEngineUrl } from '../lib/connection';
import type { EngineHealth, PoolStatus, EngineJob, CronJobDef, WorkflowDef, WorkflowState, BundleInfo } from '../services/api/engine';

// Helper: only enable engine queries when engine URL is configured
const engineAvailable = () => !!getEngineUrl();

// Engine health — polls every 10s
export function useEngineHealth() {
  return useQuery<EngineHealth>({
    queryKey: ['engine', 'health'],
    queryFn: () => engineApi.health(),
    enabled: engineAvailable(),
    staleTime: 5_000,
    refetchInterval: engineAvailable() ? 10_000 : false,
    retry: 1,
  });
}

// Pool status — polls every 3s for real-time slot monitoring
export function useEnginePool() {
  return useQuery<PoolStatus>({
    queryKey: ['engine', 'pool'],
    queryFn: () => engineApi.pool(),
    enabled: engineAvailable(),
    staleTime: 2_000,
    refetchInterval: engineAvailable() ? 3_000 : false,
    retry: 1,
  });
}

// Job list — polls every 5s
export function useEngineJobs(params?: { status?: string; limit?: number }) {
  return useQuery<{ jobs: EngineJob[] }>({
    queryKey: ['engine', 'jobs', params],
    queryFn: () => engineApi.listJobs(params),
    enabled: engineAvailable(),
    staleTime: 3_000,
    refetchInterval: engineAvailable() ? 5_000 : false,
    retry: 1,
  });
}

// Available workflow definitions
export function useWorkflowDefs() {
  return useQuery<{ workflows: WorkflowDef[] }>({
    queryKey: ['engine', 'workflows'],
    queryFn: () => engineApi.listWorkflowDefs(),
    enabled: engineAvailable(),
    staleTime: 60_000,
    retry: 1,
  });
}

// Cron jobs
export function useCronJobs() {
  return useQuery<{ crons: CronJobDef[] }>({
    queryKey: ['engine', 'crons'],
    queryFn: () => engineApi.listCrons(),
    enabled: engineAvailable(),
    staleTime: 10_000,
    refetchInterval: engineAvailable() ? 30_000 : false,
    retry: 1,
  });
}

// Team bundles
export function useTeamBundles() {
  return useQuery<{ bundles: BundleInfo[]; active: string | null }>({
    queryKey: ['engine', 'bundles'],
    queryFn: () => engineApi.listBundles(),
    enabled: engineAvailable(),
    staleTime: 30_000,
    retry: 1,
  });
}

// Single job detail
export function useGetJob(id: string | null) {
  return useQuery<{ job: EngineJob }>({
    queryKey: ['engine', 'job', id],
    queryFn: () => engineApi.getJob(id!),
    enabled: !!id,
    staleTime: 2_000,
    refetchInterval: 3_000,
    retry: 1,
  });
}

// Job logs — polls every 2s for running jobs
export function useJobLogs(jobId: string | null, tail = 100) {
  return useQuery<{ logs: string[]; hasMore: boolean }>({
    queryKey: ['engine', 'job', jobId, 'logs', tail],
    queryFn: () => engineApi.getJobLogs(jobId!, tail),
    enabled: !!jobId,
    staleTime: 1_000,
    refetchInterval: 2_000,
    retry: 1,
  });
}

// Active workflow instances — polls every 5s
export function useActiveWorkflows() {
  return useQuery<{ workflows: WorkflowState[] }>({
    queryKey: ['engine', 'workflows', 'active'],
    queryFn: () => engineApi.listActiveWorkflows(),
    enabled: engineAvailable(),
    staleTime: 3_000,
    refetchInterval: engineAvailable() ? 5_000 : false,
    retry: 1,
  });
}

// Mutations

export function useResizePool() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (size: number) => engineApi.resizePool(size),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['engine', 'pool'] });
    },
  });
}

export function useCancelJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => engineApi.cancelJob(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['engine', 'jobs'] });
      qc.invalidateQueries({ queryKey: ['engine', 'pool'] });
    },
  });
}

export function useExecuteOnEngine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { squadId: string; agentId: string; message: string; priority?: number }) =>
      engineApi.executeAgent(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['engine', 'jobs'] });
      qc.invalidateQueries({ queryKey: ['engine', 'pool'] });
    },
  });
}

export function useTriggerOrchestrator() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { message: string; callback_url?: string; priority?: number }) =>
      engineApi.triggerOrchestrator(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['engine', 'jobs'] });
    },
  });
}

export function useToggleCron() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      engineApi.toggleCron(id, enabled),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['engine', 'crons'] });
    },
  });
}

export function useActivateBundle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (bundleId: string | null) => engineApi.activateBundle(bundleId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['engine', 'bundles'] });
    },
  });
}

export function useStartWorkflow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { workflowId: string; input: Record<string, unknown>; parentJobId?: string }) =>
      engineApi.startWorkflow(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['engine', 'jobs'] });
      qc.invalidateQueries({ queryKey: ['engine', 'pool'] });
    },
  });
}

export function useCreateCron() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; schedule: string; squad_id: string; agent_id: string; message: string }) =>
      engineApi.createCron(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['engine', 'crons'] });
    },
  });
}

export function useDeleteCron() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => engineApi.deleteCron(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['engine', 'crons'] });
    },
  });
}

export function useAuditLog(limit = 50) {
  return useQuery<{ entries: Array<Record<string, unknown>> }>({
    queryKey: ['engine', 'audit', limit],
    queryFn: () => engineApi.getAuditLog(limit),
    enabled: engineAvailable(),
    staleTime: 10_000,
    refetchInterval: engineAvailable() ? 15_000 : false,
    retry: 1,
  });
}

export function useRecallMemory(scope: string, query: string, limit = 10) {
  return useQuery<{ memories: Array<{ id: string; content: string; score?: number }> }>({
    queryKey: ['engine', 'memory', 'recall', scope, query, limit],
    queryFn: () => engineApi.recallMemory(scope, query, limit),
    enabled: !!scope && !!query,
    staleTime: 30_000,
    retry: 1,
  });
}

export function useStoreMemory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ scope, content, metadata }: { scope: string; content: string; metadata?: Record<string, unknown> }) =>
      engineApi.storeMemory(scope, { content, metadata }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['engine', 'memory'] });
    },
  });
}
