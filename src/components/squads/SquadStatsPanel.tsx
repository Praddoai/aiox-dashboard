import { motion } from 'framer-motion';
import { Users, Cpu, Shield, Mic, Ban, Terminal } from 'lucide-react';
import { GlassCard, Badge, ProgressBar } from '../ui';
import type { SquadStats } from '../../types';

interface SquadStatsPanelProps {
  stats: SquadStats | null | undefined;
}

const tierBadges: Array<{ key: string; label: string; color: string; bg: string }> = [
  { key: '0', label: 'Orchestrator', color: 'text-purple-400', bg: 'bg-purple-500/15' },
  { key: '1', label: 'Master', color: 'text-blue-400', bg: 'bg-blue-500/15' },
  { key: '2', label: 'Specialist', color: 'text-green-400', bg: 'bg-green-500/15' },
];

function MetricCard({
  icon,
  label,
  children,
  delay = 0,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
    >
      <GlassCard padding="md" className="h-full">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-cyan-400">{icon}</span>
          <span className="text-xs font-semibold text-secondary uppercase tracking-wider">{label}</span>
        </div>
        {children}
      </GlassCard>
    </motion.div>
  );
}

export function SquadStatsPanel({ stats }: SquadStatsPanelProps) {
  if (!stats) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <GlassCard key={i} padding="md" className="h-24 animate-pulse">
            <div className="h-3 w-20 bg-white/5 rounded mb-3" />
            <div className="h-6 w-16 bg-white/5 rounded" />
          </GlassCard>
        ))}
      </div>
    );
  }

  const { totalAgents, byTier, quality, commands, qualityScore } = stats.stats;
  const voiceDnaPct = totalAgents > 0 ? Math.round((quality.withVoiceDna / totalAgents) * 100) : 0;
  const antiPatternsPct = totalAgents > 0 ? Math.round((quality.withAntiPatterns / totalAgents) * 100) : 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {/* Total Agents */}
      <MetricCard icon={<Users size={16} />} label="Total Agents" delay={0}>
        <p className="text-3xl font-bold text-primary">{totalAgents}</p>
      </MetricCard>

      {/* By Tier */}
      <MetricCard icon={<Cpu size={16} />} label="By Tier" delay={0.05}>
        <div className="flex flex-wrap gap-2">
          {tierBadges.map((t) => (
            <Badge key={t.key} variant="default" size="sm" className={t.bg}>
              <span className={t.color}>{t.label}: {byTier[t.key] || 0}</span>
            </Badge>
          ))}
        </div>
      </MetricCard>

      {/* Quality Score */}
      <MetricCard icon={<Shield size={16} />} label="Quality Score" delay={0.1}>
        <div className="space-y-2">
          <p className="text-2xl font-bold text-primary">{qualityScore}%</p>
          <ProgressBar
            value={qualityScore}
            variant={qualityScore >= 80 ? 'success' : qualityScore >= 50 ? 'warning' : 'error'}
            size="sm"
            glow
          />
        </div>
      </MetricCard>

      {/* Voice DNA Coverage */}
      <MetricCard icon={<Mic size={16} />} label="Voice DNA" delay={0.15}>
        <div className="space-y-2">
          <p className="text-sm text-primary">
            <span className="text-lg font-bold">{quality.withVoiceDna}</span>
            <span className="text-tertiary"> / {totalAgents}</span>
          </p>
          <ProgressBar value={voiceDnaPct} variant="info" size="sm" showLabel />
        </div>
      </MetricCard>

      {/* Anti-Patterns Coverage */}
      <MetricCard icon={<Ban size={16} />} label="Anti-Patterns" delay={0.2}>
        <div className="space-y-2">
          <p className="text-sm text-primary">
            <span className="text-lg font-bold">{quality.withAntiPatterns}</span>
            <span className="text-tertiary"> / {totalAgents}</span>
          </p>
          <ProgressBar value={antiPatternsPct} variant="info" size="sm" showLabel />
        </div>
      </MetricCard>

      {/* Total Commands */}
      <MetricCard icon={<Terminal size={16} />} label="Commands" delay={0.25}>
        <p className="text-3xl font-bold text-primary">{commands.total}</p>
        {commands.byAgent.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {commands.byAgent.slice(0, 3).map((entry) => (
              <span key={entry.agentId} className="text-[10px] text-tertiary">
                {entry.agentId}: {entry.count}
              </span>
            ))}
          </div>
        )}
      </MetricCard>
    </div>
  );
}
