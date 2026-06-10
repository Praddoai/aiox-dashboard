'use client';

import { useEffect, useCallback } from 'react';
import { useUIStore } from '@/stores/uiStore';
import { useChatStore } from '@/stores/chatStore';
import { useGlobalSearch } from '@/components/search';

interface KeyboardShortcutsOptions {
  onShowShortcuts?: () => void;
  enabled?: boolean;
}

// Single-key view shortcuts mapping
const viewShortcuts: Record<string, string> = {
  h: 'chat',
  d: 'dashboard',
  w: 'world',
  k: 'kanban',
  a: 'agents',
  b: 'bob',
  t: 'terminals',
  m: 'monitor',
  i: 'insights',
  c: 'context',
  r: 'roadmap',
  q: 'squads',
  g: 'github',
  s: 'settings',
};

export function useGlobalKeyboardShortcuts(options: KeyboardShortcutsOptions = {}) {
  const { onShowShortcuts, enabled = true } = options;

  const {
    currentView,
    setCurrentView,
    toggleSidebar,
    toggleTheme,
    toggleAgentExplorer,
    toggleActivityPanel,
    toggleWorkflowView,
  } = useUIStore();

  const {
    setActiveSession,
    activeSessionId,
    sessions,
  } = useChatStore();

  const globalSearch = useGlobalSearch();

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!enabled) return;

    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const modifier = isMac ? e.metaKey : e.ctrlKey;

    // Don't trigger shortcuts when typing in inputs
    const target = e.target as HTMLElement;
    const isInput = target.tagName === 'INPUT' ||
                    target.tagName === 'TEXTAREA' ||
                    target.isContentEditable;

    // Allow some shortcuts even in inputs
    const allowInInput = ['k', 'Escape'].includes(e.key);

    // === Modifier Shortcuts (work everywhere) ===

    // Cmd+K - Global search
    if (modifier && e.key === 'k') {
      e.preventDefault();
      globalSearch.toggle();
      return;
    }

    // Cmd+B - Toggle sidebar
    if (modifier && e.key === 'b') {
      e.preventDefault();
      toggleSidebar();
      return;
    }

    // Cmd+. - Toggle theme
    if (modifier && e.key === '.') {
      e.preventDefault();
      toggleTheme();
      return;
    }

    // Cmd+E - Toggle Agent Explorer
    if (modifier && e.key === 'e') {
      e.preventDefault();
      toggleAgentExplorer();
      return;
    }

    // Cmd+\ - Toggle activity panel
    if (modifier && e.key === '\\') {
      e.preventDefault();
      toggleActivityPanel();
      return;
    }

    // Cmd+Shift+W - Toggle workflow view
    if (modifier && e.key === 'w' && e.shiftKey) {
      e.preventDefault();
      toggleWorkflowView();
      return;
    }

    // Cmd+N - New conversation
    if (modifier && e.key === 'n') {
      e.preventDefault();
      setActiveSession(null);
      setCurrentView('chat');
      return;
    }

    // Cmd+[ - Previous conversation
    if (modifier && e.key === '[') {
      e.preventDefault();
      navigateConversation('prev');
      return;
    }

    // Cmd+] - Next conversation
    if (modifier && e.key === ']') {
      e.preventDefault();
      navigateConversation('next');
      return;
    }

    // Cmd+? or Cmd+/ - Show shortcuts
    if (modifier && (e.key === '?' || e.key === '/')) {
      e.preventDefault();
      onShowShortcuts?.();
      return;
    }

    // Escape - Close modals/panels
    if (e.key === 'Escape') {
      if (globalSearch.isOpen) {
        globalSearch.close();
        return;
      }
    }

    // === Single-key shortcuts (only when NOT in an input) ===
    if (isInput && !allowInInput) return;

    // [ - Toggle sidebar
    if (e.key === '[' && !modifier) {
      e.preventDefault();
      toggleSidebar();
      return;
    }

    // View navigation shortcuts (K, A, B, T, M, I, C, R, Q, G, S)
    const lowerKey = e.key.toLowerCase();
    if (!modifier && !e.shiftKey && !e.altKey && viewShortcuts[lowerKey]) {
      e.preventDefault();
      setCurrentView(viewShortcuts[lowerKey] as any);
      return;
    }

  }, [
    enabled,
    currentView,
    setCurrentView,
    toggleSidebar,
    toggleTheme,
    toggleAgentExplorer,
    toggleActivityPanel,
    toggleWorkflowView,
    globalSearch,
    setActiveSession,
    onShowShortcuts,
  ]);

  // Navigate between conversations
  const navigateConversation = useCallback((direction: 'prev' | 'next') => {
    if (sessions.length === 0) return;

    const currentIndex = sessions.findIndex(s => s.id === activeSessionId);
    let newIndex: number;

    if (direction === 'prev') {
      newIndex = currentIndex <= 0 ? sessions.length - 1 : currentIndex - 1;
    } else {
      newIndex = currentIndex >= sessions.length - 1 ? 0 : currentIndex + 1;
    }

    setActiveSession(sessions[newIndex].id);
  }, [sessions, activeSessionId, setActiveSession]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return {
    navigateConversation,
  };
}

// Shortcut definitions for the modal
export const shortcutDefinitions = [
  // Navigation -- Single Key
  { keys: ['H'], description: 'Chat', category: 'Views' },
  { keys: ['D'], description: 'Dashboard', category: 'Views' },
  { keys: ['W'], description: 'World', category: 'Views' },
  { keys: ['K'], description: 'Kanban Board', category: 'Views' },
  { keys: ['A'], description: 'Agent Monitor', category: 'Views' },
  { keys: ['B'], description: 'Bob Orchestration', category: 'Views' },
  { keys: ['T'], description: 'Terminals', category: 'Views' },
  { keys: ['M'], description: 'Live Monitor', category: 'Views' },
  { keys: ['I'], description: 'Insights', category: 'Views' },
  { keys: ['C'], description: 'Context', category: 'Views' },
  { keys: ['R'], description: 'Roadmap', category: 'Views' },
  { keys: ['Q'], description: 'Squads', category: 'Views' },
  { keys: ['G'], description: 'GitHub', category: 'Views' },
  { keys: ['S'], description: 'Settings', category: 'Views' },
  { keys: ['['], description: 'Toggle sidebar', category: 'Views' },

  // Commands
  { keys: ['\u2318', 'K'], description: 'Abrir busca global', category: 'Comandos' },
  { keys: ['\u2318', 'B'], description: 'Toggle sidebar', category: 'Comandos' },
  { keys: ['\u2318', '.'], description: 'Toggle tema dark/light', category: 'Comandos' },
  { keys: ['\u2318', 'E'], description: 'Abrir Agent Explorer', category: 'Comandos' },
  { keys: ['\u2318', '\\'], description: 'Toggle painel de atividades', category: 'Comandos' },
  { keys: ['\u2318', '/'], description: 'Mostrar atalhos', category: 'Comandos' },
  { keys: ['Esc'], description: 'Fechar modal/painel', category: 'Comandos' },

  // Chat
  { keys: ['\u2318', 'N'], description: 'Nova conversa', category: 'Chat' },
  { keys: ['\u2318', '['], description: 'Conversa anterior', category: 'Chat' },
  { keys: ['\u2318', ']'], description: 'Próxima conversa', category: 'Chat' },
  { keys: ['\u2318', 'Enter'], description: 'Enviar mensagem', category: 'Chat' },
  { keys: ['Shift', 'Enter'], description: 'Nova linha', category: 'Chat' },
];
