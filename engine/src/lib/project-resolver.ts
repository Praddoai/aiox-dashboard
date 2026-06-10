// ============================================================
// ProjectResolver — Centralized project root resolution
// ============================================================
// Replaces hardcoded relative path resolution (appsRoot, platformPath)
// with a configurable, portable system.
//
// Resolution priority:
//   1. Explicit init() call (programmatic)
//   2. engine.config.yaml -> project.root
//   3. AIOS_PROJECT_ROOT env var
//   4. CLI flag: --project-root (parsed from process.argv)
//   5. Auto-detect: walk up from engine cwd looking for .aios-core/

import { existsSync } from 'fs';
import { resolve, dirname } from 'path';

export interface ProjectPaths {
  /** Absolute path to the project root (where .aios-core/ lives) */
  projectRoot: string;
  /** Absolute path to .aios-core/ directory */
  aiosCore: string;
  /** Absolute path to squads/ directory */
  squads: string;
  /** Absolute path to .claude/rules/ directory */
  rules: string;
  /** Absolute path to the engine root (where engine.config.yaml lives) */
  engineRoot: string;
  /** Absolute path to the platform root (aios-platform/) */
  platformRoot: string;
}

export interface ProjectResolverConfig {
  projectRoot?: string;
  aiosCoreDir?: string;   // relative to projectRoot
  squadsDir?: string;     // relative to projectRoot
  rulesDir?: string;      // relative to projectRoot
}

let _paths: ProjectPaths | null = null;

const ENGINE_ROOT = resolve(import.meta.dir, '../..');

/**
 * Initialize the ProjectResolver with explicit paths.
 * Call this early in engine startup.
 */
export function initProjectResolver(config?: ProjectResolverConfig): ProjectPaths {
  const root = resolveProjectRoot(config?.projectRoot);

  _paths = {
    projectRoot: root,
    aiosCore: resolve(root, config?.aiosCoreDir || '.aios-core'),
    squads: resolve(root, config?.squadsDir || 'squads'),
    rules: resolve(root, config?.rulesDir || '.claude/rules'),
    engineRoot: ENGINE_ROOT,
    platformRoot: resolve(ENGINE_ROOT, '..'),
  };

  return _paths;
}

/**
 * Get resolved project paths. Auto-initializes if not yet called.
 */
export function getProjectPaths(): ProjectPaths {
  if (!_paths) {
    return initProjectResolver();
  }
  return _paths;
}

/**
 * Resolve a path relative to the project root.
 */
export function projectPath(...segments: string[]): string {
  return resolve(getProjectPaths().projectRoot, ...segments);
}

/**
 * Resolve a path relative to .aios-core/.
 */
export function aiosCorePath(...segments: string[]): string {
  return resolve(getProjectPaths().aiosCore, ...segments);
}

/**
 * Resolve a path relative to squads/.
 */
export function squadsPath(...segments: string[]): string {
  return resolve(getProjectPaths().squads, ...segments);
}

/**
 * Resolve a path relative to .claude/rules/.
 */
export function rulesPath(...segments: string[]): string {
  return resolve(getProjectPaths().rules, ...segments);
}

// ── Internal resolution logic ──────────────────────────────

function resolveProjectRoot(explicit?: string): string {
  // 1. Explicit argument
  if (explicit) {
    const abs = resolve(explicit);
    if (existsSync(abs)) return abs;
  }

  // 2. CLI flag: --project-root
  const cliRoot = parseCliFlag();
  if (cliRoot) {
    const abs = resolve(cliRoot);
    if (existsSync(abs)) return abs;
  }

  // 3. Environment variable
  const envRoot = process.env.AIOS_PROJECT_ROOT;
  if (envRoot) {
    const abs = resolve(envRoot);
    if (existsSync(abs)) return abs;
  }

  // 4. Auto-detect: walk up from engine root looking for .aios-core/
  const detected = walkUpForMarker(ENGINE_ROOT, '.aios-core');
  if (detected) return detected;

  // 5. Fallback: legacy behavior (3 levels up from engine)
  return resolve(ENGINE_ROOT, '..', '..', '..');
}

function parseCliFlag(): string | undefined {
  const args = process.argv;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--project-root' && args[i + 1]) {
      return args[i + 1];
    }
    if (args[i]?.startsWith('--project-root=')) {
      return args[i].split('=')[1];
    }
  }
  return undefined;
}

function walkUpForMarker(startDir: string, marker: string, maxLevels = 6): string | null {
  let current = startDir;
  for (let i = 0; i < maxLevels; i++) {
    if (existsSync(resolve(current, marker))) {
      return current;
    }
    const parent = dirname(current);
    if (parent === current) break; // reached filesystem root
    current = parent;
  }
  return null;
}
