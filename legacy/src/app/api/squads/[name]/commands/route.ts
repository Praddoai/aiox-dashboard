import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import {
  getProjectRoot,
  formatName,
  listFilesRecursive,
  isListableSectionFile,
  resolveSquadSectionDir,
} from '@/lib/squad-api-utils';

interface SquadCommand {
  id: string;
  name: string;
  description: string;
  type: 'task' | 'workflow';
  file: string;
}

/**
 * GET /api/squads/:name/commands
 * Returns tasks and workflows for a squad.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name: squadId } = await params;
  const projectRoot = getProjectRoot();
  const tasks: SquadCommand[] = [];
  const workflows: SquadCommand[] = [];

  // Load tasks
  const tasksDir = resolveSquadSectionDir(projectRoot, squadId, 'tasks');
  if (tasksDir) {
    try {
      const files = await listFilesRecursive(tasksDir, (_rel, fn) =>
        isListableSectionFile('tasks', fn)
      );
      for (const rel of files) {
        const id = rel.replace(/\.(md|ya?ml)$/i, '').split('/').pop() || rel;
        const fullPath = path.join(tasksDir, rel);
        let description = '';
        try {
          const content = await fs.readFile(fullPath, 'utf-8');
          const descMatch = content.match(/(?:description|purpose|summary):\s*(.+)/i);
          description = descMatch?.[1]?.trim() || content.slice(0, 100).trim();
        } catch { /* skip */ }
        tasks.push({ id, name: formatName(id), description, type: 'task', file: rel });
      }
    } catch { /* skip */ }
  }

  // Load workflows
  const workflowsDir = resolveSquadSectionDir(projectRoot, squadId, 'workflows');
  if (workflowsDir) {
    try {
      const files = await listFilesRecursive(workflowsDir, (_rel, fn) =>
        isListableSectionFile('workflows', fn)
      );
      for (const rel of files) {
        const id = rel.replace(/\.(md|ya?ml)$/i, '').split('/').pop() || rel;
        const fullPath = path.join(workflowsDir, rel);
        let description = '';
        try {
          const content = await fs.readFile(fullPath, 'utf-8');
          const descMatch = content.match(/(?:description|purpose|summary):\s*(.+)/i);
          description = descMatch?.[1]?.trim() || content.slice(0, 100).trim();
        } catch { /* skip */ }
        workflows.push({ id, name: formatName(id), description, type: 'workflow', file: rel });
      }
    } catch { /* skip */ }
  }

  return NextResponse.json({ tasks, workflows });
}
