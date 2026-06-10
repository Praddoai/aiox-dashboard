import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff } from 'lucide-react';
import { useUIStore } from '../../stores/uiStore';
import { GlassButton } from './GlassButton';
import { cn } from '../../lib/utils';

export function FocusModeIndicator() {
  const { focusMode, toggleFocusMode } = useUIStore();

  return (
    <AnimatePresence>
      {focusMode && (
        <motion.button
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.9 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          onClick={toggleFocusMode}
          className="fixed bottom-6 right-6 z-[100] flex items-center gap-2 px-3 py-2 rounded-full glass-lg border border-blue-500/30 text-blue-400 hover:text-blue-300 hover:border-blue-500/50 transition-colors shadow-lg shadow-blue-500/10 cursor-pointer"
          aria-label="Sair do Modo Foco (⌘⇧F)"
          title="Sair do Modo Foco (⌘⇧F)"
        >
          <Eye size={14} />
          <span className="text-xs font-medium">Foco</span>
          <kbd className="px-1 py-0.5 rounded text-[9px] font-mono bg-white/10 text-white/60">⌘⇧F</kbd>
        </motion.button>
      )}
    </AnimatePresence>
  );
}

export function FocusToggle() {
  const { focusMode, toggleFocusMode } = useUIStore();

  return (
    <GlassButton
      variant="ghost"
      size="icon"
      onClick={toggleFocusMode}
      className={cn('hidden sm:flex', focusMode && 'bg-blue-500/10 text-blue-400')}
      aria-label={focusMode ? 'Sair do Modo Foco (⌘⇧F)' : 'Modo Foco (⌘⇧F)'}
    >
      {focusMode ? <EyeOff size={18} /> : <Eye size={18} />}
    </GlassButton>
  );
}
