import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatRelativeTime(date: string | Date): string {
  const now = new Date();
  const then = new Date(date);
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);

  if (seconds < 60) return 'agora';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m atrás`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h atrás`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d atrás`;

  return then.toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'short',
  });
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return `${str.slice(0, maxLength - 3)}...`;
}

export function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Re-export theme utilities for convenience
export {
  squadThemes,
  tierThemes,
  statusThemes,
  commandTypeThemes,
  getSquadTheme,
  getSquadThemeById,
  getTierTheme,
  getStatusTheme,
  getAvatarGradient,
  getBorderLeftColor,
  getCommandTypeTheme,
} from './theme';

// Legacy exports for backward compatibility - prefer using theme.ts directly
export const squadColors = {
  copywriting: 'var(--squad-copywriting)',
  design: 'var(--squad-design)',
  creator: 'var(--squad-creator)',
  orchestrator: 'var(--squad-orchestrator)',
  content: 'var(--squad-content)',
  development: 'var(--squad-development)',
  engineering: 'var(--squad-engineering)',
  analytics: 'var(--squad-analytics)',
  marketing: 'var(--squad-marketing)',
  advisory: 'var(--squad-advisory)',
  default: 'var(--squad-default)',
} as const;

export const squadLabels = {
  copywriting: 'Copywriting',
  design: 'Design',
  creator: 'Creator',
  orchestrator: 'Orchestrator',
  content: 'Content',
  development: 'Development',
  engineering: 'Engineering',
  analytics: 'Analytics',
  marketing: 'Marketing',
  advisory: 'Advisory',
  default: 'Default',
} as const;
