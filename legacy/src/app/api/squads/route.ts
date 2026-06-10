import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import type { Squad, SquadConnection, SquadStatus } from '@/types';
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

async function readSquadConfig(
  squadPath: string
): Promise<Record<string, unknown> | null> {
  // Try squad.yaml first, then config.yaml as fallback
  for (const filename of ['squad.yaml', 'config.yaml']) {
    const manifestPath = path.join(squadPath, filename);
    try {
      const content = await fs.readFile(manifestPath, 'utf-8');
      return yaml.load(content) as Record<string, unknown>;
    } catch {
      continue;
    }
  }
  return null;
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

function extractDependencies(
  squadName: string,
  config: Record<string, unknown>
): SquadConnection[] {
  const connections: SquadConnection[] = [];
  const deps = config.dependencies as Record<string, unknown> | undefined;
  if (!deps) return connections;

  // Handle array of dependency objects or string references
  if (Array.isArray(deps)) {
    for (const dep of deps) {
      if (typeof dep === 'string' && dep !== 'aios-core') {
        connections.push({ from: squadName, to: dep, type: 'required' });
      } else if (typeof dep === 'object' && dep !== null) {
        const d = dep as Record<string, unknown>;
        const name = (d.name || d.squad) as string;
        if (name && name !== 'aios-core') {
          const type =
            (d.type as string) === 'optional' ? 'optional' : 'required';
          connections.push({
            from: squadName,
            to: name,
            type,
            reason: d.reason as string | undefined,
          });
        }
      }
    }
  } else if (typeof deps === 'object') {
    // Handle { squads: [...], optional: [...] } format
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
            reason:
              typeof s === 'object'
                ? ((s as Record<string, unknown>)?.reason as string)
                : undefined,
          });
        }
      }
    }
  }

  return connections;
}

interface RegistrySquad {
  path: string;
  version: string;
  score?: number | string;
  current_score?: number | string;
  quality_score?: number | string;
  grade?: number | string;
  nota?: number | string;
  description: string;
  counts: {
    agents: number;
    tasks: number;
    workflows: number;
    templates: number;
    checklists: number;
    data_files: number;
  };
  agent_names: string[];
  domain: string;
  keywords: string[];
  has_readme: boolean;
  has_changelog?: boolean;
}

interface RegistryData {
  metadata: { total_squads: number };
  squads: Record<string, RegistrySquad>;
  domain_index: Record<string, string[]>;
  summary: {
    total_agents: number;
    total_tasks: number;
    total_workflows: number;
    total_templates: number;
    total_checklists: number;
    total_data_files: number;
  };
}

