import { NextResponse } from 'next/server';

/**
 * GET /api/execute/llm/models
 * Returns the actual model tiers used by the AIOS orchestration system.
 *
 * Tier 0 (powerful): claude-opus-4   — complex reasoning, architecture decisions
 * Tier 1 (default):  claude-sonnet-4 — general development, most agent tasks
 * Tier 2 (fast):     claude-haiku    — quick classification, formatting, simple lookups
 */
export async function GET() {
  const claudeModels = [
    {
      id: 'claude-opus-4',
      name: 'Claude Opus 4',
      tier: 0,
      tierLabel: 'powerful',
      description: 'Complex reasoning, architecture decisions, and multi-step analysis',
      contextWindow: 200000,
      costPer1kInput: 0.015,
      costPer1kOutput: 0.075,
    },
    {
      id: 'claude-sonnet-4',
      name: 'Claude Sonnet 4',
      tier: 1,
      tierLabel: 'default',
      description: 'General development, agent tasks, and balanced performance',
      contextWindow: 200000,
      costPer1kInput: 0.003,
      costPer1kOutput: 0.015,
    },
    {
      id: 'claude-haiku',
      name: 'Claude Haiku',
      tier: 2,
      tierLabel: 'fast',
      description: 'Quick classification, formatting, and simple lookups',
      contextWindow: 200000,
      costPer1kInput: 0.00025,
      costPer1kOutput: 0.00125,
    },
  ];

  // Only include OpenAI if the key is configured
  const openaiConfigured = Boolean(process.env.OPENAI_API_KEY);
  const openaiModels = openaiConfigured
    ? [
        {
          id: 'gpt-4o',
          name: 'GPT-4o',
          tier: 1,
          tierLabel: 'default',
          description: 'Multimodal general-purpose model',
          contextWindow: 128000,
          costPer1kInput: 0.005,
          costPer1kOutput: 0.015,
        },
      ]
    : [];

  return NextResponse.json({
    claude: claudeModels.map(m => m.id),
    openai: openaiModels.map(m => m.id),
    default: {
      fast: 'claude-haiku',
      default: 'claude-sonnet-4',
      powerful: 'claude-opus-4',
    },
    models: [...claudeModels, ...openaiModels],
  });
}
