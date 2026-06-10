import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SmartMessageList } from './VirtualizedMessageList';
import { ChatInput } from './ChatInput';
import { ChatConversationPanel } from './ChatConversationPanel';
import { ChatHeader } from './ChatHeader';
import { WelcomeMessage } from './WelcomeMessage';
import { EmptyChat } from './EmptyChat';
import { useChat } from '../../hooks/useChat';
import { useChatStore } from '../../stores/chatStore';
import { useUIStore } from '../../stores/uiStore';
import { ORCHESTRATION_TRIGGERS } from './chat-types';

export function ChatContainer() {
  const {
    activeSession,
    selectedAgent,
    isAgentLoading,
    isStreaming,
    sendMessage,
    stopStreaming,
  } = useChat();
  const { sessions, activeSessionId, setActiveSession, deleteSession } = useChatStore();
  const { selectedAgentId, setCurrentView } = useUIStore();
  const [chatSidebarOpen, setChatSidebarOpen] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeSession?.messages]);

  // Track scroll position for scroll-to-bottom button
  useEffect(() => {
    const el = scrollAreaRef.current;
    if (!el) return;
    const onScroll = () => {
      const gap = el.scrollHeight - el.scrollTop - el.clientHeight;
      setShowScrollBtn(gap > 200);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Show loading while agent data is being fetched (prevents flash of EmptyChat)
  if (!selectedAgent && isAgentLoading && selectedAgentId) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-[#0099FF] border-t-transparent rounded-full" />
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
        <div ref={scrollAreaRef} className="flex-1 overflow-y-auto glass-scrollbar px-4 md:px-6 py-4 relative">
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

          {/* Scroll to bottom floating button */}
          <AnimatePresence>
            {showScrollBtn && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: 10 }}
                onClick={scrollToBottom}
                className="sticky bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 px-3 py-2 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/15 text-white/70 hover:text-white text-xs transition-colors shadow-lg"
                title="Ir para o final"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="7 13 12 18 17 13" />
                  <polyline points="7 6 12 11 17 6" />
                </svg>
                Novas mensagens
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* Input Area */}
        <div className="p-4 pt-0">
          <ChatInput
            onSend={(message, attachments) => {
              // Detect orchestration commands and redirect to TaskOrchestrator
              if (ORCHESTRATION_TRIGGERS.some(re => re.test(message.trim()))) {
                const demand = message.replace(/^(\/orquestrar|\/orchestrate|@bob)\s*/i, '').trim();
                setCurrentView('bob');
                if (demand) {
                  sessionStorage.setItem('orchestration-demand', demand);
                }
                // Store originating session ID so results can be injected back
                if (activeSessionId) {
                  sessionStorage.setItem('orchestration-source-session', activeSessionId);
                }
                return;
              }
              sendMessage(message, attachments);
            }}
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
