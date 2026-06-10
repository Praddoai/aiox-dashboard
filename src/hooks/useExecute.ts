import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { executeApi, buildExecuteRequest } from '../services/api';
import { useChatStore } from '../stores/chatStore';
import { useExecutionLogStore } from '../stores/executionLogStore';
import type {
  ExecuteResponse,
  ExecutionHistory,
  ExecutionStats,
  LLMUsage,
  LLMHealth,
  SquadType,
  MessageAttachment,
  StreamToolsEvent,
} from '../types';

/**
 * Extract image URLs from tool results and format as markdown images
 */
function extractImagesFromToolResults(toolResults: StreamToolsEvent['toolResults']): string {
  const imageMarkdown: string[] = [];

  console.log('[extractImages] Processing tool results:', toolResults);

  for (const toolResult of toolResults) {
    // Use 'tool' field (backend) or 'name' field (fallback)
    const toolResultRecord = toolResult as Record<string, unknown>;
    const toolName = toolResult.tool || (toolResultRecord.name as string) || '';
    // Use 'output' field (backend) or 'result' field (fallback)
    const output = toolResult.output || toolResultRecord.result;

    console.log('[extractImages] Tool:', toolName, 'Success:', toolResult.success, 'Output:', output);

    if (!toolResult.success || !output) continue;

    const result = output as Record<string, unknown>;

    // Handle thumbnail generation results
    if (toolName.includes('thumbnail') || toolName.includes('image')) {
      const imageUrl = result.thumbnail_url || result.image_url || result.url;
      console.log('[extractImages] Found image URL in thumbnail tool:', imageUrl);
      if (typeof imageUrl === 'string' && imageUrl.startsWith('http')) {
        const altText = (result.message as string) || 'Thumbnail gerada';
        imageMarkdown.push(`\n\n![${altText}](${imageUrl})\n`);
      }
    }

    // Handle any tool that returns an image URL in standard fields
    for (const key of ['thumbnail_url', 'image_url', 'url', 'imageUrl']) {
      const url = result[key];
      if (typeof url === 'string' && url.startsWith('http') &&
          (url.includes('.png') || url.includes('.jpg') || url.includes('.jpeg') ||
           url.includes('.gif') || url.includes('.webp') || url.includes('fal.media') ||
           url.includes('fal.run') || url.includes('storage.googleapis'))) {
        // Avoid duplicates
        if (!imageMarkdown.some(md => md.includes(url))) {
          console.log('[extractImages] Found image URL in field', key, ':', url);
          const altText = (result.message as string) || (result.original_path as string) || 'Imagem';
          imageMarkdown.push(`\n\n![${altText}](${url})\n`);
        }
      }
    }
  }

  console.log('[extractImages] Final markdown:', imageMarkdown);
  return imageMarkdown.join('');
}

interface ExecuteParams {
  sessionId: string;
  squadId: string;
  agentId: string;
  agentName: string;
  squadType: SquadType;
  message: string;
  attachments?: MessageAttachment[];
  context?: Record<string, unknown>;
  stream?: boolean;
}

