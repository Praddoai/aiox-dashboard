import { motion, AnimatePresence } from 'framer-motion';
import { Headphones, Phone, Bot, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SalesAgent } from './types';
import { STATUS_CONFIG, TEMP_CONFIG, formatCurrency } from './mock-data';

interface ConversationViewProps {
  agent: SalesAgent;
}

export function ConversationView({ agent }: ConversationViewProps) {
  const statusCfg = STATUS_CONFIG[agent.status];

  if (!agent.currentLead) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3" style={{ color: 'var(--text-muted)' }}>
        <Headphones className="h-10 w-10 opacity-30" />
        <p className="text-sm">Agente disponivel, sem conversa ativa</p>
      </div>
    );
  }

  const lead = agent.currentLead;

  return (
    <div className="flex flex-col h-full">
      {/* Conversation Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{ borderColor: 'rgba(255,255,255,0.06)' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center h-10 w-10 rounded-none text-sm font-bold"
            style={{
              backgroundColor: statusCfg.bgColor,
              color: statusCfg.color,
              border: `1px solid ${statusCfg.borderColor}`,
            }}
          >
            {agent.avatar}
          </div>
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              {agent.name} <span style={{ color: 'var(--text-muted)' }}>atendendo</span> {lead.name}
            </p>
            <div className="flex items-center gap-3 text-detail" style={{ color: 'var(--text-muted)' }}>
              <span className="flex items-center gap-1">
                <Phone className="h-3 w-3" /> {lead.phone}
              </span>
              <span>{lead.source}</span>
              {lead.temperature && (
                <span
                  className="flex items-center gap-1 px-1.5 py-0.5 rounded-none"
                  style={{
                    backgroundColor: `color-mix(in srgb, ${TEMP_CONFIG[lead.temperature].color} 15%, transparent)`,
                    color: TEMP_CONFIG[lead.temperature].color,
                    border: `1px solid color-mix(in srgb, ${TEMP_CONFIG[lead.temperature].color} 30%, transparent)`,
                  }}
                >
                  {TEMP_CONFIG[lead.temperature].label}
                </span>
              )}
            </div>
          </div>
        </div>
        {lead.cartValue && (
          <div className="text-right">
            <p className="text-detail" style={{ color: 'var(--text-muted)' }}>Valor do carrinho</p>
            <p className="text-lg font-light" style={{ color: '#D1FF00' }}>
              {formatCurrency(lead.cartValue)}
            </p>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        <AnimatePresence initial={false}>
          {agent.messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className={cn(
                'flex gap-2 max-w-[85%]',
                msg.direction === 'agent' ? 'ml-auto flex-row-reverse' : ''
              )}
            >
              <div
                className="flex items-center justify-center h-6 w-6 rounded-none flex-shrink-0 mt-1"
                style={{
                  backgroundColor: msg.direction === 'agent'
                    ? 'rgba(0,153,255,0.15)'
                    : 'rgba(153,153,153,0.15)',
                }}
              >
                {msg.direction === 'agent'
                  ? <Bot className="h-3 w-3" style={{ color: '#0099FF' }} />
                  : <User className="h-3 w-3" style={{ color: '#999' }} />
                }
              </div>
              <div>
                <div
                  className="px-3 py-2 text-sm leading-relaxed rounded-none"
                  style={{
                    backgroundColor: msg.direction === 'agent'
                      ? 'rgba(0,153,255,0.08)'
                      : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${msg.direction === 'agent'
                      ? 'rgba(0,153,255,0.2)'
                      : 'rgba(255,255,255,0.06)'}`,
                    color: 'var(--text-secondary)',
                  }}
                >
                  {msg.text}
                </div>
                <p className="text-[10px] mt-1 tabular-nums" style={{ color: 'var(--text-muted)' }}>
                  {msg.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Typing indicator */}
      {agent.status === 'atendendo' && (
        <div
          className="px-4 py-2 border-t flex items-center gap-2"
          style={{ borderColor: 'rgba(255,255,255,0.06)' }}
        >
          <div className="flex items-center gap-1">
            <motion.span
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: '#0099FF' }}
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ repeat: Infinity, duration: 1.2, delay: 0 }}
            />
            <motion.span
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: '#0099FF' }}
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ repeat: Infinity, duration: 1.2, delay: 0.2 }}
            />
            <motion.span
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: '#0099FF' }}
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ repeat: Infinity, duration: 1.2, delay: 0.4 }}
            />
          </div>
          <span className="text-detail" style={{ color: 'var(--text-muted)' }}>
            {agent.name} esta digitando...
          </span>
        </div>
      )}
    </div>
  );
}
