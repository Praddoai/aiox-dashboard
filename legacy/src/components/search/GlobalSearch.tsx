'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { searchAgents } from '@/services/api/agents';
import { useSearchStore } from '@/stores/searchStore';
import { cn, getSquadTheme, getTierTheme } from '@/lib/utils';
import { getSquadType } from '@/types';
import type { AgentSummary } from '@/types';

// Icons
const SearchIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.35-4.35" />
  </svg>
);

const CommandIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M18 3a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3H6a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3 3 3 0 0 0 3 3h12a3 3 0 0 0 3-3 3 3 0 0 0-3-3z" />
  </svg>
);

const UserIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const ArrowRightIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
);

const getSquadBorderColor = (squadType: string): string => {
  const theme = getSquadTheme(squadType as ReturnType<typeof getSquadType>);
  return theme.borderLeft;
};

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GlobalSearch({ isOpen, onClose }: GlobalSearchProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const { data: searchResults, isLoading } = useQuery({
    queryKey: ['search-agents', query],
    queryFn: () => searchAgents({ query, limit: 20 }),
    enabled: query.length >= 2,
    staleTime: 30000,
  });

  const results: AgentSummary[] = searchResults || [];

  interface GroupedSquad {
    squadId: string;
    squadName: string;
    agents: AgentSummary[];
  }

  const groupedResults = results.reduce<Record<string, GroupedSquad>>((acc, agent) => {
    const squadId = agent.squad;
    if (!acc[squadId]) {
      acc[squadId] = {
        squadId,
        squadName: squadId,
        agents: [],
      };
    }
    acc[squadId].agents.push(agent);
    return acc;
  }, {});

  const groupedList: GroupedSquad[] = Object.values(groupedResults);
  const flatResults = results;

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, flatResults.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (flatResults[selectedIndex]) {
          onClose();
        }
        break;
      case 'Escape':
        onClose();
        break;
    }
  }, [flatResults, selectedIndex, onClose]);

  useEffect(() => {
    const selected = resultsRef.current?.querySelector(`[data-index="${selectedIndex}"]`);
    selected?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) {
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-overlay backdrop-blur-sm z-50"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed top-[15%] left-0 right-0 mx-auto z-50 w-full max-w-2xl px-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="glass-card overflow-hidden shadow-2xl">
              <div className="flex items-center gap-3 px-4 py-3 border-b border-glass-10">
                <SearchIcon />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setSelectedIndex(0);
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="Buscar agents por nome, skill ou squad..."
                  className="flex-1 bg-transparent text-primary placeholder:text-tertiary outline-none text-sm"
                />
                <div className="flex items-center gap-1 text-[10px] text-tertiary">
                  <kbd className="px-1.5 py-0.5 rounded bg-glass-10 font-mono">esc</kbd>
                  <span>para fechar</span>
                </div>
              </div>

              <div ref={resultsRef} className="max-h-[400px] overflow-y-auto scrollbar-thin">
                {query.length < 2 ? (
                  <div className="px-4 py-8 text-center text-sm text-tertiary">
                    <p>Digite pelo menos 2 caracteres para buscar</p>
                    <div className="mt-4 flex items-center justify-center gap-4 text-xs">
                      <span className="flex items-center gap-1">
                        <kbd className="px-1.5 py-0.5 rounded bg-glass-10 font-mono">
                          <CommandIcon />
                        </kbd>
                        <span>+</span>
                        <kbd className="px-1.5 py-0.5 rounded bg-glass-10 font-mono">K</kbd>
                        <span className="text-tertiary ml-1">Abrir busca</span>
                      </span>
                    </div>
                  </div>
                ) : isLoading ? (
                  <div className="px-4 py-8 text-center text-sm text-tertiary">
                    <div className="inline-block w-5 h-5 border-2 border-glass-20 border-t-glass-60 rounded-full animate-spin" />
                    <p className="mt-2">Buscando...</p>
                  </div>
                ) : results.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-tertiary">
                    <p>Nenhum agent encontrado para &quot;{query}&quot;</p>
                    <p className="text-xs mt-1">Tente outro termo de busca</p>
                  </div>
                ) : (
                  <div className="py-2">
                    {groupedList.map((group) => (
                      <div key={group.squadId} className="mb-2">
                        <div className="px-4 py-1.5 text-[10px] text-tertiary uppercase tracking-wider sticky top-0 bg-inherit backdrop-blur-sm">
                          {group.squadName}
                          <span className="ml-1 opacity-60">({group.agents.length})</span>
                        </div>
                        <div className="px-2">
                          {group.agents.map((agent) => {
                            const globalIndex = flatResults.findIndex(a => a.id === agent.id);
                            const isSelected = globalIndex === selectedIndex;
                            const squadType = getSquadType(agent.squad);

                            return (
                              <motion.button
                                key={agent.id}
                                data-index={globalIndex}
                                onClick={onClose}
                                className={cn(
                                  'w-full px-3 py-2 rounded-lg text-left transition-all duration-150',
                                  'flex items-center gap-3 border-l-2',
                                  getSquadBorderColor(squadType),
                                  isSelected ? 'bg-glass-15' : 'hover:bg-glass-5'
                                )}
                                whileTap={{ scale: 0.98 }}
                              >
                                <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center text-sm', 'bg-glass-10')}>
                                  {agent.icon || <UserIcon />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-primary truncate">
                                      {agent.name}
                                    </span>
                                    <span className={cn(
                                      'text-[10px] px-1.5 py-0.5 rounded-full bg-glass-10',
                                      getTierTheme(agent.tier).text
                                    )}>
                                      {getTierTheme(agent.tier).label}
                                    </span>
                                  </div>
                                  <p className="text-xs text-tertiary truncate">
                                    {agent.title || agent.description || 'Agent especializado'}
                                  </p>
                                </div>
                                <div className={cn(
                                  'text-tertiary transition-transform duration-150',
                                  isSelected && 'text-primary translate-x-1'
                                )}>
                                  <ArrowRightIcon />
                                </div>
                              </motion.button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                    <div className="px-4 py-2 text-[10px] text-tertiary border-t border-glass-5 mt-2">
                      {results.length} agent{results.length !== 1 ? 's' : ''} encontrado{results.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                )}
              </div>

              {results.length > 0 && (
                <div className="px-4 py-2 border-t border-glass-10 flex items-center gap-4 text-[10px] text-tertiary">
                  <span className="flex items-center gap-1">
                    <kbd className="px-1 py-0.5 rounded bg-glass-10 font-mono">↑</kbd>
                    <kbd className="px-1 py-0.5 rounded bg-glass-10 font-mono">↓</kbd>
                    <span>navegar</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 rounded bg-glass-10 font-mono">↵</kbd>
                    <span>selecionar</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 rounded bg-glass-10 font-mono">esc</kbd>
                    <span>fechar</span>
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Hook for global keyboard shortcut - uses shared Zustand store
export function useGlobalSearch() {
  const { isOpen, open, close, toggle } = useSearchStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        toggle();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggle]);

  return { isOpen, open, close, toggle };
}
