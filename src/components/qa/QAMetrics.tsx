import { motion } from 'framer-motion';
import {
  Shield,
  CheckCircle,
  Clock,
  AlertTriangle,
  Bug,
  Lock,
  Database,
  ThumbsUp,
  ThumbsDown,
  BookOpen,
} from 'lucide-react';
import { GlassCard, Badge, ProgressBar, SectionLabel, StatusDot } from '../ui';

// --- Mock Data ---

const overview = [
  { label: 'Total Reviews', value: '156', icon: Shield, color: 'text-blue-400' },
  { label: 'Pass Rate', value: '92%', icon: CheckCircle, color: 'text-green-400' },
  { label: 'Avg Review Time', value: '45s', icon: Clock, color: 'text-cyan-400' },
  { label: 'Critical Issues', value: '3', icon: AlertTriangle, color: 'text-red-400' },
];

const dailyTrend = [
  { day: 'Mon', passed: 18, failed: 2 },
  { day: 'Tue', passed: 22, failed: 1 },
  { day: 'Wed', passed: 15, failed: 3 },
  { day: 'Thu', passed: 20, failed: 2 },
  { day: 'Fri', passed: 24, failed: 1 },
  { day: 'Sat', passed: 10, failed: 0 },
  { day: 'Sun', passed: 5, failed: 1 },
];

const maxDaily = Math.max(...dailyTrend.map((d) => d.passed + d.failed));

const validationModules = [
  {
    name: 'Library Scan',
    icon: Bug,
    status: 'success' as const,
    lastRun: '12m ago',
    findings: 2,
    description: 'Scans for vulnerable or deprecated dependencies',
  },
  {
    name: 'Security Audit',
    icon: Lock,
    status: 'working' as const,
    lastRun: '3h ago',
    findings: 1,
    description: 'Checks for hardcoded secrets and security patterns',
  },
  {
    name: 'Migration Check',
    icon: Database,
    status: 'error' as const,
    lastRun: '1h ago',
    findings: 3,
    description: 'Validates database migration consistency',
  },
];

const patternFeedback = { accepted: 42, rejected: 8 };
const gotchasRegistry = { total: 23, recent: ['CSS @media keyword collision', 'Meta API content-type quirk', 'AC API v1 vs v3 differences'] };

// --- Component ---

export default function QAMetrics() {
  return (
    <div className="h-full overflow-y-auto glass-scrollbar p-6 space-y-6" tabIndex={0} role="region" aria-label="Metricas de qualidade">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Shield size={22} className="text-green-400" />
        <h1 className="text-xl font-semibold text-primary">QA Metrics</h1>
        <Badge variant="status" status="success" size="sm">Healthy</Badge>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {overview.map((metric, i) => (
          <GlassCard key={metric.label} padding="md" motionProps={{ transition: { delay: i * 0.05 } }}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-secondary uppercase tracking-wider">{metric.label}</p>
                <p className="text-2xl font-bold text-primary mt-1">{metric.value}</p>
              </div>
              <metric.icon size={18} className={metric.color} />
            </div>
          </GlassCard>
        ))}
      </div>

      {/* Daily Trend + Validation Modules */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Daily Trend */}
        <GlassCard padding="md">
          <SectionLabel>Daily Trend (Last 7 Days)</SectionLabel>
          <div className="flex items-end justify-between gap-3 h-36 mt-4">
            {dailyTrend.map((day) => {
              const total = day.passed + day.failed;
              const passedH = (day.passed / maxDaily) * 100;
              const failedH = (day.failed / maxDaily) * 100;
              return (
                <div key={day.day} className="flex flex-col items-center gap-1 flex-1">
                  <span className="text-[10px] text-tertiary">{total}</span>
                  <div className="w-full flex flex-col-reverse gap-px" style={{ height: `${((total) / maxDaily) * 100}%`, minHeight: 4 }}>
                    <motion.div
                      className="w-full bg-green-500/70 rounded-b-md"
                      initial={{ height: 0 }}
                      animate={{ height: `${passedH / (passedH + failedH) * 100}%` }}
                      transition={{ duration: 0.4 }}
                      style={{ minHeight: day.passed > 0 ? 2 : 0 }}
                    />
                    {day.failed > 0 && (
                      <motion.div
                        className="w-full bg-red-500/70 rounded-t-md"
                        initial={{ height: 0 }}
                        animate={{ height: `${failedH / (passedH + failedH) * 100}%` }}
                        transition={{ duration: 0.4, delay: 0.1 }}
                        style={{ minHeight: 2 }}
                      />
                    )}
                  </div>
                  <span className="text-[10px] text-secondary">{day.day}</span>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-4 mt-3 justify-center">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-green-500/70" />
              <span className="text-[10px] text-secondary">Passed</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-red-500/70" />
              <span className="text-[10px] text-secondary">Failed</span>
            </div>
          </div>
        </GlassCard>

        {/* Validation Modules */}
        <GlassCard padding="md">
          <SectionLabel count={validationModules.length}>Validation Modules</SectionLabel>
          <div className="space-y-3">
            {validationModules.map((mod) => (
              <div key={mod.name} className="glass-subtle rounded-xl p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <mod.icon size={16} className="text-secondary" />
                    <span className="text-sm font-medium text-primary">{mod.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusDot status={mod.status} size="sm" />
                    <Badge
                      variant="status"
                      status={mod.status === 'success' ? 'success' : mod.status === 'error' ? 'error' : 'warning'}
                      size="sm"
                    >
                      {mod.findings} findings
                    </Badge>
                  </div>
                </div>
                <p className="text-xs text-tertiary mt-1.5">{mod.description}</p>
                <p className="text-[10px] text-tertiary mt-1">Last run: {mod.lastRun}</p>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* Learning System */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pattern Feedback */}
        <GlassCard padding="md">
          <SectionLabel>Pattern Feedback</SectionLabel>
          <div className="flex items-center gap-6 mt-2">
            <div className="flex items-center gap-2">
              <ThumbsUp size={18} className="text-green-400" />
              <div>
                <p className="text-xl font-bold text-primary">{patternFeedback.accepted}</p>
                <p className="text-xs text-secondary">Accepted</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ThumbsDown size={18} className="text-red-400" />
              <div>
                <p className="text-xl font-bold text-primary">{patternFeedback.rejected}</p>
                <p className="text-xs text-secondary">Rejected</p>
              </div>
            </div>
          </div>
          <ProgressBar
            value={(patternFeedback.accepted / (patternFeedback.accepted + patternFeedback.rejected)) * 100}
            variant="success"
            size="md"
            label="Acceptance Rate"
            showLabel
            className="mt-4"
          />
        </GlassCard>

        {/* Gotchas Registry */}
        <GlassCard padding="md">
          <SectionLabel count={gotchasRegistry.total}>Gotchas Registry</SectionLabel>
          <div className="flex items-center gap-2 mt-1">
            <BookOpen size={16} className="text-yellow-400" />
            <span className="text-sm text-secondary">{gotchasRegistry.total} gotchas documented</span>
          </div>
          <div className="mt-3 space-y-2">
            <p className="text-[10px] text-tertiary uppercase tracking-wider">Recent Additions</p>
            {gotchasRegistry.recent.map((g) => (
              <div key={g} className="flex items-center gap-2 glass-subtle rounded-lg px-3 py-2">
                <AlertTriangle size={12} className="text-yellow-400 flex-shrink-0" />
                <span className="text-xs text-primary truncate">{g}</span>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
