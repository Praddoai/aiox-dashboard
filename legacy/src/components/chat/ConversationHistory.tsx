'use client';

import { useState, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useChatStore } from '@/stores/chatStore';
import { useUIStore } from '@/stores/uiStore';
import { cn } from '@/lib/utils';
import { getSquadType } from '@/types';
import type { ChatSession } from '@/types';
import { getSquadTheme } from '@/lib/theme';

// Icons
const MessageIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

const PlusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const ChevronIcon = ({ isOpen }: { isOpen: boolean }) => (
  <motion.svg
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    animate={{ rotate: isOpen ? 180 : 0 }}
    transition={{ duration: 0.2 }}
  >
    <polyline points="6 9 12 15 18 9" />
  </motion.svg>
);

const SearchIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8" />
    <path d="M21 21l-4.35-4.35" />
  </svg>
);

const CloseIcon = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

// Get squad dot color from centralized theme
const getSquadDotColor = (squadId: string): string => {
  const squadType = getSquadType(squadId);
  return getSquadTheme(squadType).dot;
};

interface ConversationItemProps {
  session: ChatSession;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

const ConversationItem = memo(function ConversationItem({ session, isActive, onSelect, onDelete }: ConversationItemProps) {
  const [showDelete, setShowDelete] = useState(false);

  const lastMessage = session.messages[session.messages.length - 1];
  const preview = lastMessage?.content?.slice(0, 50) || 'Nova conversa';
  const timeAgo = formatTimeAgo(session.updatedAt);
  const squadType = session.squadType || getSquadType(session.squadId);
  const messageCount = session.messages.length;

  return (
    <motion.div
      className={cn(
        'group relative px-3 py-2 rounded-lg cursor-pointer transition-all duration-200',
        'flex items-start gap-2',
        isActive
          ? 'bg-glass-15 shadow-sm'
          : 'hover:bg-glass-5'
      )}
      onClick={onSelect}
      onMouseEnter={() => setShowDelete(true)}
      onMouseLeave={() => setShowDelete(false)}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -10 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Squad color indicator */}
      <div className={cn(
        'w-1 h-full min-h-[36px] rounded-full flex-shrink-0',
        getSquadDotColor(session.agentSquad || 'default')
      )} />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className={cn(
            'text-xs font-medium truncate',
            isActive ? 'text-primary' : 'text-secondary'
          )}>
            {session.agentName}
          </span>
          <span className="text-[10px] text-tertiary flex-shrink-0">
            {timeAgo}
          </span>
        </div>
        <p className={cn(
          'text-[11px] truncate',
          isActive ? 'text-secondary' : 'text-tertiary'
        )}>
          {preview}{preview.length >= 50 ? '...' : ''}
        </p>
      </div>

      {/* Message count badge */}
      {messageCount > 0 && (
        <span className={cn(
          'text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0',
          isActive ? 'bg-glass-20 text-primary' : 'bg-glass-5 text-tertiary'
        )}>
          {messageCount}
        </span>
      )}

      {/* Delete button */}
      <AnimatePresence>
        {showDelete && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className={cn(
              'absolute right-2 top-1/2 -translate-y-1/2',
              'p-1.5 rounded-md',
              'bg-red-500/10 text-red-500 hover:bg-red-500/20',
              'transition-colors duration-200'
            )}
            title="Excluir conversa"
          >
            <TrashIcon />
          </motion.button>
        )}
      </AnimatePresence>
    </motion.div>
  );
});

