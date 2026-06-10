/**
 * Voice Task Router
 *
 * Routes Gemini function calls to the AIOS Engine API (Claude Code).
 * Gemini handles dialogue only; Claude Code handles ALL task execution.
 *
 * AIOS Authority Compliance:
 * - orchestrate_task is the PRIMARY path — the Engine orchestrator decides agent/squad
 * - execute_agent requires authority check before execution
 * - Workflows follow their defined phase → agent mapping
 * - Gemini NEVER bypasses the authority enforcer
 */

import { engineApi } from './api/engine';

// Tool names that Gemini can call
export type VoiceToolName =
  | 'execute_task'
  | 'start_workflow'
  | 'check_job_status'
  | 'list_jobs'
  | 'cancel_job'
  | 'check_engine_health'
  | 'create_cron'
  | 'check_authority';

interface ToolCallResult {
  success: boolean;
  summary: string;
  data?: unknown;
}

/**
 * Gemini function declarations for the Live API setup.
 *
 * Design principle: Gemini is the VOICE INTERFACE, not the orchestrator.
 * All task routing decisions are made by the AIOS Engine, not by Gemini.
 */
export const AIOS_TOOL_DECLARATIONS = [
  {
    name: 'execute_task',
    description: [
      'Enviar uma tarefa para o orquestrador AIOS.',
      'O orquestrador decide automaticamente qual agente e squad devem executar,',
      'respeitando a matrix de autoridade do AIOS.',
      'Use para QUALQUER tarefa: codigo, design, testes, deploy, revisao, etc.',
      'NUNCA tente escolher o agente — o orquestrador faz isso.',
    ].join(' '),
    parameters: {
      type: 'OBJECT',
      properties: {
        message: {
          type: 'STRING',
          description: 'Descricao detalhada da tarefa. Seja especifico sobre o que precisa ser feito.',
        },
        priority: {
          type: 'INTEGER',
          description: 'Prioridade 0-3 (0=urgente, 1=alta, 2=normal, 3=baixa). Default: 2',
        },
      },
      required: ['message'],
    },
  },
  {
    name: 'start_workflow',
    description: [
      'Iniciar um workflow multi-fase do AIOS.',
      'Workflows disponiveis:',
      '- story-development-cycle: Ciclo completo de desenvolvimento (create -> validate -> implement -> QA)',
      '- spec-pipeline: Pipeline de especificacao (gather -> assess -> research -> write -> critique -> plan)',
      '- qa-loop: Loop iterativo de QA (review -> fix -> re-review, max 5 iteracoes)',
      'Cada fase tem seu agente designado conforme as regras do AIOS.',
    ].join(' '),
    parameters: {
      type: 'OBJECT',
      properties: {
        workflow_id: {
          type: 'STRING',
          description: 'ID do workflow: story-development-cycle, spec-pipeline, qa-loop',
        },
        message: {
          type: 'STRING',
          description: 'Descricao do que o workflow deve processar',
        },
      },
      required: ['workflow_id', 'message'],
    },
  },
  {
    name: 'check_job_status',
    description: 'Verificar o status de um job em execucao. Use quando o usuario perguntar sobre o andamento de uma tarefa.',
    parameters: {
      type: 'OBJECT',
      properties: {
        job_id: {
          type: 'STRING',
          description: 'ID do job para verificar',
        },
      },
      required: ['job_id'],
    },
  },
  {
    name: 'list_jobs',
    description: 'Listar jobs recentes do engine. Use quando o usuario perguntar o que esta rodando, quais tarefas estao em andamento, ou quais jobs falharam.',
    parameters: {
      type: 'OBJECT',
      properties: {
        status: {
          type: 'STRING',
          description: 'Filtrar por status: running, pending, done, failed. Vazio para todos.',
        },
        limit: {
          type: 'INTEGER',
          description: 'Numero maximo de resultados. Default: 10',
        },
      },
    },
  },
  {
    name: 'cancel_job',
    description: 'Cancelar um job em execucao ou pendente. Use quando o usuario pedir para parar ou cancelar uma tarefa.',
    parameters: {
      type: 'OBJECT',
      properties: {
        job_id: {
          type: 'STRING',
          description: 'ID do job para cancelar',
        },
      },
      required: ['job_id'],
    },
  },
  {
    name: 'check_engine_health',
    description: 'Verificar se o engine esta online e saudavel. Use quando o usuario perguntar sobre o status do sistema, se esta tudo funcionando, ou quantos agentes estao ativos.',
    parameters: {
      type: 'OBJECT',
      properties: {},
    },
  },
  {
    name: 'create_cron',
    description: [
      'Criar um cron job para execucao recorrente.',
      'O cron sera executado pelo orquestrador que decide o agente adequado.',
      'Schedules comuns: "0 9 * * *" (diario 9h), "0 9 * * 1-5" (seg-sex 9h),',
      '"*/15 * * * *" (cada 15min), "0 */6 * * *" (cada 6h).',
    ].join(' '),
    parameters: {
      type: 'OBJECT',
      properties: {
        name: {
          type: 'STRING',
          description: 'Nome descritivo do cron (ex: daily-review, hourly-sync)',
        },
        schedule: {
          type: 'STRING',
          description: 'Expressao cron (ex: "0 9 * * *")',
        },
        message: {
          type: 'STRING',
          description: 'Tarefa que deve ser executada a cada ciclo',
        },
      },
      required: ['name', 'schedule', 'message'],
    },
  },
  {
    name: 'check_authority',
    description: 'Verificar se um agente tem permissao para executar uma operacao. Use quando o usuario perguntar se um agente pode fazer algo.',
    parameters: {
      type: 'OBJECT',
      properties: {
        agent_id: {
          type: 'STRING',
          description: 'ID do agente (dev, qa, architect, pm, devops, sm, po)',
        },
        operation: {
          type: 'STRING',
          description: 'Operacao a verificar (ex: git-push, create-pr, execute-code, create-story)',
        },
        squad_id: {
          type: 'STRING',
          description: 'ID do squad (development, design, orchestrator)',
        },
      },
      required: ['agent_id', 'operation', 'squad_id'],
    },
  },
];

