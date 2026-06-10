import { NextResponse } from 'next/server';

/**
 * GET /api/workflows/[id]/stats
 * Returns execution statistics for a specific workflow.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return NextResponse.json({
    workflowId: decodeURIComponent(id),
    totalExecutions: 0,
    successfulExecutions: 0,
    failedExecutions: 0,
    averageDuration: 0,
    lastExecutedAt: null,
  });
}
