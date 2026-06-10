// Shape of step.output from the SSE execution stream
export interface StepOutput {
  agent?: {
    name?: string;
    squad?: string;
  };
  role?: string;
  response?: string;
  llmMetadata?: {
    provider: string;
    model: string;
    inputTokens?: number;
    outputTokens?: number;
  };
}

export interface OrchestrationPlan {
  analysis: string | null;
  expectedOutputs: string[];
  planSteps: Array<{
    id: string;
    name: string;
    squadId: string;
    agentId: string;
    role: string;
    description: string;
  }>;
  phase: string;
}

import type { LiveExecutionState } from '../../hooks/useWorkflows';

export interface WorkflowExecutionLiveProps {
  state: LiveExecutionState;
  onClose: () => void;
  orchestrationPlan?: OrchestrationPlan;
}
