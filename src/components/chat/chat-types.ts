import type { AgentWithUI } from '../../hooks/useAgents';

// Action shape coming from agent markdown definitions
export interface AgentAction {
  name: string;
  description?: string;
  trigger?: string;
}

// Extended agent type used in chat components that may include dynamic backend fields.
// Omits 'capabilities' from AgentWithUI to resolve the type conflict between
// AgentWithUI (Array<{type,text}>) and Agent (string[]) — both shapes exist at runtime.
export interface ChatAgent extends Omit<AgentWithUI, 'capabilities'> {
  actions?: AgentAction[];
  capabilities?: Array<{ type: string; text: string }> | string[];
}

// Orchestration command patterns
export const ORCHESTRATION_TRIGGERS = [
  /^\/orquestrar\b/i,
  /^\/orchestrate\b/i,
  /^@bob\b/i,
];
