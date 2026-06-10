/**
 * AIOS Centralized Theme System
 *
 * All squad-based colors flow through CSS variables (src/styles/tokens/).
 * Tailwind config maps these vars to utility classes (squad-*, tier-*, status-*).
 * This file maps SquadType → Tailwind class strings for component consumption.
 */

import type { LucideIcon } from 'lucide-react';
import { Target, Star, Wrench } from 'lucide-react';
import type { SquadType } from '@/types';
import { getSquadType } from '@/types';

/**
 * Squad Theme Configuration
 * Each squad type has a complete palette of Tailwind utility classes
 * backed by CSS variables from the token system.
 */
export interface SquadTheme {
  // Primary CSS variable reference (for inline styles)
  primary: string;

  // Background variations (Tailwind classes)
  bg: string;
  bgSubtle: string;
  bgHover: string;

  // Border variations
  border: string;
  borderSubtle: string;

  // Text variations
  text: string;
  textMuted: string;

  // Gradients (Tailwind gradient stop classes)
  gradient: string;
  gradientBg: string;

  // Combined utility classes for common patterns
  badge: string;
  card: string;
  cardHover: string;
  iconBg: string;
  dot: string;
  ring: string;
  borderLeft: string;
  glow: string;
  gradientSubtle: string;

  // CSS variable for dynamic/inline style use
  cssVar: string;
}

/**
 * Complete theme definitions for each squad type.
 * All classes reference CSS variables via Tailwind config (squad-* colors).
 */
