#!/usr/bin/env bun
// ============================================================
// AIOS CLI — Start, init, and manage AIOS-powered projects
// Usage: aios <command> [options]
// ============================================================

import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { spawn } from 'child_process';

const args = process.argv.slice(2);
const command = args[0];

function getArg(name: string): string | undefined {
  const idx = args.indexOf(`--${name}`);
  if (idx === -1) return undefined;
  return args[idx + 1];
}

function hasFlag(name: string): boolean {
  return args.includes(`--${name}`);
}

// ── Colors ────────────────────────────────────────────────
const c = {
  lime: (s: string) => `\x1b[38;2;209;255;0m${s}\x1b[0m`,
  dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
  cyan: (s: string) => `\x1b[36m${s}\x1b[0m`,
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
};

function banner(): void {
  console.log(`
${c.lime('  ╔═══════════════════════════════════╗')}
${c.lime('  ║')}  ${c.bold('AIOS')} — AI Agent Orchestration    ${c.lime('║')}
${c.lime('  ╚═══════════════════════════════════╝')}
`);
}

function showHelp(): void {
  banner();
  console.log(`${c.bold('Commands:')}

  ${c.cyan('start')}     Start the engine + dashboard for a project
  ${c.cyan('init')}      Scaffold .aios-core/ structure in current directory
  ${c.cyan('status')}    Check engine health
  ${c.cyan('help')}      Show this help

${c.bold('Start options:')}
  --project <path>    Project root (default: current directory)
  --port <number>     Engine port (default: 4002)
  --dashboard <path>  Path to built dashboard dist/
  --no-dashboard      API-only mode, don't serve dashboard

${c.bold('Examples:')}
  ${c.dim('# Start for current project')}
  aios start

  ${c.dim('# Start for a specific project on custom port')}
  aios start --project /path/to/project --port 8080

  ${c.dim('# Initialize a new project')}
  cd my-project && aios init
`);
}

// ── Commands ──────────────────────────────────────────────

async function cmdStart(): Promise<void> {
  const projectRoot = resolve(getArg('project') || '.');
  const port = getArg('port') || '4002';
  const noDashboard = hasFlag('no-dashboard');

  if (!existsSync(projectRoot)) {
    console.error(c.red(`Project root not found: ${projectRoot}`));
    process.exit(1);
  }

  banner();
  console.log(`${c.bold('Project:')}    ${projectRoot}`);
  console.log(`${c.bold('Port:')}       ${port}`);

  // Find the engine — check relative paths
  const enginePaths = [
    resolve(dirname(import.meta.dir), '../../engine'),          // monorepo: packages/cli/../../engine
    resolve(projectRoot, 'engine'),                              // project/engine/
    resolve(projectRoot, 'node_modules/@aios/engine'),           // installed as dep
    resolve(projectRoot, 'aios-platform/engine'),                // nested
  ];

  let engineDir: string | undefined;
  for (const p of enginePaths) {
    if (existsSync(resolve(p, 'src/index.ts'))) {
      engineDir = p;
      break;
    }
  }

  if (!engineDir) {
    console.error(c.red('Could not find @aios/engine. Install it or run from the aios-platform directory.'));
    process.exit(1);
  }

  console.log(`${c.bold('Engine:')}     ${engineDir}`);

  // Find dashboard dist
  let dashboardDir: string | undefined;
  if (!noDashboard) {
    dashboardDir = getArg('dashboard');
    if (!dashboardDir) {
      const candidates = [
        resolve(engineDir, '../dist'),                           // monorepo: engine/../dist
        resolve(projectRoot, 'dist'),                            // project/dist/
        resolve(projectRoot, 'node_modules/@aios/dashboard/dist'),
      ];
      for (const p of candidates) {
        if (existsSync(resolve(p, 'index.html'))) {
          dashboardDir = p;
          break;
        }
      }
    }
    if (dashboardDir) {
      console.log(`${c.bold('Dashboard:')}  ${dashboardDir}`);
    } else {
      console.log(`${c.dim('Dashboard:  not found (API-only mode)')}`);
    }
  }

  console.log('');

  // Start the engine
  const env: Record<string, string> = {
    ...process.env as Record<string, string>,
    AIOS_PROJECT_ROOT: projectRoot,
    ENGINE_PORT: port,
  };
  if (dashboardDir) {
    env.AIOS_DASHBOARD_DIR = dashboardDir;
  }

  const child = spawn('bun', ['run', resolve(engineDir, 'src/index.ts')], {
    cwd: engineDir,
    env,
    stdio: 'inherit',
  });

  child.on('exit', (code) => {
    process.exit(code ?? 1);
  });

  // Forward signals
  process.on('SIGINT', () => child.kill('SIGINT'));
  process.on('SIGTERM', () => child.kill('SIGTERM'));
}

