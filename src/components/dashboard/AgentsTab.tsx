import { motion } from 'framer-motion';
import { GlassCard } from '../ui';
import { useAgentAnalytics, useCommandAnalytics } from '../../hooks/useDashboard';
import { useUIStore } from '../../stores/uiStore';
import { cn } from '../../lib/utils';
import { BarChart, ProgressRing } from './Charts';
import { TerminalIcon } from './dashboard-icons';

// Demo fallback data for AgentsTab
const DEMO_AGENT_ANALYTICS = [
  { agentId: 'dev-agent', agentName: 'Dex (Dev)', squad: 'core-squad', totalExecutions: 24, successRate: 95, avgResponseTime: 1.2 },
  { agentId: 'qa-agent', agentName: 'Quinn (QA)', squad: 'core-squad', totalExecutions: 18, successRate: 100, avgResponseTime: 0.8 },
  { agentId: 'architect-agent', agentName: 'Aria (Architect)', squad: 'core-squad', totalExecutions: 12, successRate: 92, avgResponseTime: 2.1 },
  { agentId: 'pm-agent', agentName: 'Morgan (PM)', squad: 'management-squad', totalExecutions: 9, successRate: 88, avgResponseTime: 1.5 },
];

const DEMO_COMMAND_ANALYTICS = [
  { command: '*develop', totalCalls: 32, avgDuration: 4.2, successRate: 94 },
  { command: '*qa-gate', totalCalls: 18, avgDuration: 2.1, successRate: 100 },
  { command: '*create-story', totalCalls: 14, avgDuration: 1.8, successRate: 92 },
  { command: '*validate', totalCalls: 11, avgDuration: 1.2, successRate: 96 },
  { command: '*push', totalCalls: 8, avgDuration: 3.5, successRate: 87 },
];

export function AgentsTab() {
  const { data: rawAgentAnalytics } = useAgentAnalytics();
  const { data: rawCommandAnalytics } = useCommandAnalytics();
  const { setCurrentView, setSelectedAgentId } = useUIStore();

  const agentAnalytics = rawAgentAnalytics || DEMO_AGENT_ANALYTICS;
  const commandAnalytics = rawCommandAnalytics || DEMO_COMMAND_ANALYTICS;

  const handleAgentClick = (agentId: string) => {
    setSelectedAgentId(agentId);
    setCurrentView('chat');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6 pb-6"
    >
      {/* Top Agents */}
      <GlassCard>
        <h2 className="font-semibold text-primary mb-4">Agents Mais Ativos</h2>
        <div className="space-y-3">
          {agentAnalytics?.slice(0, 8).map((agent, index) => (
            <motion.div
              key={agent.agentId}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => handleAgentClick(agent.agentId)}
              className="flex items-center justify-between p-3 rounded-xl glass-subtle hover:bg-white/10 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-lg font-bold text-tertiary w-6">#{index + 1}</span>
                <div className="min-w-0">
                  <p className="text-primary font-medium truncate">{agent.agentName}</p>
                  <p className="text-xs text-tertiary">{agent.squad}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 flex-shrink-0">
                <div className="text-right">
                  <p className="text-primary font-semibold">{agent.totalExecutions}</p>
                  <p className="text-[10px] text-tertiary">execuções</p>
                </div>
                <div className="text-right">
                  <p className={cn(
                    'font-semibold',
                    agent.successRate >= 90 ? 'text-green-400' : agent.successRate >= 70 ? 'text-yellow-400' : 'text-red-400'
                  )}>
                    {agent.successRate.toFixed(0)}%
                  </p>
                  <p className="text-[10px] text-tertiary">sucesso</p>
                </div>
                <div className="text-right hidden sm:block">
                  <p className="text-secondary font-medium">{agent.avgResponseTime.toFixed(1)}s</p>
                  <p className="text-[10px] text-tertiary">avg time</p>
                </div>
              </div>
            </motion.div>
          ))}
          {agentAnalytics.length === 0 && (
            <p className="text-center text-tertiary py-8">Nenhum dado de execução disponível</p>
          )}
        </div>
      </GlassCard>

      {/* Command Analytics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <GlassCard>
          <h2 className="font-semibold text-primary mb-4">Comandos Mais Usados</h2>
          {commandAnalytics && commandAnalytics.length > 0 ? (
            <BarChart
              data={commandAnalytics.slice(0, 6).map(c => ({
                label: c.command,
                value: c.totalCalls,
              }))}
              horizontal
              height={200}
            />
          ) : (
            <p className="text-center text-tertiary py-8">Nenhum comando registrado</p>
          )}
        </GlassCard>

        <GlassCard>
          <h2 className="font-semibold text-primary mb-4">Performance por Comando</h2>
          <div className="space-y-3">
            {commandAnalytics?.slice(0, 5).map((cmd) => (
              <div key={cmd.command} className="flex items-center justify-between p-2 rounded-lg glass-subtle">
                <div className="flex items-center gap-2">
                  <TerminalIcon />
                  <span className="text-sm text-primary">{cmd.command}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-tertiary">{cmd.avgDuration.toFixed(1)}s</span>
                  <ProgressRing value={cmd.successRate} size={32} thickness={3} />
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </motion.div>
  );
}
