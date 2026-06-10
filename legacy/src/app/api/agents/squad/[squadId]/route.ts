import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import {
  getProjectRoot,
  formatName,
  listFilesRecursive,
  isListableSectionFile,
  resolveSquadSectionDir,
} from '@/lib/squad-api-utils';

function extractYamlFromMarkdown(content: string): Record<string, unknown> | null {
  const yamlMatch = content.match(/```ya?ml\n([\s\S]*?)```/);
  if (yamlMatch) {
    try { return yaml.load(yamlMatch[1]) as Record<string, unknown>; } catch { /* skip */ }
  }
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (frontmatterMatch) {
    try { return yaml.load(frontmatterMatch[1]) as Record<string, unknown>; } catch { /* skip */ }
  }
  return null;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ squadId: string }> }
) {
  try {
    const { squadId } = await params;
    const projectRoot = getProjectRoot();
    const agentsDir = resolveSquadSectionDir(projectRoot, squadId, 'agents');

    if (!agentsDir) {
      return NextResponse.json({ squad: squadId, agents: [], total: 0 });
    }

    const TIER_MAP: Record<string, number> = { orchestrator: 0, master: 1, specialist: 2 };
    function parseTier(raw: unknown): number {
      if (typeof raw === 'number') return raw;
      const s = String(raw || 'specialist').toLowerCase();
      return TIER_MAP[s] ?? (Number(s) >= 0 ? Number(s) : 2);
    }

    const agents: Array<{
      id: string;
      name: string;
      title?: string;
      icon?: string;
      tier: number;
      squad: string;
      description?: string;
      whenToUse?: string;
      commandCount?: number;
    }> = [];

    let files: string[] = [];
    try {
      files = await listFilesRecursive(
        agentsDir,
        (_relativePath, fileName) => isListableSectionFile('agents', fileName)
      );
    } catch {
      return NextResponse.json({ squad: squadId, agents: [], total: 0 });
    }

    for (const relativePath of files) {
      const agentId = relativePath.replace(/\.md$/i, '').split('/').pop() || relativePath;
      const fullPath = path.join(agentsDir, relativePath);

      try {
        const content = await fs.readFile(fullPath, 'utf-8');
        const yamlData = extractYamlFromMarkdown(content);
        const agentBlock = (yamlData?.agent || {}) as Record<string, unknown>;
        const persona = (yamlData?.persona || yamlData?.persona_profile || {}) as Record<string, unknown>;
        const commands = yamlData?.commands;
        let commandCount = 0;
        if (commands && typeof commands === 'object' && !Array.isArray(commands)) {
          commandCount = Object.keys(commands).length;
        } else if (Array.isArray(commands)) {
          commandCount = commands.length;
        }

        agents.push({
          id: agentId,
          name: (agentBlock.name as string) || formatName(agentId),
          title: (agentBlock.title as string) || (persona.role as string) || undefined,
          icon: (agentBlock.icon as string) || undefined,
          tier: parseTier(agentBlock.tier),
          squad: squadId,
          description: (agentBlock.whenToUse as string) || (persona.identity as string) || undefined,
          whenToUse: (agentBlock.whenToUse as string) || undefined,
          commandCount,
        });
      } catch {
        agents.push({
          id: agentId,
          name: formatName(agentId),
          tier: 2,
          squad: squadId,
        });
      }
    }

    return NextResponse.json({ squad: squadId, agents, total: agents.length });
  } catch (error) {
    console.error('Error in /api/agents/squad/[squadId]:', error);
    return NextResponse.json({ agents: [], total: 0 }, { status: 500 });
  }
}