export const squadThemes: Record<SquadType, SquadTheme> = {
  copywriting: {
    primary: 'var(--squad-copywriting-default)',
    bg: 'bg-squad-copywriting',
    bgSubtle: 'bg-squad-copywriting-10',
    bgHover: 'bg-squad-copywriting-20',
    border: 'border-squad-copywriting',
    borderSubtle: 'border-squad-copywriting-30',
    text: 'text-squad-copywriting',
    textMuted: 'text-squad-copywriting-muted',
    gradient: 'from-squad-copywriting to-squad-copywriting-end',
    gradientBg: 'bg-gradient-to-br from-squad-copywriting-10 to-squad-copywriting-10',
    badge: 'bg-squad-copywriting-10 border-squad-copywriting-20 text-squad-copywriting-muted',
    card: 'bg-squad-copywriting-5 border-squad-copywriting-20',
    cardHover: 'hover:bg-squad-copywriting-10 hover:border-squad-copywriting-30',
    iconBg: 'bg-squad-copywriting-20',
    dot: 'bg-squad-copywriting',
    ring: 'ring-squad-copywriting-20 focus:ring-squad-copywriting-40',
    borderLeft: 'border-l-squad-copywriting',
    glow: 'shadow-squad-copywriting-30',
    gradientSubtle: 'from-squad-copywriting-20 to-squad-copywriting-20',
    cssVar: 'var(--squad-copywriting-default)',
  },

  design: {
    primary: 'var(--squad-design-default)',
    bg: 'bg-squad-design',
    bgSubtle: 'bg-squad-design-10',
    bgHover: 'bg-squad-design-20',
    border: 'border-squad-design',
    borderSubtle: 'border-squad-design-30',
    text: 'text-squad-design',
    textMuted: 'text-squad-design-muted',
    gradient: 'from-squad-design to-squad-design-end',
    gradientBg: 'bg-gradient-to-br from-squad-design-10 to-squad-design-10',
    badge: 'bg-squad-design-10 border-squad-design-20 text-squad-design-muted',
    card: 'bg-squad-design-5 border-squad-design-20',
    cardHover: 'hover:bg-squad-design-10 hover:border-squad-design-30',
    iconBg: 'bg-squad-design-20',
    dot: 'bg-squad-design',
    ring: 'ring-squad-design-20 focus:ring-squad-design-40',
    borderLeft: 'border-l-squad-design',
    glow: 'shadow-squad-design-30',
    gradientSubtle: 'from-squad-design-20 to-squad-design-20',
    cssVar: 'var(--squad-design-default)',
  },

  creator: {
    primary: 'var(--squad-creator-default)',
    bg: 'bg-squad-creator',
    bgSubtle: 'bg-squad-creator-10',
    bgHover: 'bg-squad-creator-20',
    border: 'border-squad-creator',
    borderSubtle: 'border-squad-creator-30',
    text: 'text-squad-creator',
    textMuted: 'text-squad-creator-muted',
    gradient: 'from-squad-creator to-squad-creator-end',
    gradientBg: 'bg-gradient-to-br from-squad-creator-10 to-squad-creator-10',
    badge: 'bg-squad-creator-10 border-squad-creator-20 text-squad-creator-muted',
    card: 'bg-squad-creator-5 border-squad-creator-20',
    cardHover: 'hover:bg-squad-creator-10 hover:border-squad-creator-30',
    iconBg: 'bg-squad-creator-20',
    dot: 'bg-squad-creator',
    ring: 'ring-squad-creator-20 focus:ring-squad-creator-40',
    borderLeft: 'border-l-squad-creator',
    glow: 'shadow-squad-creator-30',
    gradientSubtle: 'from-squad-creator-20 to-squad-creator-20',
    cssVar: 'var(--squad-creator-default)',
  },

  orchestrator: {
    primary: 'var(--squad-orchestrator-default)',
    bg: 'bg-squad-orchestrator',
    bgSubtle: 'bg-squad-orchestrator-10',
    bgHover: 'bg-squad-orchestrator-20',
    border: 'border-squad-orchestrator',
    borderSubtle: 'border-squad-orchestrator-30',
    text: 'text-squad-orchestrator',
    textMuted: 'text-squad-orchestrator-muted',
    gradient: 'from-squad-orchestrator to-squad-orchestrator-end',
    gradientBg: 'bg-gradient-to-br from-squad-orchestrator-10 to-squad-orchestrator-10',
    badge: 'bg-squad-orchestrator-10 border-squad-orchestrator-20 text-squad-orchestrator-muted',
    card: 'bg-squad-orchestrator-5 border-squad-orchestrator-20',
    cardHover: 'hover:bg-squad-orchestrator-10 hover:border-squad-orchestrator-30',
    iconBg: 'bg-squad-orchestrator-20',
    dot: 'bg-squad-orchestrator',
    ring: 'ring-squad-orchestrator-20 focus:ring-squad-orchestrator-40',
    borderLeft: 'border-l-squad-orchestrator',
    glow: 'shadow-squad-orchestrator-30',
    gradientSubtle: 'from-squad-orchestrator-20 to-squad-orchestrator-20',
    cssVar: 'var(--squad-orchestrator-default)',
  },

  content: {
    primary: 'var(--squad-content-default)',
    bg: 'bg-squad-content',
    bgSubtle: 'bg-squad-content-10',
    bgHover: 'bg-squad-content-20',
    border: 'border-squad-content',
    borderSubtle: 'border-squad-content-30',
    text: 'text-squad-content',
    textMuted: 'text-squad-content-muted',
    gradient: 'from-squad-content to-squad-content-end',
    gradientBg: 'bg-gradient-to-br from-squad-content-10 to-squad-content-10',
    badge: 'bg-squad-content-10 border-squad-content-20 text-squad-content-muted',
    card: 'bg-squad-content-5 border-squad-content-20',
    cardHover: 'hover:bg-squad-content-10 hover:border-squad-content-30',
    iconBg: 'bg-squad-content-20',
    dot: 'bg-squad-content',
    ring: 'ring-squad-content-20 focus:ring-squad-content-40',
    borderLeft: 'border-l-squad-content',
    glow: 'shadow-squad-content-30',
    gradientSubtle: 'from-squad-content-20 to-squad-content-20',
    cssVar: 'var(--squad-content-default)',
  },

  development: {
    primary: 'var(--squad-development-default)',
    bg: 'bg-squad-development',
    bgSubtle: 'bg-squad-development-10',
    bgHover: 'bg-squad-development-20',
    border: 'border-squad-development',
    borderSubtle: 'border-squad-development-30',
    text: 'text-squad-development',
    textMuted: 'text-squad-development-muted',
    gradient: 'from-squad-development to-squad-development-end',
    gradientBg: 'bg-gradient-to-br from-squad-development-10 to-squad-development-10',
    badge: 'bg-squad-development-10 border-squad-development-20 text-squad-development-muted',
    card: 'bg-squad-development-5 border-squad-development-20',
    cardHover: 'hover:bg-squad-development-10 hover:border-squad-development-30',
    iconBg: 'bg-squad-development-20',
    dot: 'bg-squad-development',
    ring: 'ring-squad-development-20 focus:ring-squad-development-40',
    borderLeft: 'border-l-squad-development',
    glow: 'shadow-squad-development-30',
    gradientSubtle: 'from-squad-development-20 to-squad-development-20',
    cssVar: 'var(--squad-development-default)',
  },

  engineering: {
    primary: 'var(--squad-engineering-default)',
    bg: 'bg-squad-engineering',
    bgSubtle: 'bg-squad-engineering-10',
    bgHover: 'bg-squad-engineering-20',
    border: 'border-squad-engineering',
    borderSubtle: 'border-squad-engineering-30',
    text: 'text-squad-engineering',
    textMuted: 'text-squad-engineering-muted',
    gradient: 'from-squad-engineering to-squad-engineering-end',
    gradientBg: 'bg-gradient-to-br from-squad-engineering-10 to-squad-engineering-10',
    badge: 'bg-squad-engineering-10 border-squad-engineering-20 text-squad-engineering-muted',
    card: 'bg-squad-engineering-5 border-squad-engineering-20',
    cardHover: 'hover:bg-squad-engineering-10 hover:border-squad-engineering-30',
    iconBg: 'bg-squad-engineering-20',
    dot: 'bg-squad-engineering',
    ring: 'ring-squad-engineering-20 focus:ring-squad-engineering-40',
    borderLeft: 'border-l-squad-engineering',
    glow: 'shadow-squad-engineering-30',
    gradientSubtle: 'from-squad-engineering-20 to-squad-engineering-20',
    cssVar: 'var(--squad-engineering-default)',
  },

  analytics: {
    primary: 'var(--squad-analytics-default)',
    bg: 'bg-squad-analytics',
    bgSubtle: 'bg-squad-analytics-10',
    bgHover: 'bg-squad-analytics-20',
    border: 'border-squad-analytics',
    borderSubtle: 'border-squad-analytics-30',
    text: 'text-squad-analytics',
    textMuted: 'text-squad-analytics-muted',
    gradient: 'from-squad-analytics to-squad-analytics-end',
    gradientBg: 'bg-gradient-to-br from-squad-analytics-10 to-squad-analytics-10',
    badge: 'bg-squad-analytics-10 border-squad-analytics-20 text-squad-analytics-muted',
    card: 'bg-squad-analytics-5 border-squad-analytics-20',
    cardHover: 'hover:bg-squad-analytics-10 hover:border-squad-analytics-30',
    iconBg: 'bg-squad-analytics-20',
    dot: 'bg-squad-analytics',
    ring: 'ring-squad-analytics-20 focus:ring-squad-analytics-40',
    borderLeft: 'border-l-squad-analytics',
    glow: 'shadow-squad-analytics-30',
    gradientSubtle: 'from-squad-analytics-20 to-squad-analytics-20',
    cssVar: 'var(--squad-analytics-default)',
  },

  marketing: {
    primary: 'var(--squad-marketing-default)',
    bg: 'bg-squad-marketing',
    bgSubtle: 'bg-squad-marketing-10',
    bgHover: 'bg-squad-marketing-20',
    border: 'border-squad-marketing',
    borderSubtle: 'border-squad-marketing-30',
    text: 'text-squad-marketing',
    textMuted: 'text-squad-marketing-muted',
    gradient: 'from-squad-marketing to-squad-marketing-end',
    gradientBg: 'bg-gradient-to-br from-squad-marketing-10 to-squad-marketing-10',
    badge: 'bg-squad-marketing-10 border-squad-marketing-20 text-squad-marketing-muted',
    card: 'bg-squad-marketing-5 border-squad-marketing-20',
    cardHover: 'hover:bg-squad-marketing-10 hover:border-squad-marketing-30',
    iconBg: 'bg-squad-marketing-20',
    dot: 'bg-squad-marketing',
    ring: 'ring-squad-marketing-20 focus:ring-squad-marketing-40',
    borderLeft: 'border-l-squad-marketing',
    glow: 'shadow-squad-marketing-30',
    gradientSubtle: 'from-squad-marketing-20 to-squad-marketing-20',
    cssVar: 'var(--squad-marketing-default)',
  },

  advisory: {
    primary: 'var(--squad-advisory-default)',
    bg: 'bg-squad-advisory',
    bgSubtle: 'bg-squad-advisory-10',
    bgHover: 'bg-squad-advisory-20',
    border: 'border-squad-advisory',
    borderSubtle: 'border-squad-advisory-30',
    text: 'text-squad-advisory',
    textMuted: 'text-squad-advisory-muted',
    gradient: 'from-squad-advisory to-squad-advisory-end',
    gradientBg: 'bg-gradient-to-br from-squad-advisory-10 to-squad-advisory-10',
    badge: 'bg-squad-advisory-10 border-squad-advisory-20 text-squad-advisory-muted',
    card: 'bg-squad-advisory-5 border-squad-advisory-20',
    cardHover: 'hover:bg-squad-advisory-10 hover:border-squad-advisory-30',
    iconBg: 'bg-squad-advisory-20',
    dot: 'bg-squad-advisory',
    ring: 'ring-squad-advisory-20 focus:ring-squad-advisory-40',
    borderLeft: 'border-l-squad-advisory',
    glow: 'shadow-squad-advisory-30',
    gradientSubtle: 'from-squad-advisory-20 to-squad-advisory-20',
    cssVar: 'var(--squad-advisory-default)',
  },

  default: {
    primary: 'var(--squad-default-default)',
    bg: 'bg-squad-default',
    bgSubtle: 'bg-squad-default-10',
    bgHover: 'bg-squad-default-20',
    border: 'border-squad-default',
    borderSubtle: 'border-squad-default-30',
    text: 'text-squad-default',
    textMuted: 'text-squad-default-muted',
    gradient: 'from-squad-default to-squad-default-end',
    gradientBg: 'bg-gradient-to-br from-squad-default-10 to-squad-default-10',
    badge: 'bg-squad-default-10 border-squad-default-20 text-squad-default-muted',
    card: 'bg-squad-default-5 border-squad-default-20',
    cardHover: 'hover:bg-squad-default-10 hover:border-squad-default-30',
    iconBg: 'bg-squad-default-20',
    dot: 'bg-squad-default',
    ring: 'ring-squad-default-20 focus:ring-squad-default-40',
    borderLeft: 'border-l-squad-default',
    glow: 'shadow-squad-default-30',
    gradientSubtle: 'from-squad-default-20 to-squad-default-20',
    cssVar: 'var(--squad-default-default)',
  },
};

