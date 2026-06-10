'use client';

import { cn } from '@/lib/utils';
import { SectionLabel } from '@/components/ui/section-label';
import { SquadAgentChip } from './SquadAgentChip';
import type { SquadTier } from '@/types';

interface SquadTierTreeProps {
  tiers: SquadTier[];
  onAgentClick?: (agentId: string) => void;
}

const LEVEL_LABELS: Record<number, string> = {
  0: 'Orchestration',
  1: 'Core',
  2: 'Specialists',
};

export function SquadTierTree({ tiers, onAgentClick }: SquadTierTreeProps) {
  if (tiers.length === 0) {
    return (
      <div className="text-label text-text-muted py-4">
        No tier structure defined
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {tiers.map((tier, tierIndex) => (
        <div key={tier.key} className="relative">
          {/* Connector line from previous tier */}
          {tierIndex > 0 && (
            <div
              className="absolute -top-6 left-6 w-px h-6 bg-border"
            />
          )}

          {/* Tier header */}
          <SectionLabel
            variant={tier.level === 0 ? 'gold' : 'default'}
            withLine
            className="mb-3"
          >
            {tier.name || LEVEL_LABELS[tier.level] || `Tier ${tier.level}`}
          </SectionLabel>

          {/* Tier purpose */}
          {tier.purpose && (
            <p className="text-detail text-text-muted mb-3 ml-1">
              {tier.purpose}
            </p>
          )}

          {/* Agents with connector lines */}
          <div className="ml-4 space-y-1">
            {tier.agents.map((agent, agentIndex) => (
              <div key={agent.id} className="flex items-center gap-2">
                {/* Tree branch */}
                <div className="flex items-center shrink-0">
                  <div
                    className={cn(
                      'w-4 border-b border-l border-border',
                      'h-3',
                      agentIndex === tier.agents.length - 1 && 'rounded-bl'
                    )}
                  />
                </div>
                <SquadAgentChip agent={agent} onClick={onAgentClick} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
