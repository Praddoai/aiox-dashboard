import { useState } from 'react';
import { Avatar, GlassButton } from '../ui';
import { cn } from '../../lib/utils';
import type { ChatSession } from '../../types';

interface ChatConversationPanelProps {
  sessions: ChatSession[];
  activeSessionId: string | null;
  isOpen: boolean;
  onToggle: () => void;
  onSelectSession: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => void;
  onNewChat: () => void;
}

export function ChatConversationPanel({
  sessions,
  activeSessionId,
  isOpen,
  onToggle,
  onSelectSession,
  onDeleteSession,
  onNewChat,
}: ChatConversationPanelProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  if (!isOpen) return null;

  // Group sessions by date
  const today = new Date();
  const todaySessions: ChatSession[] = [];
  const yesterdaySessions: ChatSession[] = [];
  const olderSessions: ChatSession[] = [];

  sessions.forEach((session) => {
    const updated = new Date(session.updatedAt);
    const diffDays = Math.floor((today.getTime() - updated.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) todaySessions.push(session);
    else if (diffDays === 1) yesterdaySessions.push(session);
    else olderSessions.push(session);
  });

  const renderGroup = (label: string, groupSessions: ChatSession[]) => {
    if (groupSessions.length === 0) return null;
    return (
      <div className="mb-3">
        <p className="text-[10px] font-semibold text-tertiary uppercase tracking-wider px-3 mb-1.5">
          {label}
        </p>
        <div className="space-y-0.5">
          {groupSessions.map((session) => {
            const isActive = session.id === activeSessionId;
            const isHovered = session.id === hoveredId;
            const lastMessage = session.messages[session.messages.length - 1];
            const preview = lastMessage
              ? lastMessage.content.slice(0, 50) + (lastMessage.content.length > 50 ? '...' : '')
              : 'Nova conversa';

            return (
              <div
                key={session.id}
                role="presentation"
                onMouseEnter={() => setHoveredId(session.id)}
                onMouseLeave={() => setHoveredId(null)}
                className={cn(
                  'w-full text-left px-3 py-2.5 rounded-lg transition-all group relative',
                  isActive
                    ? 'bg-[#D1FF00]/10 border border-[#D1FF00]/20'
                    : 'hover:bg-white/5 border border-transparent'
                )}
              >
                <span
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelectSession(session.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectSession(session.id);
                    }
                  }}
                  className="flex items-center gap-2.5 cursor-pointer"
                >
                  <Avatar
                    name={session.agentName}
                    size="sm"
                    squadType={session.squadType}
                  />
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      'text-sm font-medium truncate',
                      isActive ? 'text-[#D1FF00]' : 'text-primary'
                    )}>
                      {session.agentName}
                    </p>
                    <p className="text-xs text-tertiary truncate">
                      {preview}
                    </p>
                  </div>
                  {session.messages.length > 0 && (
                    <span className="text-[10px] text-tertiary flex-shrink-0">
                      {session.messages.length}
                    </span>
                  )}
                </span>

                {/* Delete button on hover */}
                {isHovered && !isActive && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteSession(session.id);
                    }}
                    className="absolute top-1.5 right-1.5 p-1 rounded-md hover:bg-red-500/20 text-tertiary hover:text-red-400 transition-colors"
                    title="Excluir conversa"
                    aria-label={`Excluir conversa com ${session.agentName}`}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="w-[240px] flex-shrink-0 border-r border-glass-border flex flex-col h-full">
      {/* Header */}
      <div className="px-3 py-3 border-b border-glass-border flex items-center justify-between">
        <span className="text-sm font-semibold text-primary">Conversas</span>
        <div className="flex items-center gap-1">
          <GlassButton
            variant="ghost"
            size="icon"
            onClick={onNewChat}
            className="h-7 w-7"
            title="Nova conversa"
            aria-label="Nova conversa"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </GlassButton>
          <GlassButton
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className="h-7 w-7"
            title="Fechar painel"
            aria-label="Fechar painel"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <line x1="9" y1="3" x2="9" y2="21" />
            </svg>
          </GlassButton>
        </div>
      </div>

      {/* Session List */}
      <div className="flex-1 overflow-y-auto glass-scrollbar py-2">
        {sessions.length === 0 ? (
          <div className="px-3 py-8 text-center">
            <p className="text-tertiary text-xs">Nenhuma conversa ainda</p>
          </div>
        ) : (
          <>
            {renderGroup('Hoje', todaySessions)}
            {renderGroup('Ontem', yesterdaySessions)}
            {renderGroup('Anteriores', olderSessions)}
          </>
        )}
      </div>
    </div>
  );
}