/**
 * Agent Tier Theme Configuration
 */
export interface TierTheme {
  label: string;
  labelShort: string;
  text: string;
  bg: string;
  badge: string;
  gradient: string;
  icon: LucideIcon;
}

export const tierThemes: Record<0 | 1 | 2, TierTheme> = {
  0: {
    label: 'Orchestrator',
    labelShort: 'Orch',
    text: 'text-tier-0-muted',
    bg: 'bg-tier-0-10',
    badge: 'bg-tier-0-10 text-tier-0-muted border-tier-0-20',
    gradient: 'from-tier-0 to-tier-0-end',
    icon: Target,
  },
  1: {
    label: 'Master',
    labelShort: 'Master',
    text: 'text-tier-1-muted',
    bg: 'bg-tier-1-10',
    badge: 'bg-tier-1-10 text-tier-1-muted border-tier-1-20',
    gradient: 'from-tier-1 to-tier-1-end',
    icon: Star,
  },
  2: {
    label: 'Specialist',
    labelShort: 'Spec',
    text: 'text-tier-2-muted',
    bg: 'bg-tier-2-10',
    badge: 'bg-tier-2-10 text-tier-2-muted border-tier-2-20',
    gradient: 'from-tier-2 to-tier-2-end',
    icon: Wrench,
  },
};

