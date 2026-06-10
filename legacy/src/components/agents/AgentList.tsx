'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PlatformAgentCard } from './PlatformAgentCard';
import { Skeleton } from '@/components/ui/skeleton';
import { usePlatformAgents } from '@/hooks/use-agents';
import { useChat } from '@/hooks/use-chat';
import { useUIStore } from '@/stores/uiStore';
import { cn } from '@/lib/utils';

interface AgentListProps {
  onAgentSelect?: () => void;
}

export function AgentList({ onAgentSelect }: AgentListProps) {
  const { selectedSquadId, selectedAgentId } = useUIStore();
  const { data: agents, isLoading } = usePlatformAgents(selectedSquadId);
  const { selectAgent } = useChat();

  const handleSelectAgent = (agent: any) => {
    selectAgent(agent);
    onAgentSelect?.();
  };

  if (isLoading) {
    return <AgentListSkeleton />;
  }

  if (!agents || agents.length === 0) {
    return <EmptyAgentList />;
  }

  // Group agents by tier
  const orchestrators = agents.filter((a) => a.tier === 0);
  const masters = agents.filter((a) => a.tier === 1);
  const specialists = agents.filter((a) => a.tier === 2);

  const hasTierGroups = orchestrators.length > 0 || masters.length > 0 || specialists.length > 0;

  // If only one tier or few agents, show flat list
  if (!hasTierGroups || agents.length <= 5) {
    return (
      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {agents.map((agent, index) => (
            <motion.div
              key={agent.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ delay: index * 0.03 }}
            >
              <PlatformAgentCard
                agent={agent}
                selected={selectedAgentId === agent.id}
                compact
                showTier
                onClick={() => handleSelectAgent(agent)}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Orchestrators (Tier 0) */}
      {orchestrators.length > 0 && (
        <AgentGroup
          title="Orchestrators"
          count={orchestrators.length}
          agents={orchestrators}
          selectedId={selectedAgentId}
          onSelect={handleSelectAgent}
          defaultExpanded
        />
      )}

      {/* Masters (Tier 1) - collapsed by default */}
      {masters.length > 0 && (
        <AgentGroup
          title="Masters"
          count={masters.length}
          agents={masters}
          selectedId={selectedAgentId}
          onSelect={handleSelectAgent}
          defaultExpanded={false}
        />
      )}

      {/* Specialists (Tier 2) - collapsed by default */}
      {specialists.length > 0 && (
        <AgentGroup
          title="Specialists"
          count={specialists.length}
          agents={specialists}
          selectedId={selectedAgentId}
          onSelect={handleSelectAgent}
          defaultExpanded={false}
        />
      )}
    </div>
  );
}

interface AgentGroupProps {
  title: string;
  count: number;
  agents: any[];
  selectedId: string | null;
  onSelect: (agent: any) => void;
  defaultExpanded?: boolean;
}

// Check if agent is a chief/leader
function isChiefAgent(agent: any): boolean {
  const id = agent.id?.toLowerCase() || '';
  const name = agent.name?.toLowerCase() || '';
  return id.includes('chief') || name.includes('chief') ||
         id.includes('lider') || name.includes('lider');
}

// Chevron icon for collapse/expand
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

function AgentGroup({ title, count, agents, selectedId, onSelect, defaultExpanded = true }: AgentGroupProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className="space-y-2">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 group"
      >
        <h4 className="text-xs font-semibold text-secondary uppercase tracking-wider group-hover:text-primary transition-colors">
          {title}
        </h4>
        <span className="text-xs text-tertiary">({count})</span>
        <span className="ml-auto text-tertiary group-hover:text-primary transition-colors">
          <ChevronIcon isOpen={isExpanded} />
        </span>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="space-y-2">
              {agents.map((agent, index) => (
                <motion.div
                  key={agent.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ delay: index * 0.03 }}
                >
                  <PlatformAgentCard
                    agent={agent}
                    selected={selectedId === agent.id}
                    compact
                    onClick={() => onSelect(agent)}
                    highlight={isChiefAgent(agent)}
                  />
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function AgentListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="p-3 rounded-xl">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-40" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyAgentList() {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div className="h-12 w-12 rounded-full glass flex items-center justify-center mb-3">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="text-tertiary"
        >
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 00-3-3.87" />
          <path d="M16 3.13a4 4 0 010 7.75" />
        </svg>
      </div>
      <p className="text-secondary text-sm">Nenhum agent encontrado</p>
      <p className="text-tertiary text-xs mt-1">
        Selecione outro squad ou ajuste os filtros
      </p>
    </div>
  );
}
