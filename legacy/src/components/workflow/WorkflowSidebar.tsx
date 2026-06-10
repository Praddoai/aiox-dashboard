'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GlassAvatar } from '@/components/ui/GlassAvatar';
import { cn, formatRelativeTime } from '@/lib/utils';
import type { WorkflowMission, WorkflowOperation } from './types';

// Icons
const ChevronRightIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

const SpinnerIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin">
    <path d="M21 12a9 9 0 11-6.219-8.56" />
  </svg>
);

const CheckIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const ClockIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const RocketIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 00-2.91-.09z" />
    <path d="M12 15l-3-3a22 22 0 012-3.95A12.88 12.88 0 0122 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 01-4 2z" />
    <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
    <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
  </svg>
);

const UsersIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 00-3-3.87" />
    <path d="M16 3.13a4 4 0 010 7.75" />
  </svg>
);

const ActivityIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </svg>
);

interface WorkflowSidebarProps {
  mission: WorkflowMission;
  operations: WorkflowOperation[];
  selectedNodeId: string | null;
  onSelectNode: (id: string | null) => void;
  onViewMission: () => void;
}

export function WorkflowSidebar({
  mission,
  operations,
  selectedNodeId,
  onSelectNode,
  onViewMission,
}: WorkflowSidebarProps) {
  return (
    <div
      className="w-80 border-r border-glass-10 flex flex-col relative overflow-hidden backdrop-blur-xl"
      style={{
        background: `
          radial-gradient(ellipse 80% 50% at 0% 100%, rgba(255, 90, 60, 0.12) 0%, transparent 50%),
          radial-gradient(ellipse 60% 80% at 100% 0%, rgba(140, 60, 180, 0.10) 0%, transparent 50%),
          rgba(15, 15, 20, 0.65)
        `
      }}
    >
      {/* Mission Header */}
      <div className="p-4 border-b border-glass-10">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
            <RocketIcon />
          </div>
          <h3 className="text-xs font-semibold text-foreground-secondary uppercase tracking-wider">
            Missao Ativa
          </h3>
          <Badge variant="outline" className="ml-auto text-[10px]">
            #{mission.id.split('-')[1]}
          </Badge>
        </div>

        <div
          className="relative rounded-xl p-3 cursor-pointer transition-all hover:scale-[1.02] group border border-[rgba(59,130,246,0.2)]"
          onClick={onViewMission}
          style={{
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(6, 182, 212, 0.1) 100%)',
          }}
        >
          <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/10 to-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />

          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-foreground-primary font-medium text-sm">{mission.name}</h4>
              <ChevronRightIcon />
            </div>
            <p className="text-foreground-tertiary text-xs mb-3 line-clamp-2">{mission.description}</p>

            {/* Progress */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-foreground-secondary">Progresso geral</span>
                <span className="text-foreground-primary font-semibold">{mission.progress}%</span>
              </div>
              <div className="h-2 rounded-full bg-scrim-30 overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                  initial={{ width: 0 }}
                  animate={{ width: `${mission.progress}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Active Agents */}
      <div className="p-4 border-b border-glass-10">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <UsersIcon />
          </div>
          <h3 className="text-xs font-semibold text-foreground-secondary uppercase tracking-wider">
            Agents na Missao
          </h3>
          <Badge variant="outline" className="ml-auto text-[10px]">
            {mission.agents.length}
          </Badge>
        </div>

        <div className="space-y-1.5">
          {mission.agents.map((agent, index) => {
            const node = mission.nodes.find((n) => n.agentName === agent.name);
            const isSelected = node && selectedNodeId === node.id;

            const squadGradients: Record<string, string> = {
              copywriting: 'from-orange-500/20 to-amber-500/20',
              design: 'from-purple-500/20 to-pink-500/20',
              creator: 'from-green-500/20 to-emerald-500/20',
              orchestrator: 'from-cyan-500/20 to-blue-500/20',
            };

            return (
              <motion.div
                key={agent.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={cn(
                  'flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all',
                  `bg-gradient-to-r ${squadGradients[agent.squadType] || 'from-gray-500/20 to-gray-400/20'}`,
                  'border border-transparent hover:border-glass-10',
                  isSelected && 'ring-1 ring-white/30 border-glass-20'
                )}
                onClick={() => node && onSelectNode(node.id)}
              >
                <GlassAvatar
                  name={agent.name}
                  size="sm"
                  squadType={agent.squadType as 'copywriting' | 'design' | 'creator' | 'orchestrator' | 'default'}
                  status={agent.status === 'working' ? 'online' : agent.status === 'waiting' ? 'busy' : 'offline'}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-foreground-primary text-sm font-medium">{agent.name}</p>
                  <p className="text-foreground-tertiary text-xs truncate">{agent.currentTask}</p>
                </div>
                <div className="flex-shrink-0">
                  {agent.status === 'working' && (
                    <span className="flex items-center gap-1 text-[10px] text-orange-400">
                      <SpinnerIcon />
                    </span>
                  )}
                  {agent.status === 'completed' && (
                    <span className="flex items-center gap-1 text-[10px] text-green-400">
                      <CheckIcon />
                    </span>
                  )}
                  {agent.status === 'waiting' && (
                    <span className="flex items-center gap-1 text-[10px] text-yellow-400">
                      <ClockIcon />
                    </span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Operations Log */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="px-4 pt-4 pb-2 flex items-center gap-2">
          <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
            <ActivityIcon />
          </div>
          <h3 className="text-xs font-semibold text-foreground-secondary uppercase tracking-wider">
            Log de Operacoes
          </h3>
          <Badge variant="outline" className="ml-auto text-[10px]">
            {operations.length}
          </Badge>
        </div>

        <div className="flex-1 overflow-y-auto glass-scrollbar px-4 pb-4">
          <div className="space-y-2">
            {operations.map((op, index) => (
              <OperationItem key={op.id} operation={op} index={index} />
            ))}
          </div>
        </div>
      </div>

      {/* Footer Stats */}
      <div className="p-4 border-t border-glass-10">
        <div className="grid grid-cols-3 gap-2 text-center">
          <StatBox
            label="Concluidas"
            value={operations.filter((o) => o.status === 'completed').length}
            color="green"
          />
          <StatBox
            label="Em execucao"
            value={operations.filter((o) => o.status === 'running').length}
            color="orange"
          />
          <StatBox
            label="Pendentes"
            value={operations.filter((o) => o.status === 'pending').length}
            color="gray"
          />
        </div>
      </div>
    </div>
  );
}

function OperationItem({ operation, index }: { operation: WorkflowOperation; index: number }) {
  const squadStyles: Record<string, { border: string; bg: string }> = {
    copywriting: { border: 'border-l-orange-500', bg: 'from-orange-500/10' },
    design: { border: 'border-l-purple-500', bg: 'from-purple-500/10' },
    creator: { border: 'border-l-green-500', bg: 'from-green-500/10' },
    orchestrator: { border: 'border-l-cyan-500', bg: 'from-cyan-500/10' },
  };

  const style = squadStyles[operation.squadType] || { border: 'border-l-gray-500', bg: 'from-gray-500/10' };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className={cn(
        'rounded-lg p-3 border border-[var(--glass-border-color-subtle)] border-l-2 transition-all hover:translate-x-1',
        style.border,
        `bg-gradient-to-r ${style.bg} to-transparent`
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="flex items-center gap-2">
          <GlassAvatar
            name={operation.agentName}
            size="sm"
            squadType={operation.squadType as 'copywriting' | 'design' | 'creator' | 'orchestrator' | 'default'}
          />
          <span className="text-foreground-primary text-xs font-medium">{operation.agentName}</span>
        </div>
        <StatusBadge status={operation.status} />
      </div>

      <p className="text-foreground-secondary text-xs mb-1.5 line-clamp-2">{operation.action}</p>

      <div className="flex items-center justify-between text-[10px] text-foreground-tertiary">
        <span>{formatRelativeTime(operation.startedAt)}</span>
        {operation.duration && <span>{operation.duration}s</span>}
      </div>
    </motion.div>
  );
}

function StatusBadge({ status }: { status: WorkflowOperation['status'] }) {
  const styles: Record<string, string> = {
    running: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    completed: 'bg-green-500/20 text-green-400 border-green-500/30',
    pending: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  };

  return (
    <span
      className={cn(
        'flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full border',
        styles[status]
      )}
    >
      {status === 'running' && <SpinnerIcon />}
      {status === 'completed' && <CheckIcon />}
      {status === 'pending' && <ClockIcon />}
      <span>
        {status === 'running' ? 'Executando' : status === 'completed' ? 'Concluido' : 'Pendente'}
      </span>
    </span>
  );
}

function StatBox({ label, value, color }: { label: string; value: number; color: 'green' | 'orange' | 'gray' }) {
  const colors = {
    green: { text: 'text-green-400', bg: 'from-green-500/20', glow: 'rgba(34, 197, 94, 0.3)' },
    orange: { text: 'text-orange-400', bg: 'from-orange-500/20', glow: 'rgba(249, 115, 22, 0.3)' },
    gray: { text: 'text-gray-400', bg: 'from-gray-500/20', glow: 'rgba(156, 163, 175, 0.2)' },
  };

  const style = colors[color];

  return (
    <div
      className={cn('rounded-xl p-2.5 bg-gradient-to-b to-transparent border border-glass-5', style.bg)}
      style={{
        boxShadow: value > 0 ? `0 0 15px ${style.glow}` : 'none'
      }}
    >
      <p className={cn('text-xl font-bold', style.text)}>{value}</p>
      <p className="text-[10px] text-foreground-tertiary">{label}</p>
    </div>
  );
}