/**
 * Status Theme Configuration
 */
export interface StatusTheme {
  text: string;
  bg: string;
  dot: string;
  border: string;
}

export const statusThemes: Record<string, StatusTheme> = {
  online: {
    text: 'text-status-success-muted',
    bg: 'bg-status-success-10',
    dot: 'bg-status-success',
    border: 'border-status-success-30',
  },
  busy: {
    text: 'text-status-warning-muted',
    bg: 'bg-status-warning-10',
    dot: 'bg-status-warning',
    border: 'border-status-warning-30',
  },
  offline: {
    text: 'text-squad-default-muted',
    bg: 'bg-squad-default-10',
    dot: 'bg-squad-default',
    border: 'border-squad-default-30',
  },
  error: {
    text: 'text-status-error-muted',
    bg: 'bg-status-error-10',
    dot: 'bg-status-error',
    border: 'border-status-error-30',
  },
  success: {
    text: 'text-status-success-muted',
    bg: 'bg-status-success-10',
    dot: 'bg-status-success',
    border: 'border-status-success-30',
  },
  pending: {
    text: 'text-squad-copywriting-muted',
    bg: 'bg-squad-copywriting-10',
    dot: 'bg-squad-copywriting',
    border: 'border-squad-copywriting-30',
  },
  running: {
    text: 'text-status-info-muted',
    bg: 'bg-status-info-10',
    dot: 'bg-status-info',
    border: 'border-status-info-30',
  },
};

