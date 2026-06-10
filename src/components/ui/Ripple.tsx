import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface RippleProps {
  color?: string;
  duration?: number;
}

interface RippleInstance {
  id: number;
  x: number;
  y: number;
  size: number;
}

/**
 * Ripple effect component for button interactions
 * Wrap button content with this component for Material-like ripple effect
 */
export function useRipple(options: RippleProps = {}) {
  const { color = 'currentColor', duration = 600 } = options;
  const [ripples, setRipples] = useState<RippleInstance[]>([]);

  const createRipple = useCallback((event: React.MouseEvent<HTMLElement> | React.TouchEvent<HTMLElement>) => {
    const element = event.currentTarget;
    const rect = element.getBoundingClientRect();

    let x: number, y: number;

    if ('touches' in event) {
      x = event.touches[0].clientX - rect.left;
      y = event.touches[0].clientY - rect.top;
    } else {
      x = event.clientX - rect.left;
      y = event.clientY - rect.top;
    }

    const size = Math.max(rect.width, rect.height) * 2;

    const newRipple: RippleInstance = {
      id: Date.now(),
      x,
      y,
      size,
    };

    setRipples((prev) => [...prev, newRipple]);

    // Auto-remove ripple after animation
    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== newRipple.id));
    }, duration);
  }, [duration]);

  const RippleContainer = useCallback(() => (
    <AnimatePresence>
      {ripples.map((ripple) => (
        <motion.span
          key={ripple.id}
          initial={{ scale: 0, opacity: 0.3 }}
          animate={{ scale: 1, opacity: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: duration / 1000, ease: 'easeOut' }}
          style={{
            position: 'absolute',
            left: ripple.x - ripple.size / 2,
            top: ripple.y - ripple.size / 2,
            width: ripple.size,
            height: ripple.size,
            borderRadius: '50%',
            backgroundColor: color,
            pointerEvents: 'none',
          }}
        />
      ))}
    </AnimatePresence>
  ), [ripples, duration, color]);

  return {
    createRipple,
    RippleContainer,
  };
}

/**
 * HOC-style ripple wrapper
 */
interface RippleWrapperProps extends RippleProps {
  children: React.ReactNode;
  className?: string;
}

export function RippleWrapper({ children, className, ...rippleProps }: RippleWrapperProps) {
  const { createRipple, RippleContainer } = useRipple(rippleProps);

  return (
    <div
      className={className}
      onMouseDown={createRipple}
      onTouchStart={createRipple}
      style={{ position: 'relative', overflow: 'hidden' }}
    >
      {children}
      <RippleContainer />
    </div>
  );
}
