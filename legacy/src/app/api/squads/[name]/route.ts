import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import type { Squad, SquadAgent, SquadTier, SquadConnection, SquadStatus } from '@/types';
import {
  hasExplicitSquadVersion,
  resolveSquadVersion,
  resolveSquadScore,
} from '@/lib/squad-metadata';
import { resolveSquadDomain } from '@/lib/domain-taxonomy';
import {
  getProjectRoot,
  formatName,
  countFilesRecursive,
  listFilesRecursive,
  isListableSectionFile,
  isSafePathSegment,
  resolveSquadSectionDir,
  type SquadSectionName,
} from '@/lib/squad-api-utils';

async function countSectionFiles(
  projectRoot: string,
  squadName: string,
  section: SquadSectionName
): Promise<number> {
  const sectionDir = resolveSquadSectionDir(projectRoot, squadName, section);
  if (!sectionDir) {
    return 0;
  }
  return countFilesRecursive(sectionDir, (_relativePath, fileName) =>
    isListableSectionFile(section, fileName)
  );
}

async function listAgentNames(projectRoot: string, squadName: string): Promise<string[]> {
  const agentsDir = resolveSquadSectionDir(projectRoot, squadName, 'agents');
  if (!agentsDir) {
    return [];
  }

  const files = await listFilesRecursive(
    agentsDir,
    (_relativePath, fileName) => isListableSectionFile('agents', fileName)
  );

  return files
    .map((relativePath) => relativePath.replace(/\.md$/i, '').split('/').pop() || relativePath)
    .sort((a, b) => a.localeCompare(b));
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }
  return value as Record<string, unknown>;
}

function extractConfigScoreCandidates(
  config: Record<string, unknown> | null
): unknown[] {
  if (!config) {
    return [];
  }

  const metadata = asRecord(config.metadata);
  const quality = asRecord(config.quality);
  const qualityGates = asRecord(config.quality_gates);

  return [
    metadata?.score,
    metadata?.current_score,
    metadata?.nota,
    config.score,
    config.current_score,
    config.nota,
    quality?.score,
    quality?.current_score,
    quality?.overall_score,
    quality?.nota,
    qualityGates?.score,
  ];
}

interface RegistrySquadEntry {
  version?: string;
  score?: number | string;
  current_score?: number | string;
  quality_score?: number | string;
  grade?: number | string;
  nota?: number | string;
  has_readme?: boolean;
  counts?: {
    agents?: number;
    tasks?: number;
    workflows?: number;
    templates?: number;
    checklists?: number;
    data_files?: number;
  };
  agent_names?: string[];
}

interface RegistryFileData {
  squads?: Record<string, RegistrySquadEntry>;
}

async function readRegistrySquad(
  projectRoot: string,
  squadName: string
): Promise<RegistrySquadEntry | null> {
  const registryPath = path.join(
    projectRoot,
    'squads',
    'squad-creator',
    'data',
    'squad-registry.yaml'
  );

  try {
    const content = await fs.readFile(registryPath, 'utf-8');
    const parsed = yaml.load(content) as RegistryFileData;
    return parsed.squads?.[squadName] ?? null;
  } catch {
    return null;
  }
}

function parseTierLevel(key: string): number {
  if (key === 'orchestrator') return 0;
  if (key.match(/tier_0|tier_1_/)) return 1;
  if (key.match(/tier_2_|tier_3_/)) return 2;
  return 1;
}

interface TierSystemEntry {
  name: string;
  purpose: string;
  agents: string[];
}

interface AgentEntry {
  id: string;
  name: string;
  role: string;
  tier: string | number;
  description?: string;
  specialty?: string;
}

