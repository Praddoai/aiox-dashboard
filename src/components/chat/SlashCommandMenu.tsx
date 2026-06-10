import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';

export interface SlashCommand {
  command: string;
  label: string;
  description: string;
  icon: string; // SVG path
  category: 'agent' | 'workflow' | 'system' | 'quick';
}

// Built-in slash commands
const BUILT_IN_COMMANDS: SlashCommand[] = [
  {
    command: '/help',
    label: 'Ajuda',
    description: 'Ver comandos disponíveis',
    icon: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm1 17h-2v-2h2v2zm0-4h-2V7h2v8z',
    category: 'system',
  },
  {
    command: '/clear',
    label: 'Limpar Chat',
    description: 'Limpar o histórico da conversa',
    icon: 'M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2',
    category: 'system',
  },
  {
    command: '/export',
    label: 'Exportar',
    description: 'Exportar conversa como arquivo',
    icon: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3',
    category: 'system',
  },
  {
    command: '/orquestrar',
    label: 'Orquestrar',
    description: 'Executar orquestração multi-squad com Bob',
    icon: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
    category: 'workflow',
  },
  {
    command: '/task',
    label: 'Nova Task',
    description: 'Criar uma nova task para o agente',
    icon: 'M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11',
    category: 'workflow',
  },
  {
    command: '/story',
    label: 'Nova Story',
    description: 'Criar uma nova story no kanban',
    icon: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z',
    category: 'workflow',
  },
  {
    command: '/review',
    label: 'Code Review',
    description: 'Solicitar review de código',
    icon: 'M16 18l6-6-6-6M8 6l-6 6 6 6',
    category: 'agent',
  },
  {
    command: '/analyze',
    label: 'Analisar',
    description: 'Analisar código ou arquitetura',
    icon: 'M21 21l-6-6m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0z',
    category: 'agent',
  },
  {
    command: '/deploy',
    label: 'Deploy',
    description: 'Iniciar processo de deploy',
    icon: 'M22 12l-4-4v3H3v2h15v3l4-4z',
    category: 'workflow',
  },
  {
    command: '/status',
    label: 'Status',
    description: 'Ver status do sistema',
    icon: 'M22 12h-4l-3 9L9 3l-3 9H2',
    category: 'quick',
  },
  {
    command: '/template',
    label: 'Template',
    description: 'Inserir template de prompt',
    icon: 'M4 5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5zM4 13a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-6z',
    category: 'quick',
  },
];

const CATEGORY_LABELS: Record<SlashCommand['category'], string> = {
  quick: 'Rápido',
  agent: 'Agente',
  workflow: 'Workflow',
  system: 'Sistema',
};

const CATEGORY_COLORS: Record<SlashCommand['category'], string> = {
  quick: '#10B981',
  agent: '#8B5CF6',
  workflow: '#3B82F6',
  system: '#6B7280',
};

interface SlashCommandMenuProps {
  query: string; // text after "/"
  isVisible: boolean;
  onSelect: (command: SlashCommand) => void;
  onClose: () => void;
  extraCommands?: SlashCommand[];
  anchor?: 'top' | 'bottom';
}

export function SlashCommandMenu({
  query,
  isVisible,
  onSelect,
  onClose,
  extraCommands = [],
  anchor = 'top',
}: SlashCommandMenuProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const allCommands = useMemo(
    () => [...BUILT_IN_COMMANDS, ...extraCommands],
    [extraCommands]
  );

  const filtered = useMemo(() => {
    if (!query) return allCommands;
    const q = query.toLowerCase();
    return allCommands.filter(
      (cmd) =>
        cmd.command.toLowerCase().includes(q) ||
        cmd.label.toLowerCase().includes(q) ||
        cmd.description.toLowerCase().includes(q)
    );
  }, [query, allCommands]);

  // Reset selection when filtered list changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [filtered.length]);

  // Keyboard navigation
  useEffect(() => {
    if (!isVisible) return;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => (i + 1) % filtered.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => (i - 1 + filtered.length) % filtered.length);
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        if (filtered[selectedIndex]) {
          onSelect(filtered[selectedIndex]);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isVisible, filtered, selectedIndex, onSelect, onClose]);

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current) return;
    const item = listRef.current.children[selectedIndex] as HTMLElement;
    item?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  if (!isVisible || filtered.length === 0) return null;

  // Group by category
  const grouped = filtered.reduce(
    (acc, cmd) => {
      if (!acc[cmd.category]) acc[cmd.category] = [];
      acc[cmd.category].push(cmd);
      return acc;
    },
    {} as Record<string, SlashCommand[]>
  );

  let flatIndex = -1;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: anchor === 'top' ? 8 : -8, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: anchor === 'top' ? 8 : -8, scale: 0.97 }}
        transition={{ duration: 0.15 }}
        className={cn(
          'absolute left-2 right-2 z-50 rounded-xl overflow-hidden shadow-2xl',
          anchor === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'
        )}
        style={{
          background: 'var(--color-background-raised, rgba(20, 20, 30, 0.95))',
          border: '1px solid var(--glass-border-color, rgba(255,255,255,0.1))',
          backdropFilter: 'blur(16px)',
          maxHeight: 320,
        }}
      >
        {/* Header */}
        <div
          className="px-3 py-2 flex items-center gap-2"
          style={{ borderBottom: '1px solid var(--glass-border-color, rgba(255,255,255,0.06))' }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-tertiary">
            <path d="M4 17l6-6-6-6M12 19h8" />
          </svg>
          <span className="text-[10px] text-tertiary font-medium">Comandos</span>
          <span className="text-[10px] text-quaternary ml-auto">
            {filtered.length} resultado{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Command list */}
        <div ref={listRef} className="overflow-y-auto max-h-[260px] py-1" role="listbox">
          {Object.entries(grouped).map(([category, cmds]) => (
            <div key={category}>
              <div className="px-3 py-1">
                <span
                  className="text-[9px] font-bold uppercase tracking-widest"
                  style={{ color: CATEGORY_COLORS[category as SlashCommand['category']] }}
                >
                  {CATEGORY_LABELS[category as SlashCommand['category']]}
                </span>
              </div>
              {cmds.map((cmd) => {
                flatIndex++;
                const idx = flatIndex;
                const isSelected = idx === selectedIndex;

                return (
                  <button
                    key={cmd.command}
                    role="option"
                    aria-selected={isSelected}
                    className={cn(
                      'w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors',
                      isSelected ? 'bg-white/8' : 'hover:bg-white/4'
                    )}
                    onClick={() => onSelect(cmd)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                  >
                    <div
                      className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center"
                      style={{
                        background: `${CATEGORY_COLORS[cmd.category]}15`,
                      }}
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke={CATEGORY_COLORS[cmd.category]}
                        strokeWidth="2"
                      >
                        <path d={cmd.icon} />
                      </svg>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <code className="text-[11px] font-mono font-semibold text-primary">
                          {cmd.command}
                        </code>
                        <span className="text-[10px] text-secondary">{cmd.label}</span>
                      </div>
                      <p className="text-[10px] text-tertiary truncate">{cmd.description}</p>
                    </div>

                    {isSelected && (
                      <kbd className="flex-shrink-0 px-1.5 py-0.5 rounded text-[9px] text-tertiary bg-white/5">
                        Enter
                      </kbd>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
