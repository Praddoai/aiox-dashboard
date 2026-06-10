import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  type LucideIcon,
  Clapperboard,
  Smartphone,
  Megaphone,
  Rocket,
  Wrench,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { ICON_SIZES } from '../../lib/icons';
import { rooms } from './world-layout';
import type { DomainId } from './world-layout';
import { useDomains } from './DomainContext';
import { useMonitorStore } from '../../stores/monitorStore';

// ── Types ──

export interface WorkflowPipeline {
  id: string;
  name: string;
  icon: LucideIcon;
  description: string;
  status: 'idle' | 'active' | 'completed';
  steps: WorkflowStep[];
}

export interface WorkflowStep {
  squadId: string;
  label: string;
  status: 'pending' | 'active' | 'completed' | 'failed';
  agentName?: string;
  progress?: number; // 0-100
}

// ── Mock Business Workflows ──

// eslint-disable-next-line react-refresh/only-export-components
export const businessWorkflows: WorkflowPipeline[] = [
  {
    id: 'live-semanal',
    name: 'Live Semanal',
    icon: Clapperboard,
    description: 'Pipeline completo da live: roteiro, copy, criativos, publicação',
    status: 'active',
    steps: [
      { squadId: 'youtube-content', label: 'Roteiro', status: 'completed', agentName: 'Roteirista' },
      { squadId: 'copywriting', label: 'Copy', status: 'completed', agentName: 'Copy Chief' },
      { squadId: 'creative-studio', label: 'Thumbnail', status: 'active', agentName: 'Creative Director', progress: 65 },
      { squadId: 'social-publisher', label: 'Publicar', status: 'pending' },
    ],
  },
  {
    id: 'feed-conteudo',
    name: 'Feed de Conteúdo',
    icon: Smartphone,
    description: 'Pipeline de criação de conteúdo para redes sociais',
    status: 'idle',
    steps: [
      { squadId: 'content-ecosystem', label: 'Planejamento', status: 'pending' },
      { squadId: 'copywriting', label: 'Redação', status: 'pending' },
      { squadId: 'creative-studio', label: 'Design', status: 'pending' },
      { squadId: 'social-publisher', label: 'Agendar', status: 'pending' },
    ],
  },
  {
    id: 'criativos-ads',
    name: 'Criativos para Ads',
    icon: Megaphone,
    description: 'Criação e otimização de criativos para campanhas',
    status: 'idle',
    steps: [
      { squadId: 'copywriting', label: 'Copy do Ad', status: 'pending' },
      { squadId: 'creative-studio', label: 'Visual', status: 'pending' },
      { squadId: 'media-buy', label: 'Subir Campanha', status: 'pending' },
      { squadId: 'data-analytics', label: 'Monitorar', status: 'pending' },
    ],
  },
  {
    id: 'lancamento',
    name: 'Lançamento de Produto',
    icon: Rocket,
    description: 'Workflow completo de lançamento: copy, funil, tráfego, análise',
    status: 'idle',
    steps: [
      { squadId: 'infoproduct-creation', label: 'Produto', status: 'pending' },
      { squadId: 'copywriting', label: 'Copy VSL', status: 'pending' },
      { squadId: 'funnel-creator', label: 'Funil', status: 'pending' },
      { squadId: 'media-buy', label: 'Tráfego', status: 'pending' },
      { squadId: 'data-analytics', label: 'Análise', status: 'pending' },
      { squadId: 'conselho', label: 'Decisão', status: 'pending' },
    ],
  },
  {
    id: 'dev-deploy',
    name: 'Dev → Deploy',
    icon: Wrench,
    description: 'Pipeline de desenvolvimento: código, review, design system, deploy',
    status: 'idle',
    steps: [
      { squadId: 'full-stack-dev', label: 'Develop', status: 'pending' },
      { squadId: 'design-system', label: 'UI/UX', status: 'pending' },
      { squadId: 'aios-core-dev', label: 'Review', status: 'pending' },
      { squadId: 'project-management-clickup', label: 'Track', status: 'pending' },
    ],
  },
];

// ── Helpers ──

function getDomainForSquad(squadId: string): DomainId {
  const room = rooms.find((r) => r.squadId === squadId);
  return room?.domain || 'ops';
}

function useStatusColorMap() {
  const style = typeof document !== 'undefined' ? getComputedStyle(document.documentElement) : null;
  const active = style?.getPropertyValue('--world-status-active').trim() || '#54A0FF';
  const completed = style?.getPropertyValue('--world-status-completed').trim() || '#2ED573';
  const failed = style?.getPropertyValue('--world-status-failed').trim() || '#FF6B6B';
  return {
    pending: 'rgba(255,255,255,0.2)',
    active,
    completed,
    failed,
  } as Record<WorkflowStep['status'], string>;
}

// ── Component ──

interface WorldWorkflowPanelProps {
  expanded: boolean;
  onToggle: () => void;
  onHighlightRooms: (roomIds: string[]) => void;
  onRoomClick: (roomId: string) => void;
}