function parseTiersFromConfig(config: Record<string, unknown>): SquadTier[] {
  const tiers: SquadTier[] = [];
  const tierSystem = config.tier_system as Record<string, TierSystemEntry> | undefined;
  const agents = config.agents as AgentEntry[] | undefined;

  if (tierSystem && typeof tierSystem === 'object') {
    // V2 format: tier_system with named tiers
    for (const [key, tierData] of Object.entries(tierSystem)) {
      if (!tierData || typeof tierData !== 'object') continue;

      const level = parseTierLevel(key);
      const tierAgents: SquadAgent[] = [];

      if (Array.isArray(tierData.agents)) {
        for (const agentId of tierData.agents) {
          // Find full agent data
          const agentData = agents?.find((a) => a.id === agentId);
          tierAgents.push({
            id: typeof agentId === 'string' ? agentId : (agentId as Record<string, string>).id,
            name: agentData?.name || formatName(typeof agentId === 'string' ? agentId : ''),
            role: agentData?.role || '',
            tier: key,
            description: agentData?.description || agentData?.specialty,
          });
        }
      }

      tiers.push({
        key,
        name: tierData.name || formatName(key),
        purpose: tierData.purpose || '',
        agents: tierAgents,
        level,
      });
    }
  } else if (Array.isArray(agents)) {
    // Legacy format: agents with tier field
    const tierMap = new Map<string, SquadAgent[]>();

    for (const agent of agents) {
      const tierKey = String(agent.tier || 'core');
      if (!tierMap.has(tierKey)) {
        tierMap.set(tierKey, []);
      }
      tierMap.get(tierKey)!.push({
        id: agent.id,
        name: agent.name || formatName(agent.id),
        role: agent.role || '',
        tier: tierKey,
        description: agent.description || agent.specialty,
      });
    }

    // Convert to tiers with level mapping
    const levelMap: Record<string, number> = {
      orchestrator: 0,
      '0': 1,
      '1': 1,
      '2': 2,
      '3': 2,
      core: 1,
      aligned: 1,
      foundation: 1,
      masters: 1,
      specialists: 2,
      complementary: 2,
      tool: 2,
    };

    for (const [tierKey, tierAgents] of tierMap) {
      const level = levelMap[tierKey] ?? 1;
      tiers.push({
        key: tierKey,
        name: formatName(tierKey),
        purpose: '',
        agents: tierAgents,
        level,
      });
    }
  }

  // Sort by level
  tiers.sort((a, b) => a.level - b.level);
  return tiers;
}

