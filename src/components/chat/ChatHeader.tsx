import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar, Badge, GlassButton, GlassInput } from '../ui';
import { AgentSkills } from '../agents/AgentSkills';
import { AgentProfileModal } from '../agents/AgentProfileModal';
import { ExportChatModal } from './ExportChat';
import { CommandsModal } from './CommandsModal';
import { useChatStore } from '../../stores/chatStore';
import { useUIStore } from '../../stores/uiStore';
import { cn, squadLabels } from '../../lib/utils';
import type { SquadType, Agent, ChatSession, Message } from '../../types';
import type { ChatAgent } from './chat-types';

interface ChatHeaderProps {
  agent: ChatAgent;
  session: ChatSession | null;
  chatSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
}

export function ChatHeader({ agent, session, chatSidebarOpen, onToggleSidebar }: ChatHeaderProps) {
  const [showSearch, setShowSearch] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showCommands, setShowCommands] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { deleteSession } = useChatStore();

  const menuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearch(false);
        setSearchQuery('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter messages based on search
  const matchingMessages = searchQuery.length > 1 && session?.messages
    ? session.messages.filter((m: Message) =>
        m.content.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const handleClearChat = () => {
    if (session?.id) {
      deleteSession(session.id);
    }
    setShowMenu(false);
  };

  const handleExportChat = () => {
    if (!session?.messages || session.messages.length === 0) return;
    setShowExport(true);
    setShowMenu(false);
  };

  const handleBack = () => {
    useUIStore.setState({ selectedAgentId: null });
  };

  return (
    <div className="px-6 py-4 glass border-b border-glass-border flex items-center justify-between">
      <div className="flex items-center gap-3">
        {/* Toggle conversation panel (when closed) */}
        {!chatSidebarOpen && onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="text-tertiary hover:text-primary transition-colors p-1.5 -ml-1.5 rounded-lg hover:bg-white/10"
            title="Abrir conversas"
            aria-label="Abrir conversas"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <line x1="9" y1="3" x2="9" y2="21" />
            </svg>
          </button>
        )}
        {/* Back to agent selection */}
        <button
          onClick={handleBack}
          className="text-tertiary hover:text-primary transition-colors p-1.5 rounded-lg hover:bg-white/10"
          title="Voltar para agents"
          aria-label="Voltar"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
        </button>
        <Avatar
          name={agent.name}
          size="md"
          squadType={agent.squadType}
          status={agent.status}
        />
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-primary font-semibold">{agent.name}</h2>
            <Badge variant="squad" squadType={agent.squadType} size="sm">
              {squadLabels[agent.squadType as SquadType]}
            </Badge>
          </div>
          <p className="text-secondary text-sm">{agent.role}</p>
        </div>
      </div>

      {/* Mini skills preview */}
      <div className="flex items-center gap-3">
        <AgentSkills agent={agent as unknown as Agent} compact />

        <div className="flex items-center gap-1 ml-2">
          {/* Commands Button */}
          <GlassButton
            variant="ghost"
            size="icon"
            onClick={() => setShowCommands(true)}
            title="Comandos disponíveis"
            aria-label="Comandos disponíveis"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="4 17 10 11 4 5" />
              <line x1="12" y1="19" x2="20" y2="19" />
            </svg>
          </GlassButton>

          {/* Search Button & Dropdown */}
          <div className="relative" ref={searchRef}>
            <GlassButton
              variant="ghost"
              size="icon"
              onClick={() => setShowSearch(!showSearch)}
              className={cn(showSearch && 'bg-[#0099FF]/10 text-[#0099FF]')}
              aria-label="Buscar"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
            </GlassButton>

            <AnimatePresence>
              {showSearch && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  className="absolute top-full right-0 mt-2 w-72 rounded-xl overflow-hidden z-50 border border-white/10"
                  style={{
                    background: 'rgba(30, 30, 40, 0.95)',
                    backdropFilter: 'blur(20px)',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
                  }}
                >
                  <div className="p-3">
                    <GlassInput
                      placeholder="Buscar na conversa..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="h-9 text-sm"
                      autoFocus
                    />
                  </div>

                  {/* Show message count or search hint */}
                  {searchQuery.length === 0 && (
                    <div className="px-3 pb-3">
                      <p className="text-xs text-tertiary">
                        {session?.messages?.length || 0} mensagens na conversa
                      </p>
                    </div>
                  )}

                  {searchQuery.length > 0 && searchQuery.length <= 1 && (
                    <div className="px-3 pb-3">
                      <p className="text-xs text-tertiary">Digite mais para buscar...</p>
                    </div>
                  )}

                  {searchQuery.length > 1 && (
                    <div className="border-t border-white/10 max-h-60 overflow-y-auto">
                      {!session?.messages || session.messages.length === 0 ? (
                        <div className="p-4 text-center">
                          <p className="text-tertiary text-sm">Nenhuma mensagem ainda</p>
                        </div>
                      ) : matchingMessages.length > 0 ? (
                        <div className="p-2">
                          <p className="text-xs text-tertiary px-2 py-1">
                            {matchingMessages.length} resultado(s)
                          </p>
                          {matchingMessages.slice(0, 5).map((msg: Message, i: number) => (
                            <div
                              key={i}
                              className="p-2 rounded-lg hover:bg-white/10 cursor-pointer transition-colors"
                            >
                              <p className="text-xs text-tertiary capitalize">{msg.role === 'user' ? 'Você' : 'Agente'}</p>
                              <p className="text-sm text-primary line-clamp-2">
                                {msg.content.length > 100 ? msg.content.slice(0, 100) + '...' : msg.content}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-4 text-center">
                          <p className="text-tertiary text-sm">Nenhum resultado para "{searchQuery}"</p>
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* More Options Menu */}
          <div className="relative" ref={menuRef}>
            <GlassButton
              variant="ghost"
              size="icon"
              onClick={() => setShowMenu(!showMenu)}
              className={cn(showMenu && 'bg-[#0099FF]/10 text-[#0099FF]')}
              aria-label="Menu"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="1" />
                <circle cx="12" cy="5" r="1" />
                <circle cx="12" cy="19" r="1" />
              </svg>
            </GlassButton>

            <AnimatePresence>
              {showMenu && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  className="absolute top-full right-0 mt-2 w-48 glass-lg rounded-xl overflow-hidden z-50"
                >
                  <div className="p-2">
                    <MenuOption
                      icon={
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                          <circle cx="9" cy="7" r="4" />
                          <path d="M23 21v-2a4 4 0 00-3-3.87" />
                          <path d="M16 3.13a4 4 0 010 7.75" />
                        </svg>
                      }
                      label="Ver perfil do agent"
                      onClick={() => {
                        setShowProfile(true);
                        setShowMenu(false);
                      }}
                    />
                    <MenuOption
                      icon={
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                          <polyline points="7 10 12 15 17 10" />
                          <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                      }
                      label="Exportar conversa"
                      onClick={handleExportChat}
                    />
                    <MenuOption
                      icon={
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                          <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                        </svg>
                      }
                      label="Copiar conversa"
                      onClick={() => {
                        if (session?.messages) {
                          const content = session.messages
                            .map((m: Message) => `${m.role}: ${m.content}`)
                            .join('\n\n');
                          navigator.clipboard.writeText(content);
                        }
                        setShowMenu(false);
                      }}
                    />
                    <div className="h-px bg-glass-border my-1" />
                    <MenuOption
                      icon={
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                        </svg>
                      }
                      label="Limpar conversa"
                      danger
                      onClick={handleClearChat}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Export Modal */}
      <ExportChatModal
        isOpen={showExport}
        onClose={() => setShowExport(false)}
        session={session as ChatSession}
      />

      {/* Agent Profile Modal */}
      <AgentProfileModal
        agent={agent}
        isOpen={showProfile}
        onClose={() => setShowProfile(false)}
        onStartChat={() => setShowProfile(false)}
      />

      {/* Commands Modal */}
      <CommandsModal
        agent={agent}
        isOpen={showCommands}
        onClose={() => setShowCommands(false)}
      />
    </div>
  );
}

interface MenuOptionProps {
  icon: React.ReactNode;
  label: string;
  danger?: boolean;
  onClick?: () => void;
}

function MenuOption({ icon, label, danger, onClick }: MenuOptionProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors text-left',
        danger
          ? 'text-red-500 hover:bg-red-500/10'
          : 'text-primary hover:bg-white/10'
      )}
    >
      <span className="text-current">{icon}</span>
      <span>{label}</span>
    </button>
  );
}
