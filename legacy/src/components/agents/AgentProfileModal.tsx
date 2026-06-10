'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { GlassAvatar } from '@/components/ui/GlassAvatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getSquadType } from '@/types';
import type { SquadType } from '@/types';

// Focus trap hook for accessibility
function useFocusTrap(isActive: boolean) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const container = containerRef.current;
    const focusableElements = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    // Focus first element on open
    firstElement?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    return () => container.removeEventListener('keydown', handleKeyDown);
  }, [isActive]);

  return containerRef;
}

// Icons
const CloseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const CommandIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="4 17 10 11 4 5" />
    <line x1="12" y1="19" x2="20" y2="19" />
  </svg>
);

const FrameworkIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="12 2 2 7 12 12 22 7 12 2" />
    <polyline points="2 17 12 22 22 17" />
    <polyline points="2 12 12 17 22 12" />
  </svg>
);

const PrincipleIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const VoiceIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" y1="19" x2="12" y2="23" />
    <line x1="8" y1="23" x2="16" y2="23" />
  </svg>
);

const WarningIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const LinkIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
);

interface AgentProfileModalProps {
  agent: any;
  isOpen: boolean;
  onClose: () => void;
  onStartChat?: () => void;
}

// Tier configuration
const tierConfig = {
  0: { label: 'Orchestrator', color: 'from-cyan-500 to-blue-500', bg: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400' },
  1: { label: 'Master', color: 'from-purple-500 to-pink-500', bg: 'bg-purple-500/10 border-purple-500/30 text-purple-400' },
  2: { label: 'Specialist', color: 'from-orange-500 to-amber-500', bg: 'bg-orange-500/10 border-orange-500/30 text-orange-400' },
};

export function AgentProfileModal({ agent, isOpen, onClose, onStartChat }: AgentProfileModalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'commands' | 'voice' | 'integration'>('overview');
  const focusTrapRef = useFocusTrap(isOpen);
  const modalTitleId = 'agent-profile-modal-title';

  // Handle Escape key
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  }, [onClose]);

  if (!agent) return null;

  const squadType = getSquadType(agent.squad) as SquadType;
  const tier = tierConfig[agent.tier as keyof typeof tierConfig] || tierConfig[2];

  const tabs = [
    { id: 'overview', label: 'Visao Geral', icon: <PrincipleIcon /> },
    { id: 'commands', label: 'Comandos', icon: <CommandIcon />, count: agent.commands?.length },
    { id: 'voice', label: 'Voz & Estilo', icon: <VoiceIcon />, disabled: !agent.hasVoiceDna },
    { id: 'integration', label: 'Integracoes', icon: <LinkIcon />, disabled: !agent.hasIntegration },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-scrim-60 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            ref={focusTrapRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={modalTitleId}
            onKeyDown={handleKeyDown}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-4 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[700px] md:max-h-[85vh] z-50 flex flex-col rounded-2xl overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgba(30, 30, 40, 0.95) 0%, rgba(20, 20, 30, 0.98) 100%)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1) inset',
            }}
          >
            {/* Header */}
            <div className="relative p-6 border-b border-glass-10">
              {/* Tier gradient accent */}
              <div className={cn('absolute top-0 left-0 right-0 h-1 bg-gradient-to-r', tier.color)} />

              <div className="flex items-start gap-4">
                {/* Avatar */}
                {agent.icon ? (
                  <div className={cn(
                    'h-16 w-16 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0',
                    `bg-gradient-to-br ${tier.color}`
                  )}>
                    {agent.icon}
                  </div>
                ) : (
                  <GlassAvatar name={agent.name} size="xl" squadType={squadType} />
                )}

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 id={modalTitleId} className="text-xl font-bold text-foreground-primary">{agent.name}</h2>
                    <span className={cn('text-[10px] px-2 py-0.5 rounded-full border font-medium', tier.bg)}>
                      {tier.label}
                    </span>
                  </div>
                  <p className="text-foreground-secondary text-sm mt-0.5">{agent.title}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline">
                      {agent.squad}
                    </Badge>
                    {agent.commandCount > 0 && (
                      <span className="text-xs text-foreground-tertiary">{agent.commandCount} comandos</span>
                    )}
                  </div>
                </div>

                {/* Close button */}
                <button
                  onClick={onClose}
                  aria-label="Fechar modal"
                  className="p-2 rounded-lg text-foreground-tertiary hover:text-foreground-primary hover:bg-glass-10 transition-colors"
                >
                  <CloseIcon aria-hidden="true" />
                </button>
              </div>

              {/* When to use */}
              {agent.whenToUse && (
                <div className="mt-4 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                  <p className="text-sm text-blue-300 leading-relaxed">
                    <span className="font-semibold">Quando usar:</span> {agent.whenToUse}
                  </p>
                </div>
              )}
            </div>

            {/* Tabs */}
            <div role="tablist" aria-label="Informacoes do agente" className="flex border-b border-glass-10 px-4">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  role="tab"
                  id={`tab-${tab.id}`}
                  aria-selected={activeTab === tab.id}
                  aria-controls={`tabpanel-${tab.id}`}
                  onClick={() => !tab.disabled && setActiveTab(tab.id as any)}
                  disabled={tab.disabled}
                  tabIndex={activeTab === tab.id ? 0 : -1}
                  className={cn(
                    'flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors relative',
                    activeTab === tab.id
                      ? 'text-foreground-primary'
                      : tab.disabled
                        ? 'text-glass-20 cursor-not-allowed'
                        : 'text-foreground-tertiary hover:text-foreground-primary'
                  )}
                >
                  <span aria-hidden="true">{tab.icon}</span>
                  <span>{tab.label}</span>
                  {tab.count !== undefined && tab.count > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-glass-10" aria-label={`${tab.count} itens`}>
                      {tab.count}
                    </span>
                  )}
                  {activeTab === tab.id && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-purple-500"
                      aria-hidden="true"
                    />
                  )}
                </button>
              ))}
            </div>

            {/* Content */}
            <div
              className="flex-1 overflow-y-auto p-6"
              role="tabpanel"
              id={`tabpanel-${activeTab}`}
              aria-labelledby={`tab-${activeTab}`}
              tabIndex={0}
            >
              <AnimatePresence mode="wait">
                {activeTab === 'overview' && (
                  <TabOverview key="overview" agent={agent} />
                )}
                {activeTab === 'commands' && (
                  <TabCommands key="commands" agent={agent} />
                )}
                {activeTab === 'voice' && (
                  <TabVoice key="voice" agent={agent} />
                )}
                {activeTab === 'integration' && (
                  <TabIntegration key="integration" agent={agent} />
                )}
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-glass-10 flex justify-end gap-3">
              <Button variant="ghost" onClick={onClose}>
                Fechar
              </Button>
              <Button variant="default" onClick={onStartChat}>
                Iniciar Conversa
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Tab: Overview
function TabOverview({ agent }: { agent: any }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6"
    >
      {/* Persona */}
      {agent.persona && (
        <Section title="Persona" icon={<VoiceIcon />}>
          <div className="grid grid-cols-2 gap-3">
            {agent.persona.role && (
              <InfoCard label="Papel" value={agent.persona.role} />
            )}
            {agent.persona.style && (
              <InfoCard label="Estilo" value={agent.persona.style} />
            )}
            {agent.persona.focus && (
              <InfoCard label="Foco" value={agent.persona.focus} />
            )}
            {agent.persona.identity && (
              <InfoCard label="Identidade" value={agent.persona.identity} />
            )}
          </div>
          {agent.persona.background && (
            <p className="text-sm text-foreground-secondary mt-3 leading-relaxed whitespace-pre-line">
              {agent.persona.background}
            </p>
          )}
        </Section>
      )}

      {/* Core Principles */}
      {agent.corePrinciples && agent.corePrinciples.length > 0 && (
        <Section title="Principios Core" icon={<PrincipleIcon />}>
          <ul className="space-y-2">
            {agent.corePrinciples.map((principle: any, i: number) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-blue-400 mt-1">&#8226;</span>
                <span className="text-sm text-foreground-secondary">
                  {typeof principle === 'string' ? principle : principle.principle}
                </span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Frameworks */}
      {agent.frameworks && agent.frameworks.length > 0 && (
        <Section title="Frameworks & Metodologias" icon={<FrameworkIcon />}>
          <div className="flex flex-wrap gap-2">
            {agent.frameworks.map((framework: string, i: number) => (
              <span
                key={i}
                className="px-3 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-300 text-sm"
              >
                {framework}
              </span>
            ))}
          </div>
        </Section>
      )}

      {/* Anti-patterns */}
      {agent.hasAntiPatterns && agent.config?.anti_patterns && (
        <Section title="Anti-Patterns (O que NAO fazer)" icon={<WarningIcon />} variant="warning">
          <ul className="space-y-2">
            {agent.config.anti_patterns.never_do?.slice(0, 5).map((item: string, i: number) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-red-400 mt-1">{'\u2715'}</span>
                <span className="text-sm text-foreground-secondary">{item}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </motion.div>
  );
}

// Tab: Commands
function TabCommands({ agent }: { agent: any }) {
  const commands = agent.commands || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-3"
    >
      {commands.length === 0 ? (
        <div className="text-center py-8 text-foreground-tertiary">
          <CommandIcon />
          <p className="mt-2">Nenhum comando especifico definido</p>
        </div>
      ) : (
        commands.map((cmd: any, i: number) => (
          <div
            key={i}
            className="p-4 rounded-xl bg-glass-5 border border-glass-10 hover:bg-glass-8 transition-colors"
          >
            <div className="flex items-center gap-2 mb-1">
              <code className="text-sm font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded">
                {cmd.command}
              </code>
            </div>
            <p className="text-sm text-foreground-secondary">{cmd.description}</p>
          </div>
        ))
      )}
    </motion.div>
  );
}

// Tab: Voice & Style
function TabVoice({ agent }: { agent: any }) {
  const voiceDna = agent.config?.voice_dna;

  if (!voiceDna) {
    return (
      <div className="text-center py-8 text-foreground-tertiary">
        <VoiceIcon />
        <p className="mt-2">Voice DNA nao definido para este agente</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6"
    >
      {/* Sentence starters */}
      {voiceDna.sentence_starters && (
        <Section title="Frases de Abertura" icon={<VoiceIcon />}>
          <div className="space-y-2">
            {voiceDna.sentence_starters.slice(0, 6).map((starter: string, i: number) => (
              <div key={i} className="p-2 rounded-lg bg-glass-5 border-l-2 border-blue-500/50">
                <p className="text-sm text-foreground-secondary italic">&quot;{starter}...&quot;</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Vocabulary */}
      {voiceDna.vocabulary && (
        <div className="grid grid-cols-2 gap-4">
          {voiceDna.vocabulary.always_use && (
            <Section title="Sempre Usar" icon={<PrincipleIcon />} compact>
              <div className="flex flex-wrap gap-1.5">
                {voiceDna.vocabulary.always_use.slice(0, 10).map((word: string, i: number) => (
                  <span key={i} className="px-2 py-1 rounded bg-green-500/10 text-green-400 text-xs">
                    {word}
                  </span>
                ))}
              </div>
            </Section>
          )}
          {voiceDna.vocabulary.never_use && (
            <Section title="Nunca Usar" icon={<WarningIcon />} compact variant="warning">
              <div className="flex flex-wrap gap-1.5">
                {voiceDna.vocabulary.never_use.slice(0, 10).map((word: string, i: number) => (
                  <span key={i} className="px-2 py-1 rounded bg-red-500/10 text-red-400 text-xs line-through">
                    {word}
                  </span>
                ))}
              </div>
            </Section>
          )}
        </div>
      )}
    </motion.div>
  );
}

// Tab: Integration
function TabIntegration({ agent }: { agent: any }) {
  const integration = agent.config?.integration;

  if (!integration) {
    return (
      <div className="text-center py-8 text-foreground-tertiary">
        <LinkIcon />
        <p className="mt-2">Integracoes nao definidas para este agente</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6"
    >
      {/* Receives from */}
      {integration.receives_from && integration.receives_from.length > 0 && (
        <Section title="Recebe de" icon={<LinkIcon />}>
          <div className="flex flex-wrap gap-2">
            {integration.receives_from.map((agentName: string, i: number) => (
              <span key={i} className="px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-300 text-sm">
                &larr; {agentName}
              </span>
            ))}
          </div>
        </Section>
      )}

      {/* Hands off to */}
      {integration.handoff_to && integration.handoff_to.length > 0 && (
        <Section title="Entrega para" icon={<LinkIcon />}>
          <div className="flex flex-wrap gap-2">
            {integration.handoff_to.map((agentName: string, i: number) => (
              <span key={i} className="px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20 text-green-300 text-sm">
                {agentName} &rarr;
              </span>
            ))}
          </div>
        </Section>
      )}
    </motion.div>
  );
}

// Helper components
function Section({ title, icon, children, variant, compact }: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  variant?: 'warning';
  compact?: boolean;
}) {
  return (
    <div className={cn(
      'rounded-xl border p-4',
      variant === 'warning'
        ? 'bg-red-500/5 border-red-500/20'
        : 'bg-glass-5 border-glass-10',
      compact && 'p-3'
    )}>
      <div className={cn(
        'flex items-center gap-2 mb-3',
        variant === 'warning' ? 'text-red-400' : 'text-foreground-secondary'
      )}>
        {icon}
        <span className="text-xs font-semibold uppercase tracking-wider">{title}</span>
      </div>
      {children}
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 rounded-lg bg-glass-5">
      <p className="text-[10px] text-foreground-tertiary uppercase tracking-wider mb-1">{label}</p>
      <p className="text-sm text-foreground-primary">{value}</p>
    </div>
  );
}

export default AgentProfileModal;
