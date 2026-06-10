import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import * as queue from '../core/job-queue';
import { buildContext } from '../core/context-builder';
import { createWorkspace, type WorkspaceInfo } from '../core/workspace-manager';
import { canExecute } from '../core/authority-enforcer';
import { handleCompletion } from '../core/completion-handler';
import { log } from '../lib/logger';
import { broadcast } from '../lib/ws';
import type { ExecuteRequest } from '../types';

// ============================================================
// SSE Streaming — Story 4.4
// Compatible with StreamCallbacks: onStart, onText, onTools, onDone, onError
// ============================================================

const stream = new Hono();

// POST /stream/agent — Execute agent with SSE streaming
stream.post('/agent', async (c) => {
  const body = await c.req.json<ExecuteRequest>();

  if (!body.squadId || !body.agentId || !body.input?.message) {
    return c.json({ error: 'Missing required fields: squadId, agentId, input.message' }, 400);
  }

  // Create job in queue
  const job = queue.enqueue({
    squad_id: body.squadId,
    agent_id: body.agentId,
    input_payload: {
      message: body.input.message,
      context: body.input.context,
      command: body.input.command,
    },
    trigger_type: 'gui',
    timeout_ms: body.options?.timeout,
  });

  return streamSSE(c, async (sseStream) => {
    let workspace: WorkspaceInfo | undefined;

    try {
      // Authority check
      const authCheck = canExecute(job.agent_id, body.input.command ?? 'execute', body.squadId);
      if (!authCheck.allowed) {
        queue.updateStatus(job.id, 'rejected', {
          error_message: authCheck.reason ?? 'Not authorized',
        });
        await sseStream.writeSSE({
          event: 'error',
          data: JSON.stringify({ error: authCheck.reason, suggestAgent: authCheck.suggestAgent }),
        });
        return;
      }

      // Transition to running
      queue.updateStatus(job.id, 'running');

      // Build context
      const context = await buildContext(job);
      queue.updateFields(job.id, { context_hash: context.hash });

      // Create workspace
      try {
        workspace = await createWorkspace(job);
        queue.updateFields(job.id, { workspace_dir: workspace.path });
      } catch {
        // Continue without workspace
      }

      // Send start event
      await sseStream.writeSSE({
        event: 'start',
        data: JSON.stringify({
          executionId: job.id,
          agentId: job.agent_id,
          agentName: context.agentMeta?.name ?? job.agent_id,
        }),
      });

      broadcast('job:started', {
        jobId: job.id,
        squadId: job.squad_id,
        agentId: job.agent_id,
      });

      // Build CLI args — stream-json for real-time output
      const args: string[] = ['claude'];
      args.push('-p', context.prompt);
      args.push('--output-format', 'stream-json');

      const cwd = workspace?.path || job.workspace_dir || process.cwd();

      // Spawn process (remove CLAUDECODE to allow nested CLI invocations)
      const spawnEnv = { ...process.env };
      delete spawnEnv.CLAUDECODE;

      const proc = Bun.spawn(args, {
        cwd,
        stdout: 'pipe',
        stderr: 'pipe',
        env: spawnEnv,
      });

      queue.updateFields(job.id, { pid: proc.pid });
      const startedAt = Date.now();

      // Timeout handler
      const timeoutId = setTimeout(() => {
        try { proc.kill('SIGTERM'); } catch { /* dead */ }
      }, job.timeout_ms);

      // Stream stdout → SSE events
      const reader = proc.stdout.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let stepCount = 0;
      let fullOutput = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? ''; // Keep incomplete line in buffer

          for (const line of lines) {
            if (!line.trim()) continue;

            try {
              const parsed = JSON.parse(line);
              const sseEvent = mapClaudeStreamToSSE(parsed, ++stepCount);
              if (sseEvent) {
                await sseStream.writeSSE(sseEvent);
              }

              // Accumulate text for full output
              if (parsed.type === 'assistant' && parsed.message?.content) {
                for (const block of parsed.message.content) {
                  if (block.type === 'text') {
                    fullOutput += block.text;
                  }
                }
              } else if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
                fullOutput += parsed.delta.text;
              }
            } catch {
              // Not JSON — treat as raw text
              fullOutput += line;
              await sseStream.writeSSE({
                event: 'text',
                data: JSON.stringify({ content: line }),
              });
            }
          }
        }
      } catch (err) {
        // Stream read error — process may have died
        log.warn('Stream read error', {
          jobId: job.id,
          error: err instanceof Error ? err.message : String(err),
        });
      }

      // Process remaining buffer
      if (buffer.trim()) {
        fullOutput += buffer;
        await sseStream.writeSSE({
          event: 'text',
          data: JSON.stringify({ content: buffer }),
        });
      }

      // Wait for process exit
      clearTimeout(timeoutId);
      const exitCode = await proc.exited;
      const stderr = await new Response(proc.stderr).text();
      const durationMs = Date.now() - startedAt;

      // Update job status
      if (exitCode === 0) {
        queue.updateStatus(job.id, 'done', { output_result: fullOutput });
        await sseStream.writeSSE({
          event: 'done',
          data: JSON.stringify({
            duration: durationMs,
            usage: { inputTokens: 0, outputTokens: 0 }, // CLI doesn't expose tokens
          }),
        });
      } else {
        queue.updateStatus(job.id, 'failed', {
          error_message: stderr || `Exit code: ${exitCode}`,
        });
        await sseStream.writeSSE({
          event: 'error',
          data: JSON.stringify({ error: stderr || `Exit code: ${exitCode}` }),
        });
      }

      // Run completion handler
      const updatedJob = queue.getJob(job.id);
      await handleCompletion({
        job: updatedJob ?? job,
        exitCode,
        stdout: fullOutput,
        stderr,
        durationMs,
        workspace,
      });

      // Signal end
      await sseStream.writeSSE({ data: '[DONE]' });

    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log.error('Stream execution failed', { jobId: job.id, error: msg });

      try {
        queue.updateStatus(job.id, 'failed', { error_message: msg });
      } catch { /* terminal state */ }

      await sseStream.writeSSE({
        event: 'error',
        data: JSON.stringify({ error: msg }),
      });
      await sseStream.writeSSE({ data: '[DONE]' });
    }
  });
});

