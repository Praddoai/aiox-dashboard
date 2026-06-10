'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { GlassAvatar } from '@/components/ui/GlassAvatar';
import { useUIStore } from '@/stores/uiStore';
import { useChatStore } from '@/stores/chatStore';
import { useAgentById } from '@/hooks/use-agents';
import { useTokenUsage, useLLMHealth, useExecutionStats } from '@/hooks';
import { useMCPStatus } from '@/hooks/use-dashboard';
import { useChat } from '@/hooks/use-chat';
import { apiClient } from '@/services/api/client';
import { formatRelativeTime, cn } from '@/lib/utils';
import { getTierTheme } from '@/lib/theme';
import { getSquadType } from '@/types';
import { ExecutionLogPanel } from './ExecutionLogPanel';
import type { Message, SquadType } from '@/types';

// Icons
const CheckIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const SpinnerIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin">
    <path d="M21 12a9 9 0 11-6.219-8.56" />
  </svg>
);

const ChevronDownIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const ServerIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
    <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
    <line x1="6" y1="6" x2="6.01" y2="6" />
    <line x1="6" y1="18" x2="6.01" y2="18" />
  </svg>
);

const MessageIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const UserIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const BotIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="11" width="18" height="10" rx="2" />
    <circle cx="12" cy="5" r="2" />
    <path d="M12 7v4" />
    <line x1="8" y1="16" x2="8" y2="16" />
    <line x1="16" y1="16" x2="16" y2="16" />
  </svg>
);

const ClockIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const ChatBubbleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
  </svg>
);

const RocketIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
    <path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
    <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
    <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
  </svg>
);

// Command section icons
const ActionIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);

const CommandIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="4 17 10 11 4 5" />
    <line x1="12" y1="19" x2="20" y2="19" />
  </svg>
);

const PromptIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const TaskIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M9 12l2 2 4-4" />
  </svg>
);

const WorkflowIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="5" r="3" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <circle cx="6" cy="19" r="3" />
    <circle cx="18" cy="19" r="3" />
    <line x1="12" y1="12" x2="6" y2="16" />
    <line x1="12" y1="12" x2="18" y2="16" />
  </svg>
);

const PlugIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
    <path d="M18.4 6.6a9 9 0 1 1-12.8 0" />
  </svg>
);

const ToolIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
  </svg>
);

type TabType = 'activity' | 'history' | 'metrics';

