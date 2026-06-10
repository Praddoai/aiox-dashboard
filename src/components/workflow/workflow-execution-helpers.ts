import type { LiveExecutionStep } from '../../hooks/useWorkflows';
import type { WorkflowNode, WorkflowEdge } from './types';

export const formatDuration = (startedAt?: string, completedAt?: string): string => {
  if (!startedAt) return '';
  const start = new Date(startedAt).getTime();
  const end = completedAt ? new Date(completedAt).getTime() : Date.now();
  const seconds = Math.floor((end - start) / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
};

export const formatElapsedTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export const stepStatusToNodeStatus = (status: LiveExecutionStep['status']): WorkflowNode['status'] => {
  switch (status) {
    case 'completed': return 'completed';
    case 'running': return 'active';
    case 'failed': return 'error';
    default: return 'idle';
  }
};

export const stepStatusToEdgeStatus = (status: LiveExecutionStep['status']): WorkflowEdge['status'] => {
  switch (status) {
    case 'completed': return 'completed';
    case 'running': return 'active';
    default: return 'idle';
  }
};
