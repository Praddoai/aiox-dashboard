/**
 * CommandPalette — Global Cmd+K overlay for searching AIOS agent commands.
 *
 * Commands are derived from the build-time generated AIOS registry.
 */

import { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Command } from 'lucide-react';
import { cn } from '../../lib/utils';
import { AGENT_COLORS } from '../../lib/agent-colors';
import { useUIStore } from '../../stores/uiStore';
import { useToast } from '../../stores/toastStore';
import { aiosRegistry } from '../../data/aios-registry.generated';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PaletteCommand {
  command: string;
  description: string;
  agent: string;
  agentName: string;
  category: string;
}

// ---------------------------------------------------------------------------
// Registry-derived commands
// ---------------------------------------------------------------------------

const REGISTRY_COMMANDS: PaletteCommand[] = aiosRegistry.agents.flatMap((agent) =>
  agent.commands.map((cmd) => ({
    command: `*${cmd.name}`,
    description: cmd.description,
    agent: agent.id,
    agentName: agent.name,
    category: agent.id,
  }))
);

const MAX_RESULTS = 100;

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const CommandRow = memo(function CommandRow({
  cmd,
  isSelected,
  index,
  onSelect,
  onHover,
}: {
  cmd: PaletteCommand;
  isSelected: boolean;
  index: number;
  onSelect: (cmd: PaletteCommand) => void;
  onHover: (index: number) => void;
}) {
  const color = AGENT_COLORS[cmd.agent] || '#696969';

  return (
    <button
      role="option"
      aria-selected={isSelected}
      className={cn(
        'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
        isSelected ? 'bg-white/8' : 'hover:bg-white/4'
      )}
      onClick={() => onSelect(cmd)}
      onMouseEnter={() => onHover(index)}
    >
      {/* Agent badge */}
      <span
        className="flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold uppercase"
        style={{
          background: `${color}15`,
          color,
          border: `1px solid ${color}30`,
        }}
      >
        {cmd.agentName.charAt(0)}
      </span>

      {/* Command + description */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <code className="text-[12px] font-mono font-semibold text-primary">
            {cmd.command}
          </code>
          <span
            className="text-[10px] px-1.5 py-0.5 rounded font-medium"
            style={{
              background: `${color}15`,
              color,
            }}
          >
            @{cmd.agent}
          </span>
        </div>
        <p className="text-[11px] text-tertiary truncate mt-0.5">
          {cmd.description}
        </p>
      </div>

      {/* Enter hint */}
      {isSelected && (
        <kbd className="flex-shrink-0 px-1.5 py-0.5 rounded text-[9px] text-tertiary bg-white/5 border border-white/10">
          Enter
        </kbd>
      )}
    </button>
  );
});

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function CommandPalette() {
  const { commandPaletteOpen, toggleCommandPalette, navigateToRegistryAgent } = useUIStore();
  const { success } = useToast();

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Filter commands
  const filtered = useMemo(() => {
    if (!query) return REGISTRY_COMMANDS.slice(0, MAX_RESULTS);
    const q = query.toLowerCase();
    return REGISTRY_COMMANDS.filter(
      (cmd) =>
        cmd.command.toLowerCase().includes(q) ||
        cmd.description.toLowerCase().includes(q) ||
        cmd.agent.toLowerCase().includes(q) ||
        cmd.agentName.toLowerCase().includes(q)
    ).slice(0, MAX_RESULTS);
  }, [query]);

  // Group by agent
  const grouped = useMemo(() => {
    const groups: Record<string, PaletteCommand[]> = {};
    for (const cmd of filtered) {
      const key = cmd.agent;
      if (!groups[key]) groups[key] = [];
      groups[key].push(cmd);
    }
    return groups;
  }, [filtered]);

  // Reset on open/filter change
  useEffect(() => {
    setSelectedIndex(0);
  }, [filtered.length]);

  useEffect(() => {
    if (commandPaletteOpen) {
      setQuery('');
      setSelectedIndex(0);
      // Auto-focus after animation starts
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [commandPaletteOpen]);

  // Cmd+K / Ctrl+K keyboard shortcut
  useEffect(() => {
    const handleGlobalKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        toggleCommandPalette();
      }
    };
    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, [toggleCommandPalette]);

  // Select handler — copy command to clipboard
  const handleSelect = useCallback(
    async (cmd: PaletteCommand) => {
      try {
        await navigator.clipboard.writeText(cmd.command);
        success('Comando copiado', `${cmd.command} copiado para a área de transferência`);
      } catch {
        success('Comando copiado', cmd.command);
      }
      toggleCommandPalette();
    },
    [success, toggleCommandPalette]
  );

  // Navigate to agent profile
  const handleGoToAgent = useCallback(
    (cmd: PaletteCommand) => {
      toggleCommandPalette();
      navigateToRegistryAgent(cmd.agent);
    },
    [toggleCommandPalette, navigateToRegistryAgent]
  );

  // Internal keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => (i + 1) % filtered.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => (i - 1 + filtered.length) % filtered.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filtered[selectedIndex]) {
          handleSelect(filtered[selectedIndex]);
        }
      } else if (e.key === 'Tab') {
        e.preventDefault();
        if (filtered[selectedIndex]) {
          handleGoToAgent(filtered[selectedIndex]);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        toggleCommandPalette();
      }
    },
    [filtered, selectedIndex, handleSelect, handleGoToAgent, toggleCommandPalette]
  );

  // Scroll selected into view
  useEffect(() => {
    if (!listRef.current) return;
    const items = listRef.current.querySelectorAll('[role="option"]');
    const item = items[selectedIndex] as HTMLElement | undefined;
    item?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  // Click outside to close
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        toggleCommandPalette();
      }
    },
    [toggleCommandPalette]
  );

  // Build flat index for grouped rendering
  let flatIndex = -1;

  return (
    <AnimatePresence>
      {commandPaletteOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[60] flex items-start justify-center pt-[15vh]"
          style={{ backdropFilter: 'blur(8px)', background: 'rgba(0,0,0,0.5)' }}
          onClick={handleBackdropClick}
        >
          <motion.div
            initial={{ opacity: 0, y: -16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.97 }}
            transition={{ duration: 0.2, ease: [0, 0, 0.2, 1] }}
            className="w-full max-w-lg mx-4 rounded-xl overflow-hidden shadow-2xl"
            style={{
              background: 'var(--color-background-raised, rgba(20, 20, 30, 0.97))',
              border: '1px solid var(--glass-border-color, rgba(255,255,255,0.1))',
            }}
            role="dialog"
            aria-label="Paleta de comandos"
          >
            {/* Search input */}
            <div
              className="flex items-center gap-3 px-4 py-3"
              style={{ borderBottom: '1px solid var(--glass-border-color, rgba(255,255,255,0.08))' }}
            >
              <Search className="w-4 h-4 text-tertiary flex-shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Buscar comandos..."
                className="flex-1 bg-transparent text-sm text-primary placeholder:text-quaternary focus:outline-none"
                aria-label="Buscar comandos"
              />
              <div className="flex items-center gap-1 flex-shrink-0">
                <kbd className="px-1.5 py-0.5 rounded text-[10px] text-quaternary bg-white/5 border border-white/10 flex items-center gap-0.5">
                  <Command className="w-2.5 h-2.5" />K
                </kbd>
              </div>
            </div>

            {/* Results */}
            <div
              ref={listRef}
              className="overflow-y-auto py-1"
              style={{ maxHeight: 360 }}
              role="listbox"
            >
              {filtered.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-tertiary">
                  Nenhum comando encontrado
                </div>
              ) : (
                Object.entries(grouped).map(([agentId, cmds]) => {
                  const color = AGENT_COLORS[agentId] || '#696969';
                  const agentName = cmds[0].agentName;

                  return (
                    <div key={agentId}>
                      {/* Agent section header */}
                      <div className="px-4 py-1.5 flex items-center gap-2">
                        <span
                          className="w-4 h-4 rounded flex items-center justify-center text-[8px] font-bold"
                          style={{ background: `${color}20`, color }}
                        >
                          {agentName.charAt(0)}
                        </span>
                        <span
                          className="text-[10px] font-bold uppercase tracking-widest"
                          style={{ color }}
                        >
                          {agentName}
                        </span>
                        <span className="text-[9px] text-quaternary">
                          @{agentId}
                        </span>
                      </div>

                      {cmds.map((cmd) => {
                        flatIndex++;
                        return (
                          <CommandRow
                            key={cmd.command}
                            cmd={cmd}
                            isSelected={flatIndex === selectedIndex}
                            index={flatIndex}
                            onSelect={handleSelect}
                            onHover={setSelectedIndex}
                          />
                        );
                      })}
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div
              className="px-4 py-2 flex items-center justify-between"
              style={{ borderTop: '1px solid var(--glass-border-color, rgba(255,255,255,0.06))' }}
            >
              <div className="flex items-center gap-3 text-[10px] text-quaternary">
                <span className="flex items-center gap-1">
                  <kbd className="px-1 py-0.5 rounded bg-white/5 border border-white/10 text-[9px]">
                    ↑↓
                  </kbd>
                  navegar
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1 py-0.5 rounded bg-white/5 border border-white/10 text-[9px]">
                    Enter
                  </kbd>
                  copiar
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1 py-0.5 rounded bg-white/5 border border-white/10 text-[9px]">
                    Tab
                  </kbd>
                  ver agente
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1 py-0.5 rounded bg-white/5 border border-white/10 text-[9px]">
                    Esc
                  </kbd>
                  fechar
                </span>
              </div>
              <span className="text-[10px] text-quaternary">
                {filtered.length} comando{filtered.length !== 1 ? 's' : ''}
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
