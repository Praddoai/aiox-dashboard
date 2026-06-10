import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Play, Pause, RefreshCw, Moon, FlaskConical } from 'lucide-react';
import { GlassButton, Badge, StatusDot, SectionLabel } from '../ui';
import { AgentMonitorCard, type AgentMonitorData } from './AgentMonitorCard';
import { AgentActivityTimeline } from './AgentActivityTimeline';
import { AgentPerformanceStats } from './AgentPerformanceStats';
import { useAgents } from '../../hooks/useAgents';
import { useAgentPerformance, useAgentActivity } from '../../hooks/useAnalytics';
import type { AgentPerformance } from '../../services/api/analytics';
import type { AgentActivityEntry } from '../../types';
import { cn } from '../../lib/utils';
import { aiosRegistry } from '../../data/aios-registry.generated';

const POLLING_INTERVAL = 5000;

// ---------------------------------------------------------------------------
// Demo fallback data – derived from AIOS registry
// ---------------------------------------------------------------------------

// Demo runtime states for fallback display
const DEMO_STATES: Array<{ status: AgentMonitorData['status']; phase: string; progress: number; story: string }> = [
  { status: 'working', phase: 'Implementing Story 3.2', progress: 65, story: 'STORY-3.2' },
  { status: 'working', phase: 'Writing tests', progress: 40, story: 'STORY-3.2' },
  { status: 'idle', phase: '', progress: 0, story: '' },
  { status: 'working', phase: 'Creating Story 3.3', progress: 20, story: 'EPIC-3' },
  { status: 'error', phase: 'QA Gate failed', progress: 85, story: 'STORY-3.1' },
  { status: 'idle', phase: '', progress: 0, story: '' },
  { status: 'working', phase: 'Component audit', progress: 80, story: 'STORY-DS-1.4' },
  { status: 'idle', phase: '', progress: 0, story: '' },
];

const demoAgents: AgentMonitorData[] = aiosRegistry.agents.map((agent, i) => {
  const state = DEMO_STATES[i % DEMO_STATES.length];
  return {
    id: agent.id,
    name: `${agent.name} (${agent.title.split(' ')[0]})`,
    status: state.status,
    phase: state.phase,
    progress: state.progress,
    story: state.story,
    lastActivity: new Date(Date.now() - (i + 1) * 120_000).toISOString(),
    model: i % 3 === 0 ? 'opus' : i % 3 === 1 ? 'sonnet' : 'haiku',
    squad: 'aios-core',
    totalExecutions: Math.floor(Math.random() * 150) + 20,
    successRate: Math.floor(Math.random() * 10) + 90,
    avgResponseTime: Math.floor(Math.random() * 2000) + 800,
  };
});

// Demo activity actions keyed by agent index for variety
const DEMO_ACTIONS: Array<{ action: string; status: 'success' | 'error'; duration: number }> = [
  { action: 'Committed feat: implement agent monitor cards [Story 3.2]', status: 'success', duration: 4500 },
  { action: 'Running unit tests for AgentMonitorCard', status: 'success', duration: 12300 },
  { action: 'QA Gate — accessibility check failed (missing aria-labels)', status: 'error', duration: 8700 },
  { action: 'Created draft for Story 3.3: Agent Performance Dashboard', status: 'success', duration: 3200 },
  { action: 'Refactored useAgents hook to support polling interval', status: 'success', duration: 6100 },
  { action: 'Auditing GlassCard component for token compliance', status: 'success', duration: 5400 },
  { action: 'Approved architecture for analytics service layer', status: 'success', duration: 15200 },
  { action: 'QA Gate — Story 3.1 lint & typecheck passed', status: 'success', duration: 9800 },
  { action: 'Updated Epic 3 execution plan with revised estimates', status: 'success', duration: 4100 },
  { action: 'Deployed staging build v0.4.2 via CI/CD pipeline', status: 'success', duration: 22400 },
];

// Use at least 6 different agents, cycling through the first 8 from the registry
const DEMO_ACTIVITY_AGENT_INDICES = [4, 8, 8, 10, 4, 11, 2, 8, 6, 5];

const demoActivity: AgentActivityEntry[] = DEMO_ACTIONS.map((entry, i) => ({
  id: `demo-act-${i + 1}`,
  agentId: aiosRegistry.agents[DEMO_ACTIVITY_AGENT_INDICES[i] % aiosRegistry.agents.length]?.id || 'dev',
  timestamp: new Date(Date.now() - (i + 1) * 60_000 * (i + 1)).toISOString(),
  action: entry.action,
  status: entry.status,
  duration: entry.duration,
}));

// Map API data to monitor format, using analytics for performance enrichment
function mapToMonitorData(
  agent: { id: string; name: string; squad: string; tier: number },
  perfLookup: Map<string, AgentPerformance>
): AgentMonitorData {
  const perf = perfLookup.get(agent.id);
  const modelMap: Record<number, string> = { 0: 'opus', 1: 'sonnet', 2: 'haiku' };

  return {
    id: agent.id,
    name: agent.name,
    status: 'idle',
    phase: '',
    progress: 0,
    story: '',
    lastActivity: perf?.lastActive || '-',
    model: modelMap[agent.tier] ?? 'sonnet',
    squad: agent.squad,
    totalExecutions: perf?.totalExecutions,
    successRate: perf?.successRate,
    avgResponseTime: perf?.avgDuration,
  };
}

