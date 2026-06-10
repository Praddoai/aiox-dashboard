import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { getProjectRoot } from '@/lib/squad-api-utils';

/**
 * GET /api/workflows/[id]
 * Returns a single workflow by ID. ID format: "squadName/workflowName".
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const decodedId = decodeURIComponent(id);
  const projectRoot = getProjectRoot();
  const squadsDir = path.join(projectRoot, 'squads');

  for (const ext of ['.md', '.yaml', '.yml']) {
    const filePath = path.join(squadsDir, `${decodedId}${ext}`);
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const stat = await fs.stat(filePath);
      const name = decodedId
        .split('/')
        .pop()
        ?.split('-')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ') || decodedId;

      return NextResponse.json({
        id: decodedId,
        name,
        content,
        status: 'active',
        version: '1.0',
        trigger: { type: 'manual' },
        createdAt: stat.birthtime.toISOString(),
        updatedAt: stat.mtime.toISOString(),
      });
    } catch {
      continue;
    }
  }

  return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
}

/**
 * PATCH /api/workflows/[id]
 * Update workflow metadata.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  return NextResponse.json({
    id: decodeURIComponent(id),
    ...body,
    updatedAt: new Date().toISOString(),
  });
}

/**
 * DELETE /api/workflows/[id]
 * Delete a workflow.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return NextResponse.json({
    id: decodeURIComponent(id),
    deleted: true,
  });
}