export function ConversationHistory() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const { sessions, activeSessionId, setActiveSession, deleteSession, clearSessions } = useChatStore();
  const { setSelectedAgentId } = useUIStore();

  const handleSelect = (session: ChatSession) => {
    setActiveSession(session.id);
    // Set both atomically to avoid setSelectedSquadId clearing the agentId
    useUIStore.setState({
      selectedSquadId: session.squadId,
      selectedAgentId: session.agentId,
    });
    setSearchQuery('');
    setShowSearch(false);
  };

  const handleNewConversation = () => {
    setActiveSession(null);
    setSelectedAgentId(null);
  };

  const handleClearAll = () => {
    if (confirm('Tem certeza que deseja excluir todas as conversas?')) {
      clearSessions();
      setSelectedAgentId(null);
    }
  };

  // Filter sessions by search query
  const filteredSessions = searchQuery.length > 0
    ? sessions.filter(session => {
        const query = searchQuery.toLowerCase();
        // Search in agent name
        if (session.agentName.toLowerCase().includes(query)) return true;
        // Search in messages
        return session.messages.some(m => m.content.toLowerCase().includes(query));
      })
    : sessions;

  // Sort sessions by updatedAt (most recent first)
  const sortedSessions = [...filteredSessions].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  // Group by today, yesterday, older
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const grouped = {
    today: sortedSessions.filter(s => new Date(s.updatedAt) >= today),
    yesterday: sortedSessions.filter(s => {
      const date = new Date(s.updatedAt);
      return date >= yesterday && date < today;
    }),
    older: sortedSessions.filter(s => new Date(s.updatedAt) < yesterday),
  };

  return (
    <div className="space-y-1">
      {/* Header */}
      <div className="flex items-center justify-between px-1 mb-2">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-xs font-semibold text-secondary uppercase tracking-wider hover:text-primary transition-colors"
        >
          <MessageIcon />
          <span>Conversas</span>
          <span className="text-tertiary font-normal">({sessions.length})</span>
          <ChevronIcon isOpen={isExpanded} />
        </button>

        <div className="flex items-center gap-1">
          {/* Search toggle */}
          {sessions.length > 2 && (
            <motion.button
              onClick={() => {
                setShowSearch(!showSearch);
                if (showSearch) setSearchQuery('');
              }}
              className={cn(
                "p-1.5 rounded-md transition-colors",
                showSearch
                  ? "text-blue-400 bg-blue-500/10"
                  : "text-secondary hover:text-primary hover:bg-glass-5"
              )}
              title="Buscar conversas"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <SearchIcon />
            </motion.button>
          )}

          <motion.button
            onClick={handleNewConversation}
            className="p-1.5 rounded-md text-secondary hover:text-primary hover:bg-glass-5 transition-colors"
            title="Nova conversa"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <PlusIcon />
          </motion.button>
        </div>
      </div>

      {/* Search input */}
      <AnimatePresence>
        {showSearch && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mb-2 overflow-hidden"
          >
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar em conversas..."
                className="w-full px-3 py-1.5 text-xs bg-glass-5 border border-glass-10 rounded-lg text-primary placeholder:text-tertiary focus:outline-none focus:border-blue-500/50"
                autoFocus
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-tertiary hover:text-primary"
                >
                  <CloseIcon />
                </button>
              )}
            </div>
            {searchQuery && (
              <p className="text-[10px] text-tertiary mt-1 px-1">
                {filteredSessions.length} resultado(s) para &quot;{searchQuery}&quot;
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {sessions.length === 0 ? (
              <div className="px-3 py-4 text-center text-xs text-tertiary">
                <MessageIcon />
                <p className="mt-2">Nenhuma conversa ainda</p>
                <p className="text-[10px] mt-1">Selecione um agent para começar</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin">
                {/* Today */}
                {grouped.today.length > 0 && (
                  <div>
                    <div className="text-[10px] text-tertiary uppercase tracking-wider px-3 mb-1">
                      Hoje
                    </div>
                    <div className="space-y-0.5">
                      {grouped.today.map((session) => (
                        <ConversationItem
                          key={session.id}
                          session={session}
                          isActive={session.id === activeSessionId}
                          onSelect={() => handleSelect(session)}
                          onDelete={() => deleteSession(session.id)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Yesterday */}
                {grouped.yesterday.length > 0 && (
                  <div>
                    <div className="text-[10px] text-tertiary uppercase tracking-wider px-3 mb-1">
                      Ontem
                    </div>
                    <div className="space-y-0.5">
                      {grouped.yesterday.map((session) => (
                        <ConversationItem
                          key={session.id}
                          session={session}
                          isActive={session.id === activeSessionId}
                          onSelect={() => handleSelect(session)}
                          onDelete={() => deleteSession(session.id)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Older */}
                {grouped.older.length > 0 && (
                  <div>
                    <div className="text-[10px] text-tertiary uppercase tracking-wider px-3 mb-1">
                      Anteriores
                    </div>
                    <div className="space-y-0.5">
                      {grouped.older.map((session) => (
                        <ConversationItem
                          key={session.id}
                          session={session}
                          isActive={session.id === activeSessionId}
                          onSelect={() => handleSelect(session)}
                          onDelete={() => deleteSession(session.id)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Clear all button */}
                {sessions.length > 3 && (
                  <div className="pt-2 border-t border-glass-5">
                    <button
                      onClick={handleClearAll}
                      className="w-full px-3 py-1.5 text-[10px] text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-md transition-colors"
                    >
                      Limpar todas as conversas
                    </button>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Helper function
function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'agora';
  if (diffMins < 60) return `${diffMins}min`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;

  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}
