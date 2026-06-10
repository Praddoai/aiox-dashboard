import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { getProjectRoot, formatName, resolveSquadSectionDir } from '@/lib/squad-api-utils';

function extractYamlFromMarkdown(content: string): Record<string, unknown> | null {
  const yamlMatch = content.match(/```ya?ml\n([\s\S]*?)```/);
  if (yamlMatch) {
    try {
      return yaml.load(yamlMatch[1]) as Record<string, unknown>;
    } catch {
      /* skip */
    }
  }
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (frontmatterMatch) {
    try {
      return yaml.load(frontmatterMatch[1]) as Record<string, unknown>;
    } catch {
      /* skip */
    }
  }
  return null;
}

/**
 * GET /api/agents/[squadId]/[agentId]
 * Returns a single agent's full profile by squad and agent ID.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ squadId: string; agentId: string }> }
) {
  const { squadId, agentId } = await params;
  const projectRoot = getProjectRoot();
  const agentsDir = resolveSquadSectionDir(projectRoot, squadId, 'agents');

  if (!agentsDir) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
  }

  for (const ext of ['.md', '.yaml', '.yml']) {
    const filePath = path.join(agentsDir, `${agentId}${ext}`);
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const data = extractYamlFromMarkdown(content);
      const agent = ((data?.agent || {}) as Record<string, unknown>);
      const persona = ((data?.persona || data?.persona_profile || {}) as Record<string, unknown>);
      const commands = data?.commands;

      let commandCount = 0;
      if (commands && typeof commands === 'object' && !Array.isArray(commands)) {
        commandCount = Object.keys(commands).length;
      } else if (Array.isArray(commands)) {
        commandCount = commands.length;
      }

      // Map tier string to numeric AgentTier (0|1|2) as frontend expects
      const tierRaw = (agent.tier as string) || 'specialist';
      const tierMap: Record<string, number> = { orchestrator: 0, master: 1, specialist: 2 };
      const tierValue = tierMap[tierRaw] ?? (Number(tierRaw) >= 0 ? Number(tierRaw) : 2);

      // Wrap in { agent: ... } as frontend service expects
      return NextResponse.json({
        agent: {
          id: agentId,
          name: (agent.name as string) || formatName(agentId),
          title: (agent.title as string) || (persona.role as string) || undefined,
          squad: squadId,
          tier: tierValue,
          description:
            (agent.whenToUse as string) || (persona.identity as string) || undefined,
          commands: commands || {},
          commandCount,
          content,
        },
      });
    } catch {
      continue;
    }
  }

  return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
}
