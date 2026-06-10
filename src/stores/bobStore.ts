import { create } from 'zustand';

// Bob Pipeline Types
export interface PipelinePhase {
  id: string;
  label: string;
  status: 'completed' | 'in_progress' | 'pending' | 'failed';
  duration?: string;
  progress?: number;
}

export interface BobAgent {
  id: string;
  name: string;
  task: string;
  status: 'working' | 'completed' | 'waiting' | 'failed';
}

export interface BobDecision {
  id: string;
  message: string;
  severity: 'info' | 'warning' | 'error';
  timestamp: string;
  resolved?: boolean;
}

export interface BobError {
  id: string;
  message: string;
  source: string;
  timestamp: string;
}

export interface Pipeline {
  status: 'active' | 'completed' | 'failed' | 'stale';
  currentPhase: string;
  phases: PipelinePhase[];
  agents: BobAgent[];
  errors: BobError[];
  decisions: BobDecision[];
}

export interface ExecutionLogEntry {
  id: string;
  timestamp: string;
  message: string;
  agent: string;
  type: 'info' | 'action' | 'decision' | 'error';
}

export interface DecisionTimelineEntry {
  id: string;
  timestamp: string;
  decision: string;
  agent: string;
  outcome: 'approved' | 'rejected' | 'pending';
}

interface BobState {
  isActive: boolean;
  pipeline: Pipeline | null;
  errors: BobError[];
  agents: BobAgent[];
  decisions: BobDecision[];
  executionLog: ExecutionLogEntry[];
  decisionTimeline: DecisionTimelineEntry[];
  sessionElapsed: number;
  storyElapsed: number;
  setActive: (active: boolean) => void;
  setPipeline: (pipeline: Pipeline | null) => void;
  addError: (error: BobError) => void;
  addDecision: (decision: BobDecision) => void;
  resolveDecision: (id: string) => void;
  addLogEntry: (entry: ExecutionLogEntry) => void;
  addTimelineEntry: (entry: DecisionTimelineEntry) => void;
  updateElapsed: (session: number, story: number) => void;
  handleBobEvent: (event: { type: string; data: Record<string, unknown> }) => void;
}

export const useBobStore = create<BobState>((set) => ({
  isActive: false,
  pipeline: null,
  errors: [],
  agents: [],
  decisions: [],
  executionLog: [],
  decisionTimeline: [],
  sessionElapsed: 0,
  storyElapsed: 0,

  setActive: (active) => set({ isActive: active }),

  setPipeline: (pipeline) =>
    set({
      pipeline,
      isActive: pipeline !== null,
      agents: pipeline?.agents ?? [],
      errors: pipeline?.errors ?? [],
      decisions: pipeline?.decisions ?? [],
    }),

  addError: (error) =>
    set((state) => ({
      errors: [...state.errors, error],
    })),

  addDecision: (decision) =>
    set((state) => ({
      decisions: [...state.decisions, decision],
    })),

  resolveDecision: (id) =>
    set((state) => ({
      decisions: state.decisions.map((d) =>
        d.id === id ? { ...d, resolved: true } : d
      ),
    })),

  addLogEntry: (entry) =>
    set((state) => ({
      executionLog: [...state.executionLog, entry].slice(-100),
    })),

  addTimelineEntry: (entry) =>
    set((state) => ({
      decisionTimeline: [...state.decisionTimeline, entry],
    })),

  updateElapsed: (session, story) =>
    set({ sessionElapsed: session, storyElapsed: story }),

  handleBobEvent: (event) =>
    set((state) => {
      const { type, data } = event;

      switch (type) {
        case 'BobPhaseChange': {
          if (!state.pipeline) return state;
          const phaseId = data.phaseId as string;
          const newStatus = data.status as PipelinePhase['status'];
          return {
            pipeline: {
              ...state.pipeline,
              currentPhase: newStatus === 'in_progress' ? phaseId : state.pipeline.currentPhase,
              phases: state.pipeline.phases.map((p) =>
                p.id === phaseId ? { ...p, status: newStatus } : p
              ),
            },
          };
        }

        case 'BobAgentSpawned': {
          if (!state.pipeline) return state;
          const agent = data as unknown as BobAgent;
          return {
            pipeline: {
              ...state.pipeline,
              agents: [...state.pipeline.agents, agent],
            },
            agents: [...state.agents, agent],
          };
        }

        case 'BobAgentCompleted': {
          if (!state.pipeline) return state;
          const agentId = data.agentId as string;
          const updateAgent = (a: BobAgent) =>
            a.id === agentId ? { ...a, status: 'completed' as const } : a;
          return {
            pipeline: {
              ...state.pipeline,
              agents: state.pipeline.agents.map(updateAgent),
            },
            agents: state.agents.map(updateAgent),
          };
        }

        case 'BobSurfaceDecision': {
          const decision = data as unknown as BobDecision;
          if (!state.pipeline) return { decisions: [...state.decisions, decision] };
          return {
            pipeline: {
              ...state.pipeline,
              decisions: [...state.pipeline.decisions, decision],
            },
            decisions: [...state.decisions, decision],
          };
        }

        case 'BobError': {
          const error = data as unknown as BobError;
          if (!state.pipeline) return { errors: [...state.errors, error] };
          return {
            pipeline: {
              ...state.pipeline,
              errors: [...state.pipeline.errors, error],
            },
            errors: [...state.errors, error],
          };
        }

        default:
          return state;
      }
    }),
}));
