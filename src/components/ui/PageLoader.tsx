import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

interface PageLoaderProps {
  message?: string;
}

function useIsAioxTheme() {
  const [isAiox, setIsAiox] = useState(false);
  useEffect(() => {
    const check = () =>
      setIsAiox(document.documentElement.dataset.theme === 'aiox');
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
    return () => observer.disconnect();
  }, []);
  return isAiox;
}

// Particle Orbit loader for AIOX theme
function ParticleOrbitLoader({ message }: PageLoaderProps) {
  const particles = [0, 1, 2, 3];
  const orbitRadius = 28;

  return (
    <div className="h-full flex flex-col items-center justify-center">
      <motion.div
        className="relative"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        <div className="relative h-20 w-20">
          {/* Orbit ring */}
          <div
            className="absolute inset-0 rounded-full"
            style={{
              border: '1px solid rgba(209, 255, 0, 0.12)',
            }}
          />

          {/* Central mark with pulse */}
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            animate={{ scale: [1, 1.08, 1] }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: [0.25, 0.1, 0.25, 1],
            }}
          >
            <svg
              viewBox="0 0 377 320"
              fill="none"
              className="h-6 w-6"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fill="#D1FF00"
                d="M0 310.6H376.464L188.219 9.4L0 310.6ZM96.047 257.35L188.219 109.875L280.392 257.35H96.047Z"
              />
            </svg>
          </motion.div>

          {/* Orbiting particles */}
          {particles.map((i) => (
            <motion.div
              key={i}
              className="absolute"
              style={{
                top: '50%',
                left: '50%',
                width: 6,
                height: 6,
                marginTop: -3,
                marginLeft: -3,
              }}
              animate={{
                x: [
                  Math.cos((i * Math.PI) / 2) * orbitRadius,
                  Math.cos((i * Math.PI) / 2 + Math.PI / 2) * orbitRadius,
                  Math.cos((i * Math.PI) / 2 + Math.PI) * orbitRadius,
                  Math.cos((i * Math.PI) / 2 + (3 * Math.PI) / 2) * orbitRadius,
                  Math.cos((i * Math.PI) / 2 + 2 * Math.PI) * orbitRadius,
                ],
                y: [
                  Math.sin((i * Math.PI) / 2) * orbitRadius,
                  Math.sin((i * Math.PI) / 2 + Math.PI / 2) * orbitRadius,
                  Math.sin((i * Math.PI) / 2 + Math.PI) * orbitRadius,
                  Math.sin((i * Math.PI) / 2 + (3 * Math.PI) / 2) * orbitRadius,
                  Math.sin((i * Math.PI) / 2 + 2 * Math.PI) * orbitRadius,
                ],
                scale: [0.8, 1.2, 0.8, 1.2, 0.8],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: 'linear',
                delay: i * 0.15,
              }}
            >
              <div
                className="h-full w-full rounded-full"
                style={{
                  background: '#D1FF00',
                  boxShadow: '0 0 8px rgba(209, 255, 0, 0.5)',
                  opacity: 0.8 - i * 0.1,
                }}
              />
            </motion.div>
          ))}
        </div>

        {/* Loading text */}
        <motion.p
          className="mt-5 text-sm text-secondary text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          {message}
        </motion.p>
      </motion.div>
    </div>
  );
}

// Default loader
function DefaultLoader({ message }: PageLoaderProps) {
  return (
    <div className="h-full flex flex-col items-center justify-center">
      <motion.div
        className="relative"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        {/* Animated logo/spinner */}
        <div className="relative h-16 w-16">
          {/* Outer ring */}
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-[var(--loader-ring)]"
            animate={{ rotate: 360 }}
            transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
          />

          {/* Inner spinning arc */}
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-transparent border-t-[var(--loader-arc)]"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />

          {/* Center dot */}
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <div className="h-3 w-3 rounded-full" style={{ background: 'linear-gradient(to bottom right, var(--loader-dot-from), var(--loader-dot-to))' }} />
          </motion.div>
        </div>

        {/* Loading text */}
        <motion.p
          className="mt-4 text-sm text-secondary text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {message}
        </motion.p>
      </motion.div>
    </div>
  );
}

export function PageLoader({ message = 'Carregando...' }: PageLoaderProps) {
  const isAiox = useIsAioxTheme();

  if (isAiox) {
    return <ParticleOrbitLoader message={message} />;
  }

  return <DefaultLoader message={message} />;
}

// Compact inline loader for smaller areas
export function InlineLoader({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  };

  return (
    <motion.div
      className={`${sizes[size]} rounded-full border-2 border-transparent border-t-[var(--loader-arc)]`}
      animate={{ rotate: 360 }}
      transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
    />
  );
}
