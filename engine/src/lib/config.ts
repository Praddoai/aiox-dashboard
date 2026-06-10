import { readFileSync, existsSync } from 'fs';
import { parse as parseYaml } from 'yaml';
import { resolve } from 'path';
import type { EngineConfig } from '../types';
import {
  getProjectPaths,
  initProjectResolver,
  projectPath,
  aiosCorePath,
  squadsPath,
  rulesPath,
} from './project-resolver';

const ENGINE_ROOT = resolve(import.meta.dir, '../..');

const DEFAULTS: EngineConfig = {
  server: {
    port: 4002,
    host: '0.0.0.0',
    cors_origins: ['http://localhost:5173', 'http://localhost:5174'],
  },
  pool: {
    max_concurrent: 5,
    max_per_squad: 3,
    spawn_timeout_ms: 30_000,
    execution_timeout_ms: 300_000,
  },
  queue: {
    check_interval_ms: 1_000,
    max_attempts: 3,
  },
  memory: {
    context_budget_tokens: 8_000,
    recall_top_k: 10,
  },
  workspace: {
    base_dir: '.workspace',
    max_concurrent: 10,
    cleanup_on_success: true,
  },
  claude: {
    skip_permissions: false,
    max_turns: -1,
    output_format: 'stream-json',
  },
  auth: {
    webhook_token: '',
  },
  logging: {
    level: 'info',
  },
};

function deepMerge<T extends Record<string, unknown>>(target: T, source: Record<string, unknown>): T {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    const val = source[key];
    if (val && typeof val === 'object' && !Array.isArray(val) && typeof (result as Record<string, unknown>)[key] === 'object') {
      (result as Record<string, unknown>)[key] = deepMerge(
        (result as Record<string, unknown>)[key] as Record<string, unknown>,
        val as Record<string, unknown>,
      );
    } else {
      (result as Record<string, unknown>)[key] = val;
    }
  }
  return result;
}

export function loadConfig(): EngineConfig {
  const configPath = resolve(ENGINE_ROOT, 'engine.config.yaml');

  let config: EngineConfig;
  if (!existsSync(configPath)) {
    config = { ...DEFAULTS };
  } else {
    const raw = readFileSync(configPath, 'utf-8');
    const parsed = parseYaml(raw) as Record<string, unknown>;
    config = deepMerge(DEFAULTS as EngineConfig & Record<string, unknown>, parsed) as EngineConfig;

    // Initialize ProjectResolver from config's project section if present
    const projectConfig = (parsed as Record<string, Record<string, string>>).project;
    if (projectConfig) {
      initProjectResolver({
        projectRoot: projectConfig.root || undefined,
        aiosCoreDir: projectConfig.aios_core || undefined,
        squadsDir: projectConfig.squads || undefined,
        rulesDir: projectConfig.rules || undefined,
      });
    }
  }

  // CLI / env overrides (highest priority)
  if (process.env.ENGINE_PORT) {
    config.server.port = Number(process.env.ENGINE_PORT);
  }
  if (process.env.ENGINE_HOST) {
    config.server.host = process.env.ENGINE_HOST;
  }

  return config;
}

export function getEngineRoot(): string {
  return ENGINE_ROOT;
}

// Resolve path relative to engine root
export function enginePath(...segments: string[]): string {
  return resolve(ENGINE_ROOT, ...segments);
}

// Resolve path relative to aios-platform root
export function platformPath(...segments: string[]): string {
  return getProjectPaths().platformRoot
    ? resolve(getProjectPaths().platformRoot, ...segments)
    : resolve(ENGINE_ROOT, '..', ...segments);
}

// Resolve path relative to the project root (where .aios-core lives)
// Delegates to ProjectResolver for portable path resolution.
export function appsRoot(...segments: string[]): string {
  return projectPath(...segments);
}

// Re-export ProjectResolver utilities for direct use
export { projectPath, aiosCorePath, squadsPath, rulesPath, getProjectPaths };
