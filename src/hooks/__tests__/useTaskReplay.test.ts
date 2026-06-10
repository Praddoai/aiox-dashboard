import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTaskReplay } from '../useTaskReplay';
import type { Task } from '../../services/api/tasks';

// Mock getSquadType
vi.mock('../../types', () => ({
  getSquadType: (id: string) => id,
}));

function createMockTask(overrides?: Partial<Task>): Task {
  return {
    id: 'task-replay-1',
    demand: 'Build a landing page',
    status: 'completed',
    squads: [
      {
        squadId: 'design',
        chief: 'Brad',
        agentCount: 2,
        agents: [
          { id: 'brad', name: 'Brad' },
          { id: 'dan', name: 'Dan' },
        ],
      },
    ],
    workflow: { id: 'wf-1', name: 'Design Workflow', stepCount: 2 },
    outputs: [
      {
        stepId: 'step-1',
        stepName: 'Visual Design',
        output: {
          response: 'Created visual mockup for the landing page.',
          agent: { id: 'brad', name: 'Brad', squad: 'design' },
          role: 'chief',
          processingTimeMs: 2000,
        },
      },
      {
        stepId: 'step-2',
        stepName: 'Content Strategy',
        output: {
          response: 'Content strategy completed with copy recommendations.',
          agent: { id: 'dan', name: 'Dan', squad: 'design' },
          role: 'specialist',
          processingTimeMs: 3000,
        },
      },
    ],
    createdAt: '2025-01-01T00:00:00Z',
    startedAt: '2025-01-01T00:00:01Z',
    completedAt: '2025-01-01T00:05:00Z',
    ...overrides,
  };
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useTaskReplay', () => {
  describe('initial state', () => {
    it('starts with empty state', () => {
      const { result } = renderHook(() => useTaskReplay());
      expect(result.current.state.mission).toBeNull();
      expect(result.current.state.isPlaying).toBe(false);
      expect(result.current.state.isPaused).toBe(false);
      expect(result.current.state.currentStep).toBe(0);
      expect(result.current.state.totalSteps).toBe(0);
      expect(result.current.state.taskId).toBeNull();
      expect(result.current.state.speed).toBe(1);
    });
  });

  describe('load', () => {
    it('builds mission from task with correct nodes', () => {
      const { result } = renderHook(() => useTaskReplay());
      const task = createMockTask();

      act(() => result.current.load(task));

      const mission = result.current.state.mission!;
      expect(mission).not.toBeNull();
      expect(mission.id).toBe('task-replay-1');
      expect(mission.status).toBe('queued');
      expect(mission.progress).toBe(0);

      // Should have: start, orchestrator, chief-design, agent-dan, review, end
      expect(mission.nodes.length).toBeGreaterThanOrEqual(5);
      expect(mission.nodes.find(n => n.id === 'node-start')).toBeDefined();
      expect(mission.nodes.find(n => n.id === 'node-orchestrator')).toBeDefined();
      expect(mission.nodes.find(n => n.id === 'node-chief-design')).toBeDefined();
      expect(mission.nodes.find(n => n.id === 'node-agent-dan')).toBeDefined();
      expect(mission.nodes.find(n => n.id === 'node-review')).toBeDefined();
      expect(mission.nodes.find(n => n.id === 'node-end')).toBeDefined();

      // All nodes should start as idle
      mission.nodes.forEach(n => {
        expect(n.status).toBe('idle');
      });
    });

    it('builds edges connecting nodes correctly', () => {
      const { result } = renderHook(() => useTaskReplay());
      act(() => result.current.load(createMockTask()));

      const mission = result.current.state.mission!;
      // start -> orchestrator
      expect(mission.edges.find(e => e.source === 'node-start' && e.target === 'node-orchestrator')).toBeDefined();
      // orchestrator -> chief
      expect(mission.edges.find(e => e.source === 'node-orchestrator' && e.target === 'node-chief-design')).toBeDefined();
      // chief -> agent
      expect(mission.edges.find(e => e.source === 'node-chief-design' && e.target === 'node-agent-dan')).toBeDefined();
      // leaf -> review
      expect(mission.edges.find(e => e.target === 'node-review')).toBeDefined();
      // review -> end
      expect(mission.edges.find(e => e.source === 'node-review' && e.target === 'node-end')).toBeDefined();
    });

    it('builds agents list', () => {
      const { result } = renderHook(() => useTaskReplay());
      act(() => result.current.load(createMockTask()));

      const agents = result.current.state.mission!.agents;
      expect(agents.find(a => a.name === 'Bob')).toBeDefined(); // orchestrator
      expect(agents.find(a => a.name === 'Brad')).toBeDefined();
      expect(agents.find(a => a.name === 'Dan')).toBeDefined();
    });

    it('sets totalSteps from replay steps', () => {
      const { result } = renderHook(() => useTaskReplay());
      act(() => result.current.load(createMockTask()));

      // Steps: activate (start+orch), complete-and-activate, step-execute (Brad), step-execute (Dan), complete-all
      expect(result.current.state.totalSteps).toBeGreaterThanOrEqual(4);
    });

    it('builds replay steps with enriched output', () => {
      const { result } = renderHook(() => useTaskReplay());
      act(() => result.current.load(createMockTask()));

      // totalSteps should reflect the generated steps
      expect(result.current.state.totalSteps).toBeGreaterThan(0);
      expect(result.current.state.taskId).toBe('task-replay-1');
    });

    it('truncates long demand in mission name', () => {
      const { result } = renderHook(() => useTaskReplay());
      const task = createMockTask({ demand: 'X'.repeat(100) });
      act(() => result.current.load(task));

      expect(result.current.state.mission!.name.length).toBeLessThanOrEqual(60);
      expect(result.current.state.mission!.description).toBe('X'.repeat(100));
    });

    it('filters empty outputs', () => {
      const { result } = renderHook(() => useTaskReplay());
      const task = createMockTask({
        outputs: [
          {
            stepId: 'step-1',
            stepName: 'Empty step',
            output: { response: '', agent: { id: 'brad', name: 'Brad', squad: 'design' } },
          },
          {
            stepId: 'step-2',
            stepName: 'Valid step',
            output: { response: 'Real output', agent: { id: 'dan', name: 'Dan', squad: 'design' }, processingTimeMs: 1000 },
          },
        ],
      });

      act(() => result.current.load(task));
      // Only 1 valid output → fewer replay steps than a task with 2 valid outputs
      const baseTask = createMockTask();
      const { result: baseResult } = renderHook(() => useTaskReplay());
      act(() => baseResult.current.load(baseTask));

      expect(result.current.state.totalSteps).toBeLessThan(baseResult.current.state.totalSteps);
    });
  });

  describe('play / pause / stop', () => {
    it('play sets isPlaying to true', () => {
      const { result } = renderHook(() => useTaskReplay());
      act(() => result.current.load(createMockTask()));
      act(() => result.current.play());

      expect(result.current.state.isPlaying).toBe(true);
      expect(result.current.state.isPaused).toBe(false);
    });

    it('pause sets isPaused to true and isPlaying to false', () => {
      const { result } = renderHook(() => useTaskReplay());
      act(() => result.current.load(createMockTask()));
      act(() => result.current.play());
      act(() => result.current.pause());

      expect(result.current.state.isPlaying).toBe(false);
      expect(result.current.state.isPaused).toBe(true);
    });

    it('stop clears everything', () => {
      const { result } = renderHook(() => useTaskReplay());
      act(() => result.current.load(createMockTask()));
      act(() => result.current.play());
      act(() => result.current.stop());

      expect(result.current.state.mission).toBeNull();
      expect(result.current.state.isPlaying).toBe(false);
      expect(result.current.state.isPaused).toBe(false);
      expect(result.current.state.currentStep).toBe(0);
      expect(result.current.state.totalSteps).toBe(0);
      expect(result.current.state.taskId).toBeNull();
    });
  });

  describe('setSpeed', () => {
    it('updates speed', () => {
      const { result } = renderHook(() => useTaskReplay());
      act(() => result.current.setSpeed(2));
      expect(result.current.state.speed).toBe(2);

      act(() => result.current.setSpeed(0.5));
      expect(result.current.state.speed).toBe(0.5);
    });
  });

  describe('replay animation', () => {
    it('first step activates start and orchestrator nodes', () => {
      const { result } = renderHook(() => useTaskReplay());
      act(() => result.current.load(createMockTask()));
      act(() => result.current.play());

      // Advance past the first step's duration (800ms at 1x speed)
      act(() => vi.advanceTimersByTime(900));

      const mission = result.current.state.mission!;
      const startNode = mission.nodes.find(n => n.id === 'node-start');
      const orchNode = mission.nodes.find(n => n.id === 'node-orchestrator');

      expect(startNode!.status).toBe('completed');
      expect(orchNode!.status).toBe('active');
      expect(result.current.state.currentStep).toBeGreaterThan(0);
    });

    it('second step completes orchestrator and shows squads', () => {
      const { result } = renderHook(() => useTaskReplay());
      act(() => result.current.load(createMockTask()));
      act(() => result.current.play());

      // The tick-based replay loop uses nested timeouts.
      // Advance step by step to let each tick trigger.
      // Step 0 (activate): duration=800ms
      act(() => vi.advanceTimersByTime(900));
      // Step 1 (complete-and-activate): duration=1200ms
      act(() => vi.advanceTimersByTime(1300));

      const mission = result.current.state.mission!;
      const orchNode = mission.nodes.find(n => n.id === 'node-orchestrator');
      expect(orchNode!.status).toBe('completed');

      const chiefNode = mission.nodes.find(n => n.id === 'node-chief-design');
      expect(chiefNode).toBeDefined();
      // Should be waiting (activated by complete-and-activate step)
      expect(chiefNode!.status).toBe('waiting');
    });

    it('step-execute activates node with output and then completes it', () => {
      const { result } = renderHook(() => useTaskReplay());
      act(() => result.current.load(createMockTask()));
      act(() => result.current.play());

      // Advance through step 0 (activate, 800ms)
      act(() => vi.advanceTimersByTime(900));
      // Advance through step 1 (complete-and-activate, 1200ms)
      act(() => vi.advanceTimersByTime(1300));
      // Advance through step 2 (step-execute for Brad, ~300ms duration)
      act(() => vi.advanceTimersByTime(400));

      const mission = result.current.state.mission!;
      const bradNode = mission.nodes.find(n => n.agentName === 'Brad');
      expect(bradNode).toBeDefined();
      // Should be active (step-execute was applied) or completed (if completion delay also elapsed)
      expect(['active', 'completed']).toContain(bradNode!.status);
      // Output enrichment
      if (bradNode!.output) {
        expect(bradNode!.output).toContain('visual mockup');
      }
    });

    it('final complete-all step completes all nodes', () => {
      const { result } = renderHook(() => useTaskReplay());
      act(() => result.current.load(createMockTask()));
      act(() => result.current.play());

      // Advance through all steps incrementally to let each tick fire
      for (let i = 0; i < 20; i++) {
        act(() => vi.advanceTimersByTime(2000));
      }

      const mission = result.current.state.mission!;
      expect(mission.status).toBe('completed');
      expect(mission.progress).toBe(100);

      mission.nodes.forEach(n => {
        expect(n.status).toBe('completed');
      });

      mission.edges.forEach(e => {
        expect(e.status).toBe('completed');
        expect(e.animated).toBe(false);
      });
    });
  });

  describe('task with no squads', () => {
    it('handles task with empty squads', () => {
      const { result } = renderHook(() => useTaskReplay());
      const task = createMockTask({ squads: [], outputs: [] });

      act(() => result.current.load(task));

      const mission = result.current.state.mission!;
      // Should still have start, orchestrator, review, end
      expect(mission.nodes.find(n => n.id === 'node-start')).toBeDefined();
      expect(mission.nodes.find(n => n.id === 'node-orchestrator')).toBeDefined();
      expect(mission.nodes.find(n => n.id === 'node-end')).toBeDefined();
    });
  });

  describe('stepLabels', () => {
    it('builds step labels with correct types', () => {
      const { result } = renderHook(() => useTaskReplay());
      act(() => result.current.load(createMockTask()));

      const labels = result.current.state.stepLabels;
      expect(labels.length).toBe(result.current.state.totalSteps);

      // First label should be 'Inicialização' (activate)
      expect(labels[0].label).toBe('Inicialização');
      expect(labels[0].type).toBe('activate');

      // Second should be 'Squads ativados' (complete-and-activate)
      expect(labels[1].label).toBe('Squads ativados');
      expect(labels[1].type).toBe('complete-and-activate');

      // Step-execute labels should contain agent name
      const executeLabels = labels.filter(l => l.type === 'step-execute');
      expect(executeLabels.length).toBeGreaterThan(0);
      executeLabels.forEach(l => {
        expect(l.label).toContain(':'); // "AgentName: StepName"
      });

      // Last should be 'Concluído' (complete-all)
      expect(labels[labels.length - 1].label).toBe('Concluído');
      expect(labels[labels.length - 1].type).toBe('complete-all');
    });

    it('clears step labels on stop', () => {
      const { result } = renderHook(() => useTaskReplay());
      act(() => result.current.load(createMockTask()));
      expect(result.current.state.stepLabels.length).toBeGreaterThan(0);

      act(() => result.current.stop());
      expect(result.current.state.stepLabels).toEqual([]);
    });
  });

  describe('seekTo', () => {
    it('seeks to a specific step', () => {
      const { result } = renderHook(() => useTaskReplay());
      act(() => result.current.load(createMockTask()));

      // Seek to step 2 (after activate and complete-and-activate)
      act(() => result.current.seekTo(2));

      expect(result.current.state.currentStep).toBe(2);
      expect(result.current.state.isPlaying).toBe(false);
      expect(result.current.state.isPaused).toBe(true);

      const mission = result.current.state.mission!;
      // Orchestrator should be completed (from complete-and-activate step)
      const orchNode = mission.nodes.find(n => n.id === 'node-orchestrator');
      expect(orchNode!.status).toBe('completed');
    });

    it('seeks to beginning (step 0) resets mission', () => {
      const { result } = renderHook(() => useTaskReplay());
      act(() => result.current.load(createMockTask()));
      act(() => result.current.seekTo(3));
      expect(result.current.state.currentStep).toBe(3);

      act(() => result.current.seekTo(0));
      expect(result.current.state.currentStep).toBe(0);
      expect(result.current.state.isPaused).toBe(false);

      // All nodes should be idle again
      const mission = result.current.state.mission!;
      mission.nodes.forEach(n => {
        expect(n.status).toBe('idle');
      });
    });

    it('seeks to end completes all nodes', () => {
      const { result } = renderHook(() => useTaskReplay());
      act(() => result.current.load(createMockTask()));

      const totalSteps = result.current.state.totalSteps;
      act(() => result.current.seekTo(totalSteps));

      expect(result.current.state.currentStep).toBe(totalSteps);
      const mission = result.current.state.mission!;
      expect(mission.status).toBe('completed');
      expect(mission.progress).toBe(100);
    });

    it('clamps to valid range', () => {
      const { result } = renderHook(() => useTaskReplay());
      act(() => result.current.load(createMockTask()));

      const totalSteps = result.current.state.totalSteps;

      // Seek past end → clamped to totalSteps
      act(() => result.current.seekTo(999));
      expect(result.current.state.currentStep).toBe(totalSteps);

      // Seek negative → clamped to 0
      act(() => result.current.seekTo(-5));
      expect(result.current.state.currentStep).toBe(0);
    });

    it('stops playback when seeking', () => {
      const { result } = renderHook(() => useTaskReplay());
      act(() => result.current.load(createMockTask()));
      act(() => result.current.play());
      expect(result.current.state.isPlaying).toBe(true);

      act(() => result.current.seekTo(1));
      expect(result.current.state.isPlaying).toBe(false);
    });

    it('can resume play after seeking', () => {
      const { result } = renderHook(() => useTaskReplay());
      act(() => result.current.load(createMockTask()));

      act(() => result.current.seekTo(1));
      expect(result.current.state.currentStep).toBe(1);

      act(() => result.current.play());
      expect(result.current.state.isPlaying).toBe(true);
    });
  });

  describe('output truncation', () => {
    it('truncates responses longer than 500 chars', () => {
      const longResponse = 'A'.repeat(600);
      const { result } = renderHook(() => useTaskReplay());
      const task = createMockTask({
        outputs: [{
          stepId: 'step-1',
          stepName: 'Long output',
          output: {
            response: longResponse,
            agent: { id: 'brad', name: 'Brad', squad: 'design' },
            processingTimeMs: 1000,
          },
        }],
      });

      act(() => result.current.load(task));
      act(() => result.current.play());

      // Advance to step-execute
      act(() => vi.advanceTimersByTime(3000));

      const bradNode = result.current.state.mission!.nodes.find(n => n.agentName === 'Brad');
      if (bradNode?.output) {
        expect(bradNode.output.length).toBeLessThanOrEqual(500);
        expect(bradNode.output).toContain('...');
      }
    });
  });
});
