'use client';

import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { GlassAvatar } from '@/components/ui/GlassAvatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn, squadLabels, formatRelativeTime } from '@/lib/utils';
import type { PlatformAgent } from '@/types';

interface AgentProfileProps {
  agent: PlatformAgent;
  onStartChat?: () => void;
  onClose?: () => void;
}

export function AgentProfile({ agent, onStartChat, onClose }: AgentProfileProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
    >
      <Card className="max-w-md w-full p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            <GlassAvatar
              name={agent.name}
              size="xl"
              squadType={agent.squadType}
            />
            <div>
              <h2 className="text-primary text-xl font-semibold">{agent.name}</h2>
              <p className="text-secondary">{agent.role}</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline">
                  {squadLabels[agent.squadType || 'default']}
                </Badge>
                {agent.status && (
                  <Badge
                    variant={agent.status === 'online' ? 'default' : agent.status === 'busy' ? 'secondary' : 'outline'}
                  >
                    {agent.status === 'online' ? 'Online' : agent.status === 'busy' ? 'Ocupado' : 'Offline'}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </Button>
          )}
        </div>

        {/* Description */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-primary mb-2">Sobre</h3>
          <p className="text-secondary text-sm leading-relaxed">{agent.description}</p>
        </div>

        {/* Capabilities */}
        {agent.capabilities && agent.capabilities.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-primary mb-2">Especialidades</h3>
            <div className="flex flex-wrap gap-2">
              {agent.capabilities.map((cap) => (
                <Badge key={cap} variant="outline">
                  {cap}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6 p-4 glass-subtle rounded-xl">
          <div className="text-center">
            <p className="text-2xl font-bold text-primary">
              {agent.executionCount?.toLocaleString() || '0'}
            </p>
            <p className="text-xs text-tertiary">Execucoes</p>
          </div>
          <div className="text-center border-x border-glass-10">
            <p className="text-2xl font-bold text-primary">98%</p>
            <p className="text-xs text-tertiary">Taxa de Sucesso</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-primary">1.2s</p>
            <p className="text-xs text-tertiary">Tempo Medio</p>
          </div>
        </div>

        {/* Model Info */}
        {agent.model && (
          <div className="mb-6 p-3 glass-subtle rounded-xl flex items-center justify-between">
            <span className="text-sm text-secondary">Modelo</span>
            <span className="text-sm font-medium text-primary">{agent.model}</span>
          </div>
        )}

        {/* Last Active */}
        {agent.lastActive && (
          <p className="text-xs text-tertiary text-center mb-6">
            Ultima atividade: {formatRelativeTime(agent.lastActive)}
          </p>
        )}

        {/* Action */}
        {onStartChat && (
          <Button
            variant="default"
            className="w-full"
            onClick={onStartChat}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
            </svg>
            Iniciar Conversa
          </Button>
        )}
      </Card>
    </motion.div>
  );
}
