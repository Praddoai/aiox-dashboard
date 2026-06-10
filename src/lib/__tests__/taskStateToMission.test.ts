import { describe, it, expect } from 'vitest';
import { taskStateToMission, type TaskStateForMission } from '../taskStateToMission';

function createBaseState(overrides?: Partial<TaskStateForMission>): TaskStateForMission {
  return {
    taskId: 'task-123',
    status: 'idle',
    demand: 'Create a landing page',
    plan: null,
    squadSelections: [],
    agentOutputs: [],
    streamingOutputs: new Map(),
    startTime: null,
    ...overrides,
  };
}

describe('taskStateToMission', () => {
  it('returns null when status is idle', () => {
    const result = taskStateToMission(createBaseState());
    expect(result).toBeNull();
  });

  it('creates mission with start + orchestrator nodes for analyzing status', () => {
    const result = taskStateToMission(createBaseState({ status: 'analyzing' }));
    expect(result).not.toBeNull();
    expect(result!.status).toBe('in-progress');
    expect(result!.progress).toBe(10);

    const startNode = result!.nodes.find(n => n.id === 'start');
    expect(startNode).toBeDefined();
    expect(startNode!.status).toBe('completed');

    const orchNode = result!.nodes.find(n => n.id === 'orchestrator');
    expect(orchNode).toBeDefined();
    expect(orchNode!.status).toBe('active');
    expect(orchNode!.progress).toBe(30);
    expect(orchNode!.currentAction).toBe('Analisando demanda...');
  });

  it('sets orchestrator to planning state', () => {
    const result = taskStateToMission(createBaseState({ status: 'planning' }));
    const orchNode = result!.nodes.find(n => n.id === 'orchestrator');
    expect(orchNode!.status).toBe('active');
    expect(orchNode!.progress).toBe(70);
    expect(orchNode!.currentAction).toBe('Planejando execução...');
  });

  it('maps completed status correctly', () => {
    const result = taskStateToMission(createBaseState({ status: 'completed' }));
    expect(result!.status).toBe('completed');
    expect(result!.progress).toBe(100);

    const endNode = result!.nodes.find(n => n.id === 'end');
    expect(endNode!.status).toBe('completed');
    expect(endNode!.label).toBe('Concluído');
  });

  it('maps failed status correctly', () => {
    const result = taskStateToMission(createBaseState({ status: 'failed' }));
    expect(result!.status).toBe('error');

    const endNode = result!.nodes.find(n => n.id === 'end');
    expect(endNode!.status).toBe('error');
    expect(endNode!.label).toBe('Falhou');
  });

  it('creates squad nodes with proper positioning', () => {
    const result = taskStateToMission(createBaseState({
      status: 'executing',
      squadSelections: [
        { squadId: 'design', chief: 'Brad', agentCount: 2, agents: [{ id: 'brad', name: 'Brad' }, { id: 'dan', name: 'Dan' }] },
        { squadId: 'development', chief: 'Dex', agentCount: 1, agents: [{ id: 'dex', name: 'Dex' }] },
      ],
    }));

    const designNode = result!.nodes.find(n => n.id === 'ts-squad-design');
    const devNode = result!.nodes.find(n => n.id === 'ts-squad-development');

    expect(designNode).toBeDefined();
    expect(devNode).toBeDefined();
    expect(designNode!.agentName).toBe('Brad');
    expect(devNode!.agentName).toBe('Dex');
    // Different Y positions
    expect(designNode!.position.y).not.toBe(devNode!.position.y);
  });

  it('creates edges from orchestrator to each squad and squad to end', () => {
    const result = taskStateToMission(createBaseState({
      status: 'executing',
      squadSelections: [
        { squadId: 'design', chief: 'Brad', agentCount: 1, agents: [{ id: 'brad', name: 'Brad' }] },
      ],
    }));

    const orchToSquad = result!.edges.find(e => e.id === 'edge-orch-design');
    const squadToEnd = result!.edges.find(e => e.id === 'edge-design-end');

    expect(orchToSquad).toBeDefined();
    expect(orchToSquad!.source).toBe('orchestrator');
    expect(orchToSquad!.target).toBe('ts-squad-design');

    expect(squadToEnd).toBeDefined();
    expect(squadToEnd!.source).toBe('ts-squad-design');
    expect(squadToEnd!.target).toBe('end');
  });

  it('tracks squad progress from agent outputs', () => {
    const result = taskStateToMission(createBaseState({
      status: 'executing',
      squadSelections: [
        { squadId: 'design', chief: 'Brad', agentCount: 3, agents: [{ id: 'brad', name: 'Brad' }, { id: 'dan', name: 'Dan' }, { id: 'dave', name: 'Dave' }] },
      ],
      agentOutputs: [
        { stepId: 's1', stepName: 'Step 1', agent: { id: 'brad', name: 'Brad', squad: 'design' }, role: 'chief', response: 'Done', processingTimeMs: 1000 },
      ],
    }));

    const designNode = result!.nodes.find(n => n.id === 'ts-squad-design');
    // With outputs but no active streaming, squad status is 'waiting'
    expect(designNode!.status).toBe('waiting');
    expect(designNode!.progress).toBe(0);
  });

  it('shows streaming squad as active with partial progress', () => {
    const streamingOutputs = new Map<string, {
      stepId: string; stepName: string;
      agent: { id: string; name: string; squad: string };
      role: string; accumulated: string;
    }>();
    streamingOutputs.set('s2', {
      stepId: 's2', stepName: 'Step 2',
      agent: { id: 'dan', name: 'Dan', squad: 'design' },
      role: 'specialist', accumulated: 'partial response...',
    });

    const result = taskStateToMission(createBaseState({
      status: 'executing',
      squadSelections: [
        { squadId: 'design', chief: 'Brad', agentCount: 2, agents: [{ id: 'brad', name: 'Brad' }, { id: 'dan', name: 'Dan' }] },
      ],
      agentOutputs: [
        { stepId: 's1', stepName: 'Step 1', agent: { id: 'brad', name: 'Brad', squad: 'design' }, role: 'chief', response: 'Done', processingTimeMs: 500 },
      ],
      streamingOutputs,
    }));

    const designNode = result!.nodes.find(n => n.id === 'ts-squad-design');
    expect(designNode!.status).toBe('active');
    // finished=1, streaming=1, total=2 → (1+0.5)/2 = 75%
    expect(designNode!.progress).toBe(75);
  });

  it('builds agents list with correct status', () => {
    const streamingOutputs = new Map<string, {
      stepId: string; stepName: string;
      agent: { id: string; name: string; squad: string };
      role: string; accumulated: string;
    }>();
    streamingOutputs.set('s2', {
      stepId: 's2', stepName: 'Step 2',
      agent: { id: 'dan', name: 'Dan', squad: 'design' },
      role: 'specialist', accumulated: 'partial...',
    });

    const result = taskStateToMission(createBaseState({
      status: 'executing',
      squadSelections: [
        { squadId: 'design', chief: 'Brad', agentCount: 2, agents: [{ id: 'brad', name: 'Brad' }, { id: 'dan', name: 'Dan' }] },
      ],
      agentOutputs: [
        { stepId: 's1', stepName: 'Step 1', agent: { id: 'brad', name: 'Brad', squad: 'design' }, role: 'chief', response: 'Done', processingTimeMs: 500 },
      ],
      streamingOutputs,
    }));

    const brad = result!.agents.find(a => a.id === 'brad');
    const dan = result!.agents.find(a => a.id === 'dan');
    expect(brad!.status).toBe('completed');
    expect(dan!.status).toBe('working');
  });

  it('truncates long demand names', () => {
    const longDemand = 'A'.repeat(100);
    const result = taskStateToMission(createBaseState({ status: 'analyzing', demand: longDemand }));
    expect(result!.name.length).toBeLessThanOrEqual(60);
    expect(result!.name.endsWith('...')).toBe(true);
    expect(result!.description).toBe(longDemand);
  });

  it('uses taskId or falls back to live-task', () => {
    const withId = taskStateToMission(createBaseState({ status: 'analyzing', taskId: 'abc' }));
    expect(withId!.id).toBe('abc');

    const withoutId = taskStateToMission(createBaseState({ status: 'analyzing', taskId: null }));
    expect(withoutId!.id).toBe('live-task');
  });

  it('calculates overall progress correctly for executing state', () => {
    const result = taskStateToMission(createBaseState({
      status: 'executing',
      squadSelections: [
        { squadId: 'design', chief: 'Brad', agentCount: 2, agents: [{ id: 'brad', name: 'Brad' }, { id: 'dan', name: 'Dan' }] },
      ],
      agentOutputs: [
        { stepId: 's1', stepName: 'Step 1', agent: { id: 'brad', name: 'Brad', squad: 'design' }, role: 'chief', response: 'Done', processingTimeMs: 500 },
      ],
    }));

    // 30 + (1/2) * 70 = 65
    expect(result!.progress).toBe(65);
  });

  it('includes output from last agent response in squad node', () => {
    const result = taskStateToMission(createBaseState({
      status: 'executing',
      squadSelections: [
        { squadId: 'design', chief: 'Brad', agentCount: 1, agents: [{ id: 'brad', name: 'Brad' }] },
      ],
      agentOutputs: [
        { stepId: 's1', stepName: 'Step 1', agent: { id: 'brad', name: 'Brad', squad: 'design' }, role: 'chief', response: 'Here is the design output', processingTimeMs: 500 },
      ],
    }));

    const designNode = result!.nodes.find(n => n.id === 'ts-squad-design');
    expect(designNode!.output).toBe('Here is the design output');
  });

  it('sets startedAt from state.startTime', () => {
    const ts = Date.now();
    const result = taskStateToMission(createBaseState({ status: 'analyzing', startTime: ts }));
    expect(result!.startedAt).toBe(new Date(ts).toISOString());
  });

  it('always includes end node', () => {
    const result = taskStateToMission(createBaseState({ status: 'analyzing' }));
    const endNode = result!.nodes.find(n => n.id === 'end');
    expect(endNode).toBeDefined();
    expect(endNode!.type).toBe('end');
  });

  it('single squad is centered vertically', () => {
    const result = taskStateToMission(createBaseState({
      status: 'executing',
      squadSelections: [
        { squadId: 'design', chief: 'Brad', agentCount: 1, agents: [{ id: 'brad', name: 'Brad' }] },
      ],
    }));

    const designNode = result!.nodes.find(n => n.id === 'ts-squad-design');
    expect(designNode!.position.y).toBe(300); // Y_CENTER
  });
});
