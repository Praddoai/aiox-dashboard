'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { useSquads } from '@/hooks/use-squads';
import { useUIStore } from '@/stores/uiStore';
import { cn, getSquadTheme } from '@/lib/utils';
import type { PlatformSquad, SquadType } from '@/types';

// Use centralized theme system - just create simple accessor
const getSquadColors = (squadType: SquadType) => {
  const theme = getSquadTheme(squadType);
  return {
    text: theme.text,
    bg: theme.bg,
    gradient: theme.gradient,
    dot: theme.dot,
  };
};

// Category definitions
interface SquadCategory {
  id: string;
  name: string;
  icon: React.ReactNode;
  squadType: SquadType;
  matcher: (squad: PlatformSquad) => boolean;
}

// Categories updated 2026-02-06
const categories: SquadCategory[] = [
  {
    id: 'natalia-tanaka',
    name: 'Natalia Tanaka',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
    squadType: 'copywriting',
    matcher: (squad) => squad.id.includes('natalia-tanaka'),
  },
  {
    id: 'content',
    name: 'Conteudo & YouTube',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z" />
        <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" />
      </svg>
    ),
    squadType: 'creator',
    matcher: (squad) => ['content-ecosystem', 'youtube-lives'].includes(squad.id),
  },
  {
    id: 'marketing',
    name: 'Marketing & Vendas',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 19l7-7 3 3-7 7-3-3z" />
        <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
        <path d="M2 2l7.586 7.586" />
        <circle cx="11" cy="11" r="2" />
      </svg>
    ),
    squadType: 'copywriting',
    matcher: (squad) => ['copywriting', 'media-buy', 'funnel-creator', 'sales'].includes(squad.id),
  },
  {
    id: 'creative',
    name: 'Criacao & Design',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
        <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
        <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
        <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
        <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.555C21.965 6.012 17.461 2 12 2z" />
      </svg>
    ),
    squadType: 'design',
    matcher: (squad) => ['design-system', 'creative-studio'].includes(squad.id),
  },
  {
    id: 'development',
    name: 'Desenvolvimento',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
      </svg>
    ),
    squadType: 'creator',
    matcher: (squad) => ['full-stack-dev', 'aios-core-dev'].includes(squad.id),
  },
  {
    id: 'data',
    name: 'Dados & Pesquisa',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
        <line x1="12" y1="22.08" x2="12" y2="12" />
      </svg>
    ),
    squadType: 'orchestrator',
    matcher: (squad) => ['data-analytics', 'deep-scraper'].includes(squad.id),
  },
  {
    id: 'strategy',
    name: 'Estrategia & Conselho',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
      </svg>
    ),
    squadType: 'orchestrator',
    matcher: (squad) => ['conselho', 'infoproduct-creation'].includes(squad.id),
  },
  {
    id: 'system',
    name: 'Sistema & Orquestracao',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
    squadType: 'orchestrator',
    matcher: (squad) => ['orquestrador-global', 'squad-creator', 'project-management-clickup', 'operations-hub', 'docs'].includes(squad.id),
  },
];

// Chevron icon component
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

