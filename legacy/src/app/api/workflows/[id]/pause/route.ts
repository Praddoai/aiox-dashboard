import { NextResponse } from 'next/server';

/**
 * POST /api/workflows/[id]/pause
 * Pause a workflow.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return NextResponse.json({
    id: decodeURIComponent(id),
    status: 'paused',
    pausedAt: new Date().toISOString(),
  });
}