export function useExecuteAgent() {
  const queryClient = useQueryClient();
  const { addMessage, setStreaming, updateMessage, setAbortController } = useChatStore();
  const { startExecution, endExecution, addAgentStart, addAgentComplete, addToolUse, addError } = useExecutionLogStore();

  return useMutation<ExecuteResponse, Error, ExecuteParams>({
    mutationFn: async ({ sessionId, squadId, agentId, agentName, squadType, message, attachments, context, stream = true }) => {
      // Add user message immediately with attachments
      addMessage(sessionId, {
        role: 'user',
        content: message,
        attachments,
      });

      if (stream) {
        setStreaming(true);

        // Create AbortController for this stream
        const abortController = new AbortController();
        setAbortController(abortController);

        // Add initial agent message for streaming
        const agentMessageId = addMessage(sessionId, {
          role: 'agent',
          content: '',
          agentId,
          agentName,
          squadId,
          squadType,
          isStreaming: true,
        });

        return new Promise((resolve, reject) => {
          let fullContent = '';
          let executionId = '';
          let finalUsage = { inputTokens: 0, outputTokens: 0 };
          let finalDuration = 0;
          let pendingImages = ''; // Images to append when tools are used

          executeApi.executeAgentStream(
            { squadId, agentId, input: { message, context } },
            {
              onStart: (event) => {
                executionId = event.executionId;
                // Log execution start
                startExecution(event.executionId, message);
                addAgentStart(agentId, agentName, 1, 1);
              },
              onText: (event) => {
                fullContent += event.content;
                updateMessage(sessionId, agentMessageId, fullContent + pendingImages);
              },
              onTools: (event) => {
                // Log tool usage
                if (event.toolResults && event.toolResults.length > 0) {
                  for (const toolResult of event.toolResults) {
                    const trRecord = toolResult as Record<string, unknown>;
                    const toolName = toolResult.tool || (trRecord.name as string) || 'unknown';
                    addToolUse(
                      toolName,
                      toolResult.success,
                      toolResult.output || trRecord.result,
                      toolResult.error
                    );
                  }

                  // Extract images from tool results and append as markdown
                  const imageMarkdown = extractImagesFromToolResults(event.toolResults);
                  if (imageMarkdown) {
                    pendingImages += imageMarkdown;
                    // Update message with images appended
                    updateMessage(sessionId, agentMessageId, fullContent + pendingImages);
                  }
                }
              },
              onDone: (event) => {
                finalUsage = event.usage;
                finalDuration = event.duration;
                setStreaming(false);
                setAbortController(null);

                // Log agent completion
                addAgentComplete(agentId, agentName, 1, 1, event.duration);
                endExecution(true, `Resposta gerada em ${event.duration.toFixed(1)}s`);

                // Final content includes any images from tools
                const finalContent = fullContent + pendingImages;

                // Update message with final metadata
                updateMessage(sessionId, agentMessageId, finalContent, {
                  provider: 'claude',
                  model: 'claude-sonnet-4-6-20250929',
                  usage: finalUsage,
                  duration: finalDuration,
                });

                resolve({
                  executionId,
                  status: 'completed',
                  result: {
                    agentId,
                    agentName,
                    message: finalContent,
                    metadata: {
                      squad: squadId,
                      tier: 1,
                      provider: 'claude',
                      model: 'claude-sonnet-4-6-20250929',
                      usage: finalUsage,
                      duration: finalDuration,
                      processedAt: new Date().toISOString(),
                    },
                  },
                });
              },
              onError: (event) => {
                setStreaming(false);
                setAbortController(null);
                // Log error
                addError(event.error);
                endExecution(false, event.error);
                reject(new Error(event.error));
              },
            },
            abortController.signal
          );

          // Handle abort
          abortController.signal.addEventListener('abort', () => {
            setStreaming(false);
            setAbortController(null);
            // Log cancellation
            endExecution(false, 'Execução cancelada pelo usuário');
            // Update message to indicate it was stopped
            if (fullContent) {
              updateMessage(sessionId, agentMessageId, fullContent + '\n\n*[Resposta interrompida]*');
            }
            resolve({
              executionId,
              status: 'cancelled',
            });
          });
        });
      }

      // Non-streaming execution
      const request = buildExecuteRequest(squadId, agentId, message, { context });
      const response = await executeApi.executeAgent(request);

      // Add agent response
      if (response.result) {
        addMessage(sessionId, {
          role: 'agent',
          content: response.result.message,
          agentId,
          agentName,
          squadId,
          squadType,
          metadata: response.result.metadata,
        });
      }

      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['executionHistory'] });
    },
  });
}

export function useExecutionHistory(limit: number = 20) {
  return useQuery<ExecutionHistory>({
    queryKey: ['executionHistory', limit],
    queryFn: async () => {
      return executeApi.getHistory({ limit });
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - reduce API calls
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  });
}

export function useExecutionStats() {
  return useQuery<ExecutionStats>({
    queryKey: ['executionStats'],
    queryFn: async () => {
      // Always fetch real stats - metrics should reflect actual usage
      try {
        return await executeApi.getStats();
      } catch (error) {
        console.warn('[useExecutionStats] Failed to fetch stats, using fallback:', error);
        return {
          total: 0,
          byStatus: { completed: 0, failed: 0, pending: 0 },
          bySquad: {},
          byAgent: {},
        };
      }
    },
    staleTime: 60 * 1000, // 1 minute
    refetchInterval: 2 * 60 * 1000, // Refetch every 2 minutes
  });
}

export function useTokenUsage() {
  return useQuery<LLMUsage>({
    queryKey: ['tokenUsage'],
    queryFn: async () => {
      // Always fetch real token usage - metrics should reflect actual usage
      try {
        return await executeApi.getTokenUsage();
      } catch (error) {
        console.warn('[useTokenUsage] Failed to fetch token usage, using fallback:', error);
        return {
          claude: { input: 0, output: 0, requests: 0 },
          openai: { input: 0, output: 0, requests: 0 },
          total: { input: 0, output: 0, requests: 0 },
        };
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
    retry: 1,
  });
}

export function useLLMHealth() {
  return useQuery<LLMHealth>({
    queryKey: ['llmHealth'],
    queryFn: async () => {
      // Always fetch real health status - should reflect actual provider availability
      try {
        return await executeApi.getLLMHealth();
      } catch (error) {
        console.warn('[useLLMHealth] Failed to fetch LLM health, using fallback:', error);
        return {
          claude: { available: false, error: 'Could not connect to API' },
          openai: { available: false, error: 'Could not connect to API' },
        };
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 10 * 60 * 1000, // Refetch every 10 minutes
    retry: 1,
  });
}

