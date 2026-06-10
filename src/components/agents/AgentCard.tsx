import { memo } from 'react';
import { motion } from 'framer-motion';
import { GlassCard, Avatar, Badge } from '../ui';
import { cn, getTierTheme } from '../../lib/utils';
import { getIconComponent } from '../../lib/icons';
import { hasAgentAvatar } from '../../lib/agent-avatars';
import { useFavoritesStore } from '../../hooks/useFavorites';
import { useUIStore } from '../../stores/uiStore';
import type { AgentSummary, AgentTier } from '../../types';
import { getSquadType as getSquadTypeUtil } from '../../types';

// Star icon for favorites
const StarIcon = ({ filled }: { filled?: boolean }) => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill={filled ? 'currentColor' : 'none'}
    stroke="currentColor"
    strokeWidth="2"
  >
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

interface AgentCardProps {
  agent: AgentSummary;
  selected?: boolean;
  compact?: boolean;
  showTier?: boolean;
  highlight?: boolean;
  onClick?: () => void;
}

// Tier gradients are now accessed via getTierTheme().gradient from centralized theme

export const AgentCard = memo(function AgentCard({ agent, selected, compact = false, showTier = false, highlight = false, onClick }: AgentCardProps) {
  const squadType = getSquadTypeUtil(agent.squad);
  const { isFavorite, toggleFavorite } = useFavoritesStore();
  // Normalize tier to valid value (0, 1, or 2)
  const normalizedTier: AgentTier = (agent.tier === 0 || agent.tier === 1 || agent.tier === 2) ? agent.tier : 2;
  const favorited = isFavorite(agent.id);

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavorite({
      id: agent.id,
      name: agent.name,
      squad: agent.squad,
    });
  };

  if (compact) {
    return (
      <motion.div
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        onClick={onClick}
        className={cn(
          'group glass-subtle rounded-xl p-3 cursor-pointer transition-all duration-200',
          'hover:bg-white/30 dark:hover:bg-white/10',
          selected && 'ring-2 ring-blue-500/50 bg-blue-500/10',
          highlight && !selected && 'border-l-2 border-l-amber-500/70 bg-amber-500/5'
        )}
      >
        <div className="flex items-center gap-3">
          {hasAgentAvatar(agent.name) || hasAgentAvatar(agent.id) ? (
            <Avatar
              name={agent.name}
              agentId={agent.id}
              size="md"
              squadType={squadType}
            />
          ) : agent.icon ? (
            <div className={cn(
              'h-10 w-10 rounded-xl flex items-center justify-center',
              `bg-gradient-to-br ${getTierTheme(normalizedTier).gradient} bg-opacity-20`
            )}>
              {(() => { const Icon = getIconComponent(agent.icon); return <Icon size={18} />; })()}
            </div>
          ) : (
            <Avatar
              name={agent.name}
              size="md"
              squadType={squadType}
            />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="text-primary font-medium text-sm truncate">
                {agent.name}
              </h4>
              {showTier && (
                <span className={cn(
                  'text-[9px] px-1.5 py-0.5 rounded-full border font-medium',
                  getTierTheme(normalizedTier).badge
                )}>
                  T{normalizedTier}
                </span>
              )}
            </div>
            <p className="text-tertiary text-xs truncate">{agent.title || agent.description}</p>
          </div>
          {/* Favorite button */}
          <button
            onClick={handleFavoriteClick}
            className={cn(
              'p-1.5 rounded-lg transition-all',
              favorited
                ? 'text-yellow-500 opacity-100'
                : 'text-tertiary opacity-0 group-hover:opacity-100 hover:text-yellow-500'
            )}
            title={favorited ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
            aria-label={favorited ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
          >
            <StarIcon filled={favorited} />
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="cursor-pointer group"
    >
      <GlassCard
        interactive
        className={cn(
          'transition-all duration-200',
          selected && 'ring-2 ring-blue-500/50 bg-blue-500/10'
        )}
      >
        <div className="flex items-start gap-4">
          {hasAgentAvatar(agent.name) || hasAgentAvatar(agent.id) ? (
            <Avatar
              name={agent.name}
              agentId={agent.id}
              size="lg"
              squadType={squadType}
            />
          ) : agent.icon ? (
            <div className={cn(
              'h-14 w-14 rounded-xl flex items-center justify-center flex-shrink-0',
              `bg-gradient-to-br ${getTierTheme(normalizedTier).gradient}`
            )}>
              {(() => { const Icon = getIconComponent(agent.icon); return <Icon size={24} />; })()}
            </div>
          ) : (
            <Avatar
              name={agent.name}
              size="lg"
              squadType={squadType}
            />
          )}

          <div className="flex-1 min-w-0 space-y-2">
            <div className="relative">
              {/* Favorite button - positioned top right */}
              <button
                onClick={handleFavoriteClick}
                className={cn(
                  'absolute -top-1 -right-1 p-1.5 rounded-lg transition-all z-10',
                  favorited
                    ? 'text-yellow-500 opacity-100'
                    : 'text-tertiary opacity-0 group-hover:opacity-100 hover:text-yellow-500'
                )}
                title={favorited ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                aria-label={favorited ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
              >
                <StarIcon filled={favorited} />
              </button>
              <div className="flex items-center gap-2 flex-wrap pr-8">
                <h3 className="text-primary font-semibold">{agent.name}</h3>
                <span className={cn(
                  'text-[10px] px-2 py-0.5 rounded-full border font-medium',
                  getTierTheme(normalizedTier).badge
                )}>
                  {getTierTheme(normalizedTier).label}
                </span>
              </div>
              <p className="text-secondary text-sm">{agent.title}</p>
            </div>

            {/* When to use - Primary decision helper */}
            {(() => {
              const isPlaceholder = (text?: string) =>
                !text || text.startsWith('[') || text.includes('{{') || text.length < 10;

              if (agent.whenToUse) {
                return (
                  <p className="text-secondary text-sm line-clamp-2">
                    {agent.whenToUse}
                  </p>
                );
              } else if (agent.description && !isPlaceholder(agent.description)) {
                return (
                  <p className="text-tertiary text-sm line-clamp-2 italic">
                    {agent.description}
                  </p>
                );
              }
              return null;
            })()}

            {/* Commands count */}
            {agent.commandCount !== undefined && agent.commandCount > 0 && (
              <div className="flex items-center gap-2 pt-1">
                <Badge variant="count" size="sm">
                  {agent.commandCount} comandos
                </Badge>
              </div>
            )}
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
});

// New detailed card for explorer
interface AgentExplorerCardProps {
  agent: AgentSummary;
  selected?: boolean;
  onClick?: () => void;
}

export const AgentExplorerCard = memo(function AgentExplorerCard({ agent, selected, onClick }: AgentExplorerCardProps) {
  const squadType = getSquadTypeUtil(agent.squad);
  const { isFavorite, toggleFavorite } = useFavoritesStore();
  const favorited = isFavorite(agent.id);
  const isAiox = useUIStore((s) => s.theme) === 'aiox';
  // Normalize tier to valid value (0, 1, or 2)
  const normalizedTier: AgentTier = (agent.tier === 0 || agent.tier === 1 || agent.tier === 2) ? agent.tier : 2;

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavorite({
      id: agent.id,
      name: agent.name,
      squad: agent.squad,
    });
  };

  return (
    <motion.div
      whileHover={isAiox ? { scale: 1 } : { scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        'group relative p-4 cursor-pointer transition-all duration-200 overflow-hidden',
        isAiox
          ? 'border border-[rgba(156,156,156,0.15)] hover:border-[#D1FF00]/30'
          : 'rounded-2xl border border-white/10 hover:border-white/20',
        selected && (isAiox ? 'ring-2 ring-[#D1FF00]/50 border-[#D1FF00]/30' : 'ring-2 ring-blue-500/50 border-blue-500/30')
      )}
      style={{
        background: isAiox ? '#0a0a0a' : `linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)`,
      }}
    >
      {/* Tier indicator */}
      <div
        className={cn(
          'absolute top-0 left-0 right-0 h-1',
          isAiox ? 'bg-[#D1FF00]' : cn('bg-gradient-to-r', getTierTheme(normalizedTier).gradient)
        )}
      />

      <div className="flex items-start gap-3">
        {/* Icon/Avatar — prioritize generated avatar over icon */}
        {hasAgentAvatar(agent.name) || hasAgentAvatar(agent.id) ? (
          <Avatar
            name={agent.name}
            agentId={agent.id}
            size="2xl"
            squadType={squadType}
          />
        ) : agent.icon ? (
          <div className={cn(
            'h-12 w-12 flex items-center justify-center flex-shrink-0',
            isAiox
              ? 'bg-[#D1FF00]/15 border border-[rgba(156,156,156,0.15)]'
              : `rounded-xl bg-gradient-to-br ${getTierTheme(normalizedTier).gradient}`
          )}>
            {(() => { const Icon = getIconComponent(agent.icon); return <Icon size={22} />; })()}
          </div>
        ) : (
          <Avatar
            name={agent.name}
            size="lg"
            squadType={squadType}
          />
        )}

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="text-white font-semibold text-sm truncate">{agent.name}</h3>
              <p className="text-white/50 text-xs truncate">{agent.title}</p>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span className={cn(
                'text-[9px] px-1.5 py-0.5 rounded-full border font-medium',
                getTierTheme(normalizedTier).badge
              )}>
                {getTierTheme(normalizedTier).label}
              </span>
              {/* Favorite button */}
              <button
                onClick={handleFavoriteClick}
                className={cn(
                  'p-1 rounded-lg transition-all',
                  favorited
                    ? 'text-yellow-500 opacity-100'
                    : 'text-white/30 opacity-0 group-hover:opacity-100 hover:text-yellow-500'
                )}
                title={favorited ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                aria-label={favorited ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
              >
                <StarIcon filled={favorited} />
              </button>
            </div>
          </div>

          {/* When to use - Primary decision text */}
          {(() => {
            // Helper to check if description is a template placeholder
            const isPlaceholder = (text?: string) =>
              !text || text.startsWith('[') || text.includes('{{') || text.length < 10;

            if (agent.whenToUse) {
              return (
                <p className="text-white/60 text-xs mt-2 line-clamp-2 leading-relaxed">
                  {agent.whenToUse}
                </p>
              );
            } else if (agent.description && !isPlaceholder(agent.description)) {
              return (
                <p className="text-white/50 text-xs mt-2 line-clamp-2 leading-relaxed italic">
                  {agent.description}
                </p>
              );
            }
            return null;
          })()}

          {/* Footer */}
          <div className="flex items-center justify-between mt-3 pt-2 border-t border-white/5">
            <span className="text-[10px] text-white/30">{agent.squad}</span>
            {agent.commandCount !== undefined && agent.commandCount > 0 && (
              <span className="text-[10px] text-white/40">
                {agent.commandCount} cmds
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
});
