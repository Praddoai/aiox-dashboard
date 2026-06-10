import { useEffect, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Eye,
  Headphones,
  AlertTriangle,
  Lightbulb,
  Wifi,
  WifiOff,
  PhoneCall,
  HeartHandshake,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useSalesStore } from './store';
import { useSimulation } from './simulation';
import { useWhatsApp } from './useWhatsApp';
import { useLiveData, AGENT_META } from './useLiveData';
import { getConversationInsight, getSentimentForMessage } from './intelligence';
import type { SalesAgent, ActivityEvent, Sentiment, ConnectionStatus } from './types';

// ─── Config ────────────────────────────────────────────

const STATUS_DOT: Record<string, { color: string; pulse?: boolean }> = {
  'atendendo': { color: '#4ADE80', pulse: true },
  'recuperando-carrinho': { color: '#3B82F6', pulse: true },
  'follow-up': { color: '#f59e0b' },
  'ocioso': { color: 'rgba(255,255,255,0.25)' },
  'pausado': { color: 'rgba(255,255,255,0.12)' },
};

const STATUS_LABEL: Record<string, string> = {
  'atendendo': 'Atendendo',
  'recuperando-carrinho': 'Recuperando carrinho',
  'follow-up': 'Follow-up',
  'ocioso': 'Disponivel',
  'pausado': 'Pausado',
};

const ACTIVITY_DOT: Record<string, string> = {
  'message-sent': '#555',
  'message-received': '#555',
  'cart-recovered': '#D1FF00',
  'lead-qualified': '#4ADE80',
  'sale-closed': '#D1FF00',
  'follow-up-scheduled': '#f59e0b',
  'lead-lost': '#EF4444',
};

const SENTIMENT_INDICATOR: Record<Sentiment, { label: string; color: string }> = {
  positive: { label: 'positivo', color: '#4ADE80' },
  neutral: { label: 'neutro', color: '#666' },
  resistant: { label: 'resistente', color: '#f59e0b' },
};

