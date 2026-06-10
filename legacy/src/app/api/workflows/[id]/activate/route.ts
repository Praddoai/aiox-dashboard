import { NextResponse } from 'next/server';

/**
 * POST /api/workflows/[id]/activate
 * Activate a workflow.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return NextResponse.json({
    id: decodeURIComponent(id),
    status: 'active',
    activatedAt: new Date().toISOString(),
  });
}
