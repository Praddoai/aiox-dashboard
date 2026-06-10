'use client';

import { memo } from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { GlassAvatar } from '@/components/ui/GlassAvatar';
import { Badge } from '@/components/ui/badge';
import { cn, getTierTheme } from '@/lib/utils';
import { useFavoritesStore } from '@/hooks/use-favorites';
import type { AgentSummary, AgentTier } from '@/types';
import { getSquadType as getSquadTypeUtil } from '@/types';

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

interface PlatformAgentCardProps {
  agent: AgentSummary;
  selected?: boolean;
  compact?: boolean;
  showTier?: boolean;
  highlight?: boolean;
  onClick?: () => void;
}

// Tier gradients are now accessed via getTierTheme().gradient from centralized theme

export const PlatformAgentCard = memo(function PlatformAgentCard({ agent, selected, compact = false, showTier = false, highlight = false, onClick }: PlatformAgentCardProps) {
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
          'hover:bg-glass-30 dark:hover:bg-glass-10',
          selected && 'ring-2 ring-blue-500/50 bg-blue-500/10',
          highlight && !selected && 'border-l-2 border-l-amber-500/70 bg-amber-500/5'
        )}
      >
        <div className="flex items-center gap-3">
          {agent.icon ? (
            <div className={cn(
              'h-10 w-10 rounded-xl flex items-center justify-center text-lg',
              `bg-gradient-to-br ${getTierTheme(normalizedTier).gradient} bg-opacity-20`
            )}>
              {agent.icon}
            </div>
          ) : (
            <GlassAvatar
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
      <Card
        className={cn(
          'transition-all duration-200 p-4',
          selected && 'ring-2 ring-blue-500/50 bg-blue-500/10'
        )}
      >
        <div className="flex items-start gap-4">
          {agent.icon ? (
            <div className={cn(
              'h-14 w-14 rounded-xl flex items-center justify-center text-2xl flex-shrink-0',
              `bg-gradient-to-br ${getTierTheme(normalizedTier).gradient}`
            )}>
              {agent.icon}
            </div>
          ) : (
            <GlassAvatar
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
                <Badge variant="secondary">
                  {agent.commandCount} comandos
                </Badge>
              </div>
            )}
          </div>
        </div>
      </Card>
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
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        'group relative rounded-2xl p-4 cursor-pointer transition-all duration-200 overflow-hidden',
        'border border-glass-10 hover:border-glass-20',
        selected && 'ring-2 ring-blue-500/50 border-blue-500/30'
      )}
      style={{
        background: `linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)`,
      }}
    >
      {/* Tier indicator gradient */}
      <div
        className={cn(
          'absolute top-0 left-0 right-0 h-1 bg-gradient-to-r',
          getTierTheme(normalizedTier).gradient
        )}
      />

      <div className="flex items-start gap-3">
        {/* Icon/Avatar */}
        {agent.icon ? (
          <div className={cn(
            'h-12 w-12 rounded-xl flex items-center justify-center text-xl flex-shrink-0',
            `bg-gradient-to-br ${getTierTheme(normalizedTier).gradient}`
          )}>
            {agent.icon}
          </div>
        ) : (
          <GlassAvatar
            name={agent.name}
            size="lg"
            squadType={squadType}
          />
        )}

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="text-foreground-primary font-semibold text-sm truncate">{agent.name}</h3>
              <p className="text-foreground-tertiary text-xs truncate">{agent.title}</p>
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
                    : 'text-glass-30 opacity-0 group-hover:opacity-100 hover:text-yellow-500'
                )}
                title={favorited ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
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
                <p className="text-foreground-secondary text-xs mt-2 line-clamp-2 leading-relaxed">
                  {agent.whenToUse}
                </p>
              );
            } else if (agent.description && !isPlaceholder(agent.description)) {
              return (
                <p className="text-foreground-tertiary text-xs mt-2 line-clamp-2 leading-relaxed italic">
                  {agent.description}
                </p>
              );
            }
            return null;
          })()}

          {/* Footer */}
          <div className="flex items-center justify-between mt-3 pt-2 border-t border-glass-5">
            <span className="text-[10px] text-glass-30">{agent.squad}</span>
            {agent.commandCount !== undefined && agent.commandCount > 0 && (
              <span className="text-[10px] text-foreground-tertiary">
                {agent.commandCount} cmds
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
});
