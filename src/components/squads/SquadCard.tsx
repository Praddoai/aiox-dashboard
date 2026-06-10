import { motion } from 'framer-motion';
import { GlassCard, Badge } from '../ui';
import { cn, squadLabels } from '../../lib/utils';
import { getSquadTheme } from '../../lib/theme';
import { getSquadImageUrl } from '../../lib/agent-avatars';
import type { Squad, SquadType } from '../../types';

interface SquadCardProps {
  squad: Squad;
  selected?: boolean;
  onClick?: () => void;
}

export function SquadCard({ squad, selected, onClick }: SquadCardProps) {
  const theme = getSquadTheme((squad.type || 'default') as SquadType);

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <GlassCard
        interactive
        onClick={onClick}
        className={cn(
          'relative overflow-hidden transition-all duration-300',
          theme.gradientBg,
          theme.borderSubtle,
          selected && 'ring-2 ring-white/30'
        )}
      >
        {/* Status indicator */}
        <div
          className={cn(
            'absolute top-3 right-3 h-2 w-2 rounded-full',
            theme.dot,
            'animate-pulse-soft'
          )}
        />

        {/* Content */}
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            {getSquadImageUrl(squad.id) && (
              <img
                src={getSquadImageUrl(squad.id)}
                alt={squad.name}
                className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
              />
            )}
            <div>
            <h3 className="text-primary font-semibold text-lg">
              {squad.name || squadLabels[squad.type || 'default']}
            </h3>
            <p className="text-secondary text-sm line-clamp-2 mt-1">
              {squad.description}
            </p>
            </div>
          </div>

          {/* Capabilities */}
          {squad.capabilities && squad.capabilities.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {squad.capabilities.slice(0, 4).map((cap) => (
                <Badge key={cap} variant="squad" squadType={squad.type || 'default'} size="sm">
                  {cap}
                </Badge>
              ))}
            </div>
          )}

          {/* Stats */}
          <div className="flex items-center justify-between pt-2 border-t border-white/10">
            <span className="text-secondary text-xs">
              {squad.agentCount} agents
            </span>
            <Badge variant="status" status="online" size="sm">
              Ativo
            </Badge>
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
}
