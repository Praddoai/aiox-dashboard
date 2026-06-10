import { useCallback, useEffect, useRef } from 'react';
import { VoiceMode } from './VoiceMode';
import { GlobalVoiceFAB } from './GlobalVoiceFAB';
import { useVoiceMode } from '../../hooks/useVoiceMode';
import { useVoiceStore } from '../../stores/voiceStore';
import { useChatStore } from '../../stores/chatStore';
import { useUIStore } from '../../stores/uiStore';
import { useExecuteAgent } from '../../hooks/useExecute';
import { useAgentById } from '../../hooks/useAgents';
import { useToastStore } from '../../stores/toastStore';
import { getSquadType as getSquadTypeUtil } from '../../types';
import type { MessageAttachment } from '../../types';

// Agent identity for Gemini Live voice sessions
const GEMINI_AGENT_ID = 'aios-voice-gemini';
const GEMINI_AGENT_NAME = 'AIOS Voice';
const GEMINI_SQUAD_ID = 'orchestrator';

/**
 * GlobalVoiceProvider — mounts voice FAB + VoiceMode overlay at the root layout level,
 * making voice accessible from any view via button click or Cmd+J keyboard shortcut.
 *
 * Also syncs Gemini Live voice conversations to the chat store so they appear
 * in the text chat history when the user exits voice mode.
 */
export function GlobalVoiceProvider() {
  const { selectedAgentId, selectedSquadId } = useUIStore();
  const { data: selectedAgent } = useAgentById(selectedAgentId, selectedSquadId);
  const executeMutation = useExecuteAgent();

  // Track how many voice history entries we've already synced to chat store
  const syncedCountRef = useRef(0);

  // ---------------------------------------------------------------------------
  // Sync Gemini Live voice history → chat store
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const unsubscribe = useVoiceStore.subscribe((state, _prevState) => {
      // Only sync for gemini-live backend
      if (state.voiceBackend !== 'gemini-live') return;

      const history = state.conversationHistory;
      const newCount = history.length;
      const synced = syncedCountRef.current;

      // Nothing new to sync
      if (newCount <= synced) return;

      // On deactivate, history is cleared — reset counter
      if (newCount === 0) {
        syncedCountRef.current = 0;
        return;
      }

      // Get or create a chat session for voice messages
      const chatStore = useChatStore.getState();

      // Use the currently selected agent if available, otherwise use AIOS Voice
      const agentId = selectedAgentId || GEMINI_AGENT_ID;
      const agentName = selectedAgent?.name || GEMINI_AGENT_NAME;
      const squadId = selectedSquadId || GEMINI_SQUAD_ID;
      const squadType = getSquadTypeUtil(squadId);

      let sessionId: string | undefined;

      // Try to find existing session for this agent
      const existingSession = chatStore.sessions.find(s => s.agentId === agentId);
      if (existingSession) {
        sessionId = existingSession.id;
      } else {
        // Create a new session
        sessionId = chatStore.createSession(agentId, agentName, squadId, squadType);
      }

      // Add all new entries to the chat store
      for (let i = synced; i < newCount; i++) {
        const entry = history[i];
        chatStore.addMessage(sessionId, {
          role: entry.role === 'user' ? 'user' : 'agent',
          content: entry.text,
          agentId: entry.role === 'agent' ? agentId : undefined,
          agentName: entry.role === 'agent' ? agentName : undefined,
          squadId: entry.role === 'agent' ? squadId : undefined,
          squadType: entry.role === 'agent' ? squadType : undefined,
          metadata: entry.role === 'agent' ? {
            provider: 'gemini',
            model: 'gemini-2.5-flash-native-audio',
          } : undefined,
        });
      }

      syncedCountRef.current = newCount;
    });

    return unsubscribe;
  }, [selectedAgentId, selectedSquadId, selectedAgent]);

  // Reset sync counter when voice mode is deactivated
  const isActive = useVoiceStore((s) => s.isActive);
  useEffect(() => {
    if (!isActive) {
      syncedCountRef.current = 0;
    }
  }, [isActive]);

  // ---------------------------------------------------------------------------
  // Multi-service sendMessage (for non-Gemini backends)
  // ---------------------------------------------------------------------------
  const sendMessage = useCallback(
    async (content: string, attachments?: MessageAttachment[]) => {
      const chatStore = useChatStore.getState();

      if (!selectedAgent || chatStore.isStreaming) {
        if (!selectedAgent) {
          useToastStore.getState().addToast({
            type: 'warning',
            title: 'Nenhum agente selecionado',
            message: 'Selecione um agente no chat antes de usar o modo voz multi-service.',
          });
        }
        return;
      }

      // Find or create session for this agent
      let sessionId = chatStore.activeSessionId;
      if (!sessionId || chatStore.sessions.find(s => s.id === sessionId)?.agentId !== selectedAgent.id) {
        const existing = chatStore.sessions.find(s => s.agentId === selectedAgent.id);
        if (existing) {
          sessionId = existing.id;
          chatStore.setActiveSession(sessionId);
        } else {
          const squadType = getSquadTypeUtil(selectedAgent.squad);
          sessionId = chatStore.createSession(selectedAgent.id, selectedAgent.name, selectedAgent.squad, squadType);
        }
      }

      const squadType = getSquadTypeUtil(selectedAgent.squad);

      try {
        await executeMutation.mutateAsync({
          sessionId,
          squadId: selectedAgent.squad,
          agentId: selectedAgent.id,
          agentName: selectedAgent.name,
          squadType,
          message: content,
          attachments,
          stream: true,
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Erro ao enviar mensagem';
        useToastStore.getState().addToast({
          type: 'error',
          title: 'Erro no modo voz',
          message: errorMessage,
        });
      }
    },
    [selectedAgent, executeMutation],
  );

  const voice = useVoiceMode({ sendMessage });

  return (
    <>
      <GlobalVoiceFAB />
      <VoiceMode
        agentId={selectedAgent?.id}
        agentName={selectedAgent?.name || 'AIOS'}
        squadId={selectedAgent?.squad}
        timeDomainData={voice.timeDomainData}
        isSupported={voice.isSupported}
        onPTTDown={voice.startListening}
        onPTTUp={voice.stopListening}
        onClose={voice.deactivate}
      />
    </>
  );
}
