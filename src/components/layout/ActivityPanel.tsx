import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '../ui';
import { useUIStore } from '../../stores/uiStore';
import { useChatStore } from '../../stores/chatStore';
import { useAgentById } from '../../hooks/useAgents';
import { getSquadType } from '../../types';
import { ExecutionLogPanel } from './ExecutionLogPanel';
import { SpinnerIcon, RocketIcon, ChatBubbleIcon } from './activity-panel-icons';
import { AgentInfoCard } from './AgentInfoCard';
import { AgentCommandsPanel } from './AgentCommandsPanel';
import { ExternalToolsPanel } from './ExternalToolsPanel';
import { StreamingStatus, ReadyStatus, WaitingStatus } from './ActivityStatusCards';
import { MessageHistory } from './MessageHistory';
import { MetricsPanel } from './ActivityMetricsPanel';
import { Section, EmptyState } from './ActivitySection';
import { OrchestrationActivityPanel } from './OrchestrationActivityPanel';
import type { TabType, SectionKey } from './activity-panel-types';

export function ActivityPanel() {
  const { selectedAgentId, selectedSquadId, currentView } = useUIStore();
  const { getActiveSession, isStreaming } = useChatStore();
  const { data: selectedAgent } = useAgentById(selectedAgentId, selectedSquadId);

  const [activeTab, setActiveTab] = useState<TabType>('activity');
  const [expandedSections, setExpandedSections] = useState<Record<SectionKey, boolean>>({
    agent: true,
    activity: true,
    commands: true,
    tools: false, // Collapsed by default for discreteness
    tokens: true,
    health: true,
    stats: true,
  });

  const toggleSection = (section: SectionKey) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const activeSession = getActiveSession();
  const hasAgent = selectedAgentId !== null && selectedAgent;
  const hasMessages = activeSession && activeSession.messages.length > 0;
  const squadType = selectedAgent ? getSquadType(selectedAgent.squad) : 'default';

  // On orchestration view, render the specialized orchestration panel
  if (currentView === 'bob') {
    return <OrchestrationActivityPanel />;
  }

  return (
    <aside aria-label="Painel de atividade" className="h-screen glass-panel border-l border-glass-border flex flex-col w-[320px]">
      {/* Header */}
      <div className="h-16 px-4 flex items-center justify-between border-b border-glass-border">
        <h2 className="text-primary font-semibold">Atividade</h2>
        {isStreaming && (
          <Badge variant="status" status="warning" size="sm">
            <span className="flex items-center gap-1.5">
              <SpinnerIcon />
              Processando
            </span>
          </Badge>
        )}
        {hasAgent && !isStreaming && (
          <Badge variant="status" status="online" size="sm">
            Pronto
          </Badge>
        )}
      </div>

      {/* Tabs */}
      <div className="px-4 py-3 border-b border-glass-border">
        <div className="flex gap-1 p-1 glass-subtle rounded-xl" role="tablist" aria-label="Abas do painel de atividade">
          {[
            { id: 'activity', label: 'Status' },
            { id: 'history', label: 'Histórico' },
            { id: 'metrics', label: 'Métricas' },
          ].map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              tabIndex={activeTab === tab.id ? 0 : -1}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === tab.id
                  ? 'glass text-primary shadow-sm'
                  : 'text-secondary hover:text-primary'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto glass-scrollbar p-4 space-y-4" tabIndex={0} role="region" aria-label="Conteudo do painel de atividade">
        <AnimatePresence mode="wait">
          {activeTab === 'activity' && (
            <motion.div
              key="activity"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              {hasAgent ? (
                <>
                  {/* Agent Info */}
                  <Section
                    title="Agent Selecionado"
                    expanded={expandedSections.agent}
                    onToggle={() => toggleSection('agent')}
                  >
                    <AgentInfoCard agent={selectedAgent} squadType={squadType} />
                  </Section>

                  {/* Current Status */}
                  <Section
                    title="Status Atual"
                    expanded={expandedSections.activity}
                    onToggle={() => toggleSection('activity')}
                  >
                    {isStreaming ? (
                      <StreamingStatus agentName={selectedAgent.name} />
                    ) : hasMessages ? (
                      <ReadyStatus messageCount={activeSession.messages.length} />
                    ) : (
                      <WaitingStatus agentName={selectedAgent.name} />
                    )}
                  </Section>

                  {/* Execution Log - expandable panel */}
                  <ExecutionLogPanel className="mt-2" />

                  {/* Actions & Commands */}
                  <Section
                    title="Ações & Comandos"
                    expanded={expandedSections.commands}
                    onToggle={() => toggleSection('commands')}
                  >
                    <AgentCommandsPanel agent={selectedAgent} />
                  </Section>

                  {/* External Tools & MCPs */}
                  <Section
                    title="Ferramentas Externas"
                    expanded={expandedSections.tools}
                    onToggle={() => toggleSection('tools')}
                  >
                    <ExternalToolsPanel />
                  </Section>
                </>
              ) : (
                <EmptyState
                  icon={<RocketIcon />}
                  title="Selecione um Agent"
                  description="Escolha um agent na sidebar para ver informações de atividade aqui"
                />
              )}
            </motion.div>
          )}

          {activeTab === 'history' && (
            <motion.div
              key="history"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              {hasMessages ? (
                <MessageHistory messages={activeSession.messages} />
              ) : (
                <EmptyState
                  icon={<ChatBubbleIcon />}
                  title="Sem mensagens"
                  description={hasAgent
                    ? `Envie uma mensagem para ${selectedAgent?.name} para começar`
                    : "Selecione um agent e inicie uma conversa"
                  }
                />
              )}
            </motion.div>
          )}

          {activeTab === 'metrics' && (
            <motion.div
              key="metrics"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <MetricsPanel expandedSections={expandedSections} toggleSection={toggleSection} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </aside>
  );
}
