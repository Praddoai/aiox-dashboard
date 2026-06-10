import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { getProjectRoot } from '@/lib/squad-api-utils';

/**
 * GET /api/knowledge/files?path=
 * Lists files/directories under the project knowledge base.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const requestedPath = searchParams.get('path') || '';

  const projectRoot = getProjectRoot();
  // Knowledge lives in squads/*/data, .aios-core/data, docs/
  // For browsing, use the project root
  const basePath = projectRoot;

  const targetDir = requestedPath
    ? path.resolve(basePath, requestedPath)
    : basePath;

  // Security: ensure we don't escape the project root
  if (!targetDir.startsWith(path.resolve(basePath))) {
    return NextResponse.json({ path: requestedPath, items: [] });
  }

  try {
    const entries = await fs.readdir(targetDir, { withFileTypes: true });
    const items = [];

    for (const entry of entries) {
      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;

      try {
        const fullPath = path.join(targetDir, entry.name);
        const stat = await fs.stat(fullPath);
        items.push({
          name: entry.name,
          type: entry.isDirectory() ? 'directory' : 'file',
          size: stat.size,
          modified: stat.mtime.toISOString(),
          extension: entry.isFile() ? path.extname(entry.name).slice(1) || null : null,
        });
      } catch {
        // Skip inaccessible entries
      }
    }

    // Sort: directories first, then files
    items.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    return NextResponse.json({ path: requestedPath, items });
  } catch {
    return NextResponse.json({ path: requestedPath, items: [] });
  }
}
