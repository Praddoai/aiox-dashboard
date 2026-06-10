/**
 * Config — ~/.aios/config.json
 *
 * Persistent configuration for the AIOS Dashboard CLI.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

export interface AiosConfig {
  relay_url: string;
  api_key?: string;
  user?: {
    id: string;
    github_login?: string;
  };
}

const CONFIG_DIR = join(homedir(), '.aios');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');

const DEFAULT_CONFIG: AiosConfig = {
  relay_url: 'ws://localhost:8080',
};

/** Ensure config directory exists */
function ensureConfigDir(): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

/** Load config from disk */
export function loadConfig(): AiosConfig {
  try {
    if (existsSync(CONFIG_FILE)) {
      const raw = readFileSync(CONFIG_FILE, 'utf-8');
      return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
    }
  } catch {
    // Fall back to defaults
  }
  return { ...DEFAULT_CONFIG };
}

/** Save config to disk */
export function saveConfig(config: AiosConfig): void {
  ensureConfigDir();
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
}

/** Update a single config value */
export function updateConfig(key: string, value: string): void {
  const config = loadConfig();
  (config as unknown as Record<string, unknown>)[key] = value;
  saveConfig(config);
}

/** Get config file path (for display) */
export function getConfigPath(): string {
  return CONFIG_FILE;
}
