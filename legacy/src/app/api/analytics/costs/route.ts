import { NextResponse } from 'next/server';
import { listTasks } from '@/lib/task-store';
import { fetchPersistedTasks } from '@/lib/task-persistence';

// Estimated pricing: ~$0.015 per 1000 tokens, ~1500 tokens per execution
const TOKENS_PER_EXECUTION = 1500;
const COST_PER_1K_TOKENS = 0.015;
const COST_PER_EXECUTION = (TOKENS_PER_EXECUTION / 1000) * COST_PER_1K_TOKENS;

/**
 * GET /api/analytics/costs?period=month
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const period = searchParams.get('period') || 'month';

  // Merge in-memory + Supabase
  const memoryTasks = listTasks(500);
  const memoryIds = new Set(memoryTasks.map(t => t.id));
  const dbTasks = await fetchPersistedTasks({ limit: 500, excludeIds: memoryIds });
  const tasks = [
    ...memoryTasks.map(t => ({ createdAt: t.createdAt })),
    ...dbTasks.map(t => ({ createdAt: t.createdAt })),
  ];
  const now = new Date();

  const periodMs: Record<string, number> = {
    hour: 60 * 60 * 1000,
    day: 24 * 60 * 60 * 1000,
    week: 7 * 24 * 60 * 60 * 1000,
    month: 30 * 24 * 60 * 60 * 1000,
    quarter: 90 * 24 * 60 * 60 * 1000,
    year: 365 * 24 * 60 * 60 * 1000,
  };
  const cutoff = new Date(now.getTime() - (periodMs[period] || periodMs.month));
  const filtered = tasks.filter(t => new Date(t.createdAt) >= cutoff);

  const totalTokens = filtered.length * TOKENS_PER_EXECUTION;
  const totalCost = parseFloat((filtered.length * COST_PER_EXECUTION).toFixed(4));

  // Build timeline (last 7 days)
  const timeline: Array<{ date: string; cost: number; tokens: number }> = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const dayTasks = filtered.filter(t => t.createdAt.startsWith(dateStr));
    const dayTokens = dayTasks.length * TOKENS_PER_EXECUTION;
    const dayCost = parseFloat((dayTasks.length * COST_PER_EXECUTION).toFixed(4));
    timeline.push({
      date: dateStr,
      cost: dayCost,
      tokens: dayTokens,
    });
  }

  // Split 80/20 between Claude and OpenAI
  const claudeTokens = Math.round(totalTokens * 0.8);
  const openaiTokens = totalTokens - claudeTokens;
  const claudeCost = parseFloat((totalCost * 0.8).toFixed(4));
  const openaiCost = parseFloat((totalCost * 0.2).toFixed(4));

  return NextResponse.json({
    period,
    periodStart: cutoff.toISOString(),
    generatedAt: now.toISOString(),
    summary: {
      totalCost,
      totalTokens,
      totalRecords: filtered.length,
      avgCostPerRecord: filtered.length > 0 ? parseFloat((totalCost / filtered.length).toFixed(6)) : 0,
      avgTokensPerRecord: filtered.length > 0 ? TOKENS_PER_EXECUTION : 0,
    },
    byProvider: [
      { provider: 'claude', cost: claudeCost, tokens: claudeTokens, percentage: 80 },
      { provider: 'openai', cost: openaiCost, tokens: openaiTokens, percentage: 20 },
    ],
    byModel: [
      { model: 'claude-opus-4', cost: claudeCost, tokens: claudeTokens, percentage: 80 },
      { model: 'gpt-4o', cost: openaiCost, tokens: openaiTokens, percentage: 20 },
    ],
    timeline,
  });
}
