import { NextResponse } from 'next/server';
import { execSync } from 'child_process';

/**
 * GET /api/execute/llm/health
 * Detects real availability of LLM providers.
 * - Claude: checks for `claude` CLI on PATH or ANTHROPIC_API_KEY env var.
 * - OpenAI: checks for OPENAI_API_KEY env var.
 */
export async function GET() {
  // --- Claude availability ---
  let claudeAvailable = false;
  let claudeError: string | undefined;

  // Check env var first (fastest)
  if (process.env.ANTHROPIC_API_KEY) {
    claudeAvailable = true;
  } else {
    // Fall back to checking if claude CLI is on PATH
    try {
      execSync('which claude', { stdio: 'pipe', timeout: 3000 });
      claudeAvailable = true;
    } catch {
      claudeError = 'Claude CLI not found and ANTHROPIC_API_KEY not set';
    }
  }

  // --- OpenAI availability ---
  const openaiAvailable = Boolean(process.env.OPENAI_API_KEY);

  return NextResponse.json({
    claude: {
      available: claudeAvailable,
      ...(claudeError ? { error: claudeError } : {}),
    },
    openai: {
      available: openaiAvailable,
      ...(!openaiAvailable ? { error: 'OPENAI_API_KEY not configured' } : {}),
    },
  });
}