function cmdInit(): void {
  const projectRoot = resolve(getArg('project') || '.');
  banner();
  console.log(`Initializing AIOS project at ${c.bold(projectRoot)}\n`);

  const dirs = [
    '.aios-core',
    '.aios-core/development/agents',
    '.aios-core/development/tasks',
    '.aios-core/development/workflows',
    '.aios-core/development/templates',
    '.aios-core/development/checklists',
    'squads',
    '.claude/rules',
  ];

  for (const dir of dirs) {
    const full = resolve(projectRoot, dir);
    if (!existsSync(full)) {
      mkdirSync(full, { recursive: true });
      console.log(`  ${c.green('+')} ${dir}/`);
    } else {
      console.log(`  ${c.dim('=')} ${dir}/ ${c.dim('(exists)')}`);
    }
  }

  // Create constitution.md if missing
  const constitutionPath = resolve(projectRoot, '.aios-core/constitution.md');
  if (!existsSync(constitutionPath)) {
    writeFileSync(constitutionPath, `# AIOS Constitution

## Principles

1. **Task-First** — Workflows are composed of tasks, not agents
2. **Authority Matrix** — Each agent has explicit permissions
3. **Quality Gates** — Every deliverable passes validation
4. **No Invention** — Specs trace to requirements, never invent features
5. **Portable** — The system works with any project structure
6. **Observable** — All actions are logged and auditable
`);
    console.log(`  ${c.green('+')} .aios-core/constitution.md`);
  }

  // Create SQUAD-REGISTRY.yaml if missing
  const registryPath = resolve(projectRoot, '.aios-core/SQUAD-REGISTRY.yaml');
  if (!existsSync(registryPath)) {
    writeFileSync(registryPath, `# Squad Registry — Define your agent squads here
squads:
  - id: development
    name: Development
    domain: engineering
    description: Software development and engineering squad
    agents:
      - dev
      - qa
`);
    console.log(`  ${c.green('+')} .aios-core/SQUAD-REGISTRY.yaml`);
  }

  // Create engine.config.yaml if missing
  const engineConfigPath = resolve(projectRoot, 'engine.config.yaml');
  if (!existsSync(engineConfigPath)) {
    writeFileSync(engineConfigPath, `# AIOS Engine Configuration
# Copy this to the engine directory or set AIOS_PROJECT_ROOT

project:
  root: ""                       # auto-detect if empty
  aios_core: ".aios-core"       # relative to root
  squads: "squads"              # relative to root
  rules: ".claude/rules"        # relative to root

server:
  port: 4002
  host: "0.0.0.0"
  cors_origins:
    - "http://localhost:5173"
    - "http://localhost:3000"
`);
    console.log(`  ${c.green('+')} engine.config.yaml`);
  }

  console.log(`\n${c.green('Done!')} Project initialized.`);
  console.log(`\nNext steps:`);
  console.log(`  1. Add agents to ${c.cyan('.aios-core/development/agents/')}`);
  console.log(`  2. Add squads to ${c.cyan('squads/')}`);
  console.log(`  3. Run ${c.cyan('aios start')} to launch the engine`);
}

async function cmdStatus(): Promise<void> {
  const port = getArg('port') || '4002';
  const host = getArg('host') || 'localhost';
  try {
    const res = await fetch(`http://${host}:${port}/health`);
    const data = await res.json() as Record<string, unknown>;
    console.log(`${c.green('Engine is running')}`);
    console.log(`  Status:     ${data.status}`);
    console.log(`  Version:    ${data.version}`);
    console.log(`  Uptime:     ${Math.round((data.uptime_ms as number) / 1000)}s`);
    console.log(`  WS clients: ${data.ws_clients}`);
    console.log(`  PID:        ${data.pid}`);
  } catch {
    console.log(`${c.red('Engine is not running')} on ${host}:${port}`);
    process.exit(1);
  }
}

// ── Router ────────────────────────────────────────────────

switch (command) {
  case 'start':
    await cmdStart();
    break;
  case 'init':
    cmdInit();
    break;
  case 'status':
    await cmdStatus();
    break;
  case 'help':
  case '--help':
  case '-h':
  case undefined:
    showHelp();
    break;
  default:
    console.error(c.red(`Unknown command: ${command}`));
    showHelp();
    process.exit(1);
}
