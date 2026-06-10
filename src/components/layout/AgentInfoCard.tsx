import { GlassCard, Badge, Avatar } from '../ui';
import { getTierTheme } from '../../lib/utils';
import type { AgentWithUI } from '../../hooks/useAgents';
import type { SquadType } from '../../types';

interface AgentInfoCardProps {
  agent: AgentWithUI;
  squadType: SquadType;
}

export function AgentInfoCard({ agent, squadType }: AgentInfoCardProps) {
  const normalizedTier = (agent.tier === 0 || agent.tier === 1 || agent.tier === 2) ? agent.tier : 2;

  return (
    <GlassCard variant="subtle" padding="md">
      <div className="flex items-center gap-3">
        <Avatar name={agent.name} agentId={agent.id} size="lg" squadType={squadType} />
        <div className="flex-1 min-w-0">
          <h4 className="text-primary font-medium truncate">{agent.name}</h4>
          <p className="text-tertiary text-xs truncate">{agent.title || agent.description}</p>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="squad" squadType={squadType} size="sm">
              {agent.squad}
            </Badge>
            <span className="text-[10px] text-tertiary">
              {getTierTheme(normalizedTier).label}
            </span>
          </div>
        </div>
      </div>
    </GlassCard>
  );
}
