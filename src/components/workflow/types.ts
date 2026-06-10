import type { SquadType } from '../../types';

export interface WorkflowNodeTodo {
  id: string;
  text: string;
  status: 'pending' | 'in-progress' | 'completed';
}

export interface WorkflowNodeFile {
  id: string;
  name: string;
  type: 'text' | 'markdown' | 'image' | 'code' | 'json';
  size: string;
  createdAt: string;
}

export type ToolType =
  | 'web-search'
  | 'web-scraper'
  | 'code-interpreter'
  | 'image-gen'
  | 'file-system'
  | 'database'
  | 'api'
  | 'email'
  | 'slack'
  | 'notion'
  | 'figma'
  | 'github'
  | 'analytics'
  | 'calendar'
  | 'sheets'
  | 'docs';

export interface AgentTool {
  id: ToolType;
  name: string;
  description?: string;
  connected?: boolean;
}

export interface TokenUsage {
  input: number;
  output: number;
  total: number;
}

export interface WorkflowNode {
  id: string;
  type: 'agent' | 'task' | 'checkpoint' | 'start' | 'end';
  label: string;
  agentName?: string;
  squadType?: SquadType;
  status: 'idle' | 'active' | 'completed' | 'error' | 'waiting';
  position: { x: number; y: number };
  progress?: number;
  currentAction?: string;
  // Extended details
  request?: string; // What was requested to this agent
  todos?: WorkflowNodeTodo[];
  files?: WorkflowNodeFile[];
  tools?: AgentTool[]; // Tools/integrations available to this agent
  tokens?: TokenUsage; // Token usage for this node
  startedAt?: string;
  completedAt?: string;
  estimatedDuration?: number; // Estimated duration in seconds
  output?: string; // Final output/result
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  status: 'idle' | 'active' | 'completed';
  animated?: boolean;
  label?: string;
}

export interface WorkflowMission {
  id: string;
  name: string;
  description: string;
  status: 'queued' | 'in-progress' | 'completed' | 'error';
  startedAt?: string;
  completedAt?: string;
  progress: number;
  currentNode?: string;
  tokens?: TokenUsage; // Total token usage for the mission
  estimatedTimeRemaining?: number; // Estimated time remaining in seconds
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  agents: {
    id: string;
    name: string;
    squadType: SquadType;
    role: string;
    status: 'working' | 'waiting' | 'completed';
    currentTask?: string;
  }[];
}

export interface WorkflowOperation {
  id: string;
  missionId: string;
  agentName: string;
  squadType: SquadType;
  action: string;
  status: 'running' | 'completed' | 'pending';
  startedAt: string;
  duration?: number;
}
