export interface AgentConnection {
  from: string;
  to: string;
  type: 'receivesFrom' | 'handoffTo';
}

export const mockConnections: AgentConnection[] = [
  { from: 'chief-dev', to: 'aria', type: 'handoffTo' },
  { from: 'chief-dev', to: 'dex', type: 'handoffTo' },
  { from: 'aria', to: 'dex', type: 'handoffTo' },
  { from: 'dex', to: 'quinn', type: 'handoffTo' },
  { from: 'quinn', to: 'gage', type: 'handoffTo' },
  { from: 'river', to: 'dex', type: 'handoffTo' },
  { from: 'river', to: 'chief-dev', type: 'receivesFrom' },
];
