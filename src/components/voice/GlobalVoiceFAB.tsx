import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic } from 'lucide-react';
import { useVoiceStore } from '../../stores/voiceStore';
import { useUIStore } from '../../stores/uiStore';

/**
 * GlobalVoiceFAB — floating action button that activates voice mode from anywhere.
 *
 * - Hidden when voice overlay is active
 * - Hidden on chat view (ChatInput already has its own mic button)
 * - Positioned above StatusBar (desktop) and MobileNav (mobile)
 */
export function GlobalVoiceFAB() {
  const isActive = useVoiceStore((s) => s.isActive);
  const currentView = useUIStore((s) => s.currentView);
  const btnRef = useRef<HTMLButtonElement>(null);

  // Hide on chat view (has inline mic button) and when voice overlay is open
  const hidden = isActive || currentView === 'chat';

  const handleClick = () => {
    useVoiceStore.getState().activate();
  };

  useEffect(() => {
    const btn = btnRef.current;
    if (!btn) return;
    const isMac = navigator.platform.toUpperCase().includes('MAC');
    btn.title = `Modo voz (${isMac ? '⌘' : 'Ctrl'}+J)`;
  }, []);

  return (
    <AnimatePresence>
      {!hidden && (
        <motion.button
          ref={btnRef}
          onClick={handleClick}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.2 }}
          className="fixed z-[200] flex items-center justify-center group
                     bottom-11 right-5
                     md:bottom-11 md:right-6"
          style={{
            width: 48,
            height: 48,
            borderRadius: 0,
            background: 'rgba(209,255,0,0.08)',
            border: '1px solid rgba(209,255,0,0.2)',
            cursor: 'pointer',
            outline: 'none',
          }}
          whileHover={{
            background: 'rgba(209,255,0,0.15)',
            borderColor: 'rgba(209,255,0,0.4)',
          }}
          whileTap={{ scale: 0.95 }}
          aria-label="Ativar modo voz"
        >
          {/* Pulse ring */}
          <span
            className="absolute inset-0 pointer-events-none"
            style={{
              border: '1px solid rgba(209,255,0,0.1)',
              animation: 'gvf-pulse 3s ease-in-out infinite',
            }}
          />

          <Mic
            size={18}
            className="relative z-[1] transition-colors duration-200"
            style={{ color: 'rgba(209,255,0,0.6)' }}
          />

          {/* Shortcut hint on hover */}
          <span
            className="absolute right-full mr-2 px-2 py-1 text-[10px] font-mono uppercase tracking-wider whitespace-nowrap
                       opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
            style={{
              background: 'rgba(5,5,5,0.9)',
              border: '1px solid rgba(209,255,0,0.15)',
              color: 'rgba(209,255,0,0.5)',
            }}
          >
            ⌘J
          </span>

          <style>{`
            @keyframes gvf-pulse {
              0%, 100% { transform: scale(1); opacity: 1; }
              50% { transform: scale(1.08); opacity: 0.5; }
            }
          `}</style>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
