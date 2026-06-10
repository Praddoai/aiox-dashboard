'use client';

import { cn } from '@/lib/utils';
import { SectionLabel } from '@/components/ui/section-label';
import { SquadCard } from './SquadCard';
import { DOMAIN_ORDER, getDomainLabel } from '@/lib/domain-taxonomy';
import type { Squad } from '@/types';

interface SquadOrganogramProps {
  squads: Squad[];
  domainIndex: Record<string, string[]>;
  onSquadClick: (name: string) => void;
}

export function SquadOrganogram({
  squads,
  domainIndex,
  onSquadClick,
}: SquadOrganogramProps) {
  const squadMap = new Map(squads.map((s) => [s.name, s]));
  const usedSquads = new Set<string>();

  const domainGroups: { domain: string; squads: Squad[] }[] = [];

  // Group squads by canonical domain order
  for (const domain of DOMAIN_ORDER) {
    const squadNames = domainIndex[domain] || [];
    if (squadNames.length === 0) continue;

    const groupSquads: Squad[] = [];
    for (const name of squadNames) {
      const squad = squadMap.get(name);
      if (squad) {
        groupSquads.push(squad);
        usedSquads.add(name);
      }
    }

    if (groupSquads.length > 0) {
      groupSquads.sort((a, b) => a.name.localeCompare(b.name));
      domainGroups.push({ domain, squads: groupSquads });
    }
  }

  // Remaining squads not in canonical domains → "Other"
  const remaining = squads.filter((s) => !usedSquads.has(s.name));
  if (remaining.length > 0) {
    remaining.sort((a, b) => a.name.localeCompare(b.name));
    domainGroups.push({ domain: 'other', squads: remaining });
  }

  return (
    <div className="space-y-8">
      {domainGroups.map(({ domain, squads: groupSquads }) => (
        <div key={domain}>
          <SectionLabel withLine className="mb-4">
            {getDomainLabel(domain)}
          </SectionLabel>

          <div
            className={cn(
              'grid gap-3',
              'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'
            )}
          >
            {groupSquads.map((squad) => (
              <SquadCard
                key={squad.name}
                squad={squad}
                onClick={() => onSquadClick(squad.name)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
