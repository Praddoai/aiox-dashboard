import { describe, it, expect, beforeEach } from 'vitest';
import {
  useBobStore,
  type Pipeline,
  type BobError,
  type BobDecision,
  type BobAgent,
  type ExecutionLogEntry,
  type DecisionTimelineEntry,
} from '../bobStore';

function makePipeline(overrides: Partial<Pipeline> = {}): Pipeline {
  return {
    status: 'active',
    currentPhase: 'phase-1',
    phases: [
      { id: 'phase-1', label: 'Plan', status: 'in_progress' },
      { id: 'phase-2', label: 'Execute', status: 'pending' },
    ],
    agents: [
      { id: 'agent-1', name: 'Dev', task: 'implement', status: 'working' },
    ],
    errors: [],
    decisions: [],
    ...overrides,
  };
}

function makeError(overrides: Partial<BobError> = {}): BobError {
  return {
    id: 'err-1',
    message: 'Something broke',
    source: 'agent-1',
    timestamp: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeDecision(overrides: Partial<BobDecision> = {}): BobDecision {
  return {
    id: 'dec-1',
    message: 'Choose A or B',
    severity: 'info',
    timestamp: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeLogEntry(overrides: Partial<ExecutionLogEntry> = {}): ExecutionLogEntry {
  return {
    id: 'log-1',
    timestamp: '2026-01-01T00:00:00Z',
    message: 'Step completed',
    agent: 'dev',
    type: 'info',
    ...overrides,
  };
}

function makeTimelineEntry(overrides: Partial<DecisionTimelineEntry> = {}): DecisionTimelineEntry {
  return {
    id: 'tl-1',
    timestamp: '2026-01-01T00:00:00Z',
    decision: 'Approve PR',
    agent: 'qa',
    outcome: 'approved',
    ...overrides,
  };
}

describe('bobStore', () => {
  beforeEach(() => {
    useBobStore.setState({
      isActive: false,
      pipeline: null,
      errors: [],
      agents: [],
      decisions: [],
      executionLog: [],
      decisionTimeline: [],
      sessionElapsed: 0,
      storyElapsed: 0,
    });
  });

  describe('initial state', () => {
    it('should have correct defaults', () => {
      const state = useBobStore.getState();
      expect(state.isActive).toBe(false);
      expect(state.pipeline).toBeNull();
      expect(state.errors).toEqual([]);
      expect(state.agents).toEqual([]);
      expect(state.decisions).toEqual([]);
      expect(state.executionLog).toEqual([]);
      expect(state.decisionTimeline).toEqual([]);
      expect(state.sessionElapsed).toBe(0);
      expect(state.storyElapsed).toBe(0);
    });
  });

  describe('setActive', () => {
    it('should set isActive to true', () => {
      useBobStore.getState().setActive(true);
      expect(useBobStore.getState().isActive).toBe(true);
    });

    it('should set isActive to false', () => {
      useBobStore.setState({ isActive: true });
      useBobStore.getState().setActive(false);
      expect(useBobStore.getState().isActive).toBe(false);
    });
  });

  describe('setPipeline', () => {
    it('should set pipeline and sync agents, errors, decisions, isActive', () => {
      const pipeline = makePipeline({
        agents: [{ id: 'a1', name: 'Dev', task: 'code', status: 'working' }],
        errors: [makeError({ id: 'e1' })],
        decisions: [makeDecision({ id: 'd1' })],
      });

      useBobStore.getState().setPipeline(pipeline);
      const state = useBobStore.getState();

      expect(state.pipeline).toEqual(pipeline);
      expect(state.isActive).toBe(true);
      expect(state.agents).toEqual(pipeline.agents);
      expect(state.errors).toEqual(pipeline.errors);
      expect(state.decisions).toEqual(pipeline.decisions);
    });

    it('should reset to inactive when pipeline is null', () => {
      useBobStore.setState({ isActive: true, pipeline: makePipeline() });
      useBobStore.getState().setPipeline(null);
      const state = useBobStore.getState();

      expect(state.pipeline).toBeNull();
      expect(state.isActive).toBe(false);
      expect(state.agents).toEqual([]);
      expect(state.errors).toEqual([]);
      expect(state.decisions).toEqual([]);
    });
  });

  describe('addError', () => {
    it('should append an error to the errors array', () => {
      const err1 = makeError({ id: 'e1' });
      const err2 = makeError({ id: 'e2', message: 'Another error' });

      useBobStore.getState().addError(err1);
      useBobStore.getState().addError(err2);

      expect(useBobStore.getState().errors).toEqual([err1, err2]);
    });
  });

  describe('addDecision', () => {
    it('should append a decision to the decisions array', () => {
      const d1 = makeDecision({ id: 'd1' });
      const d2 = makeDecision({ id: 'd2', message: 'Another decision' });

      useBobStore.getState().addDecision(d1);
      useBobStore.getState().addDecision(d2);

      expect(useBobStore.getState().decisions).toEqual([d1, d2]);
    });
  });

  describe('resolveDecision', () => {
    it('should set resolved:true on the matching decision', () => {
      const d1 = makeDecision({ id: 'd1' });
      const d2 = makeDecision({ id: 'd2' });

      useBobStore.setState({ decisions: [d1, d2] });
      useBobStore.getState().resolveDecision('d1');

      const decisions = useBobStore.getState().decisions;
      expect(decisions[0].resolved).toBe(true);
      expect(decisions[1].resolved).toBeUndefined();
    });

    it('should leave other decisions unchanged', () => {
      const d1 = makeDecision({ id: 'd1', message: 'First' });
      const d2 = makeDecision({ id: 'd2', message: 'Second' });

      useBobStore.setState({ decisions: [d1, d2] });
      useBobStore.getState().resolveDecision('d1');

      const decisions = useBobStore.getState().decisions;
      expect(decisions[1]).toEqual(d2);
    });
  });

  describe('addLogEntry', () => {
    it('should append an entry to executionLog', () => {
      const entry = makeLogEntry({ id: 'log-1' });
      useBobStore.getState().addLogEntry(entry);
      expect(useBobStore.getState().executionLog).toEqual([entry]);
    });

    it('should cap executionLog at 100 entries', () => {
      const entries: ExecutionLogEntry[] = Array.from({ length: 105 }, (_, i) =>
        makeLogEntry({ id: `log-${i}` })
      );

      for (const entry of entries) {
        useBobStore.getState().addLogEntry(entry);
      }

      const log = useBobStore.getState().executionLog;
      expect(log).toHaveLength(100);
      // Oldest 5 should be dropped; first entry should be log-5
      expect(log[0].id).toBe('log-5');
      expect(log[99].id).toBe('log-104');
    });
  });

  describe('addTimelineEntry', () => {
    it('should append an entry to decisionTimeline', () => {
      const entry = makeTimelineEntry({ id: 'tl-1' });
      useBobStore.getState().addTimelineEntry(entry);
      expect(useBobStore.getState().decisionTimeline).toEqual([entry]);
    });
  });

  describe('updateElapsed', () => {
    it('should update sessionElapsed and storyElapsed', () => {
      useBobStore.getState().updateElapsed(120, 45);
      const state = useBobStore.getState();
      expect(state.sessionElapsed).toBe(120);
      expect(state.storyElapsed).toBe(45);
    });
  });

  describe('handleBobEvent', () => {
    it('BobPhaseChange should update pipeline phases', () => {
      const pipeline = makePipeline();
      useBobStore.setState({ pipeline });

      useBobStore.getState().handleBobEvent({
        type: 'BobPhaseChange',
        data: { phaseId: 'phase-2', status: 'in_progress' },
      });

      const state = useBobStore.getState();
      expect(state.pipeline!.currentPhase).toBe('phase-2');
      expect(state.pipeline!.phases[1].status).toBe('in_progress');
    });

    it('BobPhaseChange should not update currentPhase when status is not in_progress', () => {
      const pipeline = makePipeline();
      useBobStore.setState({ pipeline });

      useBobStore.getState().handleBobEvent({
        type: 'BobPhaseChange',
        data: { phaseId: 'phase-1', status: 'completed' },
      });

      const state = useBobStore.getState();
      // currentPhase stays the same because new status is 'completed', not 'in_progress'
      expect(state.pipeline!.currentPhase).toBe('phase-1');
      expect(state.pipeline!.phases[0].status).toBe('completed');
    });

    it('BobPhaseChange with no pipeline returns state unchanged', () => {
      useBobStore.getState().handleBobEvent({
        type: 'BobPhaseChange',
        data: { phaseId: 'phase-1', status: 'in_progress' },
      });

      expect(useBobStore.getState().pipeline).toBeNull();
    });

    it('BobAgentSpawned should add agent to pipeline and top-level agents', () => {
      const pipeline = makePipeline({ agents: [] });
      useBobStore.setState({ pipeline, agents: [] });

      const newAgent: BobAgent = {
        id: 'agent-new',
        name: 'QA',
        task: 'review',
        status: 'working',
      };

      useBobStore.getState().handleBobEvent({
        type: 'BobAgentSpawned',
        data: newAgent as unknown as Record<string, unknown>,
      });

      const state = useBobStore.getState();
      expect(state.pipeline!.agents).toHaveLength(1);
      expect(state.pipeline!.agents[0].id).toBe('agent-new');
      expect(state.agents).toHaveLength(1);
      expect(state.agents[0].id).toBe('agent-new');
    });

    it('BobAgentCompleted should mark agent as completed in pipeline and top-level', () => {
      const agent: BobAgent = { id: 'a1', name: 'Dev', task: 'code', status: 'working' };
      const pipeline = makePipeline({ agents: [agent] });
      useBobStore.setState({ pipeline, agents: [agent] });

      useBobStore.getState().handleBobEvent({
        type: 'BobAgentCompleted',
        data: { agentId: 'a1' },
      });

      const state = useBobStore.getState();
      expect(state.pipeline!.agents[0].status).toBe('completed');
      expect(state.agents[0].status).toBe('completed');
    });

    it('BobSurfaceDecision should add decision to pipeline and top-level', () => {
      const pipeline = makePipeline({ decisions: [] });
      useBobStore.setState({ pipeline, decisions: [] });

      const decision: BobDecision = makeDecision({ id: 'dec-new' });

      useBobStore.getState().handleBobEvent({
        type: 'BobSurfaceDecision',
        data: decision as unknown as Record<string, unknown>,
      });

      const state = useBobStore.getState();
      expect(state.pipeline!.decisions).toHaveLength(1);
      expect(state.pipeline!.decisions[0].id).toBe('dec-new');
      expect(state.decisions).toHaveLength(1);
      expect(state.decisions[0].id).toBe('dec-new');
    });

    it('BobSurfaceDecision without pipeline adds decision to top-level only', () => {
      useBobStore.getState().handleBobEvent({
        type: 'BobSurfaceDecision',
        data: makeDecision({ id: 'dec-no-pipe' }) as unknown as Record<string, unknown>,
      });

      const state = useBobStore.getState();
      expect(state.pipeline).toBeNull();
      expect(state.decisions).toHaveLength(1);
      expect(state.decisions[0].id).toBe('dec-no-pipe');
    });

    it('BobError should add error to pipeline and top-level', () => {
      const pipeline = makePipeline({ errors: [] });
      useBobStore.setState({ pipeline, errors: [] });

      const error = makeError({ id: 'err-new' });

      useBobStore.getState().handleBobEvent({
        type: 'BobError',
        data: error as unknown as Record<string, unknown>,
      });

      const state = useBobStore.getState();
      expect(state.pipeline!.errors).toHaveLength(1);
      expect(state.pipeline!.errors[0].id).toBe('err-new');
      expect(state.errors).toHaveLength(1);
      expect(state.errors[0].id).toBe('err-new');
    });

    it('BobError without pipeline adds error to top-level only', () => {
      useBobStore.getState().handleBobEvent({
        type: 'BobError',
        data: makeError({ id: 'err-no-pipe' }) as unknown as Record<string, unknown>,
      });

      const state = useBobStore.getState();
      expect(state.pipeline).toBeNull();
      expect(state.errors).toHaveLength(1);
      expect(state.errors[0].id).toBe('err-no-pipe');
    });

    it('unknown event type should return state unchanged', () => {
      const pipeline = makePipeline();
      useBobStore.setState({ pipeline, agents: pipeline.agents });

      const stateBefore = useBobStore.getState();

      useBobStore.getState().handleBobEvent({
        type: 'UnknownEvent',
        data: { foo: 'bar' },
      });

      const stateAfter = useBobStore.getState();
      expect(stateAfter.pipeline).toEqual(stateBefore.pipeline);
      expect(stateAfter.agents).toEqual(stateBefore.agents);
      expect(stateAfter.errors).toEqual(stateBefore.errors);
      expect(stateAfter.decisions).toEqual(stateBefore.decisions);
    });
  });
});
