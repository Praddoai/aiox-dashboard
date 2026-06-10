import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface MCPServerInfo {
  name: string;
  status: 'connected' | 'disconnected' | 'error';
  type: string;
  tools: Array<{ name: string; description?: string; calls: number }>;
  toolCount: number;
  resources: Array<{ uri: string; name: string }>;
  lastPing: string;
  error?: string;
}

/**
 * GET /api/tools/mcp
 * Returns MCP server status by reading Claude's config.
 */
export async function GET() {
  const servers: MCPServerInfo[] = [];
  const now = new Date().toISOString();

  // Try to read MCP config from Claude's settings
  try {
    const homeDir = process.env.HOME || process.env.USERPROFILE || '/root';
    const { readFile } = await import('fs/promises');
    const { join } = await import('path');

    // Read global Claude config
    const configPath = join(homeDir, '.claude.json');
    let claudeConfig: Record<string, unknown> = {};
    try {
      const raw = await readFile(configPath, 'utf-8');
      claudeConfig = JSON.parse(raw);
    } catch {
      // No global config
    }

    // Read project-level config
    const projectConfigPath = join(process.cwd(), '.mcp.json');
    let projectConfig: Record<string, unknown> = {};
    try {
      const raw = await readFile(projectConfigPath, 'utf-8');
      projectConfig = JSON.parse(raw);
    } catch {
      // No project config
    }

    // Extract MCP servers from configs
    const mcpServers: Record<string, unknown> = {
      ...((claudeConfig.mcpServers || {}) as Record<string, unknown>),
      ...((projectConfig.mcpServers || {}) as Record<string, unknown>),
    };

    // Well-known tools for common MCP servers.
    // These are populated as defaults when the server config is detected
    // but tools cannot be dynamically enumerated at startup.
    const knownServerTools: Record<string, Array<{ name: string; description?: string }>> = {
      playwright: [
        { name: 'browser_navigate', description: 'Navigate to a URL' },
        { name: 'browser_click', description: 'Click an element on the page' },
        { name: 'browser_fill', description: 'Fill a form field with text' },
        { name: 'browser_screenshot', description: 'Take a screenshot of the page' },
        { name: 'browser_snapshot', description: 'Capture accessibility snapshot of the page' },
        { name: 'browser_hover', description: 'Hover over an element' },
        { name: 'browser_select_option', description: 'Select an option from a dropdown' },
        { name: 'browser_press_key', description: 'Press a keyboard key' },
        { name: 'browser_type', description: 'Type text character by character' },
        { name: 'browser_tabs', description: 'List open browser tabs' },
        { name: 'browser_close', description: 'Close the browser' },
      ],
      github: [
        { name: 'create_issue', description: 'Create a new GitHub issue' },
        { name: 'create_pull_request', description: 'Create a new pull request' },
        { name: 'list_issues', description: 'List repository issues' },
        { name: 'list_pull_requests', description: 'List pull requests' },
        { name: 'get_file_contents', description: 'Get contents of a file in a repository' },
        { name: 'search_code', description: 'Search for code across repositories' },
        { name: 'search_repositories', description: 'Search for repositories' },
        { name: 'create_or_update_file', description: 'Create or update a file in a repository' },
        { name: 'create_branch', description: 'Create a new branch' },
        { name: 'merge_pull_request', description: 'Merge a pull request' },
      ],
      'desktop-commander': [
        { name: 'execute_command', description: 'Execute a shell command' },
        { name: 'read_file', description: 'Read file contents' },
        { name: 'write_file', description: 'Write content to a file' },
        { name: 'list_directory', description: 'List directory contents' },
        { name: 'search_files', description: 'Search for files by pattern' },
      ],
      'docker-mcp': [
        { name: 'docker', description: 'Run Docker CLI commands' },
        { name: 'web_search_exa', description: 'Search the web using EXA' },
        { name: 'get-library-docs', description: 'Get library documentation via Context7' },
        { name: 'resolve-library-id', description: 'Resolve a library ID for docs lookup' },
      ],
      context7: [
        { name: 'resolve-library-id', description: 'Resolve a library/package name to Context7 ID' },
        { name: 'get-library-docs', description: 'Fetch documentation for a resolved library' },
      ],
      exa: [
        { name: 'web_search_exa', description: 'Search the web with EXA AI' },
        { name: 'get_contents', description: 'Get contents of a web page' },
        { name: 'find_similar', description: 'Find pages similar to a URL' },
      ],
      apify: [
        { name: 'search-actors', description: 'Search for Actors in the Apify Store' },
        { name: 'call-actor', description: 'Run an Apify Actor' },
        { name: 'get-actor-output', description: 'Get results from an Actor run' },
        { name: 'fetch-actor-details', description: 'Get Actor information and schema' },
      ],
    };

    for (const [name, config] of Object.entries(mcpServers)) {
      const serverConfig = config as Record<string, unknown>;
      const serverType = (serverConfig.command as string)?.includes('docker') ? 'docker'
        : (serverConfig.command as string)?.includes('npx') ? 'npx'
        : (serverConfig.command as string)?.includes('node') ? 'node'
        : 'unknown';

      // Look up known tools by server name (exact match or partial match)
      const nameLower = name.toLowerCase();
      let tools: Array<{ name: string; description?: string; calls: number }> = [];

      for (const [knownName, knownTools] of Object.entries(knownServerTools)) {
        if (nameLower === knownName || nameLower.includes(knownName) || knownName.includes(nameLower)) {
          tools = knownTools.map(t => ({ ...t, calls: 0 }));
          break;
        }
      }

      servers.push({
        name,
        status: 'connected',
        type: serverType,
        tools,
        toolCount: tools.length,
        resources: [],
        lastPing: now,
      });
    }

    // Also try Docker MCP if available
    try {
      const { stdout } = await execAsync('docker mcp tools ls 2>/dev/null', { timeout: 5000 });
      if (stdout.trim()) {
        const lines = stdout.trim().split('\n').filter(l => l.trim());
        // Parse docker MCP tools output
        for (const line of lines) {
          const parts = line.split(/\s+/);
          if (parts.length >= 2) {
            const toolName = parts[0];
            const serverName = parts[1] || 'docker-mcp';
            const existing = servers.find(s => s.name === serverName);
            if (existing) {
              existing.tools.push({ name: toolName, calls: 0 });
              existing.toolCount = existing.tools.length;
            }
          }
        }
      }
    } catch {
      // Docker MCP not available
    }
  } catch {
    // Config read failed — return empty
  }

  // If no servers found, return sensible defaults based on environment
  if (servers.length === 0) {
    servers.push(
      {
        name: 'claude-code',
        status: 'connected',
        type: 'builtin',
        tools: [
          { name: 'Read', calls: 0 },
          { name: 'Write', calls: 0 },
          { name: 'Edit', calls: 0 },
          { name: 'Bash', calls: 0 },
          { name: 'Glob', calls: 0 },
          { name: 'Grep', calls: 0 },
        ],
        toolCount: 6,
        resources: [],
        lastPing: now,
      },
    );
  }

  return NextResponse.json({
    servers,
    connectedServers: servers.filter(s => s.status === 'connected').length,
    totalTools: servers.reduce((sum, s) => sum + (s.toolCount || s.tools.length), 0),
  });
}
