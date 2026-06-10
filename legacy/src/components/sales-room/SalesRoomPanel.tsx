'use client';

import { useState, useEffect, memo } from 'react';
import { motion } from 'framer-motion';
import {
  Eye,
  ShoppingCart,
  Clock,
  Users,
  TrendingUp,
  Zap,
  MessageSquare,
  Radio,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SalesAgent, ActivityEvent, SalesMetrics } from './types';
import { MOCK_AGENTS, MOCK_ACTIVITIES, MOCK_METRICS, formatCurrency } from './mock-data';
import { KpiCard } from './KpiCard';
import { AgentCard } from './AgentCard';
import { ConversationView } from './ConversationView';
import { ActivityTimeline } from './ActivityTimeline';

// ─── Main Component ────────────────────────────────────

interface SalesRoomPanelProps {
  className?: string;
}

export const SalesRoomPanel = memo(function SalesRoomPanel({ className }: SalesRoomPanelProps) {
  const [selectedAgentId, setSelectedAgentId] = useState<string>(MOCK_AGENTS[0].id);
  const [agents] = useState<SalesAgent[]>(MOCK_AGENTS);
  const [activities] = useState<ActivityEvent[]>(MOCK_ACTIVITIES);
  const [metrics] = useState<SalesMetrics>(MOCK_METRICS);
  const [liveTime, setLiveTime] = useState(0);

  const selectedAgent = agents.find((a) => a.id === selectedAgentId) || agents[0];

  // Live clock tick
  useEffect(() => {
    const interval = setInterval(() => setLiveTime((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={cn('flex flex-col h-full', className)} style={{ backgroundColor: 'var(--bg-base)' }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{ borderColor: 'rgba(255,255,255,0.06)' }}
      >
        <div className="flex items-center gap-3">
          <Eye className="h-4 w-4" style={{ color: '#D1FF00' }} />
          <div>
            <h2 className="text-sm font-light" style={{ color: 'var(--text-primary)' }}>
              Sala de Observacao
            </h2>
            <span className="text-detail" style={{ color: 'var(--text-muted)' }}>
              Monitoramento em tempo real dos agentes de vendas
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <motion.span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: '#4ADE80' }}
              animate={{ opacity: [1, 0.4, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
            />
            <span className="text-detail font-medium" style={{ color: '#4ADE80' }}>
              LIVE
            </span>
          </div>
          <span className="text-detail tabular-nums" style={{ color: 'var(--text-muted)' }}>
            {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        </div>
      </div>

      {/* KPIs */}
      <div
        className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-px border-b"
        style={{
          borderColor: 'rgba(255,255,255,0.06)',
          backgroundColor: 'rgba(255,255,255,0.04)',
        }}
      >
        <KpiCard
          icon={MessageSquare}
          label="Conversas Ativas"
          value={String(metrics.activeConversations)}
          color="#0099FF"
          trend={{ value: 12, positive: true }}
        />
        <KpiCard
          icon={ShoppingCart}
          label="Carrinhos Recuperados"
          value={String(metrics.cartsRecovered)}
          subtitle={formatCurrency(metrics.cartRecoveryValue)}
          color="#D1FF00"
          trend={{ value: 23, positive: true }}
        />
        <KpiCard
          icon={Clock}
          label="Tempo Medio Resposta"
          value={`${metrics.avgResponseTime}s`}
          color="#f59e0b"
          trend={{ value: 5, positive: true }}
        />
        <KpiCard
          icon={TrendingUp}
          label="Taxa Conversao"
          value={`${metrics.conversionRate}%`}
          color="#4ADE80"
          trend={{ value: 3, positive: true }}
        />
        <KpiCard
          icon={Users}
          label="Leads Hoje"
          value={String(metrics.leadsToday)}
          color="#999999"
        />
        <KpiCard
          icon={Zap}
          label="Vendas Fechadas"
          value={String(metrics.salesClosed)}
          color="#D1FF00"
        />
        <KpiCard
          icon={Radio}
          label="Agentes Online"
          value={`${agents.filter((a) => a.status !== 'pausado').length}/${agents.length}`}
          color="#4ADE80"
        />
        <KpiCard
          icon={TrendingUp}
          label="Receita Hoje"
          value={formatCurrency(metrics.totalRevenue)}
          color="#D1FF00"
          trend={{ value: 18, positive: true }}
        />
      </div>

      {/* Main Content: Agent List + Conversation + Activity */}
      <div className="flex-1 flex overflow-hidden">
        {/* Agent List (Left) */}
        <div
          className="w-80 flex-shrink-0 border-r overflow-y-auto"
          style={{ borderColor: 'rgba(255,255,255,0.06)' }}
        >
          <div className="px-4 py-2 border-b" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
            <p className="text-detail font-medium" style={{ color: 'var(--text-muted)' }}>
              AGENTES ({agents.length})
            </p>
          </div>
          <div className="p-2 space-y-1">
            {agents.map((agent) => (
              <AgentCard
                key={agent.id}
                agent={agent}
                isSelected={agent.id === selectedAgentId}
                onClick={() => setSelectedAgentId(agent.id)}
              />
            ))}
          </div>
        </div>

        {/* Conversation (Center) */}
        <div className="flex-1 flex flex-col min-w-0">
          <ConversationView agent={selectedAgent} />
        </div>

        {/* Activity Timeline (Right) */}
        <div
          className="w-80 flex-shrink-0 border-l overflow-y-auto"
          style={{ borderColor: 'rgba(255,255,255,0.06)' }}
        >
          <div className="px-4 py-2 border-b" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
            <p className="text-detail font-medium" style={{ color: 'var(--text-muted)' }}>
              ATIVIDADE RECENTE
            </p>
          </div>
          <div className="py-1">
            <ActivityTimeline activities={activities} />
          </div>
        </div>
      </div>

      {/* Footer Status Bar */}
      <div
        className="px-4 py-2 border-t flex items-center justify-between"
        style={{
          borderColor: 'rgba(255,255,255,0.06)',
          backgroundColor: 'rgba(255,255,255,0.02)',
        }}
      >
        <div className="flex items-center gap-4 text-detail" style={{ color: 'var(--text-muted)' }}>
          <span>
            <strong style={{ color: '#4ADE80' }}>{agents.filter((a) => a.status === 'atendendo' || a.status === 'recuperando-carrinho').length}</strong> atendendo
          </span>
          <span>
            <strong style={{ color: '#f59e0b' }}>{agents.filter((a) => a.status === 'follow-up').length}</strong> follow-up
          </span>
          <span>
            <strong style={{ color: '#999' }}>{agents.filter((a) => a.status === 'ocioso').length}</strong> disponiveis
          </span>
        </div>
        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
          Dados atualizados em tempo real
        </span>
      </div>
    </div>
  );
});
