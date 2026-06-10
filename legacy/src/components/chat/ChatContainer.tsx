'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import {
  type LucideIcon,
  Mail,
  Target,
  FileText,
  Brain,
  Flame,
  Newspaper,
  Palette,
  BarChart3,
  Clapperboard,
  Anchor,
  ClipboardList,
  Tag,
  Search,
  Zap,
  Image,
  Eye,
  Microscope,
  Library,
  PenTool,
  Lightbulb,
  MessageSquare,
  Star,
  Calendar,
  Puzzle,
  Package,
  BookOpen,
  Ruler,
  RefreshCw,
  GitMerge,
  Sparkles,
  Smartphone,
} from 'lucide-react';
import { GlassAvatar } from '@/components/ui/GlassAvatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SmartMessageList } from './VirtualizedMessageList';
import { ChatInput } from './ChatInput';
import { ExportChatModal } from './ExportChat';
import { useChat } from '@/hooks/use-chat';
import { useAgents } from '@/hooks/use-agents';
import { useSquads } from '@/hooks/use-squads';
import { useChatStore } from '@/stores/chatStore';
import { useUIStore } from '@/stores/uiStore';
import { apiClient } from '@/services/api/client';
import { cn, squadLabels, getTierTheme } from '@/lib/utils';
import type { PlatformSquad, SquadType, AgentSummary, AgentTier, ChatSession } from '@/types';
import { getSquadType } from '@/types';

export function ChatContainer() {
  const {
    activeSession,
    selectedAgent,
    isAgentLoading,
    isStreaming,
    sendMessage,
    stopStreaming,
    selectAgent,
  } = useChat();
  const { sessions, activeSessionId, setActiveSession, deleteSession } = useChatStore();
  const { selectedAgentId } = useUIStore();
  const [chatSidebarOpen, setChatSidebarOpen] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeSession?.messages]);

  // Show loading while agent data is being fetched (prevents flash of EmptyChat)
  if (!selectedAgent && isAgentLoading && selectedAgentId) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!selectedAgent) {
    return <EmptyChat />;
  }

  return (
    <div className="h-full flex">
      {/* Conversation Sidebar */}
      <ChatConversationPanel
        sessions={sessions}
        activeSessionId={activeSessionId}
        isOpen={chatSidebarOpen}
        onToggle={() => setChatSidebarOpen(!chatSidebarOpen)}
        onSelectSession={(sessionId) => {
          const session = sessions.find(s => s.id === sessionId);
          if (session) {
            setActiveSession(sessionId);
            useUIStore.setState({
              selectedSquadId: session.squadId,
              selectedAgentId: session.agentId,
            });
          }
        }}
        onDeleteSession={deleteSession}
        onNewChat={() => {
          useUIStore.setState({ selectedAgentId: null });
        }}
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Chat Header */}
        <ChatHeader
          agent={selectedAgent}
          session={activeSession}
          chatSidebarOpen={chatSidebarOpen}
          onToggleSidebar={() => setChatSidebarOpen(!chatSidebarOpen)}
        />

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto glass-scrollbar px-4 md:px-6 py-4">
          {activeSession?.messages && activeSession.messages.length > 0 ? (
            <div className="min-h-full flex flex-col justify-end">
              <SmartMessageList
                messages={activeSession.messages}
                virtualizationThreshold={50}
              />
              <div ref={messagesEndRef} />
            </div>
          ) : (
            <WelcomeMessage agent={selectedAgent} />
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 pt-0">
          <ChatInput
            onSend={(message, attachments) => sendMessage(message, attachments)}
            onStop={stopStreaming}
            disabled={isStreaming}
            isStreaming={isStreaming}
            agentName={selectedAgent.name}
          />
        </div>
      </div>
    </div>
  );
}

// ── Conversation Sidebar Panel ──────────────────────────────────────────

interface ChatConversationPanelProps {
  sessions: ChatSession[];
  activeSessionId: string | null;
  isOpen: boolean;
  onToggle: () => void;
  onSelectSession: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => void;
  onNewChat: () => void;
}

