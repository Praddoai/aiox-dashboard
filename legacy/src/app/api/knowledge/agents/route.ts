import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { getProjectRoot } from '@/lib/squad-api-utils';

/**
 * GET /api/knowledge/agents
 * Returns knowledge information per agent across all squads.
 */
export async function GET() {
  const projectRoot = getProjectRoot();
  const squadsDir = path.join(projectRoot, 'squads');
  const agents: Array<{
    agentId: string;
    agentName: string;
    squadId: string;
    knowledgePath: string;
    files: number;
    lastUpdated: string;
  }> = [];

  try {
    const squadDirs = await fs.readdir(squadsDir, { withFileTypes: true });

    for (const squadEntry of squadDirs) {
      if (!squadEntry.isDirectory() || squadEntry.name.startsWith('.')) continue;
      const squadId = squadEntry.name;
      const agentsDir = path.join(squadsDir, squadId, 'agents');

      let agentFiles;
      try {
        agentFiles = await fs.readdir(agentsDir, { withFileTypes: true });
      } catch {
        continue;
      }

      for (const agentEntry of agentFiles) {
        if (agentEntry.name.startsWith('.') || agentEntry.name.startsWith('_')) continue;

        const agentId = agentEntry.name.replace(/\.md$/i, '');
        const agentName = agentId
          .split('-')
          .map(w => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ');

        let files = 0;
        let lastUpdated = new Date(0).toISOString();

        if (agentEntry.isFile() && agentEntry.name.endsWith('.md')) {
          files = 1;
          try {
            const stat = await fs.stat(path.join(agentsDir, agentEntry.name));
            lastUpdated = stat.mtime.toISOString();
          } catch { /* skip */ }
        } else if (agentEntry.isDirectory()) {
          try {
            const contents = await fs.readdir(path.join(agentsDir, agentEntry.name));
            files = contents.filter(f => !f.startsWith('.')).length;
            for (const f of contents) {
              try {
                const stat = await fs.stat(path.join(agentsDir, agentEntry.name, f));
                if (stat.mtime.toISOString() > lastUpdated) {
                  lastUpdated = stat.mtime.toISOString();
                }
              } catch { /* skip */ }
            }
          } catch { /* skip */ }
        }

        agents.push({
          agentId,
          agentName,
          squadId,
          knowledgePath: `squads/${squadId}/agents/${agentEntry.name}`,
          files,
          lastUpdated,
        });
      }
    }
  } catch {
    // squads dir doesn't exist
  }

  return NextResponse.json({ agents, total: agents.length });
}