export function ActivityPanel() {
  const { selectedAgentId, selectedSquadId } = useUIStore();
  const { getActiveSession, isStreaming } = useChatStore();
  const { data: selectedAgent } = useAgentById(selectedAgentId, selectedSquadId);

  const [activeTab, setActiveTab] = useState<TabType>('activity');
  const [expandedSections, setExpandedSections] = useState({
    agent: true,
    activity: true,
    commands: true,
    tools: false, // Collapsed by default for discreteness
    tokens: true,
    health: true,
    stats: true,
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const activeSession = getActiveSession();
  const hasAgent = selectedAgentId !== null && selectedAgent;
  const hasMessages = activeSession && activeSession.messages.length > 0;
  const squadType = selectedAgent ? getSquadType(selectedAgent.squad) : 'default';

  return (
    <aside className="h-screen glass-panel border-l border-glass-border flex flex-col w-[320px]">
      {/* Header */}
      <div className="h-16 px-4 flex items-center justify-between border-b border-glass-border">
        <h2 className="text-primary font-semibold">Atividade</h2>
        {isStreaming && (
          <Badge variant="outline" className="text-yellow-500 border-yellow-500/30">
            <span className="flex items-center gap-1.5">
              <SpinnerIcon />
              Processando
            </span>
          </Badge>
        )}
        {hasAgent && !isStreaming && (
          <Badge variant="outline" className="text-green-500 border-green-500/30">
            Pronto
          </Badge>
        )}
      </div>

      {/* Tabs */}
      <div className="px-4 py-3 border-b border-glass-border">
        <div className="flex gap-1 p-1 glass-subtle rounded-xl">
          {[
            { id: 'activity', label: 'Status' },
            { id: 'history', label: 'Histórico' },
            { id: 'metrics', label: 'Métricas' },
          ].map((tab) => (
            <button
              key={tab.id}
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
      <div className="flex-1 overflow-y-auto glass-scrollbar p-4 space-y-4">
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

// Agent Info Card
interface AgentInfoCardProps {
  agent: any;
  squadType: SquadType;
}

function AgentInfoCard({ agent, squadType }: AgentInfoCardProps) {
  const normalizedTier = (agent.tier === 0 || agent.tier === 1 || agent.tier === 2) ? agent.tier : 2;

  return (
    <Card variant="glass" className="p-4">
      <div className="flex items-center gap-3">
        {agent.icon ? (
          <div className={cn(
            'h-12 w-12 rounded-xl flex items-center justify-center text-xl',
            `bg-gradient-to-br ${getTierTheme(normalizedTier).gradient}`
          )}>
            {agent.icon}
          </div>
        ) : (
          <GlassAvatar name={agent.name} size="lg" squadType={squadType} />
        )}
        <div className="flex-1 min-w-0">
          <h4 className="text-primary font-medium truncate">{agent.name}</h4>
          <p className="text-tertiary text-xs truncate">{agent.title || agent.description}</p>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className="text-xs">
              {agent.squad}
            </Badge>
            <span className="text-[10px] text-tertiary">
              {getTierTheme(normalizedTier).label}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}

// Agent Commands Panel - Shows actions, commands, prompts, tasks, workflows
interface SquadCommand {
  id: string;
  name: string;
  description: string;
  type: 'task' | 'workflow';
  file: string;
}

function AgentCommandsPanel({ agent }: { agent: any }) {
  const { sendMessage } = useChat();
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  // Fetch squad tasks and workflows
  const { data: squadCommands } = useQuery<{ tasks: SquadCommand[]; workflows: SquadCommand[] }>({
    queryKey: ['squad-commands', agent.squad],
    queryFn: async () => {
      try {
        return await apiClient.get<{ tasks: SquadCommand[]; workflows: SquadCommand[] }>(`/squads/${agent.squad}/commands`);
      } catch {
        return { tasks: [], workflows: [] };
      }
    },
    enabled: !!agent.squad,
  });

  // Agent-level data
  const agentActions = agent.actions || [];
  const agentCommands = agent.commands || [];
  const agentPrompts = agent.sampleTasks || [];

  // Squad-level data
  const tasks = squadCommands?.tasks || [];
  const workflows = squadCommands?.workflows || [];

  const handleUse = (command: string) => {
    sendMessage(command);
  };

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }));
  };

  // Command categories configuration
  const categories = [
    {
      id: 'actions',
      label: 'Ações',
      icon: <ActionIcon />,
      items: agentActions,
      color: 'yellow',
      getCommand: (item: any) => item.description || item.name,
      getLabel: (item: any) => item.name,
      getDescription: (item: any) => item.trigger,
    },
    {
      id: 'commands',
      label: 'Comandos',
      icon: <CommandIcon />,
      items: agentCommands,
      color: 'purple',
      getCommand: (item: any) => item.command,
      getLabel: (item: any) => item.command,
      getDescription: (item: any) => item.description,
    },
    {
      id: 'prompts',
      label: 'Prompts',
      icon: <PromptIcon />,
      items: agentPrompts,
      color: 'green',
      getCommand: (item: string) => item,
      getLabel: (item: string) => item.slice(0, 40) + (item.length > 40 ? '...' : ''),
      getDescription: () => null,
    },
    {
      id: 'tasks',
      label: 'Tasks',
      icon: <TaskIcon />,
      items: tasks,
      color: 'orange',
      getCommand: (item: SquadCommand) => `*${item.id}`,
      getLabel: (item: SquadCommand) => item.name || item.id,
      getDescription: (item: SquadCommand) => item.description,
    },
    {
      id: 'workflows',
      label: 'Workflows',
      icon: <WorkflowIcon />,
      items: workflows,
      color: 'cyan',
      getCommand: (item: SquadCommand) => `@workflow:${item.id}`,
      getLabel: (item: SquadCommand) => item.name || item.id,
      getDescription: (item: SquadCommand) => item.description,
    },
  ];

  const colorClasses: Record<string, string> = {
    yellow: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400 hover:bg-yellow-500/20',
    purple: 'bg-purple-500/10 border-purple-500/20 text-purple-400 hover:bg-purple-500/20',
    green: 'bg-green-500/10 border-green-500/20 text-green-400 hover:bg-green-500/20',
    orange: 'bg-orange-500/10 border-orange-500/20 text-orange-400 hover:bg-orange-500/20',
    cyan: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/20',
  };

  const totalItems = agentActions.length + agentCommands.length + agentPrompts.length + tasks.length + workflows.length;

  if (totalItems === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-tertiary text-xs">Nenhum comando disponível</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {categories.map((category) => {
        if (category.items.length === 0) return null;

        const isExpanded = expandedCategories[category.id];
        const hasMore = category.items.length > 3;
        const displayItems = isExpanded ? category.items : category.items.slice(0, 3);

        return (
          <div key={category.id}>
            {/* Category Header */}
            <div className="flex items-center gap-2 mb-2">
              <span className={cn('p-1 rounded', colorClasses[category.color])}>
                {category.icon}
              </span>
              <span className="text-xs font-medium text-secondary">{category.label}</span>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">{category.items.length}</Badge>
            </div>

            {/* Category Items */}
            <div className="space-y-1.5">
              <AnimatePresence initial={false}>
                {displayItems.map((item: any, index: number) => (
                  <motion.button
                    key={index}
                    initial={index >= 3 ? { opacity: 0, height: 0 } : false}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    onClick={() => handleUse(category.getCommand(item))}
                    className={cn(
                      'w-full text-left p-2 rounded-lg border transition-colors',
                      colorClasses[category.color]
                    )}
                  >
                    <p className="text-xs font-medium text-primary truncate">
                      {category.getLabel(item)}
                    </p>
                    {category.getDescription(item) && (
                      <p className="text-[10px] text-tertiary truncate mt-0.5">
                        {category.getDescription(item)}
                      </p>
                    )}
                  </motion.button>
                ))}
              </AnimatePresence>

              {/* Expand/Collapse Button */}
              {hasMore && (
                <button
                  onClick={() => toggleCategory(category.id)}
                  className="w-full text-[10px] text-tertiary hover:text-secondary text-center py-1.5 rounded-lg hover:bg-glass-5 transition-colors flex items-center justify-center gap-1"
                >
                  {isExpanded ? (
                    <>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="18 15 12 9 6 15" />
                      </svg>
                      Mostrar menos
                    </>
                  ) : (
                    <>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                      +{category.items.length - 3} mais
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// External Tools Panel - Shows MCPs and external tools
function ExternalToolsPanel() {
  const { data: mcpServers, isLoading } = useMCPStatus();
  const [expandedServers, setExpandedServers] = useState<Record<string, boolean>>({});

  const toggleServer = (serverName: string) => {
    setExpandedServers(prev => ({
      ...prev,
      [serverName]: !prev[serverName],
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <SpinnerIcon />
      </div>
    );
  }

  if (!mcpServers || mcpServers.length === 0) {
    return (
      <div className="text-center py-3">
        <p className="text-tertiary text-xs">Nenhuma ferramenta externa conectada</p>
      </div>
    );
  }

  const connectedServers = mcpServers.filter(s => s.status === 'connected');
  const disconnectedServers = mcpServers.filter(s => s.status !== 'connected');
  const totalTools = connectedServers.reduce((sum, s) => sum + s.tools.length, 0);

  return (
    <div className="space-y-2">
      {/* Summary */}
      <div className="flex items-center gap-2 text-[10px] text-tertiary px-1 mb-2">
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
          {connectedServers.length} MCP{connectedServers.length !== 1 ? 's' : ''}
        </span>
        <span>•</span>
        <span>{totalTools} tools</span>
        {disconnectedServers.length > 0 && (
          <>
            <span>•</span>
            <span className="text-red-400">{disconnectedServers.length} offline</span>
          </>
        )}
      </div>

      {/* Server List */}
      <div className="space-y-1.5">
        {mcpServers.map((server) => {
          const isConnected = server.status === 'connected';
          const isExpanded = expandedServers[server.name];
          const hasTools = server.tools.length > 0;

          return (
            <div
              key={server.name}
              className={cn(
                'rounded-lg border transition-colors',
                isConnected
                  ? 'border-glass-10 bg-glass-5'
                  : 'border-red-500/20 bg-red-500/5'
              )}
            >
              {/* Server Header */}
              <button
                onClick={() => hasTools && toggleServer(server.name)}
                className={cn(
                  'w-full flex items-center gap-2 p-2 text-left',
                  hasTools && 'hover:bg-glass-5'
                )}
                disabled={!hasTools}
              >
                <span className={cn(
                  'h-1.5 w-1.5 rounded-full flex-shrink-0',
                  isConnected ? 'bg-green-500' : 'bg-red-500'
                )} />
                <PlugIcon />
                <span className="text-xs text-primary truncate flex-1">
                  {server.name}
                </span>
                {hasTools && (
                  <>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">{server.tools.length}</Badge>
                    <motion.svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="text-tertiary"
                      animate={{ rotate: isExpanded ? 180 : 0 }}
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </motion.svg>
                  </>
                )}
                {!isConnected && (
                  <span className="text-[9px] text-red-400">offline</span>
                )}
              </button>

              {/* Tools List */}
              <AnimatePresence>
                {isExpanded && hasTools && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-2 pb-2 space-y-1">
                      {server.tools.slice(0, 8).map((tool) => (
                        <div
                          key={tool.name}
                          className="flex items-center gap-2 py-1 px-2 rounded bg-glass-5"
                        >
                          <ToolIcon />
                          <span className="text-[10px] text-secondary truncate flex-1">
                            {tool.name}
                          </span>
                          {tool.calls > 0 && (
                            <span className="text-[9px] text-tertiary">
                              {tool.calls}x
                            </span>
                          )}
                        </div>
                      ))}
                      {server.tools.length > 8 && (
                        <p className="text-[9px] text-tertiary text-center py-1">
                          +{server.tools.length - 8} mais tools
                        </p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* Resources if any */}
      {connectedServers.some(s => s.resources.length > 0) && (
        <div className="pt-2 border-t border-glass-5">
          <p className="text-[10px] text-tertiary mb-1.5">Resources</p>
          <div className="space-y-1">
            {connectedServers.flatMap(s => s.resources).slice(0, 4).map((resource, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 py-1 px-2 rounded bg-glass-5 text-[10px] text-secondary"
              >
                <ServerIcon />
                <span className="truncate">{resource.name || resource.uri}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Streaming Status
function StreamingStatus({ agentName }: { agentName: string }) {
  return (
    <Card variant="glass" className="p-4 border border-orange-500/20">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500">
          <SpinnerIcon />
        </div>
        <div>
          <p className="text-primary text-sm font-medium">Processando...</p>
          <p className="text-tertiary text-xs">{agentName} está gerando resposta</p>
        </div>
      </div>
      <div className="mt-3">
        <div className="h-1.5 bg-scrim-20 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-orange-500 to-yellow-500 rounded-full"
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          />
        </div>
      </div>
    </Card>
  );
}

// Ready Status
function ReadyStatus({ messageCount }: { messageCount: number }) {
  return (
    <Card variant="glass" className="p-4 border border-green-500/20">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-green-500/10 flex items-center justify-center text-green-500">
          <CheckIcon />
        </div>
        <div>
          <p className="text-primary text-sm font-medium">Pronto</p>
          <p className="text-tertiary text-xs">{messageCount} mensagens na conversa</p>
        </div>
      </div>
    </Card>
  );
}

// Waiting Status
function WaitingStatus({ agentName }: { agentName: string }) {
  return (
    <Card variant="glass" className="p-4 border border-blue-500/20">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
          <ClockIcon />
        </div>
        <div>
          <p className="text-primary text-sm font-medium">Aguardando</p>
          <p className="text-tertiary text-xs">Envie uma mensagem para {agentName}</p>
        </div>
      </div>
    </Card>
  );
}

// Message History
function MessageHistory({ messages }: { messages: Message[] }) {
  // Show last 10 messages in reverse order (newest first)
  const recentMessages = [...messages].reverse().slice(0, 10);

  return (
    <div className="space-y-2">
      <p className="text-xs text-tertiary px-1">Últimas {Math.min(messages.length, 10)} mensagens</p>
      {recentMessages.map((message, index) => (
        <motion.div
          key={message.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.03 }}
          className="p-3 rounded-xl glass-subtle"
        >
          <div className="flex items-center gap-2 mb-1">
            <div className={`h-5 w-5 rounded-full flex items-center justify-center ${
              message.role === 'user'
                ? 'bg-blue-500/20 text-blue-400'
                : 'bg-purple-500/20 text-purple-400'
            }`}>
              {message.role === 'user' ? <UserIcon /> : <BotIcon />}
            </div>
            <span className="text-xs font-medium text-primary">
              {message.role === 'user' ? 'Você' : message.agentName || 'Agent'}
            </span>
            <span className="text-[10px] text-tertiary ml-auto">
              {formatRelativeTime(message.timestamp)}
            </span>
          </div>
          <p className="text-xs text-secondary line-clamp-2 pl-7">
            {message.content}
          </p>
        </motion.div>
      ))}
    </div>
  );
}

// Metrics Panel Component
type SectionKey = 'agent' | 'activity' | 'commands' | 'tools' | 'tokens' | 'health' | 'stats';

interface MetricsPanelProps {
  expandedSections: Record<SectionKey, boolean>;
  toggleSection: (section: SectionKey) => void;
}

function MetricsPanel({ expandedSections, toggleSection }: MetricsPanelProps) {
  const { data: tokenUsage, isLoading: loadingTokens } = useTokenUsage();
  const { data: llmHealth, isLoading: loadingHealth } = useLLMHealth();
  const { data: stats, isLoading: loadingStats } = useExecutionStats();

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(2)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const hasData = tokenUsage || llmHealth || stats;

  if (!hasData && !loadingTokens && !loadingHealth && !loadingStats) {
    return (
      <EmptyState
        icon={
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="20" x2="18" y2="10" />
            <line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" />
          </svg>
        }
        title="Sem métricas"
        description="Execute algumas tarefas para ver estatísticas de uso"
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* LLM Health Status */}
      <Section
        title="Status LLM"
        expanded={expandedSections.health}
        onToggle={() => toggleSection('health')}
      >
        {loadingHealth ? (
          <LoadingPlaceholder />
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <HealthCard
              name="Claude"
              available={llmHealth?.claude.available ?? true}
              error={llmHealth?.claude.error}
              color="purple"
            />
            <HealthCard
              name="OpenAI"
              available={llmHealth?.openai.available ?? true}
              error={llmHealth?.openai.error}
              color="green"
            />
          </div>
        )}
      </Section>

      {/* Token Usage */}
      <Section
        title="Uso de Tokens"
        expanded={expandedSections.tokens}
        onToggle={() => toggleSection('tokens')}
      >
        {loadingTokens ? (
          <LoadingPlaceholder />
        ) : tokenUsage ? (
          <div className="space-y-3">
            {/* Total Tokens */}
            <div
              className="rounded-xl p-3"
              style={{
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(147, 51, 234, 0.1) 100%)',
                border: '1px solid rgba(59, 130, 246, 0.2)',
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-foreground-secondary text-xs">Total de Tokens</span>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  {formatNumber((tokenUsage.total.input ?? 0) + (tokenUsage.total.output ?? 0))}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] text-foreground-tertiary mb-0.5">Input</p>
                  <p className="text-foreground-primary font-semibold text-sm">
                    {formatNumber(tokenUsage.total.input ?? 0)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-foreground-tertiary mb-0.5">Output</p>
                  <p className="text-foreground-primary font-semibold text-sm">
                    {formatNumber(tokenUsage.total.output ?? 0)}
                  </p>
                </div>
              </div>
            </div>

            {/* Provider Breakdown */}
            <div className="grid grid-cols-2 gap-2">
              <TokenCard
                provider="Claude"
                input={tokenUsage.claude.input ?? 0}
                output={tokenUsage.claude.output ?? 0}
                requests={tokenUsage.claude.requests ?? 0}
                color="purple"
              />
              <TokenCard
                provider="OpenAI"
                input={tokenUsage.openai.input ?? 0}
                output={tokenUsage.openai.output ?? 0}
                requests={tokenUsage.openai.requests ?? 0}
                color="green"
              />
            </div>
          </div>
        ) : (
          <NoDataPlaceholder text="Nenhum uso de tokens registrado" />
        )}
      </Section>

      {/* Execution Stats */}
      <Section
        title="Estatísticas"
        expanded={expandedSections.stats}
        onToggle={() => toggleSection('stats')}
      >
        {loadingStats ? (
          <LoadingPlaceholder />
        ) : stats && stats.total > 0 ? (
          <div className="space-y-3">
            {/* Total Executions */}
            <div className="grid grid-cols-3 gap-2">
              <StatCard label="Total" value={stats.total} color="blue" />
              <StatCard label="Sucesso" value={stats.byStatus.completed ?? 0} color="green" />
              <StatCard label="Falhas" value={stats.byStatus.failed ?? 0} color="red" />
            </div>

            {/* Success Rate */}
            <div
              className="rounded-xl p-3"
              style={{
                background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, transparent 100%)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-foreground-secondary text-xs">Taxa de Sucesso</span>
                <span className="text-green-400 font-semibold text-sm">
                  {((stats.byStatus.completed ?? 0) / stats.total * 100).toFixed(1)}%
                </span>
              </div>
              <div className="h-2 rounded-full bg-scrim-30 overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-green-500 to-emerald-400"
                  initial={{ width: 0 }}
                  animate={{ width: `${(stats.byStatus.completed ?? 0) / stats.total * 100}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>
          </div>
        ) : (
          <NoDataPlaceholder text="Nenhuma execução registrada" />
        )}
      </Section>
    </div>
  );
}

// Loading Placeholder
function LoadingPlaceholder() {
  return (
    <div className="flex items-center justify-center py-6">
      <SpinnerIcon />
    </div>
  );
}

// No Data Placeholder
function NoDataPlaceholder({ text }: { text: string }) {
  return (
    <div className="text-center py-4">
      <p className="text-tertiary text-xs">{text}</p>
    </div>
  );
}

// Health Card Component
interface HealthCardProps {
  name: string;
  available: boolean;
  error?: string;
  color: 'purple' | 'green';
}

function HealthCard({ name, available, error, color }: HealthCardProps) {
  const colors = {
    purple: { border: 'rgba(147, 51, 234, 0.3)', bg: 'rgba(147, 51, 234, 0.1)' },
    green: { border: 'rgba(34, 197, 94, 0.3)', bg: 'rgba(34, 197, 94, 0.1)' },
  };

  const style = colors[color];

  // Parse and simplify error message
  const getErrorMessage = (err?: string): string => {
    if (!err) return 'Offline';

    // Try to extract a friendly message from JSON error
    try {
      if (err.startsWith('{') || err.startsWith('[')) {
        const parsed = JSON.parse(err);
        // Common error message fields
        if (parsed.message) return parsed.message.slice(0, 30);
        if (parsed.error?.message) return parsed.error.message.slice(0, 30);
        if (parsed.error) return String(parsed.error).slice(0, 30);
      }
    } catch {
      // Not JSON, continue
    }

    // Check for common HTTP error patterns
    if (err.includes('401') || err.toLowerCase().includes('unauthorized')) {
      return 'API key inválida';
    }
    if (err.includes('403') || err.toLowerCase().includes('forbidden')) {
      return 'Acesso negado';
    }
    if (err.includes('429') || err.toLowerCase().includes('rate limit')) {
      return 'Rate limit';
    }
    if (err.includes('500') || err.toLowerCase().includes('server error')) {
      return 'Erro servidor';
    }
    if (err.includes('timeout') || err.toLowerCase().includes('timed out')) {
      return 'Timeout';
    }
    if (err.toLowerCase().includes('network') || err.toLowerCase().includes('connect')) {
      return 'Erro de rede';
    }

    // Truncate long messages
    return err.length > 25 ? err.slice(0, 22) + '...' : err;
  };

  return (
    <div
      className="rounded-xl p-3"
      style={{
        background: `linear-gradient(135deg, ${style.bg} 0%, transparent 100%)`,
        border: `1px solid ${style.border}`,
      }}
    >
      <div className="flex items-center gap-2 mb-1">
        <ServerIcon />
        <span className="text-foreground-primary text-xs font-medium">{name}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className={`h-2 w-2 rounded-full ${available ? 'bg-green-500' : 'bg-red-500'}`} />
        <span
          className={`text-[10px] ${available ? 'text-green-400' : 'text-red-400'} truncate max-w-[80px]`}
          title={!available && error ? error : undefined}
        >
          {available ? 'Online' : getErrorMessage(error)}
        </span>
      </div>
    </div>
  );
}

// Token Card Component
interface TokenCardProps {
  provider: string;
  input: number;
  output: number;
  requests: number;
  color: 'purple' | 'green';
}

function TokenCard({ provider, input, output, requests, color }: TokenCardProps) {
  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const colors = {
    purple: 'from-purple-500/10 border-purple-500/20',
    green: 'from-green-500/10 border-green-500/20',
  };

  return (
    <div className={`rounded-xl p-2.5 bg-gradient-to-br ${colors[color]} to-transparent border`}>
      <p className="text-[10px] text-foreground-tertiary mb-1">{provider}</p>
      <p className="text-foreground-primary font-semibold text-sm mb-0.5">
        {formatNumber(input + output)}
      </p>
      <p className="text-[10px] text-foreground-tertiary">{requests} requests</p>
    </div>
  );
}

// Stat Card Component
interface StatCardProps {
  label: string;
  value: number;
  color: 'blue' | 'green' | 'red';
}

function StatCard({ label, value, color }: StatCardProps) {
  const colors = {
    blue: { text: 'text-blue-400', bg: 'from-blue-500/20' },
    green: { text: 'text-green-400', bg: 'from-green-500/20' },
    red: { text: 'text-red-400', bg: 'from-red-500/20' },
  };

  const style = colors[color];

  return (
    <div
      className={`rounded-xl p-2.5 bg-gradient-to-br ${style.bg} to-transparent border border-[var(--glass-border-color-subtle)]`}
    >
      <p className="text-[10px] text-foreground-tertiary mb-0.5">{label}</p>
      <p className={`text-lg font-bold ${style.text}`}>{value}</p>
    </div>
  );
}

// Section Component
interface SectionProps {
  title: string;
  badge?: string;
  expanded?: boolean;
  onToggle?: () => void;
  children: React.ReactNode;
}

function Section({ title, badge, expanded = true, onToggle, children }: SectionProps) {
  return (
    <div className="space-y-2">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between text-left group"
      >
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-semibold text-secondary uppercase tracking-wider">
            {title}
          </h3>
          {badge && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {badge}
            </Badge>
          )}
        </div>
        {onToggle && (
          <motion.div
            animate={{ rotate: expanded ? 0 : -90 }}
            transition={{ duration: 0.2 }}
            className="text-tertiary group-hover:text-secondary"
          >
            <ChevronDownIcon />
          </motion.div>
        )}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Empty State
interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

function EmptyState({ icon, title, description }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="h-14 w-14 rounded-2xl glass-subtle flex items-center justify-center mb-4 text-tertiary">
        {icon}
      </div>
      <p className="text-primary text-sm font-medium">{title}</p>
      <p className="text-tertiary text-xs mt-1 max-w-[200px] leading-relaxed">{description}</p>
    </div>
  );
}
