import { describe, it, expect, vi, beforeEach } from 'vitest';
import { exportTaskAsJSON, exportTaskAsMarkdown, formatOrchestrationSummary } from '../taskExport';
import type { Task } from '../../services/api/tasks';

function createMockTask(overrides?: Partial<Task>): Task {
  return {
    id: 'task-export-001',
    demand: 'Create a marketing campaign',
    status: 'completed',
    squads: [
      {
        squadId: 'marketing',
        chief: 'Chief Marketing',
        agentCount: 2,
        agents: [
          { id: 'agent-1', name: 'Copywriter' },
          { id: 'agent-2', name: 'Designer' },
        ],
      },
    ],
    workflow: { id: 'wf-1', name: 'Marketing Flow', stepCount: 2 },
    outputs: [
      {
        stepId: 'step-1',
        stepName: 'Draft Copy',
        output: {
          response: 'Campaign copy drafted successfully.',
          agent: { id: 'agent-1', name: 'Copywriter', squad: 'marketing' },
          role: 'specialist',
          processingTimeMs: 5000,
        },
      },
      {
        stepId: 'step-2',
        stepName: 'Design Assets',
        output: {
          response: 'Visual assets created.',
          agent: { id: 'agent-2', name: 'Designer', squad: 'marketing' },
          role: 'specialist',
          processingTimeMs: 8000,
        },
      },
    ],
    createdAt: '2025-01-15T10:00:00Z',
    startedAt: '2025-01-15T10:00:01Z',
    completedAt: '2025-01-15T10:05:00Z',
    totalTokens: 12500,
    totalDuration: 300000,
    ...overrides,
  };
}

// Mock DOM APIs for download
beforeEach(() => {
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  vi.spyOn(document.body, 'appendChild').mockImplementation(() => document.body);
  vi.spyOn(document.body, 'removeChild').mockImplementation(() => document.body);
  vi.spyOn(document, 'createElement').mockReturnValue({
    href: '',
    download: '',
    click: vi.fn(),
  } as unknown as HTMLAnchorElement);
});

describe('taskExport', () => {
  describe('exportTaskAsJSON', () => {
    it('creates a Blob and triggers download', () => {
      const task = createMockTask();
      exportTaskAsJSON(task);

      expect(URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');

      const anchor = document.createElement('a') as HTMLAnchorElement;
      expect(anchor.click).toHaveBeenCalled();
    });
  });

  describe('exportTaskAsMarkdown', () => {
    it('returns markdown string with correct structure', () => {
      const task = createMockTask();
      const md = exportTaskAsMarkdown(task);

      expect(md).toContain('# Orchestration Report');
      expect(md).toContain('Create a marketing campaign');
      expect(md).toContain('**Status:** completed');
      expect(md).toMatch(/\*\*Total Tokens:\*\* 12[,.]?500/);
      expect(md).toContain('## Squads');
      expect(md).toContain('### marketing (Chief: Chief Marketing)');
      expect(md).toContain('- Copywriter');
      expect(md).toContain('- Designer');
      expect(md).toContain('## Agent Outputs');
      expect(md).toContain('### Step 1: Draft Copy');
      expect(md).toContain('Campaign copy drafted successfully.');
      expect(md).toContain('### Step 2: Design Assets');
    });

    it('includes error section when task has error', () => {
      const task = createMockTask({ status: 'failed', error: 'Connection timeout' });
      const md = exportTaskAsMarkdown(task);

      expect(md).toContain('## Error');
      expect(md).toContain('Connection timeout');
    });

    it('triggers download', () => {
      const task = createMockTask();
      exportTaskAsMarkdown(task);

      expect(URL.createObjectURL).toHaveBeenCalled();
    });
  });

  describe('formatOrchestrationSummary', () => {
    it('formats completed orchestration', () => {
      const summary = formatOrchestrationSummary({
        demand: 'Build a landing page',
        status: 'completed',
        squadSelections: [
          { squadId: 'design', chief: 'Brad', agents: [{ id: 'brad', name: 'Brad' }, { id: 'dan', name: 'Dan' }] },
        ],
        agentOutputs: [
          { stepName: 'Visual Design', agent: { id: 'brad', name: 'Brad' }, response: 'Created mockup.', processingTimeMs: 2000 },
          { stepName: 'Content', agent: { id: 'dan', name: 'Dan' }, response: 'Content drafted.', processingTimeMs: 3000 },
        ],
        startTime: Date.now() - 5000,
      });

      expect(summary).toContain('**Orchestration completed**');
      expect(summary).toContain('Build a landing page');
      expect(summary).toContain('1 squad');
      expect(summary).toContain('2 steps');
      expect(summary).toContain('**Brad** — Visual Design');
      expect(summary).toContain('Created mockup.');
      expect(summary).toContain('**Dan** — Content');
    });

    it('formats failed orchestration with error', () => {
      const summary = formatOrchestrationSummary({
        demand: 'Deploy application',
        status: 'failed',
        squadSelections: [],
        agentOutputs: [],
        startTime: Date.now() - 2000,
        error: 'Connection refused',
      });

      expect(summary).toContain('**Orchestration failed**');
      expect(summary).toContain('Deploy application');
      expect(summary).toContain('**Error:** Connection refused');
    });

    it('truncates long demands', () => {
      const summary = formatOrchestrationSummary({
        demand: 'X'.repeat(200),
        status: 'completed',
        squadSelections: [],
        agentOutputs: [],
        startTime: null,
      });

      expect(summary).toContain('...');
      expect(summary.indexOf('X'.repeat(200))).toBe(-1);
    });

    it('truncates long agent responses', () => {
      const summary = formatOrchestrationSummary({
        demand: 'Test',
        status: 'completed',
        squadSelections: [],
        agentOutputs: [
          { stepName: 'Long step', agent: { id: 'a', name: 'Agent' }, response: 'Y'.repeat(300) },
        ],
        startTime: null,
      });

      const lines = summary.split('\n');
      const responseLine = lines.find(l => l.startsWith('Y'));
      expect(responseLine!.length).toBeLessThanOrEqual(200);
    });
  });
});
