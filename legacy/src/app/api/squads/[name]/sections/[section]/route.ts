import path from 'path';
import { NextResponse } from 'next/server';
import {
  encodeSquadItemSlug,
  formatName,
  getProjectRoot,
  isValidSquadSection,
  listSectionFilesRecursive,
  resolveSquadSectionDir,
} from '@/lib/squad-api-utils';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ name: string; section: string }> }
) {
  try {
    const { name, section } = await params;

    if (!isValidSquadSection(section)) {
      return NextResponse.json(
        { error: `Invalid section '${section}'` },
        { status: 400 }
      );
    }

    const projectRoot = getProjectRoot();
    const sectionDir = resolveSquadSectionDir(projectRoot, name, section);
    if (!sectionDir) {
      return NextResponse.json({ error: 'Invalid squad or section path' }, { status: 400 });
    }

    const relativePaths = await listSectionFilesRecursive(sectionDir, section);
    const items = relativePaths.map((relativePath) => ({
      slug: encodeSquadItemSlug(relativePath),
      name: formatName(path.basename(relativePath)),
      relativePath,
    }));

    return NextResponse.json({ items });
  } catch (error) {
    console.error('Error in /api/squads/[name]/sections/[section]:', error);
    return NextResponse.json({ error: 'Failed to list section items' }, { status: 500 });
  }
}