function extractDependencies(
  squadName: string,
  config: Record<string, unknown>
): SquadConnection[] {
  const connections: SquadConnection[] = [];
  const deps = config.dependencies as Record<string, unknown> | unknown[] | undefined;
  if (!deps) return connections;

  if (Array.isArray(deps)) {
    for (const dep of deps) {
      if (typeof dep === 'string' && dep !== 'aios-core') {
        connections.push({ from: squadName, to: dep, type: 'required' });
      } else if (typeof dep === 'object' && dep !== null) {
        const d = dep as Record<string, unknown>;
        const name = (d.name || d.squad) as string;
        if (name && name !== 'aios-core') {
          connections.push({
            from: squadName,
            to: name,
            type: (d.type as string) === 'optional' ? 'optional' : 'required',
            reason: d.reason as string | undefined,
          });
        }
      }
    }
  } else if (typeof deps === 'object') {
    const squads = (deps as Record<string, unknown>).squads;
    const optional = (deps as Record<string, unknown>).optional;
    if (Array.isArray(squads)) {
      for (const s of squads) {
        const name = typeof s === 'string' ? s : (s as Record<string, unknown>)?.name as string;
        if (name && name !== 'aios-core') {
          connections.push({ from: squadName, to: name, type: 'required' });
        }
      }
    }
    if (Array.isArray(optional)) {
      for (const s of optional) {
        const name = typeof s === 'string' ? s : (s as Record<string, unknown>)?.name as string;
        if (name && name !== 'aios-core') {
          connections.push({
            from: squadName,
            to: name,
            type: 'optional',
            reason: typeof s === 'object' ? ((s as Record<string, unknown>)?.reason as string) : undefined,
          });
        }
      }
    }
  }
  return connections;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;
    if (!isSafePathSegment(name)) {
      return NextResponse.json({ error: 'Invalid squad name' }, { status: 400 });
    }

    const projectRoot = getProjectRoot();
    const squadDir = path.join(projectRoot, 'squads', name);

    // Check if squad exists
    try {
      await fs.access(squadDir);
    } catch {
      return NextResponse.json({ error: `Squad '${name}' not found` }, { status: 404 });
    }

    // Read canonical squad manifest
    let config: Record<string, unknown> | null = null;
    try {
      const content = await fs.readFile(path.join(squadDir, 'squad.yaml'), 'utf-8');
      config = yaml.load(content) as Record<string, unknown>;
    } catch {
      return NextResponse.json(
        { error: `Squad '${name}' is missing a valid squad.yaml manifest` },
        { status: 500 }
      );
    }

    const registryEntry = await readRegistrySquad(projectRoot, name);
    const hasReadme = await fileExists(path.join(squadDir, 'README.md'));

    const agentNames = registryEntry?.agent_names?.length
      ? [...registryEntry.agent_names].sort((a, b) => a.localeCompare(b))
      : await listAgentNames(projectRoot, name);

    const taskCount = registryEntry?.counts?.tasks
      ?? await countSectionFiles(projectRoot, name, 'tasks');
    const workflowCount = registryEntry?.counts?.workflows
      ?? await countSectionFiles(projectRoot, name, 'workflows');
    const checklistCount = registryEntry?.counts?.checklists
      ?? await countSectionFiles(projectRoot, name, 'checklists');
    const templateCount = registryEntry?.counts?.templates
      ?? await countSectionFiles(projectRoot, name, 'templates');
    const dataCount = registryEntry?.counts?.data_files
      ?? await countSectionFiles(projectRoot, name, 'data');
    const agentCount = registryEntry?.counts?.agents ?? agentNames.length;

    // Parse tiers
    const tiers: SquadTier[] = config
      ? parseTiersFromConfig(config)
      : agentNames.length > 0
        ? [
            {
              key: 'agents',
              name: 'Agents',
              purpose: '',
              agents: agentNames.map((id) => ({
                id,
                name: formatName(id),
                role: '',
                tier: 'agents',
              })),
              level: 1,
            },
          ]
        : [];

    // Extract metadata
    const meta = config?.metadata as Record<string, unknown> | undefined;
    const description =
      typeof config?.description === 'string'
        ? config.description
        : (meta?.description as string) || '';

    let status: SquadStatus = 'active';
    const rawStatus = (meta?.status || config?.status) as string | undefined;
    if (rawStatus && ['active', 'draft', 'beta', 'planned'].includes(rawStatus)) {
      status = rawStatus as SquadStatus;
    }

    const deps = config ? extractDependencies(name, config) : [];

    // Read objectives and key_capabilities if available
    const objectives = config?.objectives as string[] | undefined;
    const keyCapabilities = config?.key_capabilities as string[] | undefined;
    const configVersion =
      (meta?.version as string) ||
      (config?.version as string) ||
      null;
    const version = resolveSquadVersion(registryEntry?.version, configVersion);
    const hasVersion =
      hasExplicitSquadVersion(registryEntry?.version) ||
      hasExplicitSquadVersion(configVersion);
    const score = resolveSquadScore(
      [
        registryEntry?.score,
        registryEntry?.current_score,
        registryEntry?.quality_score,
        registryEntry?.grade,
        registryEntry?.nota,
        ...extractConfigScoreCandidates(config),
      ],
      {
        agents: agentCount,
        tasks: taskCount,
        workflows: workflowCount,
        checklists: checklistCount,
        hasReadme: registryEntry?.has_readme ?? hasReadme,
        hasVersion,
      }
    );

    const squad: Squad & {
      objectives?: string[];
      keyCapabilities?: string[];
    } = {
      name,
      displayName: (meta?.display_name as string) || formatName(name),
      description: description.trim(),
      version,
      score,
      domain: resolveSquadDomain(
        name,
        (meta?.domain as string) || (config?.domain as string) || 'other'
      ),
      status,
      path: `squads/${name}/`,
      agentCount,
      taskCount,
      workflowCount,
      checklistCount,
      templateCount,
      dataCount,
      agentNames,
      tiers,
      dependencies: deps,
      keywords: [],
      objectives,
      keyCapabilities,
    };

    return NextResponse.json({ squad });
  } catch (error) {
    console.error('Error in /api/squads/[name]:', error);
    return NextResponse.json(
      { error: 'Failed to load squad detail' },
      { status: 500 }
    );
  }
}
