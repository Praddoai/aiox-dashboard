import { motion } from 'framer-motion';
import { Bot, User, Clock, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SalesAgent } from './types';
import { STATUS_CONFIG, TEMP_CONFIG, timeAgo, formatCurrency } from './mock-data';

interface AgentCardProps {
  agent: SalesAgent;
  isSelected: boolean;
  onClick: () => void;
}

export function AgentCard({ agent, isSelected, onClick }: AgentCardProps) {
  const statusCfg = STATUS_CONFIG[agent.status];
  const lead = agent.currentLead;
  const lastMessage = agent.messages[agent.messages.length - 1];

  return (
    <motion.button
      layout
      onClick={onClick}
      className={cn(
        'w-full text-left px-4 py-3 border transition-all cursor-pointer rounded-none',
        isSelected && 'ring-1 ring-[rgba(209,255,0,0.2)]'
      )}
      style={{
        backgroundColor: isSelected ? 'rgba(209,255,0,0.05)' : 'rgba(255,255,255,0.02)',
        borderColor: isSelected ? 'rgba(209,255,0,0.3)' : 'rgba(255,255,255,0.06)',
      }}
      whileHover={{ backgroundColor: 'rgba(255,255,255,0.04)' }}
    >
      {/* Agent Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div
            className="relative flex items-center justify-center h-8 w-8 rounded-none text-sm font-medium"
            style={{
              backgroundColor: statusCfg.bgColor,
              color: statusCfg.color,
              border: `1px solid ${statusCfg.borderColor}`,
            }}
          >
            {agent.avatar}
            {statusCfg.pulse && (
              <span
                className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full animate-pulse"
                style={{ backgroundColor: statusCfg.color }}
              />
            )}
          </div>
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{agent.name}</p>
            <span
              className="text-detail px-1.5 py-0.5 rounded-none"
              style={{
                backgroundColor: statusCfg.bgColor,
                color: statusCfg.color,
                border: `1px solid ${statusCfg.borderColor}`,
              }}
            >
              {statusCfg.label}
            </span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-detail tabular-nums" style={{ color: 'var(--text-muted)' }}>
            {agent.activeConversations} ativas
          </p>
          <p className="text-detail tabular-nums" style={{ color: '#4ADE80' }}>
            {agent.conversionRate}% conv.
          </p>
        </div>
      </div>

      {/* Lead Info */}
      {lead && (
        <div
          className="px-3 py-2 mb-2 rounded-none"
          style={{
            backgroundColor: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.05)',
          }}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {lead.name}
            </span>
            {lead.temperature && (
              <span
                className="flex items-center gap-1 text-detail"
                style={{ color: TEMP_CONFIG[lead.temperature].color }}
              >
                {(() => { const TempIcon = TEMP_CONFIG[lead.temperature].icon; return <TempIcon className="h-3 w-3" />; })()}
                {TEMP_CONFIG[lead.temperature].label}
              </span>
            )}
          </div>
          {lead.product && (
            <p className="text-detail truncate" style={{ color: 'var(--text-muted)' }}>
              {lead.product}
            </p>
          )}
          {lead.cartValue && (
            <p className="text-sm font-medium mt-1" style={{ color: '#D1FF00' }}>
              {formatCurrency(lead.cartValue)}
            </p>
          )}
        </div>
      )}

      {/* Last Message Preview */}
      {lastMessage && (
        <div className="flex items-start gap-2">
          {lastMessage.direction === 'agent' ? (
            <Bot className="h-3 w-3 mt-0.5 flex-shrink-0" style={{ color: '#0099FF' }} />
          ) : (
            <User className="h-3 w-3 mt-0.5 flex-shrink-0" style={{ color: '#999' }} />
          )}
          <p className="text-detail leading-relaxed line-clamp-2" style={{ color: 'var(--text-muted)' }}>
            {lastMessage.text}
          </p>
          <span className="text-[10px] flex-shrink-0 tabular-nums" style={{ color: 'var(--text-muted)' }}>
            {timeAgo(lastMessage.timestamp)}
          </span>
        </div>
      )}

      {/* Stats Footer */}
      <div className="flex items-center gap-3 mt-2 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <span className="text-detail tabular-nums" style={{ color: 'var(--text-muted)' }}>
          <Clock className="h-3 w-3 inline mr-1" />{agent.avgResponseTime}s
        </span>
        <span className="text-detail tabular-nums" style={{ color: 'var(--text-muted)' }}>
          <CheckCircle2 className="h-3 w-3 inline mr-1" />{agent.resolvedToday} hoje
        </span>
      </div>
    </motion.button>
  );
}
