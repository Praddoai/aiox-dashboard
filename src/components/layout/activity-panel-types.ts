// Agent action from backend (runtime field not in base type)
export interface AgentAction {
  name: string;
  description?: string;
  trigger?: string;
}

export type SectionKey = 'agent' | 'activity' | 'commands' | 'tools' | 'tokens' | 'health' | 'stats';

export type TabType = 'activity' | 'history' | 'metrics';
