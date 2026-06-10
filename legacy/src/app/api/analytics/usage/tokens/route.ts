import { NextResponse } from 'next/server';
import { listTasks } from '@/lib/task-store';
import { fetchPersistedTasks } from '@/lib/task-persistence';

/**
 * GET /api/analytics/usage/tokens
 * Returns token usage breakdown by provider group.
 * Estimates ~1500 tokens per execution (30% input, 70% output).
 */
export async function GET() {
  // Merge in-memory + Supabase
  const memoryTasks = listTasks(500);
  const memoryIds = new Set(memoryTasks.map(t => t.id));
  const dbTasks = await fetchPersistedTasks({ limit: 500, excludeIds: memoryIds });

  const allTasks = [...memoryTasks, ...dbTasks];
  const executionCount = allTasks.length;

  // Estimate 1500 tokens per execution, 30% input / 70% output
  const tokensPerExecution = 1500;
  const totalTokens = executionCount * tokensPerExecution;
  const totalInput = Math.round(totalTokens * 0.3);
  const totalOutput = Math.round(totalTokens * 0.7);

  return NextResponse.json({
    total: {
      input: totalInput,
      output: totalOutput,
    },
    byGroup: [
      {
        name: 'claude',
        input: totalInput,
        output: totalOutput,
      },
      {
        name: 'openai',
        input: 0,
        output: 0,
      },
    ],
  });
}
