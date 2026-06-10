import { NextResponse } from 'next/server';

/**
 * GET /api/workflows/schema
 * Returns the workflow schema definition with supported types and values.
 * Response shape matches the frontend WorkflowSchema type:
 *   { workflowStatus, executionStatus, stepTypes, triggerTypes } — all Record<string, string>
 */
export async function GET() {
  return NextResponse.json({
    workflowStatus: {
      draft: 'Draft',
      active: 'Active',
      paused: 'Paused',
      archived: 'Archived',
    },
    executionStatus: {
      pending: 'Pending',
      running: 'Running',
      completed: 'Completed',
      failed: 'Failed',
      cancelled: 'Cancelled',
      waiting: 'Waiting',
    },
    stepTypes: {
      agent: 'Agent Execution',
      condition: 'Conditional Branch',
      parallel: 'Parallel Execution',
      loop: 'Loop/Iteration',
    },
    triggerTypes: {
      manual: 'Manual Trigger',
      webhook: 'Webhook',
      cron: 'Scheduled (Cron)',
      event: 'Event-Based',
    },
  });
}
