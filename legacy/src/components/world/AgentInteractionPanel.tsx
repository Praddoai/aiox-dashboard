'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useAgentById, useAgentCommands } from '@/hooks/use-agents';
import { useChat } from '@/hooks/use-chat';
import { Button } from '@/components/ui/button';
import { domainSpriteColors, tierBadge, agentSpriteRects } from './pixel-sprites';
import { rooms, domains } from './world-layout';
import type { DomainId } from './world-layout';
import type { AgentTier, AgentCommand } from '@/types';

type PanelTab = 'chat' | 'profile' | 'commands';

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

  const tabs: Array<{ id: PanelTab; label: string; icon: string }> = [
    { id: 'chat', label: 'Chat', icon: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z' },
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
                className="[image-rendering:pixelated]"
              >
                {agentSpriteRects(spriteColors).map((r, i) => (
                  <rect key={i} x={r.x} y={r.y} width={r.w} height={r.h} fill={r.fill} />
                ))}
              </svg>
            </div>

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

          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-7 w-7"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </Button>
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
                      className="rounded-xl p-3 mb-3"
                      style={{ background: `${domainCfg.tileColor}11` }}
                    >
                      <svg
                        width={32}
                        height={32}
                        viewBox="0 0 16 16"
                        className="[image-rendering:pixelated]"
                      >
                        {agentSpriteRects(spriteColors).map((r, i) => (
                          <rect key={i} x={r.x} y={r.y} width={r.w} height={r.h} fill={r.fill} />
                        ))}
                      </svg>
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
                        ? 'text-foreground-primary'
                        : 'text-tertiary glass-subtle cursor-not-allowed',
                    )}
                    style={
                      inputValue.trim() && !isStreaming
                        ? { backgroundColor: domainCfg.tileColor }
                        : undefined
                    }
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="22" y1="2" x2="11" y2="13" />
                      <polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                  </button>
                </div>
              </div>
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
                  <div className="h-4 bg-glass-5 rounded animate-pulse" />
                  <div className="h-4 bg-glass-5 rounded animate-pulse w-3/4" />
                  <div className="h-4 bg-glass-5 rounded animate-pulse w-1/2" />
                </div>
              ) : agent ? (
                <>
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
                    className="w-full text-left p-2.5 rounded-xl glass-subtle hover:bg-glass-10 transition-colors group"
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
