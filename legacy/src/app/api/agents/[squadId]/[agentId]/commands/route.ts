import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { getProjectRoot, resolveSquadSectionDir } from '@/lib/squad-api-utils';

/**
 * GET /api/agents/[squadId]/[agentId]/commands
 * Returns the commands defined for a specific agent.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ squadId: string; agentId: string }> }
) {
  const { squadId, agentId } = await params;
  const projectRoot = getProjectRoot();
  const agentsDir = resolveSquadSectionDir(projectRoot, squadId, 'agents');

  if (!agentsDir) {
    return NextResponse.json({ commands: {} });
  }

  for (const ext of ['.md', '.yaml', '.yml']) {
    const filePath = path.join(agentsDir, `${agentId}${ext}`);
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const yamlMatch = content.match(/```ya?ml\n([\s\S]*?)```/);
      const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
      const match = yamlMatch || frontmatterMatch;

      if (match) {
        const data = yaml.load(match[1]) as Record<string, unknown>;
        return NextResponse.json({ commands: data?.commands || {} });
      }
    } catch {
      continue;
    }
  }

  return NextResponse.json({ commands: {} });
}