/**
 * Get theme for a squad type
 */
export function getSquadTheme(squadType: SquadType): SquadTheme {
  return squadThemes[squadType] || squadThemes.default;
}

/**
 * Get theme for a squad by its ID
 */
export function getSquadThemeById(squadId: string): SquadTheme {
  const squadType = getSquadType(squadId);
  return getSquadTheme(squadType);
}

/**
 * Inline style colors derived from CSS vars (for components using style={{}}).
 * Uses color-mix() for alpha blending — same technique as Tailwind config.
 */
export interface SquadInlineStyle {
  bg: string;
  text: string;
  border: string;
  glow: string;
}

export function getSquadInlineStyle(squadId: string): SquadInlineStyle {
  const theme = getSquadThemeById(squadId);
  const cssVar = theme.cssVar;
  const mutedVar = cssVar.replace('-default)', '-muted)');
  return {
    bg: `color-mix(in srgb, ${cssVar} 15%, transparent)`,
    text: mutedVar,
    border: `color-mix(in srgb, ${cssVar} 30%, transparent)`,
    glow: `color-mix(in srgb, ${cssVar} 40%, transparent)`,
  };
}

/**
 * Get tier theme
 */
export function getTierTheme(tier: 0 | 1 | 2): TierTheme {
  return tierThemes[tier] || tierThemes[2];
}

/**
 * Get status theme
 */
export function getStatusTheme(status: string): StatusTheme {
  return statusThemes[status] || statusThemes.offline;
}

/**
 * Utility: Generate avatar gradient based on squad type
 */
export function getAvatarGradient(squadType: SquadType): string {
  const theme = getSquadTheme(squadType);
  return `bg-gradient-to-br ${theme.gradient}`;
}

/**
 * Utility: Generate border-left color class for lists
 */
export function getBorderLeftColor(squadType: SquadType): string {
  const theme = getSquadTheme(squadType);
  return `border-l-2 ${theme.border}`;
}

/**
 * Command type themes for the commands modal
 */
export const commandTypeThemes: Record<string, { bg: string; border: string; text: string }> = {
  action: { bg: 'bg-status-warning-10', border: 'border-status-warning-20', text: 'text-status-warning-muted' },
  command: { bg: 'bg-squad-design-10', border: 'border-squad-design-20', text: 'text-squad-design-muted' },
  prompt: { bg: 'bg-status-success-10', border: 'border-status-success-20', text: 'text-status-success-muted' },
  task: { bg: 'bg-squad-copywriting-10', border: 'border-squad-copywriting-20', text: 'text-squad-copywriting-muted' },
  workflow: { bg: 'bg-squad-orchestrator-10', border: 'border-squad-orchestrator-20', text: 'text-squad-orchestrator-muted' },
};

/**
 * Get command type theme
 */
export function getCommandTypeTheme(type: string): { bg: string; border: string; text: string } {
  return commandTypeThemes[type] || commandTypeThemes.command;
}
