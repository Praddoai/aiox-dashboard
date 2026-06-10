'use client';

import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { AgentSummary, AgentTier } from '@/types';

interface SquadOrgChartProps {
  agents: AgentSummary[];
}

const tierConfig: Record<AgentTier, { label: string; color: string; bg: string; borderColor: string }> = {
  0: { label: 'Orchestrator', color: 'text-purple-400', bg: 'bg-purple-500/15', borderColor: 'border-purple-500/30' },
  1: { label: 'Master', color: 'text-blue-400', bg: 'bg-blue-500/15', borderColor: 'border-blue-500/30' },
  2: { label: 'Specialist', color: 'text-green-400', bg: 'bg-green-500/15', borderColor: 'border-green-500/30' },
};

function AgentNode({ agent, index }: { agent: AgentSummary; index: number }) {
  const tier = tierConfig[agent.tier];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
    >
      <Card className="w-36 text-center p-2">
        <div className={cn('w-8 h-8 rounded-lg mx-auto flex items-center justify-center text-sm', tier.bg)}>
          {agent.icon || agent.name.charAt(0)}
        </div>
        <p className="text-xs font-medium text-primary mt-1.5 truncate">{agent.name}</p>
        <Badge variant="default" className={cn('mt-1 text-xs', tier.bg)}>
          <span className={tier.color}>{tier.label}</span>
        </Badge>
      </Card>
    </motion.div>
  );
}

export function SquadOrgChart({ agents }: SquadOrgChartProps) {
  const tiers: AgentTier[] = [0, 1, 2];
  const grouped = tiers.map((t) => ({
    tier: t,
    config: tierConfig[t],
    agents: agents.filter((a) => a.tier === t),
  })).filter((g) => g.agents.length > 0);

  if (agents.length === 0) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-secondary text-sm">Nenhum agente neste squad</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {grouped.map((group, gi) => (
        <div key={group.tier} className="relative">
          {/* Tier label */}
          <div className="flex items-center gap-3 mb-4">
            <span className={cn('text-xs font-semibold uppercase tracking-wider', group.config.color)}>
              Tier {group.tier} - {group.config.label}
            </span>
            <div className={cn('flex-1 h-px', group.config.bg)} />
          </div>

          {/* Agent nodes */}
          <div className="flex flex-wrap justify-center gap-4">
            {group.agents.map((agent, ai) => (
              <AgentNode key={agent.id} agent={agent} index={gi * 3 + ai} />
            ))}
          </div>

          {/* Connecting line to next tier */}
          {gi < grouped.length - 1 && (
            <div className="flex justify-center my-4">
              <div className="w-px h-8 bg-glass-10" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
