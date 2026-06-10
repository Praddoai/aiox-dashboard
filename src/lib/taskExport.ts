/**
 * Task Export utilities — JSON and Markdown export for completed orchestrations.
 */
import type { Task } from '../services/api/tasks';

/** Export task as formatted JSON and trigger download */
export function exportTaskAsJSON(task: Task): void {
  const data = {
    id: task.id,
    demand: task.demand,
    status: task.status,
    createdAt: task.createdAt,
    startedAt: task.startedAt,
    completedAt: task.completedAt,
    totalTokens: task.totalTokens,
    totalDuration: task.totalDuration,
    stepCount: task.stepCount,
    completedSteps: task.completedSteps,
    squads: task.squads,
    outputs: task.outputs.map((o) => ({
      stepId: o.stepId,
      stepName: o.stepName,
      agent: o.output.agent,
      response: o.output.response || o.output.content || '',
      processingTimeMs: o.output.processingTimeMs,
      tokens: o.output.llmMetadata,
    })),
    error: task.error,
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  downloadBlob(blob, `task-${task.id.slice(0, 8)}.json`);
}

/** Export task as Markdown report and trigger download */
export function exportTaskAsMarkdown(task: Task): string {
  const lines: string[] = [];
  const durationSec = task.totalDuration ? Math.round(task.totalDuration / 1000) : null;

  lines.push(`# Orchestration Report`);
  lines.push('');
  lines.push(`**Demand:** ${task.demand}`);
  lines.push(`**Status:** ${task.status}`);
  lines.push(`**Created:** ${task.createdAt}`);
  if (task.startedAt) lines.push(`**Started:** ${task.startedAt}`);
  if (task.completedAt) lines.push(`**Completed:** ${task.completedAt}`);
  if (durationSec !== null) lines.push(`**Duration:** ${durationSec}s`);
  if (task.totalTokens) lines.push(`**Total Tokens:** ${task.totalTokens.toLocaleString()}`);
  lines.push('');

  // Squads
  if (task.squads.length > 0) {
    lines.push(`## Squads`);
    lines.push('');
    task.squads.forEach((squad) => {
      lines.push(`### ${squad.squadId} (Chief: ${squad.chief})`);
      if (squad.agents && squad.agents.length > 0) {
        squad.agents.forEach((a) => {
          lines.push(`- ${a.name || a.id}`);
        });
      }
      lines.push('');
    });
  }

  // Outputs
  if (task.outputs.length > 0) {
    lines.push(`## Agent Outputs`);
    lines.push('');
    task.outputs.forEach((output, idx) => {
      const agentName = output.output.agent?.name || output.output.agent?.id || 'Agent';
      const response = output.output.response || output.output.content || '';
      const timeMs = output.output.processingTimeMs;

      lines.push(`### Step ${idx + 1}: ${output.stepName}`);
      lines.push(`**Agent:** ${agentName}`);
      if (timeMs) lines.push(`**Processing Time:** ${Math.round(timeMs / 1000)}s`);
      lines.push('');
      if (response) {
        lines.push(response);
        lines.push('');
      }
      lines.push('---');
      lines.push('');
    });
  }

  if (task.error) {
    lines.push(`## Error`);
    lines.push('');
    lines.push(`\`\`\`\n${task.error}\n\`\`\``);
    lines.push('');
  }

  lines.push(`---`);
  lines.push(`*Exported from AIOS Platform*`);

  const markdown = lines.join('\n');
  const blob = new Blob([markdown], { type: 'text/markdown' });
  downloadBlob(blob, `task-${task.id.slice(0, 8)}.md`);

  return markdown;
}

/**
 * Format orchestration result as a compact inline markdown summary for chat messages.
 * Shorter than the full export — shows key results without full outputs.
 */
export function formatOrchestrationSummary(state: {
  demand: string;
  status: string;
  squadSelections: Array<{ squadId: string; chief: string; agents: Array<{ id: string; name: string }> }>;
  agentOutputs: Array<{
    stepName: string;
    agent: { id: string; name: string };
    response: string;
    processingTimeMs?: number;
  }>;
  startTime?: number | null;
  error?: string;
}): string {
  const lines: string[] = [];
  const isSuccess = state.status === 'completed';
  const durationSec = state.startTime ? Math.round((Date.now() - state.startTime) / 1000) : null;

  lines.push(isSuccess ? '**Orchestration completed**' : '**Orchestration failed**');
  lines.push('');

  // Demand
  const demandPreview = state.demand.length > 120 ? state.demand.slice(0, 117) + '...' : state.demand;
  lines.push(`> ${demandPreview}`);
  lines.push('');

  // Stats line
  const stats: string[] = [];
  if (state.squadSelections.length > 0) stats.push(`${state.squadSelections.length} squad${state.squadSelections.length > 1 ? 's' : ''}`);
  if (state.agentOutputs.length > 0) stats.push(`${state.agentOutputs.length} step${state.agentOutputs.length > 1 ? 's' : ''}`);
  if (durationSec !== null) stats.push(`${durationSec}s`);
  if (stats.length > 0) lines.push(stats.join(' · '));
  lines.push('');

  // Agent results (compact — first 200 chars of each)
  if (state.agentOutputs.length > 0) {
    state.agentOutputs.forEach((output) => {
      const preview = output.response.length > 200 ? output.response.slice(0, 197) + '...' : output.response;
      lines.push(`**${output.agent.name}** — ${output.stepName}`);
      lines.push(preview);
      lines.push('');
    });
  }

  if (state.error) {
    lines.push(`**Error:** ${state.error}`);
    lines.push('');
  }

  return lines.join('\n').trim();
}

/** Generate a shareable URL for a task and copy to clipboard */
export async function copyTaskShareLink(taskId: string): Promise<boolean> {
  const url = `${window.location.origin}/share/${taskId}`;
  try {
    await navigator.clipboard.writeText(url);
    return true;
  } catch {
    return false;
  }
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
