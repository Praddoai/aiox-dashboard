'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';

// Icons
const SunIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="5" />
    <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
  </svg>
);

const MoonIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
  </svg>
);

const SystemIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
    <line x1="8" y1="21" x2="16" y2="21" />
    <line x1="12" y1="17" x2="12" y2="21" />
  </svg>
);

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

interface ThemeToggleProps {
  showDropdown?: boolean;
  size?: 'sm' | 'md';
}

export function ThemeToggle({ showDropdown = false, size = 'md' }: ThemeToggleProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isMatrix = theme === 'matrix';
  const isGlass = theme === 'glass';
  const isAiox = theme === 'aiox';
  const isDark = resolvedTheme === 'dark' || isMatrix || isGlass || isAiox;

  const handleToggle = () => {
    if (showDropdown) {
      setIsOpen(!isOpen);
    } else {
      // Cycle: light -> dark -> glass -> matrix -> aiox -> light
      if (isAiox) {
        setTheme('light');
      } else if (isMatrix) {
        setTheme('aiox');
      } else if (isGlass) {
        setTheme('matrix');
      } else if (isDark) {
        setTheme('glass');
      } else {
        setTheme('dark');
      }
    }
  };

  const handleSelectTheme = (newTheme: string) => {
    setTheme(newTheme);
    setIsOpen(false);
  };

  const buttonSize = size === 'sm' ? 'h-8 w-8' : 'h-10 w-10';
  const iconSize = size === 'sm' ? 14 : 16;

  // Render placeholder until mounted to avoid hydration mismatch
  if (!mounted) {
    return (
      <div className={cn(buttonSize, 'rounded-xl bg-glass-5 border border-[var(--glass-border,transparent)]')} />
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <motion.button
        onClick={handleToggle}
        className={cn(
          buttonSize,
          'relative rounded-xl flex items-center justify-center',
          'bg-glass-5 hover:bg-glass-10 border border-[var(--glass-border,hsl(var(--border)))]',
          'transition-colors overflow-hidden'
        )}
        whileTap={{ scale: 0.95 }}
        aria-label={`Tema atual: ${theme === 'system' ? 'Sistema' : isDark ? 'Escuro' : 'Claro'}`}
      >
        {/* Animated icon container */}
        <div className="relative w-full h-full flex items-center justify-center">
          <AnimatePresence mode="wait">
            {isAiox ? (
              <motion.div
                key="aiox"
                initial={{ scale: 0, rotate: -180, opacity: 0 }}
                animate={{ scale: 1, rotate: 0, opacity: 1 }}
                exit={{ scale: 0, rotate: 180, opacity: 0 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="text-lime-400"
              >
                <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <circle cx="12" cy="12" r="4" />
                  <line x1="12" y1="2" x2="12" y2="6" />
                  <line x1="12" y1="18" x2="12" y2="22" />
                  <line x1="2" y1="12" x2="6" y2="12" />
                  <line x1="18" y1="12" x2="22" y2="12" />
                </svg>
              </motion.div>
            ) : isMatrix ? (
              <motion.div
                key="matrix"
                initial={{ scale: 0, rotate: -180, opacity: 0 }}
                animate={{ scale: 1, rotate: 0, opacity: 1 }}
                exit={{ scale: 0, rotate: 180, opacity: 0 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="text-green-400"
              >
                <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="4 17 10 11 4 5" />
                  <line x1="12" y1="19" x2="20" y2="19" />
                </svg>
              </motion.div>
            ) : isGlass ? (
              <motion.div
                key="glass"
                initial={{ scale: 0, rotate: -180, opacity: 0 }}
                animate={{ scale: 1, rotate: 0, opacity: 1 }}
                exit={{ scale: 0, rotate: 180, opacity: 0 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="text-purple-400"
              >
                <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
                  <path d="M5 3v4" /><path d="M19 17v4" /><path d="M3 5h4" /><path d="M17 19h4" />
                </svg>
              </motion.div>
            ) : theme === 'system' ? (
              <motion.div
                key="system"
                initial={{ scale: 0, rotate: -180, opacity: 0 }}
                animate={{ scale: 1, rotate: 0, opacity: 1 }}
                exit={{ scale: 0, rotate: 180, opacity: 0 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="text-foreground"
              >
                <SystemIcon />
              </motion.div>
            ) : isDark ? (
              <motion.div
                key="moon"
                initial={{ scale: 0, rotate: 90, opacity: 0 }}
                animate={{ scale: 1, rotate: 0, opacity: 1 }}
                exit={{ scale: 0, rotate: -90, opacity: 0 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="text-blue-400"
              >
                <MoonIcon />
              </motion.div>
            ) : (
              <motion.div
                key="sun"
                initial={{ scale: 0, rotate: -90, opacity: 0 }}
                animate={{ scale: 1, rotate: 0, opacity: 1 }}
                exit={{ scale: 0, rotate: 90, opacity: 0 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="text-amber-500"
              >
                <SunIcon />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Background glow effect */}
        <motion.div
          className={cn(
            'absolute inset-0 rounded-xl opacity-20 pointer-events-none',
            isAiox ? 'bg-lime-500' : isMatrix ? 'bg-green-500' : isGlass ? 'bg-purple-500' : isDark ? 'bg-blue-500' : 'bg-amber-500'
          )}
          initial={false}
          animate={{
            opacity: [0, 0.15, 0],
          }}
          transition={{ duration: 0.6 }}
          key={resolvedTheme}
        />
      </motion.button>

      {/* Dropdown menu */}
      <AnimatePresence>
        {showDropdown && isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full right-0 mt-2 w-44 glass-lg rounded-xl overflow-hidden z-[999] p-1.5"
          >
            <ThemeOption
              icon={<SunIcon />}
              label="Claro"
              isSelected={theme === 'light'}
              onClick={() => handleSelectTheme('light')}
            />
            <ThemeOption
              icon={<MoonIcon />}
              label="Escuro"
              isSelected={theme === 'dark'}
              onClick={() => handleSelectTheme('dark')}
            />
            <ThemeOption
              icon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
                  <path d="M5 3v4" /><path d="M19 17v4" /><path d="M3 5h4" /><path d="M17 19h4" />
                </svg>
              }
              label="Liquid Glass"
              description="Escuro vibrante com vidro"
              isSelected={theme === 'glass'}
              onClick={() => handleSelectTheme('glass')}
              accentColor="purple"
            />
            <ThemeOption
              icon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="4 17 10 11 4 5" />
                  <line x1="12" y1="19" x2="20" y2="19" />
                </svg>
              }
              label="Matrix"
              description="Verde neon, modo hacker"
              isSelected={theme === 'matrix'}
              onClick={() => handleSelectTheme('matrix')}
              accentColor="green"
            />
            <ThemeOption
              icon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <circle cx="12" cy="12" r="4" />
                  <line x1="12" y1="2" x2="12" y2="6" />
                  <line x1="12" y1="18" x2="12" y2="22" />
                  <line x1="2" y1="12" x2="6" y2="12" />
                  <line x1="18" y1="12" x2="22" y2="12" />
                </svg>
              }
              label="AIOX Cockpit"
              description="Lima neon, modo cockpit"
              isSelected={theme === 'aiox'}
              onClick={() => handleSelectTheme('aiox')}
              accentColor="lime"
            />
            <div className="h-px bg-glass-10 my-1" />
            <ThemeOption
              icon={<SystemIcon />}
              label="Sistema"
              description={`Agora: ${resolvedTheme === 'dark' ? 'Escuro' : 'Claro'}`}
              isSelected={theme === 'system'}
              onClick={() => handleSelectTheme('system')}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface ThemeOptionProps {
  icon: React.ReactNode;
  label: string;
  description?: string;
  isSelected: boolean;
  onClick: () => void;
  accentColor?: 'blue' | 'green' | 'purple' | 'lime';
}

function ThemeOption({ icon, label, description, isSelected, onClick, accentColor = 'blue' }: ThemeOptionProps) {
  const colorMap = {
    green: { bg: 'bg-green-500/15', text: 'text-green-500' },
    purple: { bg: 'bg-purple-500/15', text: 'text-purple-500' },
    blue: { bg: 'bg-blue-500/15', text: 'text-blue-500' },
    lime: { bg: 'bg-lime-400/15', text: 'text-lime-400' },
  };
  const colorClasses = colorMap[accentColor];

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
        isSelected
          ? `${colorClasses.bg} ${colorClasses.text}`
          : 'text-foreground hover:bg-glass-10'
      )}
    >
      <span className={cn(
        'transition-colors',
        isSelected ? colorClasses.text : 'text-muted-foreground'
      )}>
        {icon}
      </span>
      <div className="flex-1 text-left">
        <div className="font-medium">{label}</div>
        {description && (
          <div className="text-[10px] text-muted-foreground">{description}</div>
        )}
      </div>
      {isSelected && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className={colorClasses.text}
        >
          <CheckIcon />
        </motion.span>
      )}
    </button>
  );
}

// Animated Toggle Switch variant
export function ThemeToggleSwitch() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = resolvedTheme === 'dark';

  const handleToggle = () => {
    setTheme(isDark ? 'light' : 'dark');
  };

  if (!mounted) {
    return <div className="h-8 w-16 rounded-full bg-glass-10 border border-[var(--glass-border,transparent)]" />;
  }

  return (
    <motion.button
      onClick={handleToggle}
      className="relative h-8 w-16 rounded-full bg-glass-10 border border-[var(--glass-border,hsl(var(--border)))] overflow-hidden"
      whileTap={{ scale: 0.95 }}
      aria-label={`Alternar tema - atual: ${isDark ? 'Escuro' : 'Claro'}`}
    >
      {/* Track background */}
      <motion.div
        className="absolute inset-0 rounded-full"
        initial={false}
        animate={{
          background: isDark
            ? 'linear-gradient(135deg, rgba(30, 58, 138, 0.3), rgba(76, 29, 149, 0.3))'
            : 'linear-gradient(135deg, rgba(251, 191, 36, 0.3), rgba(251, 146, 60, 0.3))'
        }}
        transition={{ duration: 0.3 }}
      />

      {/* Sun icon */}
      <motion.div
        className="absolute left-1.5 top-1/2 -translate-y-1/2 text-amber-400"
        initial={false}
        animate={{
          opacity: isDark ? 0.3 : 1,
          scale: isDark ? 0.8 : 1
        }}
        transition={{ duration: 0.2 }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="12" r="5" />
        </svg>
      </motion.div>

      {/* Moon icon */}
      <motion.div
        className="absolute right-1.5 top-1/2 -translate-y-1/2 text-blue-400"
        initial={false}
        animate={{
          opacity: isDark ? 1 : 0.3,
          scale: isDark ? 1 : 0.8
        }}
        transition={{ duration: 0.2 }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
          <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
        </svg>
      </motion.div>

      {/* Thumb */}
      <motion.div
        className={cn(
          'absolute top-1 h-6 w-6 rounded-full shadow-md',
          'flex items-center justify-center',
          isDark
            ? 'bg-gradient-to-br from-blue-500 to-purple-600'
            : 'bg-gradient-to-br from-amber-400 to-orange-500'
        )}
        initial={false}
        animate={{
          x: isDark ? 34 : 2
        }}
        transition={{
          type: 'spring',
          stiffness: 500,
          damping: 30
        }}
      >
        <AnimatePresence mode="wait">
          {isDark ? (
            <motion.svg
              key="moon"
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="white"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
            </motion.svg>
          ) : (
            <motion.svg
              key="sun"
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="white"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <circle cx="12" cy="12" r="5" />
            </motion.svg>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.button>
  );
}
