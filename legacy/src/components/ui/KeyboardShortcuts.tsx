'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// Icons
const KeyboardIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="2" y="4" width="20" height="16" rx="2" ry="2" />
    <path d="M6 8h.001M10 8h.001M14 8h.001M18 8h.001M8 12h.001M12 12h.001M16 12h.001M6 16h12" />
  </svg>
);

const CloseIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

// Default shortcut definitions — can be overridden via props
export const defaultShortcutDefinitions = [
  // Navigation
  { keys: ['K'], description: 'Kanban Board', category: 'Views' },
  { keys: ['A'], description: 'Agents', category: 'Views' },
  { keys: ['B'], description: 'Bob', category: 'Views' },
  { keys: ['T'], description: 'Terminals', category: 'Views' },
  { keys: ['M'], description: 'Monitor', category: 'Views' },
  { keys: ['I'], description: 'Insights', category: 'Views' },
  { keys: ['S'], description: 'Settings', category: 'Views' },

  // Commands
  { keys: ['\u2318', 'K'], description: 'Busca global', category: 'Comandos' },
  { keys: ['\u2318', 'B'], description: 'Toggle sidebar', category: 'Comandos' },
  { keys: ['\u2318', '.'], description: 'Toggle tema', category: 'Comandos' },
  { keys: ['\u2318', '/'], description: 'Mostrar atalhos', category: 'Comandos' },
  { keys: ['Esc'], description: 'Fechar modal/painel', category: 'Comandos' },
];

export type ShortcutDefinition = {
  keys: string[];
  description: string;
  category: string;
};

interface KeyboardShortcutsProps {
  isOpen: boolean;
  onClose: () => void;
  shortcuts?: ShortcutDefinition[];
}

// Group shortcuts by category
function useGroupedShortcuts(shortcuts: ShortcutDefinition[]) {
  return useMemo(() => {
    return shortcuts.reduce((acc, shortcut) => {
      if (!acc[shortcut.category]) {
        acc[shortcut.category] = [];
      }
      acc[shortcut.category].push(shortcut);
      return acc;
    }, {} as Record<string, ShortcutDefinition[]>);
  }, [shortcuts]);
}

export function KeyboardShortcuts({ isOpen, onClose, shortcuts = defaultShortcutDefinitions }: KeyboardShortcutsProps) {
  const groupedShortcuts = useGroupedShortcuts(shortcuts);

  // Close on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-overlay backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed top-[15%] left-1/2 -translate-x-1/2 z-50 w-full max-w-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="glass-card rounded-2xl overflow-hidden shadow-2xl">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-glass-10">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl glass-subtle flex items-center justify-center text-foreground">
                    <KeyboardIcon />
                  </div>
                  <div>
                    <h2 className="text-foreground font-semibold">Atalhos de Teclado</h2>
                    <p className="text-xs text-muted-foreground">Navegue mais rápido</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-glass-10 transition-colors"
                >
                  <CloseIcon />
                </button>
              </div>

              {/* Content */}
              <div className="p-4 max-h-[60vh] overflow-y-auto glass-scrollbar">
                <div className="space-y-6">
                  {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
                    <div key={category}>
                      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                        {category}
                      </h3>
                      <div className="space-y-2">
                        {categoryShortcuts.map((shortcut, index) => (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.03 }}
                            className="flex items-center justify-between p-2 rounded-lg hover:bg-glass-5 transition-colors"
                          >
                            <span className="text-sm text-muted-foreground">{shortcut.description}</span>
                            <div className="flex items-center gap-1">
                              {shortcut.keys.map((key, keyIndex) => (
                                <span key={keyIndex}>
                                  <kbd className={cn(
                                    'px-2 py-1 rounded-md text-xs font-mono',
                                    'bg-glass-10 text-foreground border border-glass-10',
                                    'shadow-sm'
                                  )}>
                                    {key}
                                  </kbd>
                                  {keyIndex < shortcut.keys.length - 1 && (
                                    <span className="text-muted-foreground mx-0.5">+</span>
                                  )}
                                </span>
                              ))}
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-glass-10 flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  Pressione <kbd className="px-1.5 py-0.5 rounded bg-glass-10 text-foreground font-mono text-[10px]">{'\u2318'}</kbd>
                  <span className="mx-1">+</span>
                  <kbd className="px-1.5 py-0.5 rounded bg-glass-10 text-foreground font-mono text-[10px]">?</kbd>
                  {' '}para abrir/fechar
                </p>
                <button
                  onClick={onClose}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Fechar
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Hook for keyboard shortcuts modal
export function useKeyboardShortcuts() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + ? to toggle shortcuts
      if ((e.metaKey || e.ctrlKey) && e.key === '?') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    toggle: () => setIsOpen(prev => !prev),
  };
}
