/**
 * taskStateToLiveExecution — Converts TaskOrchestrator's TaskState into
 * LiveExecutionState for the sidebar (WorkflowExecutionSidebar / Details).
 *
 * When a plan exists (awaiting_approval or executing), each plan step becomes
 * an individual sidebar step whose `id` matches the canvas node id from
 * taskStateToMission.ts, so clicking a canvas node highlights the right step.
 *
 * Fallback: when no plan exists, uses squad-based grouping (legacy).
 */
import type { TaskState, StreamingOutput } from '../components/orchestration/orchestration-types';
import type { LiveExecutionState, LiveExecutionStep } from '../hooks/useWorkflows';

const STATUS_MAP: Record<TaskState['status'], LiveExecutionState['status']> = {
  idle: 'connecting',
  analyzing: 'running',
  planning: 'running',
  awaiting_approval: 'running',
  executing: 'running',
  completed: 'completed',
  failed: 'failed',
};

export function taskStateToLiveExecution(state: TaskState): LiveExecutionState | null {
  if (state.status === 'idle') return null;

  const steps: LiveExecutionStep[] = [];
  const hasPlan = state.plan && state.plan.steps.length > 0;

  // ── Virtual orchestrator step — always first ──
  const orchIsActive = state.status === 'analyzing' || state.status === 'planning';
  const orchIsWaiting = state.status === 'awaiting_approval';
  const orchIsDone =
    state.status === 'executing' ||
    state.status === 'completed' ||
    (state.status === 'failed' && (state.squadSelections.length > 0 || hasPlan));

  const orchFailed = state.status === 'failed' && !orchIsDone;

  let orchResponse = '';

  if (orchIsWaiting && state.plan) {
    const planLines = state.plan.steps
      .map((s, i) => `${i + 1}. **${s.agentName}** (${s.squadName}): ${s.task}`)
      .join('\n');
    orchResponse = `### Aguardando Aprovacao\n\n**Demanda:** ${state.demand}\n\n**${state.plan.summary}**\n\n**Plano (${state.plan.steps.length} steps):**\n${planLines}`;
  } else if (orchIsDone && state.plan) {
    orchResponse = `### Planejamento Aprovado\n\n**Demanda:** ${state.demand}\n\n**${state.plan.summary}**\n\n**Steps:** ${state.plan.steps.length}`;
  } else if (orchIsDone) {
    const squadsInfo = state.squadSelections
      .map(s => `**${s.squadId}** — Chief: ${s.chief}, ${s.agentCount} agente(s)`)
      .join('\n');
    orchResponse = `### Planejamento Concluido\n\n**Demanda:** ${state.demand}\n\n**Squads selecionados (${state.squadSelections.length}):**\n${squadsInfo}\n\n**Total de agentes:** ${state.squadSelections.reduce((s, sq) => s + sq.agentCount, 0)}`;
  } else if (orchIsActive) {
    orchResponse = `### ${state.status === 'analyzing' ? 'Analisando Demanda' : 'Planejando Execucao'}\n\n**Demanda:** ${state.demand}`;
  }

  steps.push({
    id: 'orchestrator',
    type: 'task',
    status: orchIsActive ? 'running' : orchIsWaiting ? 'running' : orchIsDone ? 'completed' : orchFailed ? 'failed' : 'pending',
    name: 'Orquestrador Master',
    config: {
      squadId: 'orchestrator',
      agentId: 'master',
      role: 'orchestrator',
      message: state.demand,
    },
    startedAt: state.startTime ? new Date(state.startTime).toISOString() : undefined,
    completedAt: orchIsDone ? new Date().toISOString() : undefined,
    output: (orchIsActive || orchIsWaiting || orchIsDone) ? {
      agent: { name: 'Master Orchestrator', squad: 'orchestrator' },
      role: 'orchestrator',
      response: orchResponse,
    } : undefined,
    error: orchFailed ? (state.error || 'Falha no planejamento') : undefined,
  });

  // Collect finished/streaming step IDs
  const _finishedStepIds = new Set(state.agentOutputs.map(o => o.stepId));
  const streamingMap = new Map<string, StreamingOutput>();
  for (const [, s] of state.streamingOutputs) {
    streamingMap.set(s.stepId, s);
  }

  if (hasPlan) {
    // ── Plan-based steps: each plan step becomes a sidebar step ──
    const planSteps = state.plan!.steps;

    for (let i = 0; i < planSteps.length; i++) {
      const step = planSteps[i];
      const output = state.agentOutputs.find(o => o.stepId === step.id);
      const streaming = streamingMap.get(step.id);

      let stepStatus: LiveExecutionStep['status'] = 'pending';
      if (output) {
        stepStatus = 'completed';
      } else if (streaming) {
        stepStatus = 'running';
      } else if (state.status === 'awaiting_approval') {
        stepStatus = 'pending';
      } else if (state.status === 'failed' && !output) {
        stepStatus = 'failed';
      }

      const depsLabel = step.dependsOn.length > 0
        ? ` [deps: ${step.dependsOn.join(', ')}]`
        : '';

      const stepOutput = output ? {
        agent: { name: output.agent.name, squad: output.agent.squad },
        role: output.role,
        response: output.response,
        processingTimeMs: output.processingTimeMs,
        llmMetadata: output.llmMetadata,
      } : streaming ? {
        agent: { name: streaming.agent.name, squad: streaming.agent.squad },
        role: streaming.role,
        response: streaming.accumulated,
      } : state.status === 'awaiting_approval' ? {
        agent: { name: step.agentName, squad: step.squadId },
        role: 'specialist',
        response: `**Tarefa:** ${step.task}${step.estimatedDuration ? `\n**Estimativa:** ${step.estimatedDuration}` : ''}${depsLabel}`,
      } : undefined;

      // Use step.id directly — matches canvas node IDs in taskStateToMission.ts
      steps.push({
        id: step.id,
        type: 'task',
        status: stepStatus,
        name: `${step.agentName}: ${step.task.length > 60 ? step.task.slice(0, 57) + '...' : step.task}`,
        config: {
          squadId: step.squadId,
          agentId: step.agentId,
          role: step.dependsOn.length === 0 ? 'chief' : 'specialist',
          message: step.task,
        },
        startedAt: streaming ? new Date(streaming.startedAt).toISOString() : undefined,
        completedAt: output ? new Date().toISOString() : undefined,
        output: stepOutput,
      });
    }
  } else {
    // ── Fallback: squad-based steps (no plan yet) ──
    for (const squad of state.squadSelections) {
      for (const agent of squad.agents) {
        const output = state.agentOutputs.find(
          o => o.agent.id === agent.id && o.agent.squad === squad.squadId
        );

        let streaming: StreamingOutput | undefined;
        for (const [, s] of state.streamingOutputs) {
          if (s.agent.id === agent.id && s.agent.squad === squad.squadId) {
            streaming = s;
            break;
          }
        }

        const stepId = `ts-squad-${squad.squadId}`;
        let stepStatus: LiveExecutionStep['status'] = 'pending';
        if (output) stepStatus = 'completed';
        else if (streaming) stepStatus = 'running';

        const stepOutput = output ? {
          agent: { name: output.agent.name, squad: output.agent.squad },
          role: output.role,
          response: output.response,
          processingTimeMs: output.processingTimeMs,
          llmMetadata: output.llmMetadata,
        } : streaming ? {
          agent: { name: streaming.agent.name, squad: streaming.agent.squad },
          role: streaming.role,
          response: streaming.accumulated,
        } : undefined;

        steps.push({
          id: stepId,
          type: 'task',
          status: stepStatus,
          name: `${agent.name} executa tarefa`,
          config: {
            squadId: squad.squadId,
            agentId: agent.id,
            role: output?.role || streaming?.role || 'specialist',
            message: state.demand,
          },
          startedAt: streaming ? new Date(streaming.startedAt).toISOString() : undefined,
          completedAt: output ? new Date().toISOString() : undefined,
          output: stepOutput,
        });
      }
    }
  }

  // Build final output
  const allOutputResponses = state.agentOutputs.map(o => {
    const label = `### ${o.agent.name} (${o.agent.squad})`;
    return `${label}\n${o.response}`;
  });

  return {
    executionId: state.taskId,
    workflowId: state.taskId || 'orchestration',
    workflowName: state.demand.length > 60 ? state.demand.slice(0, 57) + '...' : state.demand,
    status: STATUS_MAP[state.status],
    steps,
    input: { demand: state.demand },
    output: state.status === 'completed' && state.agentOutputs.length > 0
      ? {
          response: state.agentOutputs.length === 1
            ? state.agentOutputs[0].response
            : allOutputResponses.join('\n\n---\n\n'),
        }
      : undefined,
    error: state.error ?? undefined,
    startedAt: state.startTime ? new Date(state.startTime).toISOString() : undefined,
    completedAt: state.status === 'completed' ? new Date().toISOString() : undefined,
  };
}
