import { useCallback, useMemo } from 'react';
import { useChatStore } from '../stores/chatStore';
import { useUIStore } from '../stores/uiStore';
import { useToastStore } from '../stores/toastStore';
import { useFavoritesStore } from './useFavorites';
import { useAgentById, type AgentWithUI } from './useAgents';
import { useExecuteAgent } from './useExecute';
import type { AgentSummary, MessageAttachment } from '../types';
import { getSquadType as getSquadTypeUtil } from '../types';

export function useChat() {
  const { selectedAgentId, selectedSquadId } = useUIStore();
  const { data: fetchedAgent, isLoading: isAgentLoading } = useAgentById(selectedAgentId, selectedSquadId);

  const {
    sessions,
    activeSessionId,
    isLoading,
    isStreaming,
    error,
    createSession,
    setActiveSession,
    getActiveSession,
    getSessionByAgent,
    deleteSession,
    clearSessions,
    setError,
    stopStreaming,
  } = useChatStore();

  const executeMutation = useExecuteAgent();

  const activeSession = getActiveSession();

  // Fallback: if agent not found in API but we have session data,
  // build a minimal agent from session info (handles renamed/removed agents)
  const selectedAgent = useMemo<AgentWithUI | null | undefined>(() => {
    if (fetchedAgent) return fetchedAgent;
    if (!isAgentLoading && selectedAgentId && activeSession) {
      return {
        id: activeSession.agentId,
        name: activeSession.agentName,
        squad: activeSession.squadId,
        squadType: activeSession.squadType || getSquadTypeUtil(activeSession.squadId),
        tier: 2 as const,
        role: 'Agent (offline)',
        status: 'offline' as const,
      };
    }
    return fetchedAgent;
  }, [fetchedAgent, isAgentLoading, selectedAgentId, activeSession]);

  const selectAgent = useCallback(
    (agent: AgentSummary) => {
      console.log('[useChat.selectAgent] Selecting agent:', agent.id);

      // Check if there's already a session for this agent
      const existingSession = getSessionByAgent(agent.id);
      const squadType = getSquadTypeUtil(agent.squad);

      if (existingSession) {
        console.log('[useChat.selectAgent] Using existing session:', existingSession.id);
        setActiveSession(existingSession.id);
      } else {
        // Create new session
        console.log('[useChat.selectAgent] Creating new session');
        const newSessionId = createSession(agent.id, agent.name, agent.squad, squadType);
        console.log('[useChat.selectAgent] New session created:', newSessionId);
      }

      // Update UI store - set both values atomically to avoid clearing agentId
      useUIStore.setState({
        selectedSquadId: agent.squad,
        selectedAgentId: agent.id
      });

      // Add to recents
      useFavoritesStore.getState().addRecent({
        id: agent.id,
        name: agent.name,
        squad: agent.squad,
      });
    },
    [createSession, getSessionByAgent, setActiveSession]
  );

  const sendMessage = useCallback(
    async (content: string, attachments?: MessageAttachment[]) => {
      // Get latest state directly from store to avoid stale closure
      const { activeSessionId: currentSessionId, isStreaming: currentIsStreaming } = useChatStore.getState();

      console.log('[useChat.sendMessage] Called with:', {
        content,
        attachments: attachments?.length || 0,
        selectedAgent: selectedAgent?.id,
        activeSessionId: currentSessionId,
        isStreaming: currentIsStreaming
      });

      if (!selectedAgent || !currentSessionId || currentIsStreaming) {
        console.log('[useChat.sendMessage] Early return - missing:', {
          hasAgent: !!selectedAgent,
          hasSession: !!currentSessionId,
          isStreaming: currentIsStreaming
        });
        return;
      }

      const squadType = getSquadTypeUtil(selectedAgent.squad);
      const { addToast } = useToastStore.getState();

      setError(null);

      console.log('[useChat.sendMessage] Executing mutation with sessionId:', currentSessionId);
      try {
        await executeMutation.mutateAsync({
          sessionId: currentSessionId,
          squadId: selectedAgent.squad,
          agentId: selectedAgent.id,
          agentName: selectedAgent.name,
          squadType,
          message: content,
          attachments,
          stream: true,
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An error occurred';
        setError(errorMessage);
        addToast({
          type: 'error',
          title: 'Erro ao enviar mensagem',
          message: errorMessage,
        });
      }
    },
    [selectedAgent, executeMutation, setError]
  );

  return {
    // State
    sessions,
    activeSession,
    activeSessionId,
    selectedAgent,
    isAgentLoading,
    isLoading,
    isStreaming,
    error,

    // Actions
    selectAgent,
    sendMessage,
    stopStreaming,
    setActiveSession,
    deleteSession,
    clearSessions,
  };
}