function ChatConversationPanel({
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
              <button
                key={session.id}
                onClick={() => onSelectSession(session.id)}
                onMouseEnter={() => setHoveredId(session.id)}
                onMouseLeave={() => setHoveredId(null)}
                className={cn(
                  'w-full text-left px-3 py-2.5 rounded-lg transition-all group relative',
                  isActive
                    ? 'bg-blue-500/10 border border-blue-500/20'
                    : 'hover:bg-glass-5 border border-transparent'
                )}
              >
                <div className="flex items-center gap-2.5">
                  <GlassAvatar
                    name={session.agentName}
                    size="sm"
                    squadType={session.squadType}
                  />
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      'text-sm font-medium truncate',
                      isActive ? 'text-blue-400' : 'text-primary'
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
                </div>

                {/* Delete button on hover */}
                {isHovered && !isActive && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteSession(session.id);
                    }}
                    className="absolute top-1.5 right-1.5 p-1 rounded-md hover:bg-red-500/20 text-tertiary hover:text-red-400 transition-colors"
                    title="Excluir conversa"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                )}
              </button>
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
          <Button
            variant="glass-ghost"
            size="icon-xs"
            onClick={onNewChat}
            className="h-7 w-7"
            title="Nova conversa"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </Button>
          <Button
            variant="glass-ghost"
            size="icon-xs"
            onClick={onToggle}
            className="h-7 w-7"
            title="Fechar painel"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <line x1="9" y1="3" x2="9" y2="21" />
            </svg>
          </Button>
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

interface ChatHeaderProps {
  agent: any;
  session: any;
  chatSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
}