export default function AgentsMonitor() {
  const [isLive, setIsLive] = useState(true);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);

  const { data: apiAgents, refetch, isLoading } = useAgents(undefined, {
    refetchInterval: isLive ? POLLING_INTERVAL : false,
  });

  const { data: perfData } = useAgentPerformance();
  const { data: activityData } = useAgentActivity();

  // Build analytics performance lookup
  const perfLookup = useMemo(
    () => new Map((perfData || []).map((p) => [p.agentId, p])),
    [perfData]
  );

  // Map API agents with analytics enrichment; fall back to demo data
  const isDemo = !apiAgents || apiAgents.length === 0;

  const agents: AgentMonitorData[] = useMemo(() => {
    if (apiAgents && apiAgents.length > 0) {
      return apiAgents.map((a) => mapToMonitorData(a, perfLookup));
    }
    // Fallback to demo data when API is unavailable
    return demoAgents;
  }, [apiAgents, perfLookup]);

  const activeAgents = agents.filter(
    (a) => a.status === 'working' || a.status === 'waiting' || a.status === 'error'
  );
  const standbyAgents = agents.filter((a) => a.status === 'idle');

  const activity = activityData && activityData.length > 0 ? activityData : isDemo ? demoActivity : [];

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const handleCardClick = useCallback((agentId: string) => {
    setSelectedAgentId((prev) => (prev === agentId ? null : agentId));
  }, []);

  return (
    <div className="h-full flex flex-col overflow-y-auto p-4 md:p-6 gap-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-primary">Agent Activity</h1>
          <Badge variant="status" status="online" size="sm">
            {activeAgents.length}/{agents.length} active
          </Badge>
          {isDemo && (
            <Badge variant="default" size="sm" className="flex items-center gap-1 text-yellow-400 bg-yellow-500/10">
              <FlaskConical className="h-3 w-3" />
              Demo
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <GlassButton
            size="sm"
            variant={isLive ? 'primary' : 'default'}
            leftIcon={
              isLive ? (
                <Pause className="h-3.5 w-3.5" />
              ) : (
                <Play className="h-3.5 w-3.5" />
              )
            }
            onClick={() => setIsLive(!isLive)}
          >
            {isLive ? 'Live' : 'Paused'}
          </GlassButton>
          <GlassButton
            size="sm"
            variant="ghost"
            leftIcon={
              <RefreshCw
                className={cn('h-3.5 w-3.5', isLoading && 'animate-spin')}
              />
            }
            onClick={handleRefresh}
          >
            Refresh
          </GlassButton>
        </div>
      </div>

      {/* Performance Stats */}
      <AgentPerformanceStats agents={agents} />

      {/* Active Section */}
      <section>
        <SectionLabel count={activeAgents.length}>Active Agents</SectionLabel>
        <AnimatePresence mode="popLayout">
          {activeAgents.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {activeAgents.map((agent, i) => (
                <motion.div
                  key={`${agent.squad}-${agent.id}`}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: i * 0.05, duration: 0.25 }}
                >
                  <AgentMonitorCard
                    agent={agent}
                    onClick={() => handleCardClick(agent.id)}
                  />
                </motion.div>
              ))}
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="glass-subtle rounded-glass p-8 text-center"
            >
              <Moon className="h-8 w-8 text-tertiary mx-auto mb-2" />
              <p className="text-sm text-secondary">
                Nenhum agente ativo no momento
              </p>
              <p className="text-[10px] text-tertiary mt-1">
                Ative via CLI: @agent-name
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* Standby Section */}
      <section>
        <SectionLabel count={standbyAgents.length}>Standby</SectionLabel>
        {standbyAgents.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {standbyAgents.map((agent) => (
              <motion.button
                key={`${agent.squad}-${agent.id}`}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={() => handleCardClick(agent.id)}
                className={cn(
                  'glass-subtle rounded-xl px-3 py-2 flex items-center gap-2',
                  'text-xs text-secondary transition-all duration-150',
                  'hover:bg-white/[0.03] hover:text-primary',
                  selectedAgentId === agent.id &&
                    'ring-1 ring-cyan-500/30 bg-white/[0.03]',
                )}
              >
                <StatusDot status="idle" size="sm" />
                <span className="font-medium">{agent.name}</span>
                {agent.model && (
                  <span className="text-[9px] text-tertiary">
                    ({agent.model})
                  </span>
                )}
              </motion.button>
            ))}
          </div>
        ) : (
          !isLoading &&
          agents.length === 0 && (
            <div className="glass-subtle rounded-glass p-6 text-center">
              <Bot className="h-8 w-8 text-tertiary mx-auto mb-2" />
              <p className="text-sm text-secondary">Nenhum agente encontrado</p>
            </div>
          )
        )}
      </section>

      {/* Activity Timeline */}
      <section>
        <SectionLabel
          count={
            selectedAgentId
              ? activity.filter((e) => e.agentId === selectedAgentId).length
              : activity.length
          }
        >
          {selectedAgentId
            ? `Atividade: @${selectedAgentId}`
            : 'Atividade Recente'}
        </SectionLabel>
        <AgentActivityTimeline
          entries={activity}
          agentFilter={selectedAgentId}
        />
      </section>

      {/* Footer: polling indicator */}
      <div className="mt-auto pt-2 text-center">
        <span className="text-[11px] text-tertiary">
          {isLoading ? 'Carregando...' : 'Atualizado'}
          {isLive && (
            <span className="ml-2 inline-flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
              polling a cada {POLLING_INTERVAL / 1000}s
            </span>
          )}
          {!isLive && (
            <span className="ml-2 text-yellow-500">pausado</span>
          )}
        </span>
      </div>
    </div>
  );
}
