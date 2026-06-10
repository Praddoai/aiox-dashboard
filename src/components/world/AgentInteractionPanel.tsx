import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';
import { useAgentById, useAgentCommands } from '../../hooks/useAgents';
import { useChat } from '../../hooks/useChat';
import { GlassButton } from '../ui';
import { domainSpriteColors, tierBadge, agentSpriteRects } from './pixel-sprites';
import { rooms } from './world-layout';
import type { DomainId } from './world-layout';
import { useDomains } from './DomainContext';
import type { AgentTier, AgentCommand } from '../../types';
import { useMonitorStore, type MonitorEvent } from '../../stores/monitorStore';
import { useAgentActivityStore } from '../../stores/agentActivityStore';
import { getAgentAvatarUrl } from '../../lib/agent-avatars';

type PanelTab = 'chat' | 'profile' | 'commands' | 'activity';

interface AgentInteractionPanelProps {
  agentId: string;
  roomId: string;
  onClose: () => void;
  onStartChat: (agentId: string) => void;
}

export function AgentInteractionPanel({
  agentId,
  roomId,
  onClose,
}: AgentInteractionPanelProps) {
  const [activeTab, setActiveTab] = useState<PanelTab>('chat');
  const [inputValue, setInputValue] = useState('');
  const { data: agent, isLoading } = useAgentById(agentId);
  const { data: commands } = useAgentCommands(roomId, agentId);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const domains = useDomains();
  const roomConfig = rooms.find((r) => r.squadId === roomId);
  const domain: DomainId = roomConfig?.domain || 'dev';
  const domainCfg = domains[domain];
  const spriteColors = domainSpriteColors[domain];
  const tier = (agent?.tier ?? 2) as AgentTier;
  const badge = tierBadge[tier];

  // Chat integration
  const {
    activeSession,
    selectedAgent,
    isStreaming,
    sendMessage,
    selectAgent,
  } = useChat();

  // Auto-select agent when panel opens
  useEffect(() => {
    if (agent && (!selectedAgent || selectedAgent.id !== agent.id)) {
      selectAgent(agent);
    }
  }, [agent, selectedAgent, selectAgent]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeSession?.messages]);

  // Focus input when switching to chat tab
  useEffect(() => {
    if (activeTab === 'chat') {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [activeTab]);

  const handleSend = useCallback(() => {
    const text = inputValue.trim();
    if (!text || isStreaming) return;
    sendMessage(text);
    setInputValue('');
  }, [inputValue, isStreaming, sendMessage]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const handleCommandClick = useCallback((cmd: AgentCommand) => {
    setInputValue(`*${cmd.command} `);
    setActiveTab('chat');
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const messages = activeSession?.messages || [];

  // Agent activity from monitor
  const monitorEvents = useMonitorStore((s) => s.events);
  const liveActivity = useAgentActivityStore((s) =>
    agent?.name ? s.getActivity(agent.name) : undefined
  );

  // Filter events for this agent
  const agentName = agent?.name;
  const agentEvents = useMemo(() => {
    if (!agentName) return [];
    const name = agentName.toLowerCase();
    return monitorEvents
      .filter((e) => {
        const eName = e.agent.toLowerCase();
        return eName.includes(name) || name.includes(eName.replace(/^@/, '').replace(/\s*\(.*\)/, ''));
      })
      .slice(-50) // Last 50 events
      .reverse();
  }, [monitorEvents, agentName]);

  const tabs: Array<{ id: PanelTab; label: string; icon: string }> = [
    { id: 'chat', label: 'Chat', icon: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z' },
    { id: 'activity', label: 'Live', icon: 'M13 2L3 14h9l-1 8 10-12h-9l1-8' },
    { id: 'profile', label: 'Perfil', icon: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2' },
    { id: 'commands', label: 'Cmds', icon: 'M4 17l6-6-6-6M12 19h8' },
  ];

  return (
    <motion.div
      className="h-full flex flex-col glass-panel border-l border-glass-border"
      initial={{ x: '100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '100%', opacity: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
    >
      {/* Header */}
      <div className="flex-shrink-0 p-3 border-b border-glass-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {getAgentAvatarUrl(agentId) ? (
              <img
                src={getAgentAvatarUrl(agentId)}
                alt={agent?.name || agentId}
                className="rounded-lg object-cover"
                style={{
                  width: 36,
                  height: 36,
                  border: `1.5px solid ${domainCfg.tileColor}44`,
                }}
              />
            ) : (
              <div
                className="rounded-lg flex items-center justify-center"
                style={{
                  width: 36,
                  height: 36,
                  background: `${domainCfg.tileColor}22`,
                }}
              >
                <svg
                  width={24}
                  height={24}
                  viewBox="0 0 16 16"
                  style={{ imageRendering: 'pixelated' }}
                >
                  {agentSpriteRects(spriteColors).map((r, i) => (
                    <rect key={i} x={r.x} y={r.y} width={r.w} height={r.h} fill={r.fill} />
                  ))}
                </svg>
              </div>
            )}

            <div>
              <h3 className="text-xs font-semibold text-primary leading-tight">
                {agent?.name || agentId}
              </h3>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="text-[9px]" style={{ color: badge.color }}>
                  {badge.symbol}
                </span>
                <span className="text-[9px] text-secondary">
                  {tier === 0 ? 'Chief' : tier === 1 ? 'Master' : 'Specialist'}
                </span>
                <span className="text-[9px] text-tertiary">·</span>
                <span className="text-[9px]" style={{ color: domainCfg.tileColor }}>
                  {roomConfig?.label}
                </span>
              </div>
            </div>
          </div>

          <GlassButton
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-7 w-7"
            aria-label="Fechar"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </GlassButton>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex-shrink-0 px-3 pt-2">
        <div className="flex gap-0.5 p-0.5 glass-subtle rounded-lg">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex-1 py-1.5 rounded-md text-[10px] font-medium transition-all flex items-center justify-center gap-1',
                activeTab === tab.id
                  ? 'glass text-primary shadow-sm'
                  : 'text-secondary hover:text-primary'
              )}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d={tab.icon} />
              </svg>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        <AnimatePresence mode="wait">
          {activeTab === 'chat' ? (
            <motion.div
              key="chat"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col min-h-0"
            >
              {/* Messages area */}
              <div className="flex-1 overflow-y-auto glass-scrollbar px-3 py-2 space-y-2">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center py-8">
                    <div
                      className="rounded-xl p-3 mb-3 overflow-hidden"
                      style={{ background: `${domainCfg.tileColor}11` }}
                    >
                      {getAgentAvatarUrl(agentId) ? (
                        <img
                          src={getAgentAvatarUrl(agentId)}
                          alt={agent?.name || agentId}
                          className="rounded-lg object-cover"
                          style={{ width: 48, height: 48 }}
                        />
                      ) : (
                        <svg
                          width={32}
                          height={32}
                          viewBox="0 0 16 16"
                          style={{ imageRendering: 'pixelated' }}
                        >
                          {agentSpriteRects(spriteColors).map((r, i) => (
                            <rect key={i} x={r.x} y={r.y} width={r.w} height={r.h} fill={r.fill} />
                          ))}
                        </svg>
                      )}
                    </div>
                    <p className="text-[11px] text-secondary font-medium mb-1">
                      Conversar com {agent?.name || 'Agent'}
                    </p>
                    <p className="text-[10px] text-tertiary max-w-[200px]">
                      Digite uma mensagem ou use um comando da aba Cmds
                    </p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={cn(
                        'flex',
                        msg.role === 'user' ? 'justify-end' : 'justify-start',
                      )}
                    >
                      <div
                        className={cn(
                          'max-w-[85%] rounded-xl px-2.5 py-1.5',
                          msg.role === 'user'
                            ? 'glass text-primary'
                            : 'text-secondary',
                        )}
                        style={
                          msg.role === 'agent'
                            ? { background: `${domainCfg.tileColor}11` }
                            : undefined
                        }
                      >
                        <p className="text-[11px] leading-relaxed whitespace-pre-wrap break-words">
                          {msg.content}
                        </p>
                        {msg.isStreaming && (
                          <motion.span
                            className="inline-block w-1.5 h-3 ml-0.5 rounded-sm"
                            style={{ backgroundColor: domainCfg.tileColor }}
                            animate={{ opacity: [1, 0, 1] }}
                            transition={{ duration: 0.8, repeat: Infinity }}
                          />
                        )}
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="flex-shrink-0 p-2 border-t border-glass-border">
                <div className="flex items-center gap-1.5">
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={`Mensagem para ${agent?.name || 'agent'}...`}
                    aria-label={`Mensagem para ${agent?.name || 'agent'}`}
                    disabled={isStreaming}
                    className="flex-1 h-8 px-2.5 rounded-lg text-[11px] text-primary placeholder:text-tertiary glass-subtle focus:outline-none focus:ring-1 transition-all bg-transparent"
                    style={{ focusRingColor: domainCfg.tileColor } as React.CSSProperties}
                  />
                  <button
                    onClick={handleSend}
                    disabled={!inputValue.trim() || isStreaming}
                    className={cn(
                      'h-8 w-8 flex items-center justify-center rounded-lg transition-all',
                      inputValue.trim() && !isStreaming
                        ? 'text-white'
                        : 'text-tertiary glass-subtle cursor-not-allowed',
                    )}
                    style={
                      inputValue.trim() && !isStreaming
                        ? { backgroundColor: domainCfg.tileColor }
                        : undefined
                    }
                    aria-label="Enviar mensagem"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="22" y1="2" x2="11" y2="13" />
                      <polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                  </button>
                </div>
              </div>
            </motion.div>
          ) : activeTab === 'activity' ? (
            <motion.div
              key="activity"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 overflow-y-auto glass-scrollbar p-3 space-y-1"
            >
              {/* Live status */}
              {liveActivity?.isActive && (
                <motion.div
                  className="rounded-xl p-3 mb-3"
                  style={{
                    background: `${domainCfg.tileColor}11`,
                    border: `1px solid ${domainCfg.tileColor}22`,
                  }}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="flex items-center gap-2">
                    <motion.div
                      className="w-2 h-2 rounded-full"
                      style={{ background: '#10B981' }}
                      animate={{ scale: [1, 1.3, 1], opacity: [1, 0.6, 1] }}
                      transition={{ duration: 1.2, repeat: Infinity }}
                    />
                    <span className="text-[11px] font-semibold text-primary">
                      {liveActivity.action}
                    </span>
                  </div>
                  {liveActivity.tool && (
                    <span className="text-[9px] text-tertiary mt-1 block font-mono">
                      tool: {liveActivity.tool}
                    </span>
                  )}
                </motion.div>
              )}

              {/* Events timeline */}
              {agentEvents.length > 0 ? (
                <div className="space-y-0.5">
                  {agentEvents.map((event, i) => (
                    <ActivityEventRow key={event.id || i} event={event} domainColor={domainCfg.tileColor} />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center py-8">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-tertiary mb-2">
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8" />
                  </svg>
                  <p className="text-[11px] text-secondary font-medium mb-1">
                    Sem atividade recente
                  </p>
                  <p className="text-[10px] text-tertiary max-w-[200px]">
                    Quando o agente estiver trabalhando, a atividade em tempo real aparecerá aqui
                  </p>
                </div>
              )}
            </motion.div>
          ) : activeTab === 'profile' ? (
            <motion.div
              key="profile"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex-1 overflow-y-auto glass-scrollbar p-4 space-y-4"
            >
              {isLoading ? (
                <div className="space-y-3">
                  <div className="h-4 bg-white/5 rounded animate-pulse" />
                  <div className="h-4 bg-white/5 rounded animate-pulse w-3/4" />
                  <div className="h-4 bg-white/5 rounded animate-pulse w-1/2" />
                </div>
              ) : agent ? (
                <>
                  {/* Agent Avatar Card */}
                  {getAgentAvatarUrl(agentId) && (
                    <div className="flex flex-col items-center mb-2">
                      <img
                        src={getAgentAvatarUrl(agentId)}
                        alt={agent.name}
                        className="rounded-xl object-cover shadow-lg"
                        style={{
                          width: 120,
                          height: 120,
                          border: `2px solid ${domainCfg.tileColor}33`,
                        }}
                      />
                    </div>
                  )}

                  {agent.description && (
                    <div>
                      <p className="text-[10px] font-semibold text-secondary uppercase tracking-wider mb-1.5">
                        Sobre
                      </p>
                      <p className="text-xs text-secondary leading-relaxed">
                        {agent.description}
                      </p>
                    </div>
                  )}

                  {agent.role && (
                    <div>
                      <p className="text-[10px] font-semibold text-secondary uppercase tracking-wider mb-1.5">
                        Papel
                      </p>
                      <p className="text-xs text-primary">{agent.role}</p>
                    </div>
                  )}

                  {agent.capabilities && agent.capabilities.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold text-secondary uppercase tracking-wider mb-1.5">
                        Capacidades
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {agent.capabilities.map((cap, i) => {
                          const text = typeof cap === 'string' ? cap : (cap as { text: string }).text;
                          return (
                            <span
                              key={i}
                              className="px-2 py-0.5 rounded text-[10px] glass-subtle text-secondary"
                            >
                              {text}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {agent.whenToUse && (
                    <div>
                      <p className="text-[10px] font-semibold text-secondary uppercase tracking-wider mb-1.5">
                        Quando usar
                      </p>
                      <p className="text-xs text-secondary leading-relaxed">
                        {agent.whenToUse}
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-xs text-tertiary">Agent não encontrado</p>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="commands"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex-1 overflow-y-auto glass-scrollbar p-3 space-y-1.5"
            >
              {commands && commands.length > 0 ? (
                commands.map((cmd: AgentCommand) => (
                  <button
                    key={cmd.command}
                    onClick={() => handleCommandClick(cmd)}
                    className="w-full text-left p-2.5 rounded-xl glass-subtle hover:bg-white/10 transition-colors group"
                  >
                    <div className="flex items-center gap-2 mb-0.5">
                      <code
                        className="text-[11px] font-mono font-semibold"
                        style={{ color: domainCfg.tileColor }}
                      >
                        *{cmd.command}
                      </code>
                    </div>
                    {cmd.description && (
                      <p className="text-[10px] text-tertiary group-hover:text-secondary transition-colors">
                        {cmd.description}
                      </p>
                    )}
                  </button>
                ))
              ) : (
                <div className="text-center py-8">
                  <p className="text-xs text-tertiary">
                    Nenhum comando disponível
                  </p>
                  <p className="text-[10px] text-tertiary mt-1">
                    Use a aba Chat para interagir
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// Timeline row for an individual monitor event
function ActivityEventRow({ event, domainColor: _domainColor }: { event: MonitorEvent; domainColor: string }) {
  const typeColors: Record<MonitorEvent['type'], string> = {
    tool_call: '#10B981',
    message: '#8B5CF6',
    error: '#EF4444',
    system: '#6B7280',
  };

  const typeIcons: Record<MonitorEvent['type'], string> = {
    tool_call: 'M13 2L3 14h9l-1 8 10-12h-9l1-8', // bolt
    message: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z', // chat
    error: 'M12 9v2m0 4h.01M10.29 3.86l-8.3 14.4A1 1 0 0 0 2.85 20h18.3a1 1 0 0 0 .86-1.74l-8.3-14.4a1 1 0 0 0-1.72 0z', // triangle alert
    system: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33', // gear
  };

  const color = typeColors[event.type];
  const time = new Date(event.timestamp).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  // Truncate description
  const desc = event.description.length > 60
    ? event.description.slice(0, 57) + '...'
    : event.description;

  return (
    <div className="flex items-start gap-2 py-1.5 px-2 rounded-lg hover:bg-white/5 transition-colors group">
      {/* Type icon */}
      <div
        className="flex-shrink-0 w-5 h-5 rounded flex items-center justify-center mt-0.5"
        style={{ background: `${color}15` }}
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5">
          <path d={typeIcons[event.type]} />
        </svg>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-primary truncate">{desc}</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-[9px] text-tertiary font-mono">{time}</span>
          {event.duration != null && (
            <span className="text-[9px] text-tertiary">
              {event.duration}ms
            </span>
          )}
          {event.success === false && (
            <span className="text-[9px] font-bold" style={{ color: '#EF4444' }}>FAIL</span>
          )}
        </div>
      </div>

      {/* Status dot */}
      <div
        className="flex-shrink-0 w-1.5 h-1.5 rounded-full mt-1.5"
        style={{ background: event.success === false ? '#EF4444' : color }}
      />
    </div>
  );
}
