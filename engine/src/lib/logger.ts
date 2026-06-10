import type { LogLevel } from '../types';

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

let currentLevel: LogLevel = 'info';

export function setLogLevel(level: LogLevel): void {
  currentLevel = level;
}

function shouldLog(level: LogLevel): boolean {
  return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[currentLevel];
}

function formatLog(level: LogLevel, msg: string, ctx?: Record<string, unknown>): string {
  const entry: Record<string, unknown> = {
    ts: new Date().toISOString(),
    level,
    msg,
  };
  if (ctx) Object.assign(entry, ctx);
  return JSON.stringify(entry);
}

export const log = {
  debug(msg: string, ctx?: Record<string, unknown>): void {
    if (shouldLog('debug')) console.log(formatLog('debug', msg, ctx));
  },

  info(msg: string, ctx?: Record<string, unknown>): void {
    if (shouldLog('info')) console.log(formatLog('info', msg, ctx));
  },

  warn(msg: string, ctx?: Record<string, unknown>): void {
    if (shouldLog('warn')) console.warn(formatLog('warn', msg, ctx));
  },

  error(msg: string, ctx?: Record<string, unknown>): void {
    if (shouldLog('error')) console.error(formatLog('error', msg, ctx));
  },
};
