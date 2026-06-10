import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { getProjectRoot } from '@/lib/squad-api-utils';

interface FileInfo {
  name: string;
  path: string;
  size: number;
  modified: string;
  extension: string;
}

/**
 * GET /api/knowledge/files/overview
 * Returns overview stats of project knowledge files.
 */
export async function GET() {
  const projectRoot = getProjectRoot();
  let totalFiles = 0;
  let totalDirectories = 0;
  let totalSize = 0;
  const byExtension: Record<string, number> = {};
  const allFiles: FileInfo[] = [];

  // Scan key directories for knowledge files
  const dirsToScan = ['docs', 'squads', '.aios-core'];

  async function walk(dir: string, relBase: string) {
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
      const fullPath = path.join(dir, entry.name);
      const relPath = path.join(relBase, entry.name);

      if (entry.isDirectory()) {
        totalDirectories++;
        await walk(fullPath, relPath);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).slice(1).toLowerCase();
        if (['md', 'yaml', 'yml', 'json', 'txt'].includes(ext)) {
          try {
            const stat = await fs.stat(fullPath);
            totalFiles++;
            totalSize += stat.size;
            byExtension[ext] = (byExtension[ext] || 0) + 1;
            allFiles.push({
              name: entry.name,
              path: relPath,
              size: stat.size,
              modified: stat.mtime.toISOString(),
              extension: ext,
            });
          } catch {
            // Skip
          }
        }
      }
    }
  }

  for (const dir of dirsToScan) {
    await walk(path.join(projectRoot, dir), dir);
  }

  // Sort by modified date, most recent first
  allFiles.sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime());

  return NextResponse.json({
    totalFiles,
    totalDirectories,
    totalSize,
    byExtension,
    recentFiles: allFiles.slice(0, 10),
  });
}
