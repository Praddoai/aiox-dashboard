import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import {
  getProjectRoot,
  listFilesRecursive,
  isListableSectionFile,
  resolveSquadSectionDir,
} from '@/lib/squad-api-utils';

/**
 * GET /api/squads/:name/stats
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name: squadId } = await params;
  const projectRoot = getProjectRoot();

  const agentsDir = resolveSquadSectionDir(projectRoot, squadId, 'agents');
  if (!agentsDir) {
    return NextResponse.json({
      squadId,
      stats: {
        totalAgents: 0,
        byTier: {},
        quality: { withVoiceDna: 0, withAntiPatterns: 0, withIntegration: 0 },
        commands: { total: 0, byAgent: [] },
        qualityScore: 0,
      },
    });
  }

  const agentFiles = await listFilesRecursive(
    agentsDir,
    (_rel, fileName) => isListableSectionFile('agents', fileName)
  );

  const totalAgents = agentFiles.length;
  const byTier: Record<string, number> = {};
  let withVoiceDna = 0;
  let withAntiPatterns = 0;
  let withIntegration = 0;
  let totalCommands = 0;
  const byAgent: Array<{ agentId: string; count: number }> = [];

  for (const relPath of agentFiles) {
    const agentId = relPath.replace(/\.md$/i, '').split('/').pop() || relPath;
    const fullPath = path.join(agentsDir, relPath);

    try {
      const content = await fs.readFile(fullPath, 'utf-8');

      const tierMatch = content.match(/tier:\s*(\d+)/i);
      const tier = tierMatch ? tierMatch[1] : '2';
      byTier[tier] = (byTier[tier] || 0) + 1;

      if (/voice[_-]?dna|voice_style/i.test(content)) withVoiceDna++;
      if (/anti[_-]?pattern/i.test(content)) withAntiPatterns++;
      if (/integrat|mcp|tool/i.test(content)) withIntegration++;

      const commandMatches = content.match(/^\s*[-*]\s+\*\w+/gm);
      const cmdCount = commandMatches?.length || 0;
      totalCommands += cmdCount;
      if (cmdCount > 0) {
        byAgent.push({ agentId, count: cmdCount });
      }
    } catch {
      byTier['2'] = (byTier['2'] || 0) + 1;
    }
  }

  const qualityScore = totalAgents > 0
    ? Math.round(
        ((withVoiceDna / totalAgents) * 30 +
          (withAntiPatterns / totalAgents) * 20 +
          (withIntegration / totalAgents) * 30 +
          Math.min(totalCommands / totalAgents / 3, 1) * 20)
      )
    : 0;

  return NextResponse.json({
    squadId,
    stats: {
      totalAgents,
      byTier,
      quality: { withVoiceDna, withAntiPatterns, withIntegration },
      commands: { total: totalCommands, byAgent },
      qualityScore,
    },
  });
}