export async function GET() {
  try {
    const projectRoot = getProjectRoot();
    const registryPath = path.join(
      projectRoot,
      'squads',
      'squad-creator',
      'data',
      'squad-registry.yaml'
    );

    let registry: RegistryData | null = null;
    try {
      const content = await fs.readFile(registryPath, 'utf-8');
      registry = yaml.load(content) as RegistryData;
    } catch {
      // Registry not available, will fall back to directory scan
    }

    const squads: Squad[] = [];
    const allConnections: SquadConnection[] = [];

    if (registry?.squads) {
      // Primary path: read from registry
      for (const [name, data] of Object.entries(registry.squads)) {
        const squadDir = path.join(projectRoot, data.path);

        // Read config for dependencies
        const config = await readSquadConfig(squadDir);
        const deps = config ? extractDependencies(name, config) : [];
        allConnections.push(...deps);

        // Determine status from config metadata
        let status: SquadStatus = 'active';
        if (config) {
          const meta = config.metadata as Record<string, unknown> | undefined;
          const rawStatus = (meta?.status || config.status) as string | undefined;
          if (rawStatus && ['active', 'draft', 'beta', 'planned'].includes(rawStatus)) {
            status = rawStatus as SquadStatus;
          }
        }

        const meta = config?.metadata as Record<string, unknown> | undefined;
        const configVersion =
          (meta?.version as string) ||
          (config?.version as string) ||
          null;
        const normalizedVersion = resolveSquadVersion(data.version, configVersion);
        const hasVersion =
          hasExplicitSquadVersion(data.version) ||
          hasExplicitSquadVersion(configVersion);
        const score = resolveSquadScore(
          [
            data.score,
            data.current_score,
            data.quality_score,
            data.grade,
            data.nota,
            ...extractConfigScoreCandidates(config),
          ],
          {
            agents: data.counts?.agents || 0,
            tasks: data.counts?.tasks || 0,
            workflows: data.counts?.workflows || 0,
            checklists: data.counts?.checklists || 0,
            hasReadme: Boolean(data.has_readme),
            hasVersion,
          }
        );

        squads.push({
          name,
          displayName:
            (meta?.display_name as string) ||
            formatName(name),
          description: data.description || '',
          version: normalizedVersion,
          score,
          domain: resolveSquadDomain(name, data.domain || 'other'),
          status,
          path: data.path,
          agentCount: data.counts?.agents || 0,
          taskCount: data.counts?.tasks || 0,
          workflowCount: data.counts?.workflows || 0,
          checklistCount: data.counts?.checklists || 0,
          templateCount: data.counts?.templates || 0,
          dataCount: data.counts?.data_files || 0,
          agentNames: data.agent_names || [],
          dependencies: deps,
          keywords: data.keywords || [],
        });
      }
    } else {
      // Fallback: scan squads/ directory
      const squadsDir = path.join(projectRoot, 'squads');
      try {
        const entries = await fs.readdir(squadsDir, { withFileTypes: true });
        for (const entry of entries) {
          if (
            !entry.isDirectory() ||
            entry.name.startsWith('.') ||
            entry.name === 'node_modules'
          )
            continue;

          const squadDir = path.join(squadsDir, entry.name);
          const hasSquadManifest =
            (await fileExists(path.join(squadDir, 'squad.yaml'))) ||
            (await fileExists(path.join(squadDir, 'config.yaml')));
          if (!hasSquadManifest) {
            continue;
          }
          const config = await readSquadConfig(squadDir);
          const agentNames = await listAgentNames(projectRoot, entry.name);

          const taskCount = await countSectionFiles(projectRoot, entry.name, 'tasks');
          const workflowCount = await countSectionFiles(projectRoot, entry.name, 'workflows');
          const checklistCount = await countSectionFiles(projectRoot, entry.name, 'checklists');
          const templateCount = await countSectionFiles(projectRoot, entry.name, 'templates');
          const dataCount = await countSectionFiles(projectRoot, entry.name, 'data');

          const deps = config ? extractDependencies(entry.name, config) : [];
          allConnections.push(...deps);

          const meta = config?.metadata as Record<string, unknown> | undefined;
          const rawVersion =
            (meta?.version as string) ||
            (config?.version as string) ||
            null;
          const normalizedVersion = resolveSquadVersion(rawVersion);
          const hasReadme = await fileExists(path.join(squadDir, 'README.md'));
          const score = resolveSquadScore(
            extractConfigScoreCandidates(config),
            {
              agents: agentNames.length,
              tasks: taskCount,
              workflows: workflowCount,
              checklists: checklistCount,
              hasReadme,
              hasVersion: hasExplicitSquadVersion(rawVersion),
            }
          );

          squads.push({
            name: entry.name,
            displayName:
              (meta?.display_name as string) ||
              formatName(entry.name),
            description:
              (config?.description as string) ||
              (meta?.description as string) ||
              '',
            version: normalizedVersion,
            score,
            domain: resolveSquadDomain(
              entry.name,
              (meta?.domain as string) || (config?.domain as string) || 'other'
            ),
            status: 'active',
            path: `squads/${entry.name}/`,
            agentCount: agentNames.length,
            taskCount,
            workflowCount,
            checklistCount,
            templateCount,
            dataCount,
            agentNames,
            dependencies: deps,
            keywords: [],
          });
        }
      } catch {
        // squads dir doesn't exist
      }
    }

    // Build domain index from the data
    const domainIndex: Record<string, string[]> = {};
    for (const squad of squads) {
      if (!domainIndex[squad.domain]) {
        domainIndex[squad.domain] = [];
      }
      domainIndex[squad.domain].push(squad.name);
    }

    // Sort squads naturally
    squads.sort((a, b) => a.name.localeCompare(b.name));

    // Filter connections to only include valid squad-to-squad references
    const squadNames = new Set(squads.map((s) => s.name));
    const validConnections = allConnections.filter(
      (c) => squadNames.has(c.from) && squadNames.has(c.to)
    );

    return NextResponse.json({
      squads,
      domainIndex,
      connections: validConnections,
      summary: {
        total_agents: registry?.summary?.total_agents ?? squads.reduce((s, q) => s + q.agentCount, 0),
        total_tasks: registry?.summary?.total_tasks ?? squads.reduce((s, q) => s + q.taskCount, 0),
        total_workflows: registry?.summary?.total_workflows ?? squads.reduce((s, q) => s + q.workflowCount, 0),
        total_templates: registry?.summary?.total_templates ?? squads.reduce((s, q) => s + q.templateCount, 0),
        total_checklists: registry?.summary?.total_checklists ?? squads.reduce((s, q) => s + q.checklistCount, 0),
        total_data_files: registry?.summary?.total_data_files ?? squads.reduce((s, q) => s + q.dataCount, 0),
      },
    });
  } catch (error) {
    console.error('Error in /api/squads:', error);
    return NextResponse.json(
      { squads: [], domainIndex: {}, connections: [], error: 'Failed to load squads' },
      { status: 500 }
    );
  }
}
