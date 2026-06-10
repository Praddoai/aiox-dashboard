import { NextResponse } from 'next/server';
import { listTasks } from '@/lib/task-store';
import { fetchPersistedTasks } from '@/lib/task-persistence';

/**
 * GET /api/execute/llm/usage
 * Returns token usage statistics with total field.
 */
export async function GET() {
  // Merge in-memory + Supabase to count real executions
  const memoryTasks = listTasks(500);
  const memoryIds = new Set(memoryTasks.map(t => t.id));
  const dbTasks = await fetchPersistedTasks({ limit: 500, excludeIds: memoryIds });
  const totalRequests = memoryTasks.length + dbTasks.length;

  // Estimate token usage based on execution count (no real tracking yet)
  const estimatedTokensPerExec = 1500;
  const totalTokens = totalRequests * estimatedTokensPerExec;
  const inputTokens = Math.round(totalTokens * 0.3);
  const outputTokens = Math.round(totalTokens * 0.7);

  return NextResponse.json({
    claude: {
      input: inputTokens,
      output: outputTokens,
      requests: totalRequests,
    },
    openai: {
      input: 0,
      output: 0,
      requests: 0,
    },
    total: {
      input: inputTokens,
      output: outputTokens,
      requests: totalRequests,
    },
  });
}
