'use client';

import { motion } from 'framer-motion';
import {
  Bot,
  Terminal,
  Shield,
  MessageSquare,
  ArrowRightLeft,
  X,
  Check,
  Mic,
  Ban,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatusDot } from '@/components/ui/status-dot';
import { SectionLabel } from '@/components/ui/section-label';
import { cn, formatRelativeTime } from '@/lib/utils';
import type { PlatformAgent, AgentTier } from '@/types';

interface AgentDetailPanelProps {
  agent: PlatformAgent;
}

const tierConfig: Record<AgentTier, { label: string; color: string; bg: string }> = {
  0: { label: 'Orchestrator', color: 'text-purple-400', bg: 'bg-purple-500/15' },
  1: { label: 'Master', color: 'text-blue-400', bg: 'bg-blue-500/15' },
  2: { label: 'Specialist', color: 'text-green-400', bg: 'bg-green-500/15' },
};

function Section({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
    >
      {children}
    </motion.div>
  );
}

export function AgentDetailPanel({ agent }: AgentDetailPanelProps) {
  const tier = tierConfig[agent.tier as AgentTier] || tierConfig[2];
  const statusMap: Record<string, 'success' | 'waiting' | 'idle'> = {
    online: 'success',
    busy: 'waiting',
    offline: 'idle',
  };

  return (
    <div className="space-y-4">
      {/* Profile */}
      <Section delay={0}>
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className={cn('w-14 h-14 rounded-xl flex items-center justify-center', tier.bg)}>
              <Bot size={28} className={tier.color} />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-semibold text-primary">{agent.name}</h2>
              <p className="text-sm text-secondary">{agent.title || 'Agent'}</p>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <Badge variant="default" className={cn('text-xs', tier.bg)}>
                  <span className={tier.color}>{tier.label}</span>
                </Badge>
                {agent.model && <Badge variant="default" className="text-xs">{agent.model}</Badge>}
                <StatusDot
                  status={statusMap[agent.status || 'offline'] || 'idle'}
                  size="sm"
                />
                <span className="text-xs text-tertiary">{agent.status || 'offline'}</span>
              </div>
            </div>
          </div>
          {agent.description && (
            <p className="text-sm text-secondary mt-4">{agent.description}</p>
          )}
          <div className="flex items-center gap-4 mt-3 text-xs text-tertiary">
            {agent.lastActive && (
              <span>Ativo: {formatRelativeTime(agent.lastActive)}</span>
            )}
            {agent.executionCount !== undefined && (
              <span>{agent.executionCount} execucoes</span>
            )}
          </div>
        </Card>
      </Section>

      {/* Persona */}
      {agent.persona && (
        <Section delay={0.05}>
          <Card className="p-4">
            <SectionLabel>
              <span className="flex items-center gap-1.5">
                <MessageSquare size={12} />
                Persona
              </span>
            </SectionLabel>
            <div className="space-y-2 text-sm">
              {agent.persona.role && (
                <div>
                  <span className="text-tertiary">Role:</span>{' '}
                  <span className="text-primary">{agent.persona.role}</span>
                </div>
              )}
              {agent.persona.style && (
                <div>
                  <span className="text-tertiary">Style:</span>{' '}
                  <span className="text-primary">{agent.persona.style}</span>
                </div>
              )}
              {agent.persona.identity && (
                <div>
                  <span className="text-tertiary">Identity:</span>{' '}
                  <span className="text-primary">{agent.persona.identity}</span>
                </div>
              )}
            </div>
          </Card>
        </Section>
      )}

      {/* Core Principles */}
      {agent.corePrinciples && agent.corePrinciples.length > 0 && (
        <Section delay={0.1}>
          <Card className="p-4">
            <SectionLabel>
              <span className="flex items-center gap-1.5">
                <Shield size={12} />
                Core Principles
              </span>
            </SectionLabel>
            <ul className="space-y-2">
              {agent.corePrinciples.map((p, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-primary">
                  <span className="text-cyan-400 mt-0.5 flex-shrink-0">&#8226;</span>
                  {p}
                </li>
              ))}
            </ul>
          </Card>
        </Section>
      )}

      {/* Commands */}
      {agent.commands && agent.commands.length > 0 && (
        <Section delay={0.15}>
          <Card className="p-4">
            <SectionLabel>
              <span className="flex items-center gap-1.5">
                <Terminal size={12} />
                Commands
              </span>
            </SectionLabel>
            <div className="space-y-2">
              {agent.commands.map((cmd) => (
                <div key={cmd.command} className="flex items-start gap-3 glass-subtle rounded-lg px-3 py-2">
                  <span className="text-xs font-mono text-cyan-400 bg-cyan-500/10 rounded px-1.5 py-0.5 flex-shrink-0">
                    {cmd.command}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-primary">{cmd.action}</p>
                    {cmd.description && (
                      <p className="text-[10px] text-tertiary mt-0.5">{cmd.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </Section>
      )}

      {/* Voice DNA */}
      {agent.voiceDna && (
        <Section delay={0.2}>
          <Card className="p-4">
            <SectionLabel>
              <span className="flex items-center gap-1.5">
                <Mic size={12} />
                Voice DNA
              </span>
            </SectionLabel>
            <div className="space-y-3">
              {agent.voiceDna.sentenceStarters && agent.voiceDna.sentenceStarters.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-tertiary mb-1.5">Sentence Starters</p>
                  <div className="flex flex-wrap gap-1.5">
                    {agent.voiceDna.sentenceStarters.map((s, i) => (
                      <span key={i} className="text-xs text-primary bg-glass-5 rounded-md px-2 py-1">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {agent.voiceDna.vocabulary?.alwaysUse && agent.voiceDna.vocabulary.alwaysUse.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-tertiary mb-1.5">Always Use</p>
                  <div className="flex flex-wrap gap-1.5">
                    {agent.voiceDna.vocabulary.alwaysUse.map((w, i) => (
                      <span key={i} className="text-xs text-green-400 bg-green-500/10 rounded-md px-2 py-1">
                        {w}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {agent.voiceDna.vocabulary?.neverUse && agent.voiceDna.vocabulary.neverUse.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-tertiary mb-1.5">Never Use</p>
                  <div className="flex flex-wrap gap-1.5">
                    {agent.voiceDna.vocabulary.neverUse.map((w, i) => (
                      <span key={i} className="text-xs text-red-400 bg-red-500/10 rounded-md px-2 py-1 line-through">
                        {w}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>
        </Section>
      )}

      {/* Anti-Patterns */}
      {agent.antiPatterns?.neverDo && agent.antiPatterns.neverDo.length > 0 && (
        <Section delay={0.25}>
          <Card className="p-4">
            <SectionLabel>
              <span className="flex items-center gap-1.5">
                <Ban size={12} />
                Anti-Patterns
              </span>
            </SectionLabel>
            <ul className="space-y-2">
              {agent.antiPatterns.neverDo.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-primary">
                  <X size={14} className="text-red-400 mt-0.5 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </Card>
        </Section>
      )}

      {/* Integration */}
      {agent.integration && (
        <Section delay={0.3}>
          <Card className="p-4">
            <SectionLabel>
              <span className="flex items-center gap-1.5">
                <ArrowRightLeft size={12} />
                Integration
              </span>
            </SectionLabel>
            <div className="space-y-3">
              {agent.integration.receivesFrom && agent.integration.receivesFrom.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-tertiary mb-1.5">Receives From</p>
                  <div className="flex flex-wrap gap-1.5">
                    {agent.integration.receivesFrom.map((a) => (
                      <Badge key={a} variant="default" className="bg-blue-500/10 text-xs">
                        <span className="text-blue-400">{a}</span>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {agent.integration.handoffTo && agent.integration.handoffTo.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-tertiary mb-1.5">Handoff To</p>
                  <div className="flex flex-wrap gap-1.5">
                    {agent.integration.handoffTo.map((a) => (
                      <Badge key={a} variant="default" className="bg-orange-500/10 text-xs">
                        <span className="text-orange-400">{a}</span>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>
        </Section>
      )}

      {/* Quality */}
      {agent.quality && (
        <Section delay={0.35}>
          <Card className="p-4">
            <SectionLabel>Quality Indicators</SectionLabel>
            <div className="flex items-center gap-4">
              <QualityItem label="Voice DNA" active={agent.quality.hasVoiceDna} />
              <QualityItem label="Anti-Patterns" active={agent.quality.hasAntiPatterns} />
              <QualityItem label="Integration" active={agent.quality.hasIntegration} />
            </div>
          </Card>
        </Section>
      )}
    </div>
  );
}

function QualityItem({ label, active }: { label: string; active: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      {active ? (
        <Check size={14} className="text-green-400" />
      ) : (
        <X size={14} className="text-red-400" />
      )}
      <span className={cn('text-xs', active ? 'text-primary' : 'text-tertiary')}>{label}</span>
    </div>
  );
}
