import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFavorites } from '../../hooks/useFavorites';
import { useChat } from '../../hooks/useChat';
import { cn, getSquadTheme } from '../../lib/utils';
import { getSquadType } from '../../types';

// Icons
const StarIcon = ({ filled }: { filled?: boolean }) => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill={filled ? 'currentColor' : 'none'}
    stroke="currentColor"
    strokeWidth="2"
  >
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

const ClockIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const ChevronIcon = ({ isOpen }: { isOpen: boolean }) => (
  <motion.svg
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    animate={{ rotate: isOpen ? 180 : 0 }}
    transition={{ duration: 0.2 }}
  >
    <polyline points="6 9 12 15 18 9" />
  </motion.svg>
);

const TrashIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

// Get squad dot color from centralized theme
const getSquadDotColor = (squadId: string): string => {
  const squadType = getSquadType(squadId);
  return getSquadTheme(squadType).dot;
};

interface FavoritesRecentsProps {
  onAgentSelect?: () => void;
}

export function FavoritesRecents({ onAgentSelect }: FavoritesRecentsProps) {
  const [favoritesExpanded, setFavoritesExpanded] = useState(false);
  const [recentsExpanded, setRecentsExpanded] = useState(false);
  const { favorites, recents, removeFavorite, clearRecents } = useFavorites();
  const { selectAgent } = useChat();

  const handleSelectAgent = (agent: { id: string; name: string; squad: string }) => {
    selectAgent({
      id: agent.id,
      name: agent.name,
      squad: agent.squad,
      tier: 2, // Default tier, will be overridden when loaded
    });
    onAgentSelect?.();
  };

  const hasFavorites = favorites.length > 0;
  const hasRecents = recents.length > 0;

  if (!hasFavorites && !hasRecents) {
    return null;
  }

  return (
    <div className="space-y-3">
      {/* Favorites Section */}
      {hasFavorites && (
        <div>
          <button
            onClick={() => setFavoritesExpanded(!favoritesExpanded)}
            className="flex items-center gap-2 text-xs font-semibold text-secondary uppercase tracking-wider hover:text-primary transition-colors w-full px-1 mb-1"
          >
            <StarIcon filled />
            <span>Favoritos</span>
            <span className="text-tertiary font-normal">({favorites.length})</span>
            <span className="flex-1" />
            <ChevronIcon isOpen={favoritesExpanded} />
          </button>

          <AnimatePresence>
            {favoritesExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="space-y-0.5">
                  {favorites.map((agent, index) => {
                    return (
                      <motion.div
                        key={agent.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.03 }}
                        className="group flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-white/5 cursor-pointer transition-colors"
                        onClick={() => handleSelectAgent(agent)}
                      >
                        <div className={cn(
                          'w-1.5 h-1.5 rounded-full flex-shrink-0',
                          getSquadDotColor(agent.squad)
                        )} />
                        <span className="text-xs text-secondary group-hover:text-primary truncate flex-1">
                          {agent.name}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFavorite(agent.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 text-tertiary hover:text-yellow-500 transition-all"
                          title="Remover dos favoritos"
                          aria-label="Remover dos favoritos"
                        >
                          <StarIcon filled />
                        </button>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Recents Section */}
      {hasRecents && (
        <div>
          <button
            onClick={() => setRecentsExpanded(!recentsExpanded)}
            className="flex items-center gap-2 text-xs font-semibold text-secondary uppercase tracking-wider hover:text-primary transition-colors w-full px-1 mb-1"
          >
            <ClockIcon />
            <span>Recentes</span>
            <span className="text-tertiary font-normal">({recents.length})</span>
            <span className="flex-1" />
            <ChevronIcon isOpen={recentsExpanded} />
          </button>

          <AnimatePresence>
            {recentsExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="space-y-0.5">
                  {recents.map((agent, index) => {
                    return (
                      <motion.div
                        key={agent.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.03 }}
                        className="group flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-white/5 cursor-pointer transition-colors"
                        onClick={() => handleSelectAgent(agent)}
                      >
                        <div className={cn(
                          'w-1.5 h-1.5 rounded-full flex-shrink-0',
                          getSquadDotColor(agent.squad)
                        )} />
                        <span className="text-xs text-secondary group-hover:text-primary truncate flex-1">
                          {agent.name}
                        </span>
                        {agent.useCount > 1 && (
                          <span className="text-[10px] text-tertiary opacity-60">
                            {agent.useCount}x
                          </span>
                        )}
                      </motion.div>
                    );
                  })}

                  {/* Clear recents button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      clearRecents();
                    }}
                    className="w-full mt-1 px-2 py-1 text-[10px] text-tertiary hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors flex items-center justify-center gap-1"
                  >
                    <TrashIcon />
                    <span>Limpar recentes</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
