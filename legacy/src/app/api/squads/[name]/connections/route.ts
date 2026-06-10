import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import {
  getProjectRoot,
  listFilesRecursive,
  isListableSectionFile,
  resolveSquadSectionDir,
} from '@/lib/squad-api-utils';

interface AgentConnection {
  from: string;
  to: string;
  type: 'receivesFrom' | 'handoffTo';
}

/**
 * GET /api/squads/:name/connections
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name: squadId } = await params;
  const projectRoot = getProjectRoot();

  const agentsDir = resolveSquadSectionDir(projectRoot, squadId, 'agents');
  if (!agentsDir) {
    return NextResponse.json({ connections: [] });
  }

  const agentFiles = await listFilesRecursive(
    agentsDir,
    (_rel, fileName) => isListableSectionFile('agents', fileName)
  );

  const agentIds = agentFiles.map(
    rel => rel.replace(/\.md$/i, '').split('/').pop() || rel
  );

  const connections: AgentConnection[] = [];

  for (const relPath of agentFiles) {
    const agentId = relPath.replace(/\.md$/i, '').split('/').pop() || relPath;
    const fullPath = path.join(agentsDir, relPath);

    try {
      const content = await fs.readFile(fullPath, 'utf-8');
      const contentLower = content.toLowerCase();

      for (const otherId of agentIds) {
        if (otherId === agentId) continue;

        if (contentLower.includes(otherId.toLowerCase()) ||
            contentLower.includes(`@${otherId.toLowerCase()}`)) {
          const handoffPattern = new RegExp(
            `(handoff|delegate|pass|send|forward).*${otherId}|${otherId}.*(handoff|delegate|receive)`,
            'i'
          );
          connections.push({
            from: agentId,
            to: otherId,
            type: handoffPattern.test(content) ? 'handoffTo' : 'receivesFrom',
          });
        }
      }
    } catch {
      // Skip
    }
  }

  const seen = new Set<string>();
  const unique = connections.filter(c => {
    const key = `${c.from}-${c.to}-${c.type}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return NextResponse.json({ connections: unique });
}
