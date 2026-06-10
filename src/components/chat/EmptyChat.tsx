import { motion } from 'framer-motion';
import { Badge } from '../ui';
import { AgentExplorerCard } from '../agents/AgentCard';
import { useAgents } from '../../hooks/useAgents';
import { useSquads } from '../../hooks/useSquads';
import { useChat } from '../../hooks/useChat';
import { useUIStore } from '../../stores/uiStore';
import { cn, squadLabels, getTierTheme } from '../../lib/utils';
import { ICON_SIZES, getIconComponent } from '../../lib/icons';
import { getSquadImageUrl } from '../../lib/agent-avatars';
import type { Squad, AgentSummary, AgentTier } from '../../types';
import { getSquadType } from '../../types';

// Tier labels with plural for grouping
const tierPluralLabels: Record<AgentTier, string> = {
  0: 'Orchestrators',
  1: 'Masters',
  2: 'Specialists',
};

export function EmptyChat() {
  const { selectedSquadId, setSelectedSquadId } = useUIStore();
  const { data: agents, isLoading: agentsLoading } = useAgents(selectedSquadId);
  const { data: squads, isLoading: squadsLoading } = useSquads();
  const { selectAgent } = useChat();

  // Show agents when a squad is selected and agents are available
  if (selectedSquadId && agents && agents.length > 0) {
    // Group agents by tier
    const groupedAgents: Record<AgentTier, AgentSummary[]> = { 0: [], 1: [], 2: [] };
    agents.forEach((agent) => {
      const tier = (agent.tier === 0 || agent.tier === 1 || agent.tier === 2) ? agent.tier : 2;
      groupedAgents[tier].push(agent);
    });

    return (
      <div className="h-full flex flex-col p-6 overflow-hidden">
        {/* Header with back button */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex items-center gap-3 mb-1">
            <button
              onClick={() => setSelectedSquadId(null)}
              className="text-tertiary hover:text-primary transition-colors p-1 -ml-1 rounded-lg hover:bg-white/10"
              title="Voltar para squads"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
            </button>
            <div>
              <h2 className="text-primary text-xl font-semibold">
                Escolha um Agent
              </h2>
              <p className="text-secondary text-sm">
                {agents.length} agents disponíveis neste squad
              </p>
            </div>
          </div>
        </motion.div>

        {/* Agents Grid */}
        <div className="flex-1 overflow-y-auto glass-scrollbar pr-2">
          <div className="space-y-6">
            {([0, 1, 2] as AgentTier[]).map((tier) => {
              const tierAgents = groupedAgents[tier];
              if (tierAgents.length === 0) return null;

              return (
                <motion.div
                  key={tier}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: tier * 0.1 }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className={cn('text-sm font-semibold', getTierTheme(tier).text)}>
                      {tierPluralLabels[tier]}
                    </span>
                    <Badge variant="count" size="sm">{tierAgents.length}</Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {tierAgents.map((agent, index) => (
                      <motion.div
                        key={agent.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.03 }}
                      >
                        <AgentExplorerCard
                          agent={agent}
                          onClick={() => selectAgent(agent)}
                        />
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (agentsLoading || squadsLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-[#0099FF] border-t-transparent rounded-full" />
      </div>
    );
  }

  // Squad selection — show all squads as clickable cards
  return (
    <div className="h-full flex flex-col p-6 overflow-hidden">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 text-center"
      >
        <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-[#D1FF00] to-[#a8cc00] flex items-center justify-center mx-auto mb-4">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
          </svg>
        </div>
        <h2 className="text-primary text-xl font-semibold mb-1">
          Escolha um Squad
        </h2>
        <p className="text-secondary text-sm">
          Selecione um squad para ver os agents disponíveis
        </p>
      </motion.div>

      <div className="flex-1 overflow-y-auto glass-scrollbar pr-2">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {(squads || []).map((squad: Squad, index: number) => {
            const squadType = squad.type || getSquadType(squad.id);
            return (
              <motion.button
                key={squad.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.03 }}
                onClick={() => setSelectedSquadId(squad.id)}
                className={cn(
                  'glass-card rounded-xl p-4 text-left transition-all group',
                  'hover:bg-white/10 hover:border-[#D1FF00]/30',
                  'border border-white/10'
                )}
              >
                <div className="flex items-start gap-3">
                  {getSquadImageUrl(squad.id) ? (
                    <img
                      src={getSquadImageUrl(squad.id)}
                      alt={squad.name}
                      className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                    />
                  ) : (
                    (() => { const Icon = getIconComponent(squad.icon || 'Bot'); return <Icon size={ICON_SIZES['2xl']} className="text-secondary" />; })()
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-primary text-sm font-semibold truncate group-hover:text-[#D1FF00] transition-colors">
                        {squad.name}
                      </h3>
                      <Badge variant="squad" squadType={squadType} size="sm">
                        {squadLabels[squadType] || squadType}
                      </Badge>
                    </div>
                    <p className="text-tertiary text-xs line-clamp-2">
                      {squad.description}
                    </p>
                    <p className="text-tertiary text-xs mt-1.5">
                      {squad.agentCount} agents
                    </p>
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