// -- Claude stream-json → SSE event mapping --

interface SSEEvent {
  event?: string;
  data: string;
}

interface ClaudeStreamEvent {
  type: string;
  delta?: { type?: string; text?: string; partial_json?: string };
  content_block?: { type?: string; name?: string; input?: unknown };
  message?: { content?: Array<{ type: string; text?: string }> };
  result?: unknown;
}

function mapClaudeStreamToSSE(parsed: ClaudeStreamEvent, stepCount: number): SSEEvent | null {
  // Claude stream-json types:
  // { type: "assistant", message: { content: [...] } }
  // { type: "content_block_start", content_block: { type: "text" | "tool_use" } }
  // { type: "content_block_delta", delta: { type: "text_delta", text: "..." } }
  // { type: "content_block_delta", delta: { type: "input_json_delta", partial_json: "..." } }
  // { type: "content_block_stop" }
  // { type: "message_stop" }
  // { type: "result", result: "..." }

  switch (parsed.type) {
    case 'content_block_delta':
      if (parsed.delta?.type === 'text_delta' && parsed.delta?.text) {
        return {
          event: 'text',
          data: JSON.stringify({ content: parsed.delta.text }),
        };
      }
      break;

    case 'content_block_start':
      if (parsed.content_block?.type === 'tool_use') {
        return {
          event: 'tools',
          data: JSON.stringify({
            step: stepCount,
            toolsUsed: true,
            toolResults: [{
              tool: parsed.content_block.name ?? 'unknown',
              input: parsed.content_block.input,
              success: true,
            }],
          }),
        };
      }
      break;

    case 'result':
      if (parsed.result) {
        return {
          event: 'text',
          data: JSON.stringify({ content: String(parsed.result) }),
        };
      }
      break;

    case 'assistant':
      // Full message — extract text blocks
      if (parsed.message?.content) {
        const texts: string[] = [];
        for (const block of parsed.message.content) {
          if (block.type === 'text' && block.text) texts.push(block.text);
        }
        if (texts.length > 0) {
          return {
            event: 'text',
            data: JSON.stringify({ content: texts.join('') }),
          };
        }
      }
      break;
  }

  return null;
}

export { stream };
