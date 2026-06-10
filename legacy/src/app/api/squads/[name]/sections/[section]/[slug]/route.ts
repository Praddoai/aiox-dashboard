import { promises as fs } from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';
import {
  decodeSquadItemSlug,
  formatName,
  getProjectRoot,
  isListableSectionFile,
  isValidSquadSection,
  resolvePathWithin,
  resolveSquadSectionDir,
} from '@/lib/squad-api-utils';

function extractTitle(content: string, filename: string, isStructured: boolean): string {
  if (!isStructured) {
    const match = content.match(/^#\s+(.+)/m);
    if (match) {
      return match[1].trim();
    }
  }
  return formatName(filename);
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ name: string; section: string; slug: string }> }
) {
  try {
    const { name, section, slug } = await params;

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

    const relativePath = decodeSquadItemSlug(slug);
    if (!relativePath) {
      return NextResponse.json({ error: 'Invalid item slug' }, { status: 400 });
    }

    const fullPath = resolvePathWithin(sectionDir, relativePath);
    if (!fullPath) {
      return NextResponse.json({ error: 'Invalid item path' }, { status: 400 });
    }

    const fileName = path.basename(relativePath);
    if (!isListableSectionFile(section, fileName)) {
      return NextResponse.json({ error: 'Item not allowed for this section' }, { status: 404 });
    }

    let content: string;
    try {
      const stats = await fs.stat(fullPath);
      if (!stats.isFile()) {
        return NextResponse.json({ error: 'Item not found' }, { status: 404 });
      }
      content = await fs.readFile(fullPath, 'utf-8');
    } catch {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    const ext = path.extname(fileName).toLowerCase();
    const isStructured = ext === '.yaml' || ext === '.yml' || ext === '.json';
    const title = extractTitle(content, fileName, isStructured);

    return NextResponse.json({
      title,
      content,
      filePath: relativePath,
      isYaml: isStructured,
    });
  } catch (error) {
    console.error('Error in /api/squads/[name]/sections/[section]/[slug]:', error);
    return NextResponse.json({ error: 'Failed to load item content' }, { status: 500 });
  }
}