// ─── Helpers ───────────────────────────────────────────

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h`;
}

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// ─── Sub-components ────────────────────────────────────

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-3 py-2 flex-shrink-0">
      <p className="text-[10px] text-white/25 truncate">{label}</p>
      <span className="text-sm tabular-nums text-white/70">{value}</span>
    </div>
  );
}

function AgentRow({ agent, isSelected, onClick }: {
  agent: SalesAgent;
  isSelected: boolean;
  onClick: () => void;
}) {
  const dot = STATUS_DOT[agent.status] || STATUS_DOT['ocioso'];
  const meta = AGENT_META[agent.id];

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors',
        isSelected ? 'bg-white/[0.06]' : 'hover:bg-white/[0.03]'
      )}
    >
      <span
        className={cn('h-1.5 w-1.5 rounded-full flex-shrink-0', dot.pulse && 'animate-pulse')}
        style={{ backgroundColor: dot.color }}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className={cn('text-[13px] truncate', isSelected ? 'text-white' : 'text-white/70')}>
            {agent.name}
          </span>
          {agent.activeConversations > 0 && (
            <span className="text-[10px] tabular-nums text-white/25">{agent.activeConversations}</span>
          )}
        </div>
        {agent.currentLead ? (
          <p className="text-[11px] text-white/30 truncate">{agent.currentLead.name}</p>
        ) : (
          <p className="text-[11px] text-white/20 italic">
            {meta?.role || STATUS_LABEL[agent.status] || 'Disponivel'}
          </p>
        )}
      </div>
      {agent.currentLead?.cartValue && (
        <span className="text-[11px] tabular-nums text-white/20 flex-shrink-0">
          {formatCurrency(agent.currentLead.cartValue)}
        </span>
      )}
    </button>
  );
}

function ConversationView({ agent }: { agent: SalesAgent }) {
  if (!agent.currentLead) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2">
        <Headphones className="h-8 w-8 text-white/10" />
        <p className="text-[13px] text-white/30">{agent.name} esta disponivel</p>
      </div>
    );
  }

  const lead = agent.currentLead;
  const insight = getConversationInsight(agent);
  const sentimentCfg = SENTIMENT_INDICATOR[insight.sentiment];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.04]">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[13px] text-white/90 font-medium">{agent.name}</span>
            <span className="text-[11px] text-white/15">→</span>
            <span className="text-[13px] text-white/90">{lead.name}</span>
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-[11px] text-white/25">{lead.phone}</span>
            <span className="text-[11px] text-white/25">{lead.source}</span>
            {lead.product && <span className="text-[11px] text-white/25">{lead.product}</span>}
          </div>
        </div>

        {/* Intelligence bar — compact, right side */}
        <div className="flex items-center gap-4 flex-shrink-0">
          {/* Close probability */}
          <div className="text-right">
            <p className="text-[10px] text-white/20">chance</p>
            <p className={cn(
              'text-sm tabular-nums font-medium',
              insight.closeProbability >= 60 ? 'text-emerald-400/80' :
              insight.closeProbability >= 35 ? 'text-amber-400/70' : 'text-white/30'
            )}>
              {insight.closeProbability}%
            </p>
          </div>
          {/* Sentiment dot */}
          <div className="text-right">
            <p className="text-[10px] text-white/20">sentimento</p>
            <div className="flex items-center gap-1 justify-end">
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: sentimentCfg.color }} />
              <span className="text-[11px]" style={{ color: sentimentCfg.color }}>{sentimentCfg.label}</span>
            </div>
          </div>
          {/* Cart value */}
          {lead.cartValue && (
            <div className="text-right">
              <p className="text-[10px] text-white/20">carrinho</p>
              <p className="text-sm tabular-nums text-white/60">{formatCurrency(lead.cartValue)}</p>
            </div>
          )}
        </div>
      </div>

      {/* Stale alert */}
      {insight.isStale && (
        <div className="flex items-center gap-2 px-5 py-1.5 bg-amber-500/[0.05] border-b border-amber-500/10">
          <AlertTriangle className="h-3 w-3 text-amber-400/50" />
          <span className="text-[11px] text-amber-400/50">
            Conversa parada ha {insight.staleMinutes}min
          </span>
        </div>
      )}

      {/* Suggested response */}
      {insight.suggestedResponse && (
        <div className="flex items-center gap-2 px-5 py-1.5 bg-blue-500/[0.03] border-b border-blue-500/[0.06]">
          <Lightbulb className="h-3 w-3 text-blue-400/40" />
          <span className="text-[11px] text-blue-400/40">{insight.suggestedResponse}</span>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        <AnimatePresence initial={false}>
          {agent.messages.map((msg) => {
            const isAgent = msg.direction === 'agent';
            const msgSentiment = msg.direction === 'lead' ? getSentimentForMessage(msg.text) : null;
            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15 }}
                className={cn('flex gap-3 max-w-[80%]', isAgent && 'ml-auto flex-row-reverse')}
              >
                <div className={cn(
                  'h-6 w-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-[10px] font-medium',
                  isAgent ? 'bg-blue-500/10 text-blue-400/60' : 'bg-white/5 text-white/30'
                )}>
                  {isAgent ? agent.avatar : lead.name[0]}
                </div>
                <div className="min-w-0">
                  <div className={cn(
                    'px-3.5 py-2.5 text-[13px] leading-relaxed rounded-xl',
                    isAgent
                      ? 'bg-blue-500/8 text-white/80 rounded-tr-sm'
                      : 'bg-white/[0.04] text-white/70 rounded-tl-sm'
                  )}>
                    {msg.text}
                  </div>
                  <div className={cn(
                    'flex items-center gap-2 mt-1',
                    isAgent && 'justify-end'
                  )}>
                    <span className="text-[10px] text-white/15 tabular-nums">
                      {msg.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {msgSentiment && msgSentiment !== 'neutral' && (
                      <span
                        className="h-1 w-1 rounded-full"
                        style={{ backgroundColor: SENTIMENT_INDICATOR[msgSentiment].color }}
                        title={SENTIMENT_INDICATOR[msgSentiment].label}
                      />
                    )}
                    {msg.source === 'whatsapp' && (
                      <span className="text-[9px] text-white/10">wa</span>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Typing indicator */}
      {agent.status === 'atendendo' && (
        <div className="px-5 py-2.5 border-t border-white/[0.04] flex items-center gap-2">
          <div className="flex items-center gap-1">
            {[0, 0.15, 0.3].map((delay) => (
              <motion.span
                key={delay}
                className="h-1 w-1 rounded-full bg-blue-400/40"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ repeat: Infinity, duration: 1, delay }}
              />
            ))}
          </div>
          <span className="text-[11px] text-white/20">{agent.name} digitando...</span>
        </div>
      )}
    </div>
  );
}

function ActivityFeed({ activities }: { activities: ActivityEvent[] }) {
  return (
    <div>
      <AnimatePresence initial={false}>
        {activities.map((activity) => {
          const dotColor = ACTIVITY_DOT[activity.type] || '#555';
          return (
            <motion.div
              key={activity.id}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              transition={{ duration: 0.2 }}
              className="flex items-start gap-2.5 px-3 py-1.5 hover:bg-white/[0.02] transition-colors"
            >
              <span
                className="h-1 w-1 rounded-full flex-shrink-0 mt-[7px]"
                style={{ backgroundColor: dotColor }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-white/35 truncate">
                  <span className="text-white/50">{activity.agentName}</span>
                  {' · '}
                  {activity.description}
                </p>
              </div>
              {activity.value && (
                <span className="text-[10px] tabular-nums text-white/20 flex-shrink-0">
                  {formatCurrency(activity.value)}
                </span>
              )}
              <span className="text-[10px] tabular-nums text-white/15 flex-shrink-0">
                {timeAgo(activity.timestamp)}
              </span>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

function WhatsAppBadge({ status }: { status: ConnectionStatus }) {
  if (status === 'disconnected') return null;

  const cfg = {
    connecting: { icon: Wifi, text: 'Conectando...', color: 'text-amber-400/40' },
    connected: { icon: Wifi, text: 'WhatsApp', color: 'text-emerald-400/50' },
    error: { icon: WifiOff, text: 'WA offline', color: 'text-red-400/40' },
  }[status] || { icon: WifiOff, text: '', color: '' };

  const Icon = cfg.icon;
  return (
    <div className={cn('flex items-center gap-1.5', cfg.color)}>
      <Icon className="h-3 w-3" />
      <span className="text-[10px]">{cfg.text}</span>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────

export default memo(function SalesRoomPanel() {
  // Boot simulation + WhatsApp + live data
  useSimulation();
  useWhatsApp();
  const { isConfigured: hasLiveData } = useLiveData();

  const agents = useSalesStore((s) => s.agents);
  const activities = useSalesStore((s) => s.activities);
  const metrics = useSalesStore((s) => s.metrics);
  const selectedAgentId = useSalesStore((s) => s.selectedAgentId);
  const selectAgent = useSalesStore((s) => s.selectAgent);
  const waStatus = useSalesStore((s) => s.whatsappStatus);
  const simEnabled = useSalesStore((s) => s.simulationEnabled);

  const selectedAgent = agents.find((a) => a.id === selectedAgentId) || agents[0];

  // Split agents by pipeline
  const salesAgents = agents.filter((a) => AGENT_META[a.id]?.pipeline === 'sales');
  const supportAgents = agents.filter((a) => AGENT_META[a.id]?.pipeline === 'support');

  // Clock tick for timestamps (every 30s instead of 1s — less overhead)
  useEffect(() => {
    const id = setInterval(() => useSalesStore.setState({}), 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a]">
      {/* ── Header + KPIs ── */}
      <div className="flex items-center border-b border-white/[0.04] overflow-x-auto">
        <div className="flex items-center gap-2.5 px-4 py-2.5 border-r border-white/[0.04] flex-shrink-0">
          <Eye className="h-3.5 w-3.5 text-white/20" />
          <span className="text-[13px] text-white/60 font-medium">Sales Room</span>
          <div className="flex items-center gap-1.5 ml-1">
            {hasLiveData && !simEnabled ? (
              <>
                <motion.span
                  className="h-1.5 w-1.5 rounded-full bg-emerald-400"
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                />
                <span className="text-[10px] text-emerald-400/50 uppercase tracking-wider">live</span>
              </>
            ) : (
              <span className="text-[10px] text-white/20 uppercase tracking-wider">
                {simEnabled ? 'sim' : 'offline'}
              </span>
            )}
          </div>
          <WhatsAppBadge status={waStatus} />
        </div>

        <Kpi label="Conversas" value={String(metrics.activeConversations)} />
        <Kpi label="Vendas" value={String(metrics.salesClosed)} />
        <Kpi label="Conversao" value={`${metrics.conversionRate}%`} />
        <Kpi label="Leads" value={String(metrics.leadsToday)} />
      </div>

      {/* ── Main ── */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left — Agents (split by pipeline) */}
        <div className="w-60 flex-shrink-0 border-r border-white/[0.04] flex flex-col">
          {/* Sales Pipeline */}
          <div className="px-3 py-2 flex items-center gap-1.5 border-b border-white/[0.04]">
            <PhoneCall className="h-3 w-3 text-blue-400/40" />
            <p className="text-[10px] text-blue-400/40 uppercase tracking-wider">Vendas</p>
            <span className="text-[10px] text-white/20 ml-auto tabular-nums">
              {salesAgents.filter((a) => a.status !== 'ocioso' && a.status !== 'pausado').length}/{salesAgents.length}
            </span>
          </div>
          <div className="overflow-y-auto">
            {salesAgents.map((agent) => (
              <AgentRow
                key={agent.id}
                agent={agent}
                isSelected={agent.id === selectedAgentId}
                onClick={() => selectAgent(agent.id)}
              />
            ))}
          </div>

          {/* Support Pipeline */}
          <div className="px-3 py-2 flex items-center gap-1.5 border-b border-white/[0.04] border-t border-white/[0.04]">
            <HeartHandshake className="h-3 w-3 text-purple-400/40" />
            <p className="text-[10px] text-purple-400/40 uppercase tracking-wider">Suporte</p>
            <span className="text-[10px] text-white/20 ml-auto tabular-nums">
              {supportAgents.filter((a) => a.status !== 'ocioso' && a.status !== 'pausado').length}/{supportAgents.length}
            </span>
          </div>
          <div className="overflow-y-auto">
            {supportAgents.map((agent) => (
              <AgentRow
                key={agent.id}
                agent={agent}
                isSelected={agent.id === selectedAgentId}
                onClick={() => selectAgent(agent.id)}
              />
            ))}
          </div>
        </div>

        {/* Center — Conversation */}
        <div className="flex-1 flex flex-col min-w-0">
          <ConversationView agent={selectedAgent} />
        </div>

        {/* Right — Activity */}
        <div className="w-64 flex-shrink-0 border-l border-white/[0.04] flex flex-col">
          <div className="px-3 py-2">
            <p className="text-[10px] text-white/20 uppercase tracking-wider">Atividade</p>
          </div>
          <div className="flex-1 overflow-y-auto">
            <ActivityFeed activities={activities} />
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="px-4 py-1.5 border-t border-white/[0.04] flex items-center gap-4 text-[10px] text-white/20">
        <span>
          <span className="text-emerald-400/50">
            {agents.filter((a) => a.status === 'atendendo' || a.status === 'recuperando-carrinho').length}
          </span> atendendo
        </span>
        <span>
          <span className="text-amber-400/50">
            {agents.filter((a) => a.status === 'follow-up').length}
          </span> follow-up
        </span>
        <span>
          <span className="text-white/30">
            {agents.filter((a) => a.status === 'ocioso').length}
          </span> disponiveis
        </span>
        <span className="ml-auto tabular-nums flex items-center gap-2">
          {hasLiveData && (
            <span className="text-[9px] text-emerald-400/30">WAHA</span>
          )}
          {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </span>
      </div>
    </div>
  );
});
