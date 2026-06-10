#!/usr/bin/env bun
// ============================================================
// AIOS Engine CLI — Start the engine pointing at any project
// Usage: aios-engine --project-root /path/to/project [--port 4002] [--dashboard /path/to/dist]
// ============================================================

const args = process.argv.slice(2);

function getArg(name: string): string | undefined {
  const idx = args.indexOf(`--${name}`);
  if (idx === -1) return undefined;
  return args[idx + 1];
}

function hasFlag(name: string): boolean {
  return args.includes(`--${name}`);
}

if (hasFlag('help') || hasFlag('h')) {
  console.log(`
AIOS Agent Execution Engine

Usage:
  aios-engine [options]

Options:
  --project-root <path>   Path to the project root (contains .aios-core/ and squads/)
  --port <number>         Server port (default: 4002, or ENGINE_PORT env)
  --dashboard <path>      Path to built dashboard dist/ to serve static files
  --host <address>        Bind address (default: 0.0.0.0)
  --help, -h              Show this help

Environment variables:
  AIOS_PROJECT_ROOT       Same as --project-root
  ENGINE_PORT             Same as --port
  ENGINE_HOST             Same as --host
  AIOS_DASHBOARD_DIR      Same as --dashboard

Examples:
  # Start engine for current directory
  aios-engine --project-root .

  # Start on custom port with dashboard
  aios-engine --project-root /my/project --port 8080 --dashboard ./dist

  # Use env vars
  AIOS_PROJECT_ROOT=/my/project aios-engine
`);
  process.exit(0);
}

// Set env vars from CLI args before importing the engine
const projectRoot = getArg('project-root') || process.env.AIOS_PROJECT_ROOT;
if (projectRoot) {
  process.env.AIOS_PROJECT_ROOT = projectRoot;
}

const port = getArg('port') || process.env.ENGINE_PORT;
if (port) {
  process.env.ENGINE_PORT = port;
}

const host = getArg('host') || process.env.ENGINE_HOST;
if (host) {
  process.env.ENGINE_HOST = host;
}

const dashboardDir = getArg('dashboard') || process.env.AIOS_DASHBOARD_DIR;
if (dashboardDir) {
  process.env.AIOS_DASHBOARD_DIR = dashboardDir;
}

// Import and run the engine (side-effect: starts the server)
await import('../src/index.ts');
