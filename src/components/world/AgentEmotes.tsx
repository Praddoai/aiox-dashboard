import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { EMOTE_LIST, type EmoteKey } from '../../lib/icons';

interface AgentEmotesProps {
  /** Position (center of the emote ring) */
  x: number;
  y: number;
  onEmote: (emote: string) => void;
  onClose: () => void;
}

const RING_RADIUS = 44;

export function AgentEmotes({ x, y, onEmote, onClose }: AgentEmotesProps) {
  const [selectedEmote, setSelectedEmote] = useState<EmoteKey | null>(null);

  const handleEmote = (key: EmoteKey) => {
    setSelectedEmote(key);
    onEmote(key);
    setTimeout(onClose, 800);
  };

  return (
    <>
      {/* Backdrop to catch clicks */}
      <div className="absolute inset-0 z-30" onClick={onClose} />

      {/* Emote ring */}
      <motion.div
        className="absolute z-40 pointer-events-none"
        style={{ left: x, top: y - 20 }}
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.5 }}
        transition={{ type: 'spring', damping: 15, stiffness: 300 }}
      >
        {EMOTE_LIST.map((emote, i) => {
          const angle = (i / EMOTE_LIST.length) * Math.PI * 2 - Math.PI / 2;
          const ex = Math.cos(angle) * RING_RADIUS;
          const ey = Math.sin(angle) * RING_RADIUS;

          return (
            <motion.button
              key={emote.key}
              className="absolute pointer-events-auto flex items-center justify-center rounded-full"
              style={{
                width: 28,
                height: 28,
                left: ex - 14,
                top: ey - 14,
                background: 'rgba(0,0,0,0.7)',
                border: '1px solid rgba(255,255,255,0.15)',
                cursor: 'pointer',
                color: 'rgba(255,255,255,0.8)',
              }}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.04, type: 'spring', damping: 12 }}
              whileHover={{ scale: 1.3, background: 'rgba(255,255,255,0.2)' }}
              whileTap={{ scale: 0.9 }}
              onClick={(e) => {
                e.stopPropagation();
                handleEmote(emote.key);
              }}
              title={emote.label}
            >
              <emote.Icon size={14} />
            </motion.button>
          );
        })}
      </motion.div>

      {/* Floating emote animation */}
      <AnimatePresence>
        {selectedEmote && (() => {
          const selected = EMOTE_LIST.find(e => e.key === selectedEmote);
          if (!selected) return null;
          return (
            <motion.div
              className="absolute z-50 pointer-events-none"
              style={{ left: x - 12, top: y - 30, color: 'rgba(255,255,255,0.9)' }}
              initial={{ opacity: 1, y: 0, scale: 1 }}
              animate={{ opacity: 0, y: -40, scale: 1.5 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            >
              <selected.Icon size={24} />
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </>
  );
}

/** Small floating emote that rises and fades — used after selection */
export function FloatingEmote({ emoteKey, x, y }: { emoteKey: string; x: number; y: number }) {
  const emote = EMOTE_LIST.find(e => e.key === emoteKey);
  if (!emote) return null;
  return (
    <motion.div
      className="absolute pointer-events-none"
      style={{ left: x - 10, top: y - 30, zIndex: 45, color: 'rgba(255,255,255,0.9)' }}
      initial={{ opacity: 1, y: 0, scale: 0.8 }}
      animate={{ opacity: 0, y: -50, scale: 1.4 }}
      transition={{ duration: 1.2, ease: 'easeOut' }}
    >
      <emote.Icon size={20} />
    </motion.div>
  );
}
