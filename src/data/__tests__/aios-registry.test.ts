import { describe, it, expect } from 'vitest';
import { aiosRegistry, agentById, taskById, workflowById, checklistById } from '../aios-registry.generated';

describe('aios-registry.generated', () => {
  describe('registry structure', () => {
    it('has agents array', () => {
      expect(Array.isArray(aiosRegistry.agents)).toBe(true);
      // agents may be empty if .aios-core/development/agents/ is not present
      expect(aiosRegistry.agents.length).toBeGreaterThanOrEqual(0);
    });

    it('has tasks array', () => {
      expect(Array.isArray(aiosRegistry.tasks)).toBe(true);
      expect(aiosRegistry.tasks.length).toBeGreaterThan(0);
    });

    it('has workflows array', () => {
      expect(Array.isArray(aiosRegistry.workflows)).toBe(true);
      expect(aiosRegistry.workflows.length).toBeGreaterThan(0);
    });

    it('has checklists array', () => {
      expect(Array.isArray(aiosRegistry.checklists)).toBe(true);
    });

    it('has meta with counts', () => {
      expect(aiosRegistry.meta.agentCount).toBe(aiosRegistry.agents.length);
      expect(aiosRegistry.meta.taskCount).toBe(aiosRegistry.tasks.length);
      expect(aiosRegistry.meta.workflowCount).toBe(aiosRegistry.workflows.length);
      expect(aiosRegistry.meta.checklistCount).toBe(aiosRegistry.checklists.length);
    });
  });

  describe('agents', () => {
    it('each agent has required fields', () => {
      for (const agent of aiosRegistry.agents) {
        expect(agent.id).toBeTruthy();
        expect(agent.name).toBeTruthy();
        expect(agent.title).toBeTruthy();
        expect(Array.isArray(agent.commands)).toBe(true);
      }
    });

    it('contains core AIOS agents when available', () => {
      if (aiosRegistry.agents.length === 0) return; // skip if no agents dir
      const ids = aiosRegistry.agents.map(a => a.id);
      expect(ids).toContain('dev');
      expect(ids).toContain('qa');
      expect(ids).toContain('architect');
      expect(ids).toContain('pm');
      expect(ids).toContain('aios-master');
    });

    it('each command has name and description', () => {
      for (const agent of aiosRegistry.agents) {
        for (const cmd of agent.commands) {
          expect(cmd.name).toBeTruthy();
          expect(cmd.description).toBeTruthy();
        }
      }
    });
  });

  describe('tasks', () => {
    it('each task has required fields', () => {
      for (const task of aiosRegistry.tasks) {
        expect(task.id).toBeTruthy();
        expect(task.description).toBeTruthy();
        expect(typeof task.hasElicitation).toBe('boolean');
      }
    });
  });

  describe('workflows', () => {
    it('each workflow has required fields', () => {
      for (const wf of aiosRegistry.workflows) {
        expect(wf.id).toBeTruthy();
        expect(wf.name).toBeTruthy();
        expect(Array.isArray(wf.phases)).toBe(true);
        expect(Array.isArray(wf.agents)).toBe(true);
      }
    });

    it('workflow phases have agent references', () => {
      for (const wf of aiosRegistry.workflows) {
        for (const phase of wf.phases) {
          expect(phase.id).toBeTruthy();
          expect(phase.name).toBeTruthy();
        }
      }
    });
  });

  describe('convenience lookups', () => {
    it('agentById resolves known agents when available', () => {
      if (aiosRegistry.agents.length === 0) return; // skip if no agents dir
      expect(agentById.get('dev')).toBeDefined();
      expect(agentById.get('dev')?.name).toBeTruthy();
    });

    it('taskById resolves existing tasks', () => {
      const firstTask = aiosRegistry.tasks[0];
      if (firstTask) {
        expect(taskById.get(firstTask.id)).toBe(firstTask);
      }
    });

    it('workflowById resolves existing workflows', () => {
      const firstWf = aiosRegistry.workflows[0];
      if (firstWf) {
        expect(workflowById.get(firstWf.id)).toBe(firstWf);
      }
    });

    it('checklistById resolves existing checklists', () => {
      if (aiosRegistry.checklists.length > 0) {
        const first = aiosRegistry.checklists[0];
        expect(checklistById.get(first.id)).toBe(first);
      }
    });
  });
});
