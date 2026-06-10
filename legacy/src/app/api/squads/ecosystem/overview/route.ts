import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { getProjectRoot, formatName } from '@/lib/squad-api-utils';

/**
 * Parse a YAML value simply (handles basic string/number values).
 * This avoids needing a full YAML parser for simple key: value lines.
 */
function parseSimpleYamlValue(content: string, key: string): string | undefined {
  const regex = new RegExp(`^${key}:\\s*(.+)$`, 'm');
  const match = content.match(regex);
  return match ? match[1].trim() : undefined;
}

/**
 * GET /api/squads/ecosystem/overview
 * Returns a high-level overview of the squad ecosystem: total squads, agents, workflows.
 */
export async function GET() {
  const projectRoot = getProjectRoot();
  const squadsDir = path.join(projectRoot, 'squads');

  let squadCount = 0;
  let agentCount = 0;
  let workflowCount = 0;
  const squads: Array<{
    id: string;
    name: string;
    icon: string;
    domain: string;
    agentCount: number;
    workflowCount: number;
    tiers: { orchestrators: number; masters: number; specialists: number };
  }> = [];

  try {
    const entries = await fs.readdir(squadsDir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name.startsWith('.') || entry.name === 'node_modules') {
        continue;
      }
      squadCount++;

      // Read config.yaml for squad metadata
      let configName = '';
      let configIcon = '';
      let configDomain = '';
      let tierOrchestrators = 0;
      let tierMasters = 0;
      let tierSpecialists = 0;

      try {
        const configPath = path.join(squadsDir, entry.name, 'config.yaml');
        const configContent = await fs.readFile(configPath, 'utf-8');

        configName = parseSimpleYamlValue(configContent, 'title') ||
                     parseSimpleYamlValue(configContent, 'name') ||
                     formatName(entry.name);
        configIcon = parseSimpleYamlValue(configContent, 'icon') || '';
        configDomain = parseSimpleYamlValue(configContent, 'type') || 'general';

        // Parse tier_system for agent counts
        const orchestratorMatch = configContent.match(/orchestrator[\s\S]*?agent:\s*(\S+)/);
        if (orchestratorMatch) tierOrchestrators = 1;

        const tier1Match = configContent.match(/tier_1_masters[\s\S]*?agents:\s*\n((?:\s+-\s+\S+\n)*)/);
        if (tier1Match) {
          tierMasters = (tier1Match[1].match(/-\s+\S+/g) || []).length;
        }

        const tier2Match = configContent.match(/tier_2_specialists[\s\S]*?agents:\s*\n((?:\s+-\s+\S+\n)*)/);
        if (tier2Match) {
          tierSpecialists = (tier2Match[1].match(/-\s+\S+/g) || []).length;
        }
      } catch {
        configName = formatName(entry.name);
        // config.yaml not found, use defaults
      }

      let agents = 0;
      try {
        const agentFiles = await fs.readdir(
          path.join(squadsDir, entry.name, 'agents')
        );
        agents = agentFiles.filter(
          (f) => f.endsWith('.md') && !f.startsWith('.') && !f.startsWith('_')
        ).length;
      } catch {
        /* no agents dir */
      }
      agentCount += agents;

      // If tier parsing didn't yield results, estimate from total agents
      if (tierOrchestrators === 0 && tierMasters === 0 && tierSpecialists === 0 && agents > 0) {
        tierOrchestrators = 1;
        tierMasters = Math.min(Math.floor(agents * 0.3), agents - 1);
        tierSpecialists = agents - tierOrchestrators - tierMasters;
      }

      let workflows = 0;
      try {
        const wfFiles = await fs.readdir(
          path.join(squadsDir, entry.name, 'workflows')
        );
        workflows = wfFiles.filter(
          (f) => /\.(md|ya?ml)$/i.test(f) && !f.startsWith('.') && !f.startsWith('_')
        ).length;
      } catch {
        /* no workflows dir */
      }
      workflowCount += workflows;

      squads.push({
        id: entry.name,
        name: configName,
        icon: configIcon,
        domain: configDomain,
        agentCount: agents,
        workflowCount: workflows,
        tiers: {
          orchestrators: tierOrchestrators,
          masters: tierMasters,
          specialists: tierSpecialists,
        },
      });
    }
  } catch {
    /* squads dir not found */
  }

  return NextResponse.json({
    totalSquads: squadCount,
    totalAgents: agentCount,
    totalWorkflows: workflowCount,
    squads,
  });
}