function ChatHeader({ agent, session, chatSidebarOpen, onToggleSidebar }: ChatHeaderProps) {
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
    ? session.messages.filter((m: any) =>
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
            className="text-tertiary hover:text-primary transition-colors p-1.5 -ml-1.5 rounded-lg hover:bg-glass-10"
            title="Abrir conversas"
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
          className="text-tertiary hover:text-primary transition-colors p-1.5 rounded-lg hover:bg-glass-10"
          title="Voltar para agents"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
        </button>
        <GlassAvatar
          name={agent.name}
          size="md"
          squadType={agent.squadType}
          status={agent.status}
        />
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-primary font-semibold">{agent.name}</h2>
            <Badge variant="outline">
              {squadLabels[agent.squadType as SquadType]}
            </Badge>
          </div>
          <p className="text-secondary text-sm">{agent.role}</p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1 ml-2">
          {/* Commands Button */}
          <Button
            variant="glass-ghost"
            size="icon"
            onClick={() => setShowCommands(true)}
            title="Comandos disponíveis"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="4 17 10 11 4 5" />
              <line x1="12" y1="19" x2="20" y2="19" />
            </svg>
          </Button>

          {/* Search Button & Dropdown */}
          <div className="relative" ref={searchRef}>
            <Button
              variant="glass-ghost"
              size="icon"
              onClick={() => setShowSearch(!showSearch)}
              className={cn(showSearch && 'bg-blue-500/10 text-blue-500')}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
            </Button>

            <AnimatePresence>
              {showSearch && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  className="absolute top-full right-0 mt-2 w-72 rounded-xl overflow-hidden z-50 border border-glass-10"
                  style={{
                    background: 'rgba(30, 30, 40, 0.95)',
                    backdropFilter: 'blur(20px)',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
                  }}
                >
                  <div className="p-3">
                    <Input
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
                    <div className="border-t border-glass-10 max-h-60 overflow-y-auto">
                      {!session?.messages || session.messages.length === 0 ? (
                        <div className="p-4 text-center">
                          <p className="text-tertiary text-sm">Nenhuma mensagem ainda</p>
                        </div>
                      ) : matchingMessages.length > 0 ? (
                        <div className="p-2">
                          <p className="text-xs text-tertiary px-2 py-1">
                            {matchingMessages.length} resultado(s)
                          </p>
                          {matchingMessages.slice(0, 5).map((msg: any, i: number) => (
                            <div
                              key={i}
                              className="p-2 rounded-lg hover:bg-glass-10 cursor-pointer transition-colors"
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
                          <p className="text-tertiary text-sm">Nenhum resultado para &quot;{searchQuery}&quot;</p>
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
            <Button
              variant="glass-ghost"
              size="icon"
              onClick={() => setShowMenu(!showMenu)}
              className={cn(showMenu && 'bg-blue-500/10 text-blue-500')}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="1" />
                <circle cx="12" cy="5" r="1" />
                <circle cx="12" cy="19" r="1" />
              </svg>
            </Button>

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
                            .map((m: any) => `${m.role}: ${m.content}`)
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
          : 'text-primary hover:bg-glass-10'
      )}
    >
      <span className="text-current">{icon}</span>
      <span>{label}</span>
    </button>
  );
}

// Commands Modal - shows agent commands, tasks, and workflows
interface CommandsModalProps {
  agent: any;
  isOpen: boolean;
  onClose: () => void;
}

interface SquadCommand {
  id: string;
  name: string;
  description: string;
  type: 'task' | 'workflow';
  file: string;
}

type TabType = 'actions' | 'commands' | 'prompts' | 'tasks' | 'workflows';

function CommandsModal({ agent, isOpen, onClose }: CommandsModalProps) {
  const { sendMessage } = useChat();
  const [activeTab, setActiveTab] = useState<TabType>('actions');

  // Fetch squad tasks and workflows
  const { data: squadCommands, isLoading } = useQuery<{ tasks: SquadCommand[]; workflows: SquadCommand[] }>({
    queryKey: ['squad-commands', agent.squad],
    queryFn: async () => {
      try {
        return await apiClient.get<{ tasks: SquadCommand[]; workflows: SquadCommand[] }>(`/squads/${agent.squad}/commands`);
      } catch {
        return { tasks: [], workflows: [] };
      }
    },
    enabled: isOpen && !!agent.squad,
  });

  // Agent-level data
  const agentActions = agent.actions || [];
  const agentCommands = agent.commands || [];
  const agentPrompts = agent.sampleTasks || [];

  // Squad-level data
  const tasks = squadCommands?.tasks || [];
  const workflows = squadCommands?.workflows || [];

  const handleUseCommand = (command: string) => {
    sendMessage(command);
    onClose();
  };

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-overlay-heavy z-[9998]"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="w-full max-w-2xl max-h-[85vh] overflow-hidden pointer-events-auto">
            <div
              className="flex flex-col max-h-[85vh] rounded-2xl border border-glass-10 shadow-2xl overflow-hidden"
              style={{
                background: 'rgba(20, 20, 30, 1)',
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-glass-10">
                <div>
                  <h2 className="text-lg font-semibold text-primary">Ações & Comandos</h2>
                  <p className="text-xs text-tertiary">{agent.name} • {agent.squad}</p>
                </div>
                <Button variant="glass-ghost" size="icon" onClick={onClose}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </Button>
              </div>

              {/* Tabs - Alphabetical order */}
              <div className="flex border-b border-glass-10 overflow-x-auto">
                {/* Ações */}
                <TabButton
                  active={activeTab === 'actions'}
                  onClick={() => setActiveTab('actions')}
                  count={agentActions.length}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                  </svg>
                  Ações
                </TabButton>

                {/* Comandos */}
                <TabButton
                  active={activeTab === 'commands'}
                  onClick={() => setActiveTab('commands')}
                  count={agentCommands.length}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="4 17 10 11 4 5" />
                    <line x1="12" y1="19" x2="20" y2="19" />
                  </svg>
                  Comandos
                </TabButton>

                {/* Prompts */}
                <TabButton
                  active={activeTab === 'prompts'}
                  onClick={() => setActiveTab('prompts')}
                  count={agentPrompts.length}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                  Prompts
                </TabButton>

                {/* Tasks */}
                <TabButton
                  active={activeTab === 'tasks'}
                  onClick={() => setActiveTab('tasks')}
                  count={tasks.length}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <path d="M9 12l2 2 4-4" />
                  </svg>
                  Tasks
                </TabButton>

                {/* Workflows */}
                <TabButton
                  active={activeTab === 'workflows'}
                  onClick={() => setActiveTab('workflows')}
                  count={workflows.length}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="5" r="3" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <circle cx="6" cy="19" r="3" />
                    <circle cx="18" cy="19" r="3" />
                    <line x1="12" y1="12" x2="6" y2="16" />
                    <line x1="12" y1="12" x2="18" y2="16" />
                  </svg>
                  Workflows
                </TabButton>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto glass-scrollbar p-4">
                {isLoading ? (
                  <div className="text-center py-8 text-tertiary">
                    <div className="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2" />
                    <p className="text-sm">Carregando...</p>
                  </div>
                ) : (
                  <>
                    {/* Ações Tab */}
                    {activeTab === 'actions' && (
                      <div className="space-y-2">
                        {agentActions.length === 0 ? (
                          <LocalEmptyState message="Nenhuma ação definida para este agent" />
                        ) : (
                          agentActions.map((action: any, index: number) => (
                            <CommandItem
                              key={index}
                              command={action.name}
                              description={action.description || action.trigger}
                              type="action"
                              onUse={() => handleUseCommand(action.description || action.name)}
                            />
                          ))
                        )}
                      </div>
                    )}

                    {/* Comandos Tab */}
                    {activeTab === 'commands' && (
                      <div className="space-y-2">
                        {agentCommands.length === 0 ? (
                          <LocalEmptyState message="Nenhum comando definido para este agent" />
                        ) : (
                          agentCommands.map((cmd: any, index: number) => (
                            <CommandItem
                              key={index}
                              command={cmd.command}
                              description={cmd.description}
                              type="command"
                              onUse={() => handleUseCommand(cmd.command)}
                            />
                          ))
                        )}
                      </div>
                    )}

                    {/* Prompts Tab */}
                    {activeTab === 'prompts' && (
                      <div className="space-y-2">
                        {agentPrompts.length === 0 ? (
                          <LocalEmptyState message="Nenhum prompt sugerido para este agent" />
                        ) : (
                          agentPrompts.map((prompt: string, index: number) => (
                            <CommandItem
                              key={index}
                              command={prompt.slice(0, 50) + (prompt.length > 50 ? '...' : '')}
                              description={prompt}
                              type="prompt"
                              onUse={() => handleUseCommand(prompt)}
                            />
                          ))
                        )}
                      </div>
                    )}

                    {/* Tasks Tab */}
                    {activeTab === 'tasks' && (
                      <div className="space-y-2">
                        {tasks.length === 0 ? (
                          <LocalEmptyState message="Nenhuma task definida para este squad" />
                        ) : (
                          tasks.map((task) => (
                            <CommandItem
                              key={task.id}
                              command={`*${task.id}`}
                              description={task.description || task.name}
                              type="task"
                              onUse={() => handleUseCommand(`*${task.id}`)}
                            />
                          ))
                        )}
                      </div>
                    )}

                    {/* Workflows Tab */}
                    {activeTab === 'workflows' && (
                      <div className="space-y-2">
                        {workflows.length === 0 ? (
                          <LocalEmptyState message="Nenhum workflow definido para este squad" />
                        ) : (
                          workflows.map((workflow) => (
                            <CommandItem
                              key={workflow.id}
                              command={`@workflow:${workflow.id}`}
                              description={workflow.description || workflow.name}
                              type="workflow"
                              onUse={() => handleUseCommand(`@workflow:${workflow.id}`)}
                            />
                          ))
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-glass-10 bg-glass-5">
                <p className="text-xs text-tertiary text-center">
                  Clique em um item para usá-lo na conversa
                </p>
              </div>
            </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}

function TabButton({
  active,
  onClick,
  children,
  count,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  count: number;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors',
        active
          ? 'text-blue-400 border-b-2 border-blue-400 bg-blue-500/5'
          : 'text-tertiary hover:text-secondary hover:bg-glass-5'
      )}
    >
      {children}
      {count > 0 && (
        <span className={cn(
          'px-1.5 py-0.5 rounded-full text-[10px] font-bold',
          active ? 'bg-blue-500/20 text-blue-400' : 'bg-glass-10 text-tertiary'
        )}>
          {count}
        </span>
      )}
    </button>
  );
}

function CommandItem({
  command,
  description,
  type,
  onUse,
}: {
  command: string;
  description: string;
  type: 'action' | 'command' | 'prompt' | 'task' | 'workflow';
  onUse: () => void;
}) {
  const typeColors: Record<string, string> = {
    action: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400',
    command: 'bg-purple-500/10 border-purple-500/20 text-purple-400',
    prompt: 'bg-green-500/10 border-green-500/20 text-green-400',
    task: 'bg-orange-500/10 border-orange-500/20 text-orange-400',
    workflow: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400',
  };

  const typeLabels: Record<string, string> = {
    action: 'AÇÃO',
    command: 'CMD',
    prompt: 'PROMPT',
    task: 'TASK',
    workflow: 'FLOW',
  };

  return (
    <button
      onClick={onUse}
      className="w-full flex items-start gap-3 p-3 rounded-xl border border-glass-10 bg-glass-5 hover:bg-glass-10 transition-colors text-left group"
    >
      <span className={cn(
        'px-2 py-0.5 rounded text-[10px] font-bold border flex-shrink-0 mt-0.5',
        typeColors[type]
      )}>
        {typeLabels[type]}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-mono text-primary group-hover:text-blue-400 transition-colors">
          {command}
        </p>
        {description && (
          <p className="text-xs text-tertiary mt-0.5 line-clamp-2">
            {description}
          </p>
        )}
      </div>
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="text-tertiary group-hover:text-blue-400 flex-shrink-0 mt-1 transition-colors"
      >
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </button>
  );
}

function LocalEmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-8">
      <svg
        width="40"
        height="40"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="mx-auto text-tertiary mb-3"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      <p className="text-sm text-tertiary">{message}</p>
    </div>
  );
}

interface WelcomeMessageProps {
  agent: any;
}

function WelcomeMessage({ agent }: WelcomeMessageProps) {
  // Helper to check if text is a placeholder
  const isPlaceholder = (text?: string) =>
    !text || text.startsWith('[') || text.includes('{{') || text.length < 10;

  const displayDescription = agent.whenToUse || (!isPlaceholder(agent.description) ? agent.description : null);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center h-full text-center py-8"
    >
      <GlassAvatar
        name={agent.name}
        size="xl"
        squadType={agent.squadType}
        className="mb-4"
      />

      <h2 className="text-primary text-xl font-semibold mb-1">
        {agent.name}
      </h2>

      <p className="text-tertiary text-sm mb-3">
        {agent.title || agent.role}
      </p>

      {/* When to use - Key capability */}
      {displayDescription && (
        <div className="max-w-md mb-6 px-4 py-3 rounded-xl bg-glass-5 border border-glass-10">
          <p className="text-secondary text-sm leading-relaxed">
            {displayDescription}
          </p>
        </div>
      )}

      {/* Suggestion Prompts */}
      <div className="max-w-lg w-full">
        <div className="flex items-center gap-2 justify-center mb-4">
          <Lightbulb size={20} className="text-secondary" />
          <p className="text-tertiary text-xs uppercase tracking-wider font-medium">
            O que posso fazer por você
          </p>
        </div>
        <SuggestionPrompts agent={agent} />
      </div>
    </motion.div>
  );
}

function SuggestionPrompts({ agent }: { agent: any }) {
  const { sendMessage } = useChat();

  const suggestions = getSuggestionsForAgent(agent);

  return (
    <div className="grid gap-2">
      {suggestions.map((suggestion, index) => (
        <motion.button
          key={index}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          onClick={() => sendMessage(suggestion.prompt)}
          className={cn(
            'glass-subtle rounded-xl p-3 text-left',
            'hover:bg-glass-30 dark:hover:bg-glass-10',
            'transition-all duration-200 group',
            'border border-transparent hover:border-glass-10'
          )}
        >
          <div className="flex items-start gap-3">
            <suggestion.icon size={20} className="text-secondary flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-primary font-medium">{suggestion.label}</p>
              <p className="text-xs text-tertiary mt-0.5 line-clamp-1 group-hover:text-secondary transition-colors">
                {suggestion.prompt}
              </p>
            </div>
          </div>
        </motion.button>
      ))}
    </div>
  );
}

interface AgentSuggestion {
  icon: LucideIcon;
  label: string;
  prompt: string;
}

// Agent-specific suggestions mapping
const agentSuggestions: Record<string, AgentSuggestion[]> = {
  // Copywriting Squad
  'gary-halbert': [
    { icon: Mail, label: 'Carta de vendas', prompt: 'Escreva uma carta de vendas estilo Gary Halbert para um produto digital de produtividade' },
    { icon: Target, label: 'Bullets que vendem', prompt: 'Crie 10 fascination bullets para uma página de vendas de curso online' },
    { icon: Mail, label: 'Email de vendas', prompt: 'Escreva um email de vendas direto e pessoal para reativar clientes inativos' },
  ],
  'eugene-schwartz': [
    { icon: Brain, label: 'Níveis de consciência', prompt: 'Analise o nível de consciência do meu público e sugira a melhor abordagem de copy' },
    { icon: FileText, label: 'Headline breakthrough', prompt: 'Crie 5 headlines usando a técnica de mass desire do Eugene Schwartz' },
    { icon: Flame, label: 'Lead magnético', prompt: 'Escreva um lead que capture atenção imediata para uma oferta de consultoria' },
  ],
  'david-ogilvy': [
    { icon: Newspaper, label: 'Anúncio clássico', prompt: 'Crie um anúncio no estilo Ogilvy para uma marca de luxo' },
    { icon: Palette, label: 'Brand copy', prompt: 'Desenvolva o tom de voz e messaging para uma nova marca premium' },
    { icon: BarChart3, label: 'Copy com dados', prompt: 'Escreva um texto de vendas baseado em pesquisa e dados concretos' },
  ],
  // YouTube Content Squad
  'roteirista': [
    { icon: Clapperboard, label: 'Roteiro completo', prompt: 'Crie um roteiro de 10 minutos sobre [tema] com ganchos de retenção' },
    { icon: Anchor, label: 'Ganchos de abertura', prompt: 'Sugira 5 ganchos de abertura para um vídeo sobre produtividade' },
    { icon: ClipboardList, label: 'Estrutura de vídeo', prompt: 'Monte a estrutura ideal para um vídeo educacional de YouTube' },
  ],
  'title-writer': [
    { icon: Tag, label: 'Títulos virais', prompt: 'Crie 10 títulos otimizados para CTR sobre [tema do vídeo]' },
    { icon: Search, label: 'Análise de título', prompt: 'Analise este título e sugira melhorias para aumentar CTR' },
    { icon: Zap, label: 'Títulos A/B', prompt: 'Gere variações de título para teste A/B no YouTube' },
  ],
  'thumbnail-strategist': [
    { icon: Image, label: 'Conceito visual', prompt: 'Defina o conceito visual e elementos-chave para thumbnail de vídeo sobre [tema]' },
    { icon: Target, label: 'Estratégia de thumb', prompt: 'Analise thumbnails de concorrentes e sugira estratégia diferenciada' },
    { icon: Eye, label: 'Elementos de atenção', prompt: 'Quais elementos visuais usar para destacar na home do YouTube?' },
  ],
  'deep-researcher': [
    { icon: Microscope, label: 'Pesquisa profunda', prompt: 'Faça uma pesquisa aprofundada sobre [tema] com fontes acadêmicas' },
    { icon: Library, label: 'Estado da arte', prompt: 'Qual o estado atual da pesquisa científica sobre [tema]?' },
    { icon: BarChart3, label: 'Dados e estatísticas', prompt: 'Encontre dados e estatísticas relevantes sobre [tema] para fundamentar meu conteúdo' },
  ],
  'briefing-creator': [
    { icon: ClipboardList, label: 'Briefing completo', prompt: 'Crie um briefing estruturado para produção de vídeo sobre [tema]' },
    { icon: Target, label: 'Direcionamento criativo', prompt: 'Sintetize esta pesquisa em direcionamentos claros para o roteirista' },
    { icon: Sparkles, label: 'Checklist de briefing', prompt: 'Monte um checklist de todos os elementos necessários para o briefing' },
  ],
  // Design System Squad
  'brad-frost': [
    { icon: Puzzle, label: 'Design System', prompt: 'Estruture um design system com atomic design para minha aplicação' },
    { icon: Package, label: 'Componentes', prompt: 'Defina a hierarquia de componentes (átomos, moléculas, organismos) para um dashboard' },
    { icon: BookOpen, label: 'Documentação', prompt: 'Crie a documentação de um componente de botão seguindo best practices' },
  ],
  'dan-mall': [
    { icon: Palette, label: 'Design tokens', prompt: 'Defina os design tokens essenciais para consistência visual' },
    { icon: RefreshCw, label: 'Design handoff', prompt: 'Como estruturar um handoff eficiente entre design e desenvolvimento?' },
    { icon: Ruler, label: 'Grid system', prompt: 'Sugira um grid system responsivo para uma aplicação web moderna' },
  ],
  // Orchestrator Squad
  'supervisor-sistema': [
    { icon: Target, label: 'Coordenar squads', prompt: 'Coordene uma tarefa complexa envolvendo múltiplos squads' },
    { icon: BarChart3, label: 'Análise de gaps', prompt: 'Identifique gaps de cobertura nos squads atuais' },
    { icon: RefreshCw, label: 'Otimizar workflow', prompt: 'Sugira melhorias no workflow entre os squads de conteúdo' },
  ],
  'roteador': [
    { icon: GitMerge, label: 'Rotear demanda', prompt: 'Qual o melhor squad e agente para criar uma campanha de lançamento?' },
    { icon: Target, label: 'Classificar tarefa', prompt: 'Classifique esta tarefa e indique o fluxo ideal de execução' },
    { icon: ClipboardList, label: 'Plano de ação', prompt: 'Monte um plano de ação com os agentes necessários para [objetivo]' },
  ],
};

// Squad-level fallback suggestions
const squadSuggestions: Record<string, AgentSuggestion[]> = {
  copywriting: [
    { icon: PenTool, label: 'Copy de vendas', prompt: 'Escreva um texto de vendas persuasivo para [produto/serviço]' },
    { icon: Mail, label: 'Sequência de emails', prompt: 'Crie uma sequência de 5 emails para lançamento de produto' },
    { icon: Target, label: 'Headlines', prompt: 'Gere 10 headlines impactantes para [tema]' },
  ],
  design: [
    { icon: Palette, label: 'Sistema visual', prompt: 'Defina um sistema visual completo para minha aplicação' },
    { icon: Smartphone, label: 'UI patterns', prompt: 'Quais UI patterns usar para uma experiência mobile-first?' },
    { icon: Puzzle, label: 'Componentes', prompt: 'Estruture uma biblioteca de componentes reutilizáveis' },
  ],
  creator: [
    { icon: Clapperboard, label: 'Conteúdo', prompt: 'Crie um plano de conteúdo para [plataforma] sobre [tema]' },
    { icon: Calendar, label: 'Calendário', prompt: 'Monte um calendário editorial para o próximo mês' },
    { icon: Lightbulb, label: 'Ideias', prompt: 'Sugira 20 ideias de conteúdo para engajar minha audiência' },
  ],
  orchestrator: [
    { icon: Target, label: 'Orquestrar', prompt: 'Coordene uma entrega complexa entre múltiplos especialistas' },
    { icon: BarChart3, label: 'Analisar', prompt: 'Analise o fluxo atual e identifique oportunidades de melhoria' },
    { icon: RefreshCw, label: 'Workflow', prompt: 'Desenhe um workflow otimizado para [processo]' },
  ],
};

function getSuggestionsForAgent(agent: any): AgentSuggestion[] {
  // Priority 1: Dynamic commands from agent markdown files (from backend)
  if (agent.commands && agent.commands.length > 0) {
    const dynamicSuggestions = agent.commands.slice(0, 4).map((cmd: any) => ({
      icon: getCommandIcon(cmd.command),
      label: cmd.command.replace(/^\*/, ''),
      prompt: cmd.description,
    }));
    return dynamicSuggestions;
  }

  // Priority 2: Sample tasks extracted from markdown
  if (agent.sampleTasks && agent.sampleTasks.length > 0) {
    const taskIcons: LucideIcon[] = [Lightbulb, Target, FileText, Zap];
    const taskSuggestions = agent.sampleTasks.slice(0, 4).map((task: string, i: number) => ({
      icon: taskIcons[i % 4],
      label: task.slice(0, 30) + (task.length > 30 ? '...' : ''),
      prompt: task,
    }));
    return taskSuggestions;
  }

  // Priority 3: Agent-specific hardcoded suggestions
  if (agentSuggestions[agent.id]) {
    return agentSuggestions[agent.id];
  }

  // Priority 4: Fallback to squad suggestions
  return squadSuggestions[agent.squadType] || squadSuggestions.copywriting;
}

// Map command names to appropriate icons
function getCommandIcon(command: string): LucideIcon {
  const cmd = command.toLowerCase();
  if (cmd.includes('letter') || cmd.includes('carta')) return Mail;
  if (cmd.includes('email')) return Mail;
  if (cmd.includes('headline') || cmd.includes('titulo')) return Tag;
  if (cmd.includes('bullet')) return Target;
  if (cmd.includes('roteiro') || cmd.includes('script')) return Clapperboard;
  if (cmd.includes('research') || cmd.includes('pesquisa')) return Microscope;
  if (cmd.includes('briefing')) return ClipboardList;
  if (cmd.includes('thumbnail') || cmd.includes('thumb')) return Image;
  if (cmd.includes('hook') || cmd.includes('gancho')) return Anchor;
  if (cmd.includes('copy')) return PenTool;
  if (cmd.includes('análise') || cmd.includes('analise') || cmd.includes('analysis')) return BarChart3;
  if (cmd.includes('sequence') || cmd.includes('sequência')) return RefreshCw;
  if (cmd.includes('lead')) return Flame;
  if (cmd.includes('design')) return Palette;
  if (cmd.includes('component')) return Puzzle;
  return Zap;
}

// Tier labels with plural for grouping
const tierPluralLabels: Record<AgentTier, string> = {
  0: 'Orchestrators',
  1: 'Masters',
  2: 'Specialists',
};

function EmptyChat() {
  const { selectedSquadId, setSelectedSquadId } = useUIStore();
  const { agents, isLoading: agentsLoading } = useAgents();
  const { squads, isLoading: squadsLoading } = useSquads();
  const { selectAgent } = useChat();

  // Show agents when a squad is selected and agents are available
  if (selectedSquadId && agents && agents.length > 0) {
    // Group agents by tier
    const groupedAgents: Record<AgentTier, AgentSummary[]> = { 0: [], 1: [], 2: [] };
    (agents as unknown as AgentSummary[]).forEach((agent) => {
      const tier = (agent.tier === 0 || agent.tier === 1 || agent.tier === 2) ? agent.tier : 2;
      groupedAgents[tier].push(agent);
    });

    return (
      <div className="h-full flex flex-col p-6 overflow-hidden">
        {/* Header with back button */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex items-center gap-3 mb-1">
            <button
              onClick={() => setSelectedSquadId(null)}
              className="text-tertiary hover:text-primary transition-colors p-1 -ml-1 rounded-lg hover:bg-glass-10"
              title="Voltar para squads"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
            </button>
            <div>
              <h2 className="text-primary text-xl font-semibold">
                Escolha um Agent
              </h2>
              <p className="text-secondary text-sm">
                {agents.length} agents disponíveis neste squad
              </p>
            </div>
          </div>
        </motion.div>

        {/* Agents Grid */}
        <div className="flex-1 overflow-y-auto glass-scrollbar pr-2">
          <div className="space-y-6">
            {([0, 1, 2] as AgentTier[]).map((tier) => {
              const tierAgents = groupedAgents[tier];
              if (tierAgents.length === 0) return null;

              return (
                <motion.div
                  key={tier}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: tier * 0.1 }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className={cn('text-sm font-semibold', getTierTheme(tier).text)}>
                      {tierPluralLabels[tier]}
                    </span>
                    <Badge variant="outline">
                      {tierAgents.length}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {tierAgents.map((agent, index) => (
                      <motion.div
                        key={agent.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.03 }}
                      >
                        <button
                          onClick={() => selectAgent(agent)}
                          className={cn(
                            'glass-card rounded-xl p-4 text-left transition-all w-full',
                            'hover:bg-glass-10 hover:border-blue-500/30',
                            'border border-glass-10'
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <GlassAvatar name={agent.name} size="sm" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-primary truncate">{agent.name}</p>
                              <p className="text-xs text-tertiary truncate">{agent.title || agent.description}</p>
                            </div>
                          </div>
                        </button>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (agentsLoading || squadsLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  // Squad selection — show all squads as clickable cards
  return (
    <div className="h-full flex flex-col p-6 overflow-hidden">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 text-center"
      >
        <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center mx-auto mb-4">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
          </svg>
        </div>
        <h2 className="text-primary text-xl font-semibold mb-1">
          Escolha um Squad
        </h2>
        <p className="text-secondary text-sm">
          Selecione um squad para ver os agents disponíveis
        </p>
      </motion.div>

      <div className="flex-1 overflow-y-auto glass-scrollbar pr-2">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {((squads || []) as unknown as PlatformSquad[]).map((squad: PlatformSquad, index: number) => {
            const squadType = squad.type || getSquadType(squad.id);
            return (
              <motion.button
                key={squad.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.03 }}
                onClick={() => setSelectedSquadId(squad.id)}
                className={cn(
                  'glass-card rounded-xl p-4 text-left transition-all group',
                  'hover:bg-glass-10 hover:border-blue-500/30',
                  'border border-glass-10'
                )}
              >
                <div className="flex items-start gap-3">
                  <MessageSquare size={24} className="text-secondary" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-primary text-sm font-semibold truncate group-hover:text-blue-400 transition-colors">
                        {squad.name}
                      </h3>
                      <Badge variant="outline">
                        {squadLabels[squadType] || squadType}
                      </Badge>
                    </div>
                    <p className="text-tertiary text-xs line-clamp-2">
                      {squad.description}
                    </p>
                    <p className="text-tertiary text-xs mt-1.5">
                      {squad.agentCount} agents
                    </p>
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
