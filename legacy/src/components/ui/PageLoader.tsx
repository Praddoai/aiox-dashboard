'use client';

import { motion } from 'framer-motion';

interface PageLoaderProps {
  message?: string;
}

export function PageLoader({ message = 'Carregando...' }: PageLoaderProps) {
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
            className="absolute inset-0 rounded-full border-2 border-[var(--loader-ring,theme(colors.border))]"
            animate={{ rotate: 360 }}
            transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
          />

          {/* Inner spinning arc */}
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-transparent border-t-[var(--loader-arc,theme(colors.primary))]"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />

          {/* Center dot */}
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <div className="h-3 w-3 rounded-full bg-gradient-to-br from-[var(--loader-dot-from,theme(colors.primary))] to-[var(--loader-dot-to,theme(colors.primary))]" />
          </motion.div>
        </div>

        {/* Loading text */}
        <motion.p
          className="mt-4 text-sm text-muted-foreground text-center"
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

// Compact inline loader for smaller areas
export function InlineLoader({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  };

  return (
    <motion.div
      className={`${sizes[size]} rounded-full border-2 border-transparent border-t-[var(--loader-arc,hsl(var(--primary)))]`}
      animate={{ rotate: 360 }}
      transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
    />
  );
}
