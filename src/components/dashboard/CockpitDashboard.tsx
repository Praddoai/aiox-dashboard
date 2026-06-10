import React, { useMemo, useState, useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'
import {
  CockpitKpiCard,
  CockpitAlert,
  CockpitBadge,
  CockpitButton,
  CockpitSpinner,
  CockpitTickerStrip,
  CockpitSectionDivider,
  CockpitFooterBar,
  CockpitStatusIndicator,
} from '../ui/cockpit'
import { useSquads } from '../../hooks/useSquads'
import { useAgents } from '../../hooks/useAgents'
import { useExecutionHistory, useTokenUsage, useLLMHealth } from '../../hooks/useExecute'
import { useMCPStats, useSystemMetrics, useCostSummary } from '../../hooks/useDashboard'

export default function CockpitDashboard({ viewToggle }: { viewToggle?: React.ReactNode } = {}) {
  const { data: squads } = useSquads()
  const { data: agents } = useAgents()
  const { data: historyData } = useExecutionHistory(100)
  const { data: tokenUsage } = useTokenUsage()
  const { data: llmHealth } = useLLMHealth()
  const { data: mcpStats } = useMCPStats()
  const { data: metrics } = useSystemMetrics()
  const { data: costSummary } = useCostSummary()

  const executions = useMemo(() => historyData?.executions || [], [historyData?.executions])
  const completedCount = executions.filter(e => e.status === 'completed').length
  const successRate = executions.length > 0 ? Math.round((completedCount / executions.length) * 100) : 100

  // Show spinner only during initial load — never block forever
  const [initialLoad, setInitialLoad] = useState(true);
  useEffect(() => { const t = setTimeout(() => setInitialLoad(false), 1500); return () => clearTimeout(t); }, []);
  const isLoading = initialLoad && !squads && !agents

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '1rem' }}>
        <CockpitSpinner size="lg" />
        <span style={{ fontFamily: 'var(--font-family-mono)', fontSize: '0.7rem', color: 'var(--aiox-gray-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Initializing cockpit...
        </span>
      </div>
    )
  }

  const claudeOk = llmHealth?.claude.available ?? false
  const openaiOk = llmHealth?.openai.available ?? false
  const allHealthy = claudeOk && openaiOk

  return (
    <div style={{ height: '100%', overflow: 'auto', padding: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-family-display)', fontSize: '1.75rem', fontWeight: 700, color: 'var(--aiox-cream)', lineHeight: 1, margin: 0 }}>
              Dashboard
            </h1>
            <p style={{ fontFamily: 'var(--font-family-mono)', fontSize: '0.6rem', color: 'var(--aiox-gray-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '0.25rem' }}>
              AIOS Core Platform — Real-time Overview
            </p>
          </div>
          {viewToggle}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <CockpitBadge variant={allHealthy ? 'lime' : 'error'}>
            {allHealthy ? 'All Systems Go' : 'Degraded'}
          </CockpitBadge>
          <CockpitButton variant="secondary" size="sm">
            Refresh
          </CockpitButton>
        </div>
      </div>

      {/* Ticker */}
      <CockpitTickerStrip
        items={[
          `${agents?.length || 0} Agents Online`,
          `${executions.length} Executions`,
          `${successRate}% Success Rate`,
          `${mcpStats?.totalTools || 0} MCP Tools`,
          `Latency ${metrics?.avgLatency.toFixed(0) || '—'}ms`,
        ]}
        speed={25}
        style={{ marginBottom: '1.5rem' }}
      />

      {/* Alerts */}
      {!allHealthy && (
        <div style={{ marginBottom: '1.5rem' }}>
          {!claudeOk && (
            <CockpitAlert variant="error" title="Claude API" icon={<AlertTriangle size={14} />}>
              Claude API is unavailable. Agent executions may fail.
            </CockpitAlert>
          )}
          {!openaiOk && (
            <CockpitAlert variant="warning" title="OpenAI API" icon={<AlertTriangle size={14} />} style={{ marginTop: '0.5rem' }}>
              OpenAI API is unavailable. Fallback models may be affected.
            </CockpitAlert>
          )}
        </div>
      )}

      <CockpitSectionDivider label="Key Metrics" num="01" style={{ marginBottom: '1rem' }} />

      {/* KPI Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <CockpitKpiCard
          label="Squads"
          value={squads?.length || 0}
          change={`${squads?.length || 0} active`}
          trend="neutral"
        />
        <CockpitKpiCard
          label="Agents"
          value={agents?.length || 0}
          change="Online"
          trend="up"
        />
        <CockpitKpiCard
          label="Executions"
          value={executions.length}
          change={`${successRate}% success`}
          trend={successRate >= 90 ? 'up' : successRate >= 70 ? 'neutral' : 'down'}
        />
        <CockpitKpiCard
          label="MCP Tools"
          value={mcpStats?.totalTools || 0}
          change={`${mcpStats?.connectedServers || 0} servers`}
          trend={mcpStats?.connectedServers ? 'up' : 'down'}
        />
        <CockpitKpiCard
          label="Cost Today"
          value={`$${costSummary?.today.toFixed(2) || '0.00'}`}
          change={`$${costSummary?.thisMonth.toFixed(2) || '0.00'} this month`}
          trend="neutral"
        />
        <CockpitKpiCard
          label="Latency"
          value={metrics ? `${metrics.avgLatency.toFixed(0)}ms` : '—'}
          change={metrics ? `${metrics.requestsPerMinute.toFixed(1)} req/min` : ''}
          trend={metrics && metrics.avgLatency < 500 ? 'up' : 'down'}
        />
      </div>

      {/* Services Grid */}
      <CockpitSectionDivider label="Services" num="02" concept="Health" style={{ marginBottom: '1rem' }} />
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
          <ServiceRow name="Claude API" ok={claudeOk} />
          <ServiceRow name="OpenAI API" ok={openaiOk} />
          <ServiceRow name="MCP Servers" ok={(mcpStats?.connectedServers || 0) > 0} detail={`${mcpStats?.connectedServers || 0}/${mcpStats?.totalServers || 0}`} />
          <ServiceRow name="API Gateway" ok={true} detail={metrics ? `${metrics.avgLatency.toFixed(0)}ms` : ''} />
        </div>
      </div>

      {/* Tokens Summary */}
      <CockpitSectionDivider label="Token Usage" num="03" style={{ marginBottom: '1rem' }} />
      <div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
          <CockpitKpiCard
            label="Total Tokens"
            value={formatNumber((tokenUsage?.total.input ?? 0) + (tokenUsage?.total.output ?? 0))}
            change={`${tokenUsage?.total.requests ?? 0} requests`}
            trend="neutral"
          />
          <CockpitKpiCard
            label="Claude Tokens"
            value={formatNumber((tokenUsage?.claude.input ?? 0) + (tokenUsage?.claude.output ?? 0))}
            trend="neutral"
          />
          <CockpitKpiCard
            label="OpenAI Tokens"
            value={formatNumber((tokenUsage?.openai.input ?? 0) + (tokenUsage?.openai.output ?? 0))}
            trend="neutral"
          />
        </div>
      </div>

      {/* Footer */}
      <CockpitFooterBar
        left="AIOS Platform"
        center="Synkra Labs"
        right={new Date().getFullYear().toString()}
        style={{ marginTop: '2rem' }}
      />
    </div>
  )
}

function ServiceRow({ name, ok, detail }: { name: string; ok: boolean; detail?: string }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0.75rem 1rem',
      background: 'var(--aiox-surface)',
      border: '1px solid rgba(156, 156, 156, 0.15)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <CockpitStatusIndicator status={ok ? 'online' : 'offline'} pulse={ok} />
        <span style={{ fontFamily: 'var(--font-family-mono)', fontSize: '0.65rem', color: 'var(--aiox-cream)' }}>
          {name}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        {detail && (
          <span style={{ fontFamily: 'var(--font-family-mono)', fontSize: '0.55rem', color: 'var(--aiox-gray-muted)' }}>
            {detail}
          </span>
        )}
        <CockpitBadge variant={ok ? 'lime' : 'error'}>
          {ok ? 'OK' : 'Down'}
        </CockpitBadge>
      </div>
    </div>
  )
}

function formatNumber(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`
  return num.toString()
}
