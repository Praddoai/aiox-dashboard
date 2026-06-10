import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import {
  getProjectRoot,
  formatName,
  listFilesRecursive,
  isListableSectionFile,
  resolveSquadSectionDir,
} from '@/lib/squad-api-utils';

interface AgentSearchResult {
  id: string;
  name: string;
  squad: string;
  tier: number;
  title?: string;
  description?: string;
  commandCount: number;
}

/**
 * GET /api/agents/search?q=<query>&limit=50
 * Search agents by name, ID, or content.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = (searchParams.get('q') || '').toLowerCase().trim();
  const limit = parseInt(searchParams.get('limit') || '50', 10);

  if (!query) {
    return NextResponse.json({ results: [], query: '', total: 0 });
  }

  const projectRoot = getProjectRoot();
  const squadsDir = path.join(projectRoot, 'squads');
  const agents: AgentSearchResult[] = [];

  try {
    const entries = await fs.readdir(squadsDir, { withFileTypes: true });
    const squadDirs = entries
      .filter((e) => e.isDirectory() && !e.name.startsWith('.') && e.name !== 'node_modules')
      .map((e) => e.name);

    for (const squadName of squadDirs) {
      if (agents.length >= limit) break;

      const agentsDir = resolveSquadSectionDir(projectRoot, squadName, 'agents');
      if (!agentsDir) continue;

      const files = await listFilesRecursive(agentsDir, (_rel, fn) =>
        isListableSectionFile('agents', fn)
      );

      for (const rel of files) {
        if (agents.length >= limit) break;

        const agentId = rel.replace(/\.md$/i, '').split('/').pop() || rel;
        const fullPath = path.join(agentsDir, rel);

        try {
          const content = await fs.readFile(fullPath, 'utf-8');
          const name = formatName(agentId);
          const lowerContent = content.toLowerCase();

          if (
            agentId.toLowerCase().includes(query) ||
            name.toLowerCase().includes(query) ||
            lowerContent.includes(query)
          ) {
            // Extract tier from content
            const tierMatch = content.match(/tier:\s*(\d+)/i);
            const tierRaw = tierMatch ? tierMatch[1] : '2';
            const tierMap: Record<string, number> = { '0': 0, '1': 1, '2': 2 };
            const tier = tierMap[tierRaw] ?? 2;

            // Count commands
            const commandMatches = content.match(/^\s*[-*]\s+\*\w+/gm);
            const commandCount = commandMatches?.length || 0;

            agents.push({ id: agentId, name, squad: squadName, tier, commandCount });
          }
        } catch {
          continue;
        }
      }
    }
  } catch {
    /* squads dir not found */
  }

  return NextResponse.json({ results: agents, query, total: agents.length });
}
