import { readFileSync, existsSync, readdirSync } from 'fs';
import { basename, resolve } from 'path';
import { parse as parseYaml } from 'yaml';
import { log } from '../lib/logger';
import { aiosCorePath } from '../lib/config';
import type { EngineConfig } from '../types';

// ============================================================
// Team Bundle Integration — Story 3.5
// Respects team bundles for pool/agent configuration
// ============================================================

let _config: EngineConfig;

interface TeamBundle {
  id: string;
  name: string;
  icon: string;
  description: string;
  agents: string[];         // agent IDs, '*' = all
  workflows: string[];      // workflow file names
  allowAll: boolean;        // true if agents includes '*'
}

const bundleCache = new Map<string, TeamBundle>();
let activeBundle: string | null = null;

export function initTeamBundles(cfg: EngineConfig): void {
  _config = cfg;
  loadBundles();
}

export function getAvailableBundles(): Array<{ id: string; name: string; icon: string; description: string; agentCount: number }> {
  return [...bundleCache.values()].map(b => ({
    id: b.id,
    name: b.name,
    icon: b.icon,
    description: b.description,
    agentCount: b.allowAll ? -1 : b.agents.length,
  }));
}

export function getBundle(bundleId: string): TeamBundle | null {
  return bundleCache.get(bundleId) ?? null;
}

export function setActiveBundle(bundleId: string | null): void {
  if (bundleId && !bundleCache.has(bundleId)) {
    throw new Error(`Bundle "${bundleId}" not found. Available: ${[...bundleCache.keys()].join(', ')}`);
  }
  activeBundle = bundleId;
  log.info('Active bundle changed', { bundleId: bundleId ?? 'none (unrestricted)' });
}

export function getActiveBundle(): TeamBundle | null {
  if (!activeBundle) return null;
  return bundleCache.get(activeBundle) ?? null;
}

export function isAgentInBundle(agentId: string, bundleId?: string): boolean {
  const bundle = bundleId
    ? bundleCache.get(bundleId)
    : (activeBundle ? bundleCache.get(activeBundle) : null);

  // No bundle = no restriction
  if (!bundle) return true;

  // Wildcard bundle allows all
  if (bundle.allowAll) return true;

  const normalized = agentId.toLowerCase();
  return bundle.agents.some(a => a.toLowerCase() === normalized);
}

export function validateAgentForBundle(agentId: string, bundleId?: string): { valid: boolean; error?: string } {
  const targetBundleId = bundleId ?? activeBundle;
  if (!targetBundleId) return { valid: true };

  const bundle = bundleCache.get(targetBundleId);
  if (!bundle) return { valid: true };

  if (bundle.allowAll) return { valid: true };

  const normalized = agentId.toLowerCase();
  if (bundle.agents.some(a => a.toLowerCase() === normalized)) {
    return { valid: true };
  }

  return {
    valid: false,
    error: `Agent "${agentId}" is not part of bundle "${bundle.name}". Allowed agents: ${bundle.agents.join(', ')}`,
  };
}

// -- Internal --

function loadBundles(): void {
  const bundleDirs = [
    aiosCorePath('development', 'agent-teams'),
  ];

  let loaded = 0;

  for (const dir of bundleDirs) {
    if (!existsSync(dir)) continue;

    const files = readdirSync(dir).filter(f => f.endsWith('.yaml') || f.endsWith('.yml'));

    for (const file of files) {
      try {
        const content = readFileSync(resolve(dir, file), 'utf-8');
        const raw = parseYaml(content);
        if (!raw?.bundle) continue;

        const id = basename(file, '.yaml').replace('.yml', '');
        const agents: string[] = raw.agents || [];
        const allowAll = agents.includes('*');

        const bundle: TeamBundle = {
          id,
          name: raw.bundle.name || id,
          icon: raw.bundle.icon || '',
          description: raw.bundle.description || '',
          agents: agents.filter((a: string) => a !== '*'),
          workflows: (raw.workflows || []).filter(Boolean),
          allowAll,
        };

        bundleCache.set(id, bundle);
        loaded++;
      } catch (err) {
        log.warn('Failed to parse team bundle', {
          file,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    if (loaded > 0) break;
  }

  log.info('Team bundles loaded', {
    count: loaded,
    ids: [...bundleCache.keys()],
  });
}
