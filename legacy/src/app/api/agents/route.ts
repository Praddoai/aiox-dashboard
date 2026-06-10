import { NextRequest, NextResponse } from 'next/server';
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

interface AgentSummary {
  id: string;
  name: string;
  title?: string;
  icon?: string;
  tier: number;
  squad: string;
  description?: string;
  whenToUse?: string;
  commandCount?: number;
}

const TIER_MAP: Record<string, number> = { orchestrator: 0, master: 1, specialist: 2 };
function parseTier(raw: unknown): number {
  if (typeof raw === 'number') return raw;
  const s = String(raw || 'specialist').toLowerCase();
  return TIER_MAP[s] ?? (Number(s) >= 0 ? Number(s) : 2);
}

function extractYamlFromMarkdown(content: string): Record<string, unknown> | null {
  const yamlMatch = content.match(/```ya?ml\n([\s\S]*?)```/);
  if (yamlMatch) {
    try {
      return yaml.load(yamlMatch[1]) as Record<string, unknown>;
    } catch { /* skip */ }
  }
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (frontmatterMatch) {
    try {
      return yaml.load(frontmatterMatch[1]) as Record<string, unknown>;
    } catch { /* skip */ }
  }
  return null;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '500', 10);
    const squadFilter = searchParams.get('squad') || undefined;

    const projectRoot = getProjectRoot();
    const squadsDir = path.join(projectRoot, 'squads');
    const agents: AgentSummary[] = [];

    let squadDirs: string[] = [];
    try {
      const entries = await fs.readdir(squadsDir, { withFileTypes: true });
      squadDirs = entries
        .filter((e) => e.isDirectory() && !e.name.startsWith('.') && e.name !== 'node_modules')
        .map((e) => e.name);
    } catch {
      return NextResponse.json({ agents: [], total: 0 });
    }

    if (squadFilter) {
      squadDirs = squadDirs.filter((d) => d === squadFilter);
    }

    for (const squadName of squadDirs) {
      const agentsDir = resolveSquadSectionDir(projectRoot, squadName, 'agents');
      if (!agentsDir) continue;

      const files = await listFilesRecursive(
        agentsDir,
        (_relativePath, fileName) => isListableSectionFile('agents', fileName)
      );

      for (const relativePath of files) {
        if (agents.length >= limit) break;

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
            squad: squadName,
            description: (agentBlock.whenToUse as string) || (persona.identity as string) || undefined,
            whenToUse: (agentBlock.whenToUse as string) || undefined,
            commandCount,
          });
        } catch {
          agents.push({
            id: agentId,
            name: formatName(agentId),
            tier: 2,
            squad: squadName,
          });
        }
      }

      if (agents.length >= limit) break;
    }

    return NextResponse.json({ agents, total: agents.length });
  } catch (error) {
    console.error('Error in /api/agents:', error);
    return NextResponse.json({ agents: [], total: 0 }, { status: 500 });
  }
}