export function WorldWorkflowPanel({
  expanded,
  onToggle,
  onHighlightRooms,
  onRoomClick,
}: WorldWorkflowPanelProps) {
  const domains = useDomains();
  const statusColorMap = useStatusColorMap();
  const [selectedWorkflow, setSelectedWorkflow] = useState<string | null>(null);
  const [hoveredStep, setHoveredStep] = useState<string | null>(null);

  const monitorConnected = useMonitorStore((s) => s.connected);
  const eventCount = useMonitorStore((s) => s.events.length);

  const activeCount = useMemo(
    () => businessWorkflows.filter((w) => w.status === 'active').length,
    [],
  );

  const handleWorkflowHover = (wf: WorkflowPipeline | null) => {
    if (wf) {
      onHighlightRooms(wf.steps.map((s) => s.squadId));
    } else {
      onHighlightRooms([]);
    }
  };

  return (
    <motion.div
      className="absolute bottom-0 left-0 right-0 z-20"
      initial={false}
      animate={{ height: expanded ? 220 : 44 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
    >
      {/* Toggle bar */}
      <button
        onClick={onToggle}
        className="w-full h-[44px] flex items-center justify-between px-4 transition-colors"
        style={{
          background: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(8px)',
          borderTop: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-white/90">Workflows</span>
          {activeCount > 0 && (
            <motion.span
              className="px-1.5 py-0.5 rounded text-[9px] font-bold"
              style={{ background: 'color-mix(in srgb, var(--color-status-info) 20%, transparent)', color: 'var(--color-status-info)' }}
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              {activeCount} active
            </motion.span>
          )}
          {/* Live monitor indicator */}
          {monitorConnected && (
            <div className="flex items-center gap-1 ml-2">
              <motion.div
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: '#10B981' }}
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
              <span className="text-[8px] text-white/40 font-mono">LIVE</span>
              {eventCount > 0 && (
                <span className="text-[8px] text-white/30 font-mono">{eventCount}</span>
              )}
            </div>
          )}
        </div>
        <motion.svg
          width="14" height="14" viewBox="0 0 24 24"
          fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2"
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <polyline points="6 9 12 15 18 9" />
        </motion.svg>
      </button>

      {/* Panel content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            className="overflow-y-auto"
            style={{
              height: 176,
              background: 'rgba(0,0,0,0.8)',
              backdropFilter: 'blur(12px)',
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="px-4 py-2 flex gap-3 overflow-x-auto glass-scrollbar">
              {businessWorkflows.map((wf) => (
                <motion.div
                  key={wf.id}
                  className={cn(
                    'flex-shrink-0 rounded-xl p-3 cursor-pointer transition-colors',
                    selectedWorkflow === wf.id ? 'ring-1 ring-white/20' : '',
                  )}
                  style={{
                    width: 320,
                    background: selectedWorkflow === wf.id
                      ? 'rgba(255,255,255,0.08)'
                      : 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}
                  onClick={() => setSelectedWorkflow(wf.id === selectedWorkflow ? null : wf.id)}
                  onMouseEnter={() => handleWorkflowHover(wf)}
                  onMouseLeave={() => handleWorkflowHover(null)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {/* Workflow header */}
                  <div className="flex items-center gap-2 mb-2.5">
                    <wf.icon size={ICON_SIZES.sm} />
                    <span className="text-[11px] font-semibold text-white/90">{wf.name}</span>
                    <span
                      className="ml-auto px-1.5 py-0.5 rounded text-[8px] font-bold uppercase"
                      style={{
                        background: wf.status === 'active' ? `${statusColorMap.active}22` : 'rgba(255,255,255,0.06)',
                        color: wf.status === 'active' ? statusColorMap.active : 'rgba(255,255,255,0.4)',
                      }}
                    >
                      {wf.status}
                    </span>
                  </div>

                  {/* Pipeline steps */}
                  <div className="flex items-center gap-0">
                    {wf.steps.map((step, idx) => {
                      const domain = getDomainForSquad(step.squadId);
                      const domainCfg = domains[domain];
                      const isLast = idx === wf.steps.length - 1;

                      return (
                        <div key={step.squadId} className="flex items-center">
                          {/* Step node */}
                          <motion.div
                            className="flex flex-col items-center cursor-pointer"
                            onMouseEnter={() => setHoveredStep(`${wf.id}-${step.squadId}`)}
                            onMouseLeave={() => setHoveredStep(null)}
                            onClick={(e) => {
                              e.stopPropagation();
                              onRoomClick(step.squadId);
                            }}
                            whileHover={{ y: -2 }}
                          >
                            {/* Node circle */}
                            <div className="relative">
                              <div
                                className="w-7 h-7 rounded-full flex items-center justify-center"
                                style={{
                                  background: step.status === 'active'
                                    ? domainCfg.tileColor
                                    : step.status === 'completed'
                                      ? `${statusColorMap.completed}44`
                                      : 'rgba(255,255,255,0.08)',
                                  border: `2px solid ${statusColorMap[step.status]}`,
                                }}
                              >
                                {step.status === 'completed' && (
                                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={statusColorMap.completed} strokeWidth="3">
                                    <polyline points="20 6 9 17 4 12" />
                                  </svg>
                                )}
                                {step.status === 'active' && (
                                  <motion.div
                                    className="w-2 h-2 rounded-full bg-white"
                                    animate={{ scale: [1, 1.3, 1] }}
                                    transition={{ duration: 1.5, repeat: Infinity }}
                                  />
                                )}
                                {step.status === 'failed' && (
                                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={statusColorMap.failed} strokeWidth="3">
                                    <line x1="18" y1="6" x2="6" y2="18" />
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                  </svg>
                                )}
                              </div>

                              {/* Active pulse */}
                              {step.status === 'active' && (
                                <motion.div
                                  className="absolute inset-0 rounded-full"
                                  style={{ border: `2px solid ${domainCfg.tileColor}` }}
                                  animate={{ scale: [1, 1.5], opacity: [0.6, 0] }}
                                  transition={{ duration: 1.5, repeat: Infinity }}
                                />
                              )}
                            </div>

                            {/* Step label */}
                            <span className="text-[8px] mt-1 text-white/50 whitespace-nowrap">
                              {step.label}
                            </span>

                            {/* Progress bar for active steps */}
                            {step.status === 'active' && step.progress !== undefined && (
                              <div className="w-full h-0.5 rounded mt-0.5 overflow-hidden" style={{ background: 'var(--glass-border-color)' }}>
                                <motion.div
                                  className="h-full rounded"
                                  style={{ background: domainCfg.tileColor }}
                                  initial={{ width: 0 }}
                                  animate={{ width: `${step.progress}%` }}
                                  transition={{ duration: 0.5 }}
                                />
                              </div>
                            )}

                            {/* Hover tooltip */}
                            <AnimatePresence>
                              {hoveredStep === `${wf.id}-${step.squadId}` && (
                                <motion.div
                                  className="absolute bottom-full mb-1 px-2 py-1 rounded pointer-events-none z-50"
                                  style={{
                                    background: 'rgba(0,0,0,0.9)',
                                    border: `1px solid ${domainCfg.tileColor}44`,
                                    whiteSpace: 'nowrap',
                                  }}
                                  initial={{ opacity: 0, y: 4 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: 4 }}
                                >
                                  <div className="text-[9px] text-white font-semibold">{step.label}</div>
                                  {step.agentName && (
                                    <div className="text-[8px] text-white/50">{step.agentName}</div>
                                  )}
                                  <div className="text-[7px] text-white/30 mt-0.5">Click to enter room</div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </motion.div>

                          {/* Arrow connector with data flow animation */}
                          {!isLast && (() => {
                            const nextStep = wf.steps[idx + 1];
                            const isFlowing = step.status === 'completed' && (nextStep?.status === 'active' || nextStep?.status === 'completed');
                            const connectorColor = step.status === 'completed'
                              ? `${statusColorMap.completed}66`
                              : step.status === 'active'
                                ? `${statusColorMap.active}44`
                                : 'rgba(255,255,255,0.1)';

                            return (
                              <div className="mx-1 flex items-center relative">
                                {/* Base connector line */}
                                <div
                                  className="h-px flex-1"
                                  style={{
                                    width: 16,
                                    background: connectorColor,
                                  }}
                                />
                                {/* Data flow pulse — animated dot traveling along connector */}
                                {isFlowing && (
                                  <motion.div
                                    className="absolute top-1/2 -translate-y-1/2 rounded-full"
                                    style={{
                                      width: 4,
                                      height: 4,
                                      background: statusColorMap.completed,
                                      boxShadow: `0 0 6px ${statusColorMap.completed}`,
                                    }}
                                    animate={{
                                      left: [-2, 18],
                                      opacity: [0, 1, 1, 0],
                                    }}
                                    transition={{
                                      duration: 1.2,
                                      repeat: Infinity,
                                      ease: 'linear',
                                      repeatDelay: 0.5,
                                    }}
                                  />
                                )}
                                <svg width="6" height="8" viewBox="0 0 6 8" style={{ marginLeft: -1 }}>
                                  <path
                                    d="M1 1 L5 4 L1 7"
                                    fill="none"
                                    stroke={connectorColor}
                                    strokeWidth="1.5"
                                  />
                                </svg>
                              </div>
                            );
                          })()}
                        </div>
                      );
                    })}
                  </div>

                  {/* Workflow description (when selected) */}
                  <AnimatePresence>
                    {selectedWorkflow === wf.id && (
                      <motion.div
                        className="mt-2 pt-2"
                        style={{ borderTop: '1px solid var(--glass-border-color-subtle)' }}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                      >
                        <p className="text-[9px] text-white/40">{wf.description}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