/**
 * Execute a tool call from Gemini by routing to the Engine API.
 * All execution goes through the AIOS orchestrator — Gemini never picks agents directly.
 */
export async function executeToolCall(
  toolName: string,
  args: Record<string, unknown>,
): Promise<ToolCallResult> {
  try {
    switch (toolName) {
      // PRIMARY PATH: All tasks go through the orchestrator
      case 'execute_task': {
        const result = await engineApi.triggerOrchestrator({
          message: args.message as string,
          priority: (args.priority as number) ?? 2,
        });
        return {
          success: true,
          summary: `Tarefa enviada ao orquestrador. Job ID: ${result.job_id}. Roteada para agente @${result.routed_to.agent} no squad ${result.routed_to.squad}.`,
          data: result,
        };
      }

      case 'start_workflow': {
        const result = await engineApi.startWorkflow({
          workflowId: args.workflow_id as string,
          input: { message: args.message as string },
        });
        return {
          success: true,
          summary: `Workflow ${args.workflow_id} iniciado. ID: ${result.workflowId}. Status: ${result.status}. Os agentes serao acionados conforme cada fase do workflow.`,
          data: result,
        };
      }

      case 'check_job_status': {
        const result = await engineApi.getJob(args.job_id as string);
        const job = result.job;
        const duration = job.started_at
          ? `${Math.round((Date.now() - new Date(job.started_at).getTime()) / 1000)}s`
          : 'nao iniciado';
        return {
          success: true,
          summary: `Job ${job.id.slice(0, 12)}: status ${job.status}, agente @${job.agent_id}, squad ${job.squad_id}, duracao ${duration}.${job.error_message ? ` Erro: ${job.error_message}` : ''}`,
          data: job,
        };
      }

      case 'list_jobs': {
        const result = await engineApi.listJobs({
          status: args.status as string | undefined,
          limit: (args.limit as number) || 10,
        });
        const jobs = result.jobs;
        if (!jobs.length) {
          return {
            success: true,
            summary: args.status
              ? `Nenhum job com status ${args.status} encontrado.`
              : 'Nenhum job encontrado no engine.',
          };
        }
        const summaries = jobs.slice(0, 5).map(
          (j) => `@${j.agent_id}/${j.squad_id}: ${j.status} (${j.id.slice(0, 8)})`,
        );
        return {
          success: true,
          summary: `${jobs.length} jobs encontrados. ${summaries.join('. ')}.`,
          data: jobs,
        };
      }

      case 'cancel_job': {
        await engineApi.cancelJob(args.job_id as string);
        return {
          success: true,
          summary: `Job ${(args.job_id as string).slice(0, 12)} cancelado com sucesso.`,
        };
      }

      case 'check_engine_health': {
        const health = await engineApi.health();
        const pool = await engineApi.pool();
        return {
          success: true,
          summary: `Engine online. Versao ${health.version}, uptime ${Math.round(health.uptime_ms / 60000)} minutos, ${health.ws_clients} clientes WebSocket conectados. Pool: ${pool.occupied} de ${pool.total} slots ocupados, ${pool.queue_depth} jobs na fila.`,
          data: { health, pool },
        };
      }

      case 'create_cron': {
        // Crons go through the orchestrator webhook, so squad/agent are resolved at runtime
        const result = await engineApi.createCron({
          name: args.name as string,
          schedule: args.schedule as string,
          squad_id: 'orchestrator',
          agent_id: 'orchestrator',
          message: args.message as string,
        });
        return {
          success: true,
          summary: `Cron "${args.name}" criado com sucesso. Schedule: ${args.schedule}. O orquestrador definira o agente a cada execucao. ID: ${result.cron.id}.`,
          data: result,
        };
      }

      case 'check_authority': {
        const result = await engineApi.checkAuthority(
          args.agent_id as string,
          args.operation as string,
          args.squad_id as string,
        );
        if (result.allowed) {
          return {
            success: true,
            summary: `Agente @${args.agent_id} TEM permissao para ${args.operation} no squad ${args.squad_id}.${result.reason ? ` Motivo: ${result.reason}` : ''}`,
            data: result,
          };
        }
        return {
          success: true,
          summary: `Agente @${args.agent_id} NAO tem permissao para ${args.operation} no squad ${args.squad_id}.${result.reason ? ` Motivo: ${result.reason}` : ''}${result.suggestAgent ? ` Sugestao: delegue para @${result.suggestAgent}.` : ''}`,
          data: result,
        };
      }

      default:
        return {
          success: false,
          summary: `Ferramenta desconhecida: ${toolName}. Nao foi possivel executar.`,
        };
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erro desconhecido';
    return {
      success: false,
      summary: `Erro ao executar ${toolName}: ${msg}`,
    };
  }
}
