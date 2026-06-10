export const DEFAULT_SQUAD_VERSION = '0.0.0';
export const DEFAULT_SQUAD_SCORE = 0;

const UNKNOWN_VERSION_VALUES = new Set([
  '',
  'unknown',
  'n/a',
  'na',
  'none',
  'null',
  'undefined',
  '-',
]);

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const match = trimmed.match(/\d+(?:\.\d+)?/);
  if (!match) {
    return null;
  }

  const parsed = Number.parseFloat(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeScoreScale(value: number): number {
  if (value <= 1) {
    return value * 10;
  }
  if (value > 10 && value <= 100) {
    return value / 10;
  }
  return value;
}

function clampScore(value: number): number {
  return Math.min(10, Math.max(0, value));
}

function roundOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

export interface SquadScoreSignals {
  agents: number;
  tasks: number;
  workflows: number;
  checklists: number;
  hasReadme: boolean;
  hasVersion: boolean;
}

export function hasExplicitSquadVersion(version: string | null | undefined): boolean {
  if (typeof version !== 'string') {
    return false;
  }

  const normalized = version.trim().toLowerCase();
  return !UNKNOWN_VERSION_VALUES.has(normalized);
}

export function normalizeSquadVersion(version: string | null | undefined): string {
  if (!hasExplicitSquadVersion(version)) {
    return DEFAULT_SQUAD_VERSION;
  }
  return version!.trim();
}

export function resolveSquadVersion(
  ...candidates: Array<string | null | undefined>
): string {
  for (const candidate of candidates) {
    if (hasExplicitSquadVersion(candidate)) {
      return candidate!.trim();
    }
  }
  return DEFAULT_SQUAD_VERSION;
}

export function formatSquadVersion(version: string | null | undefined): string {
  return `v${normalizeSquadVersion(version)}`;
}

export function computeSquadScore(signals: SquadScoreSignals): number {
  const agents = Math.max(0, signals.agents);
  const tasks = Math.max(0, signals.tasks);
  const workflows = Math.max(0, signals.workflows);
  const checklists = Math.max(0, signals.checklists);

  const score =
    (Math.min(agents, 5) / 5) * 2.5 +
    (Math.min(tasks, 8) / 8) * 2 +
    (Math.min(workflows, 4) / 4) * 2 +
    (Math.min(checklists, 4) / 4) * 1.5 +
    (signals.hasReadme ? 1 : 0) +
    (signals.hasVersion ? 1 : 0);

  return roundOneDecimal(clampScore(score));
}

export function resolveSquadScore(
  candidates: unknown[],
  signals: SquadScoreSignals
): number {
  for (const candidate of candidates) {
    const parsed = toFiniteNumber(candidate);
    if (parsed === null) {
      continue;
    }
    return roundOneDecimal(clampScore(normalizeScoreScale(parsed)));
  }
  return computeSquadScore(signals);
}

export function formatSquadScore(score: number | null | undefined): string {
  const value = typeof score === 'number' && Number.isFinite(score)
    ? clampScore(score)
    : DEFAULT_SQUAD_SCORE;
  return value.toFixed(1);
}

export function getScoreColor(score: number): string {
  if (score < 5.0) return 'var(--status-error)';
  if (score < 7.0) return 'var(--status-warning)';
  return 'var(--status-success)';
}