export function SquadSelector() {
  const { squads, isLoading } = useSquads();
  const { selectedSquadId, setSelectedSquadId } = useUIStore();
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  // Group squads by category and sort alphabetically
  const platformSquads = (squads ?? []) as unknown as PlatformSquad[];
  const groupedSquads = categories.map((category) => ({
    ...category,
    squads: platformSquads.filter(category.matcher).sort((a: PlatformSquad, b: PlatformSquad) =>
      a.name.localeCompare(b.name, 'pt-BR')
    ),
  }));

  // Find uncategorized squads
  const categorizedIds = new Set(groupedSquads.flatMap((g) => g.squads.map((s: PlatformSquad) => s.id)));
  const uncategorized = platformSquads.filter((s: PlatformSquad) => !categorizedIds.has(s.id));

  if (isLoading) {
    return <SquadSelectorSkeleton />;
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-secondary uppercase tracking-wider">
          Squads
        </h3>
        <Badge variant="outline">{squads?.length || 0}</Badge>
      </div>

      {/* All Squads button */}
      <motion.button
        onClick={() => setSelectedSquadId(null)}
        className={cn(
          'w-full px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200',
          'flex items-center gap-2',
          selectedSquadId === null
            ? 'glass-card-active text-foreground-primary'
            : 'hover:bg-glass-5 text-secondary hover:text-primary'
        )}
        whileTap={{ scale: 0.98 }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="7" height="7" />
          <rect x="14" y="3" width="7" height="7" />
          <rect x="14" y="14" width="7" height="7" />
          <rect x="3" y="14" width="7" height="7" />
        </svg>
        <span className="flex-1 text-left">Todos os Squads</span>
        <span className="text-xs opacity-60">{squads?.length || 0}</span>
      </motion.button>

      {/* Category accordions */}
      <div className="space-y-1 mt-2">
        {groupedSquads.map((group) => {
          if (group.squads.length === 0) return null;

          const isExpanded = expandedCategories.has(group.id);
          const hasSelectedSquad = group.squads.some((s: PlatformSquad) => s.id === selectedSquadId);

          return (
            <div key={group.id} className="rounded-lg overflow-hidden">
              {/* Category header */}
              <motion.button
                onClick={() => toggleCategory(group.id)}
                className={cn(
                  'w-full px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                  'flex items-center gap-2',
                  hasSelectedSquad
                    ? 'bg-glass-10 text-primary'
                    : 'hover:bg-glass-5 text-secondary hover:text-primary'
                )}
                whileTap={{ scale: 0.98 }}
              >
                <span className={getSquadColors(group.squadType).text}>{group.icon}</span>
                <span className="flex-1 text-left">{group.name}</span>
                <span className="text-xs opacity-60 mr-1">{group.squads.length}</span>
                <ChevronIcon isOpen={isExpanded} />
              </motion.button>

              {/* Category content */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="pl-4 pr-1 py-1 space-y-0.5">
                      {group.squads.map((squad: PlatformSquad, index: number) => (
                        <motion.button
                          key={squad.id}
                          onClick={() => setSelectedSquadId(squad.id)}
                          className={cn(
                            'w-full px-3 py-1.5 rounded-md text-xs transition-all duration-200',
                            'flex items-center gap-2',
                            selectedSquadId === squad.id
                              ? cn(getSquadColors(group.squadType).bg, 'text-foreground-primary shadow-sm')
                              : 'hover:bg-glass-5 text-secondary hover:text-primary'
                          )}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.03 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <span
                            className={cn(
                              'w-1.5 h-1.5 rounded-full',
                              selectedSquadId === squad.id ? 'bg-white' : getSquadColors(group.squadType).bg
                            )}
                          />
                          <span className="flex-1 text-left truncate">
                            {formatSquadName(squad.name, group.name)}
                          </span>
                          <span className={cn(
                            'text-[10px]',
                            selectedSquadId === squad.id ? 'text-foreground-secondary' : 'opacity-50'
                          )}>
                            {squad.agentCount}
                          </span>
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}

        {/* Uncategorized squads (sorted alphabetically) */}
        {uncategorized.length > 0 && (
          <div className="pt-2 border-t border-glass-5">
            <div className="text-[10px] text-secondary uppercase tracking-wider px-3 py-1 mb-1">
              Outros
            </div>
            {[...uncategorized].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')).map((squad) => (
              <motion.button
                key={squad.id}
                onClick={() => setSelectedSquadId(squad.id)}
                className={cn(
                  'w-full px-3 py-1.5 rounded-md text-xs transition-all duration-200',
                  'flex items-center gap-2',
                  selectedSquadId === squad.id
                    ? 'bg-gray-500 text-foreground-primary shadow-sm'
                    : 'hover:bg-glass-5 text-secondary hover:text-primary'
                )}
                whileTap={{ scale: 0.98 }}
              >
                <span
                  className={cn(
                    'w-1.5 h-1.5 rounded-full',
                    selectedSquadId === squad.id ? 'bg-white' : 'bg-gray-500'
                  )}
                />
                <span className="flex-1 text-left truncate">{squad.name}</span>
                <span className="text-[10px] opacity-50">{squad.agentCount}</span>
              </motion.button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Helper to shorten squad names within a category
function formatSquadName(name: string, categoryName: string): string {
  // Remove category name prefix for cleaner display
  const cleanName = name
    .replace(new RegExp(`^${categoryName}\\s*[-:]?\\s*`, 'i'), '')
    .replace(/Natalia Tanaka$/i, '')
    .trim();

  // If the name became empty or too short, return original
  if (cleanName.length < 3) return name;

  return cleanName || name;
}

function SquadSelectorSkeleton() {
  return (
    <div className="space-y-2">
      <div className="h-4 w-16 rounded shimmer" />
      <div className="space-y-1">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-9 rounded-lg shimmer" />
        ))}
      </div>
    </div>
  );
}
