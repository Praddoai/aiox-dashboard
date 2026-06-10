#!/usr/bin/env bun
/**
 * AIOS Dashboard CLI
 *
 * Local proxy that receives events from Claude Code hooks (port 4001)
 * and forwards them to the cloud relay server via WebSocket.
 *
 * Usage:
 *   npx aios-dash                     # Start (project = cwd)
 *   npx aios-dash --project ./path    # Specify project
 *   npx aios-dash --relay-url URL     # Override relay URL
 *   npx aios-dash config set key val  # Configure
 *   npx aios-dash rooms               # List active rooms
 */

import { existsSync, readFileSync } from 'fs';
import { resolve, basename } from 'path';
import { loadConfig, saveConfig, getConfigPath, type AiosConfig } from './config';
import { RelayConnection } from './relay';
import { startLocalServer } from './local-server';

// Parse CLI arguments
const args = process.argv.slice(2);

/** Resolve project name from package.json or directory name */
function resolveProjectName(projectPath: string): string {
  const pkgPath = resolve(projectPath, 'package.json');
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
      if (pkg.name) return pkg.name;
    } catch {
      // Fall through
    }
  }
  return basename(resolve(projectPath));
}

/** Handle 'config' subcommand */
function handleConfig(): void {
  const subCmd = args[1];
  if (subCmd === 'set' && args[2] && args[3]) {
    const config = loadConfig();
    (config as unknown as Record<string, unknown>)[args[2]] = args[3];
    saveConfig(config);
    console.log(`Set ${args[2]} = ${args[3]}`);
    console.log(`Config: ${getConfigPath()}`);
  } else if (subCmd === 'show' || !subCmd) {
    const config = loadConfig();
    console.log(JSON.stringify(config, null, 2));
    console.log(`\nPath: ${getConfigPath()}`);
  } else {
    console.log('Usage: aios-dash config [show | set <key> <value>]');
  }
}

/** Handle 'rooms' subcommand */
async function handleRooms(): Promise<void> {
  const config = loadConfig();
  if (!config.api_key) {
    console.error('No API key configured. Run: aios-dash config set api_key YOUR_KEY');
    process.exit(1);
  }

  const httpUrl = config.relay_url.replace(/^ws/, 'http');
  try {
    const res = await fetch(`${httpUrl}/rooms`, {
      headers: { Authorization: `Bearer ${config.api_key}` },
    });
    const data = await res.json() as { rooms: Array<{id: string; projectName: string; status: string; cliConnected: boolean; lastActivity: number}> };

    if (!data.rooms?.length) {
      console.log('No active rooms.');
      return;
    }

    console.log('\nActive Rooms:\n');
    for (const room of data.rooms) {
      const status = room.cliConnected ? '\x1b[32m● active\x1b[0m' : '\x1b[33m○ idle\x1b[0m';
      const age = Math.round((Date.now() - room.lastActivity) / 1000 / 60);
      console.log(`  ${status}  ${room.id}`);
      console.log(`         Project: ${room.projectName}`);
      console.log(`         Last activity: ${age}m ago\n`);
    }
  } catch (err) {
    console.error('Failed to fetch rooms:', (err as Error).message);
  }
}

/** Main: start CLI proxy */
async function main(): Promise<void> {
  // Handle subcommands
  if (args[0] === 'config') return handleConfig();
  if (args[0] === 'rooms') return handleRooms();
  if (args[0] === '--help' || args[0] === '-h') {
    console.log(`
AIOS Dashboard CLI v0.1.0

Usage:
  aios-dash                         Start proxy (project = cwd)
  aios-dash --project ./path        Specify project path
  aios-dash --relay-url URL         Override relay URL
  aios-dash --api-key KEY           Override API key
  aios-dash --port PORT             Override local port (default: 4001)
  aios-dash config [show|set k v]   Manage config
  aios-dash rooms                   List active rooms

Config: ${getConfigPath()}
`);
    return;
  }

  // Parse flags
  let projectPath = process.cwd();
  let relayUrlOverride: string | undefined;
  let apiKeyOverride: string | undefined;
  let portOverride: number | undefined;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--project' && args[i + 1]) {
      projectPath = resolve(args[++i]);
    } else if (args[i] === '--relay-url' && args[i + 1]) {
      relayUrlOverride = args[++i];
    } else if (args[i] === '--api-key' && args[i + 1]) {
      apiKeyOverride = args[++i];
    } else if (args[i] === '--port' && args[i + 1]) {
      portOverride = parseInt(args[++i]);
    }
  }

  // Load config
  const config = loadConfig();
  const relayUrl = relayUrlOverride || config.relay_url;
  const apiKey = apiKeyOverride || config.api_key;

  if (!apiKey) {
    console.error('\x1b[31mNo API key configured.\x1b[0m');
    console.error('Run: aios-dash config set api_key YOUR_KEY');
    console.error('Or:  aios-dash --api-key YOUR_KEY');
    process.exit(1);
  }

  const projectName = resolveProjectName(projectPath);
  console.log(`\n\x1b[36mAIOS Dashboard CLI\x1b[0m v0.1.0\n`);
  console.log(`  Project:  ${projectName}`);
  console.log(`  Path:     ${projectPath}`);
  console.log(`  Relay:    ${relayUrl}`);

  // Create room on relay
  const httpUrl = relayUrl.replace(/^ws/, 'http');
  let roomId: string;

  try {
    const res = await fetch(`${httpUrl}/rooms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ projectName, projectPath }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Unknown error' })) as { error: string };
      console.error(`\n\x1b[31mFailed to create room: ${err.error}\x1b[0m`);
      process.exit(1);
    }

    const data = await res.json() as { room: { id: string } };
    roomId = data.room.id;
  } catch (err) {
    console.error(`\n\x1b[31mFailed to connect to relay: ${(err as Error).message}\x1b[0m`);
    console.error(`Make sure the relay server is running at ${httpUrl}`);
    process.exit(1);
  }

  // Connect to relay via WebSocket
  const relay = new RelayConnection({
    relayUrl,
    apiKey,
    roomId,
    onConnected: () => {
      console.log(`  Status:   \x1b[32m● Connected\x1b[0m`);
    },
    onDisconnected: () => {
      console.log(`  Status:   \x1b[33m○ Disconnected (reconnecting...)\x1b[0m`);
    },
    onError: (err) => {
      console.error(`  Error:    \x1b[31m${err}\x1b[0m`);
    },
  });

  relay.connect();

  // Start local HTTP server (port 4001)
  const localServer = startLocalServer({
    port: portOverride,
    onEvent: (event) => {
      relay.sendEvent(event);
    },
  });

  const dashboardUrl = `http://localhost:5173`;

  console.log(`  Room:     ${roomId}`);
  console.log(`  Local:    http://localhost:${localServer.port}`);
  console.log(`  Dashboard: ${dashboardUrl}?room=${roomId}`);
  console.log(`\n\x1b[2mWaiting for events from Claude Code hooks...\x1b[0m\n`);

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n\x1b[2mShutting down...\x1b[0m');
    relay.disconnect();
    localServer.stop();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    relay.disconnect();
    localServer.stop();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
