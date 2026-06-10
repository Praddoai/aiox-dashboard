/**
 * AIOS Registry Types
 *
 * Type definitions for the build-time generated registry that captures
 * all agent, task, workflow, and checklist definitions from .aios-core/.
 */

export interface AgentDefinition {
  /** Agent identifier (kebab-case), e.g. "dev", "qa", "aios-master" */
  id: string;
  /** Display name, e.g. "Dex", "Quinn", "Orion" */
  name: string;
  /** Role title, e.g. "Full Stack Developer" */
  title: string;
  /** Emoji icon, e.g. "💻" */
  icon: string;
  /** Persona archetype, e.g. "Builder", "Guardian" */
  archetype: string;
  /** Zodiac sign, e.g. "♒ Aquarius" */
  zodiac: string;
  /** Role from persona section (serves as short description) */
  role: string;
  /** Communication style/tone */
  tone: string;
  /** When to use this agent */
  whenToUse: string;
  /** Agent commands (prefixed with *) */
  commands: AgentCommand[];
  /** Tools the agent can use */
  tools: string[];
  /** Exclusive operations only this agent may perform */
  exclusiveOps: string[];
  /** Agents this agent delegates work to */
  delegatesTo: string[];
  /** Agents this agent receives work from */
  receivesFrom: string[];
  /** Task files in dependencies */
  dependencyTasks: string[];
  /** Template files in dependencies */
  dependencyTemplates: string[];
  /** Checklist files in dependencies */
  dependencyChecklists: string[];
}

export interface AgentCommand {
  /** Command name without * prefix, e.g. "develop" */
  name: string;
  /** Human-readable description */
  description: string;
  /** Visibility levels: "full", "quick", "key" */
  visibility: string[];
  /** Optional command arguments pattern */
  args?: string;
}

export interface TaskDefinition {
  /** Filename without extension, e.g. "dev-develop-story" */
  id: string;
  /** Task function name from YAML, e.g. "devDevelopStory()" */
  taskName: string;
  /** Human-readable description */
  description: string;
  /** Responsible agent name */
  agent: string;
  /** Whether the task requires user interaction */
  hasElicitation: boolean;
}

export interface WorkflowDefinition {
  /** Workflow identifier, e.g. "story-development-cycle" */
  id: string;
  /** Human-readable name */
  name: string;
  /** Description of what the workflow does */
  description: string;
  /** Workflow type, e.g. "generic", "loop", "pipeline" */
  type: string;
  /** Ordered phases/steps */
  phases: WorkflowPhase[];
  /** All agents involved in this workflow */
  agents: string[];
  /** Trigger commands or events */
  triggers: string[];
}

export interface WorkflowPhase {
  /** Step identifier */
  id: string;
  /** Phase name */
  name: string;
  /** Phase number */
  phase: string | number;
  /** Agent that executes this phase */
  agent: string;
  /** Linked task file (if any) */
  taskFile?: string;
}

export interface ChecklistDefinition {
  /** Filename without extension */
  id: string;
  /** Human-readable name from heading or YAML */
  name: string;
  /** Purpose/description */
  description: string;
  /** Number of checklist items detected */
  itemCount: number;
}

export interface AIOSRegistry {
  agents: AgentDefinition[];
  tasks: TaskDefinition[];
  workflows: WorkflowDefinition[];
  checklists: ChecklistDefinition[];
  meta: {
    agentCount: number;
    taskCount: number;
    workflowCount: number;
    checklistCount: number;
  };
}
