// AUTO-GENERATED — do not edit manually
// Run: npx tsx scripts/generate-aios-registry.ts

import type { AIOSRegistry } from './registry-types';

export const aiosRegistry: AIOSRegistry = {
  "agents": [],
  "tasks": [
    {
      "id": "apply-qa-fixes",
      "taskName": "applyQaFixes()",
      "description": "Ap",
      "agent": "Dex",
      "hasElicitation": true
    },
    {
      "id": "create-next-story",
      "taskName": "createNextStory()",
      "description": "Create Next Story Task",
      "agent": "River",
      "hasElicitation": true
    },
    {
      "id": "create-task",
      "taskName": "createTask()",
      "description": "TODO: Create task-validation-checklist.md for validation (follow-up story needed)",
      "agent": "Orion",
      "hasElicitation": true
    },
    {
      "id": "create-workflow",
      "taskName": "createWorkflow()",
      "description": "TODO: Create workflow-validation-checklist.md for validation (follow-up story needed)",
      "agent": "Orion",
      "hasElicitation": true
    },
    {
      "id": "dev-apply-qa-fixes",
      "taskName": "devApplyQaFixes()",
      "description": "Ap",
      "agent": "Dex",
      "hasElicitation": true
    },
    {
      "id": "dev-develop-story",
      "taskName": "devDevelopStory()",
      "description": "Develop Story Task",
      "agent": "Dex",
      "hasElicitation": true
    },
    {
      "id": "dev-validate-next-story",
      "taskName": "devValidateNextStory()",
      "description": "Validate Next Story Task",
      "agent": "Dex",
      "hasElicitation": true
    },
    {
      "id": "improve-self",
      "taskName": "improveSelf()",
      "description": "improve-self",
      "agent": "Orion",
      "hasElicitation": true
    },
    {
      "id": "orchestrate-status",
      "taskName": "orchestrate-status()",
      "description": "\\*orchestrate-status Command",
      "agent": "",
      "hasElicitation": false
    },
    {
      "id": "qa-gate",
      "taskName": "qaGate()",
      "description": "qa-gate",
      "agent": "Quinn",
      "hasElicitation": true
    },
    {
      "id": "qa-review-story",
      "taskName": "qaReviewStory()",
      "description": "review-story",
      "agent": "Quinn",
      "hasElicitation": true
    },
    {
      "id": "release-management",
      "taskName": "releaseManagement()",
      "description": "Manage Software Releases",
      "agent": "Gage",
      "hasElicitation": true
    },
    {
      "id": "security-scan",
      "taskName": "securityScan()",
      "description": "security-scan",
      "agent": "Quinn",
      "hasElicitation": true
    },
    {
      "id": "validate-next-story",
      "taskName": "validateNextStory()",
      "description": "Validate Next Story Task",
      "agent": "Quinn",
      "hasElicitation": true
    }
  ],
  "workflows": [
    {
      "id": "qa-loop",
      "name": "QA Loop Orchestrator - Review Fix Re-review Cycle",
      "description": "Automated QA loop that orchestrates the review → fix → re-review cycle. Runs up to maxIterations (default 5), tracking each iteration's results. Escalates to human when max iterations reached or manual stop requested. Part of Epic 6 - QA Evolution: Autonomous Development Engine (ADE).",
      "type": "loop",
      "phases": [
        {
          "id": "review",
          "name": "review",
          "phase": "1",
          "agent": "qa",
          "taskFile": "qa-review-story.md"
        },
        {
          "id": "check_verdict",
          "name": "check_verdict",
          "phase": "2",
          "agent": "system"
        },
        {
          "id": "create_fix_request",
          "name": "create_fix_request",
          "phase": "3",
          "agent": "qa",
          "taskFile": "qa-create-fix-request.md"
        },
        {
          "id": "fix_issues",
          "name": "fix_issues",
          "phase": "4",
          "agent": "dev",
          "taskFile": "dev-apply-qa-fixes.md"
        },
        {
          "id": "increment_iteration",
          "name": "increment_iteration",
          "phase": "5",
          "agent": "system"
        }
      ],
      "agents": [
        "qa",
        "dev"
      ],
      "triggers": [
        "*qa-loop\"",
        "*qa-loop-review\"",
        "*qa-loop-fix\"",
        "*stop-qa-loop\"",
        "*resume-qa-loop\"",
        "*escalate-qa-loop\"",
        "*stop-qa-loop\"",
        "*resume-qa-loop\"",
        "*qa-loop"
      ]
    },
    {
      "id": "story-development-cycle",
      "name": "Story Development Cycle",
      "description": "Ciclo completo de desenvolvimento de stories. Automatiza o fluxo desde a criação até a entrega com quality gate: create → validate → implement → QA review. Aplicável a projetos greenfield e brownfield.",
      "type": "generic",
      "phases": [
        {
          "id": "create_story",
          "name": "create_story",
          "phase": "1",
          "agent": "sm"
        },
        {
          "id": "validate_story",
          "name": "validate_story",
          "phase": "2",
          "agent": "po"
        },
        {
          "id": "implement_story",
          "name": "implement_story",
          "phase": "3",
          "agent": "dev"
        },
        {
          "id": "qa_review",
          "name": "qa_review",
          "phase": "4",
          "agent": "qa"
        }
      ],
      "agents": [
        "sm",
        "po",
        "dev",
        "qa"
      ],
      "triggers": []
    }
  ],
  "checklists": [
    {
      "id": "change-checklist",
      "name": "Change Navigation Checklist",
      "description": "",
      "itemCount": 63
    },
    {
      "id": "pm-checklist",
      "name": "Product Manager (PM) Requirements Checklist",
      "description": "",
      "itemCount": 139
    },
    {
      "id": "self-critique-checklist",
      "name": "Self-Critique Checklist",
      "description": "This checklist enables the Developer Agent to perform mandatory self-critique at two critical points during subtask execution:",
      "itemCount": 43
    }
  ],
  "meta": {
    "agentCount": 0,
    "taskCount": 14,
    "workflowCount": 2,
    "checklistCount": 3
  }
} as const;

// Convenience lookups
export const agentById = new Map(aiosRegistry.agents.map(a => [a.id, a]));
export const taskById = new Map(aiosRegistry.tasks.map(t => [t.id, t]));
export const workflowById = new Map(aiosRegistry.workflows.map(w => [w.id, w]));
export const checklistById = new Map(aiosRegistry.checklists.map(c => [c.id, c]));

// Agent IDs as union type for type safety
export type AgentId = typeof aiosRegistry.agents[number]['id'];
export type WorkflowId = typeof aiosRegistry.workflows[number]['id'];
