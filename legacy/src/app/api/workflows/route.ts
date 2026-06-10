import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { getProjectRoot } from '@/lib/squad-api-utils';

/**
 * GET /api/workflows
 * Returns workflows found across squads.
 */
export async function GET() {
  const projectRoot = getProjectRoot();
  const squadsDir = path.join(projectRoot, 'squads');
  const workflows: Array<{
    id: string;
    name: string;
    description: string;
    version: string;
    status: string;
    trigger: { type: string };
    stepCount: number;
    createdAt: string;
    updatedAt: string;
  }> = [];

  try {
    const squadDirs = await fs.readdir(squadsDir, { withFileTypes: true });

    for (const squadEntry of squadDirs) {
      if (!squadEntry.isDirectory() || squadEntry.name.startsWith('.')) continue;
      const workflowsDir = path.join(squadsDir, squadEntry.name, 'workflows');

      let files;
      try {
        files = await fs.readdir(workflowsDir, { withFileTypes: true });
      } catch {
        continue;
      }

      for (const file of files) {
        if (!file.isFile() || file.name.startsWith('.') || file.name.startsWith('_')) continue;
        const ext = path.extname(file.name).toLowerCase();
        if (!['.md', '.yaml', '.yml'].includes(ext)) continue;

        const fullPath = path.join(workflowsDir, file.name);
        const wfId = `${squadEntry.name}/${file.name.replace(/\.(md|yaml|yml)$/i, '')}`;
        const wfName = file.name
          .replace(/\.(md|yaml|yml)$/i, '')
          .split('-')
          .map(w => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ');

        try {
          const stat = await fs.stat(fullPath);
          const content = await fs.readFile(fullPath, 'utf-8');

          // Try to extract step count from content
          const stepMatches = content.match(/^#{1,3}\s+(step|phase|stage)/gim);
          const bulletSteps = content.match(/^\s*\d+\.\s+/gm);
          const stepCount = (stepMatches?.length || 0) + (bulletSteps?.length || 0) || 1;

          // Try to extract description from first paragraph
          const lines = content.split('\n').filter(l => l.trim() && !l.startsWith('#'));
          const description = lines[0]?.trim().slice(0, 120) || `Workflow from ${squadEntry.name}`;

          workflows.push({
            id: wfId,
            name: wfName,
            description,
            version: '1.0',
            status: 'active',
            trigger: { type: 'manual' },
            stepCount,
            createdAt: stat.birthtime.toISOString(),
            updatedAt: stat.mtime.toISOString(),
          });
        } catch {
          // Skip unreadable files
        }
      }
    }
  } catch {
    // squads dir doesn't exist
  }

  return NextResponse.json({ total: workflows.length, workflows });
}
