import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import {
  Loader2,
  Sparkles,
  Users,
  Bot,
  CheckCircle2,
  AlertCircle,
  Workflow,
  Zap,
  Clock,
  MessageSquare,
  Terminal,
  Brain,
  Target,
  Activity,
  Layers,
} from 'lucide-react';
import { GlassButton } from '../ui/GlassButton';

/**
 * TaskOrchestrator is a large page-level component that manages SSE
 * connections and internal state. These stories render presentational
 * shells covering key states: idle, analyzing, executing, completed, failed.
 */

// Minimal phase progress bar
function PhaseProgress({ currentStatus }: { currentStatus: string }) {
  const phases = [
    { id: 'analyzing', label: 'Analisando', icon: Brain, color: 'cyan' },
    { id: 'planning', label: 'Planejando', icon: Target, color: 'purple' },
    { id: 'executing', label: 'Executando', icon: Activity, color: 'orange' },
    { id: 'completed', label: 'Concluido', icon: CheckCircle2, color: 'green' },
  ];

  const currentPhaseIndex = phases.findIndex((p) => p.id === currentStatus);

  return (
    <div className="flex items-center gap-3">
      {phases.map((phase, index) => {
        const isActive = phase.id === currentStatus;
        const isCompleted = currentPhaseIndex > index || currentStatus === 'completed';
        const Icon = phase.icon;
        return (
          <div key={phase.id} className="flex items-center">
            <div
              className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all ${
                isActive
                  ? 'bg-white/10 border-white/20 shadow-lg'
                  : isCompleted
                  ? 'bg-green-500/10 border-green-500/30'
                  : 'bg-white/5 border-white/10'
              }`}
            >
              {isActive ? (
                <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
              ) : isCompleted ? (
                <CheckCircle2 className="w-4 h-4 text-green-400" />
              ) : (
                <Icon className="w-4 h-4 text-white/40" />
              )}
              <span className={`text-sm font-medium ${isActive ? 'text-cyan-400' : isCompleted ? 'text-green-400' : 'text-white/40'}`}>
                {phase.label}
              </span>
            </div>
            {index < phases.length - 1 && (
              <div className={`w-8 h-0.5 ${currentPhaseIndex > index ? 'bg-green-500' : 'bg-white/10'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function TaskOrchestratorShell({
  status,
  demand,
  agentCount,
  tokenCount,
  elapsed,
}: {
  status: 'idle' | 'analyzing' | 'planning' | 'executing' | 'completed' | 'failed';
  demand?: string;
  agentCount?: number;
  tokenCount?: number;
  elapsed?: string;
}) {
  const isRunning = ['analyzing', 'planning', 'executing'].includes(status);

  return (
    <div className="h-full flex flex-col relative overflow-hidden" style={{ background: 'var(--color-background-primary, #0d1015)' }}>
      {/* Header */}
      <div className="relative z-10 p-6 border-b border-white/10">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center border border-cyan-500/30">
              <Workflow className="w-7 h-7 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Orquestrador de Tarefas</h1>
              <p className="text-sm text-white/50">Visualizacao em tempo real do fluxo de execucao</p>
            </div>
          </div>

          {(isRunning || status === 'completed') && (
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10">
                <Clock className="w-4 h-4 text-cyan-400" />
                <span className="text-sm font-mono text-white/80">{elapsed || '00:00'}</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10">
                <MessageSquare className="w-4 h-4 text-purple-400" />
                <span className="text-sm font-mono text-white/80">{tokenCount?.toLocaleString() || 0} tokens</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10">
                <Bot className="w-4 h-4 text-green-400" />
                <span className="text-sm font-mono text-white/80">{agentCount || 0} agentes</span>
              </div>
            </div>
          )}
        </div>
        {status !== 'idle' && <PhaseProgress currentStatus={status} />}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel */}
        <div className="w-80 border-r border-white/10 p-6 flex flex-col gap-6 overflow-auto">
          <div>
            <label className="text-sm font-medium text-white/70 mb-2 block">Sua Demanda</label>
            <div className="relative">
              <textarea
                value={demand || ''}
                readOnly
                placeholder="Descreva o que voce precisa..."
                className="w-full h-32 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 resize-none"
              />
              <div className="absolute bottom-3 right-3">
                <GlassButton disabled={isRunning} onClick={fn()} aria-label={isRunning ? 'Executando' : undefined}>
                  {isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Zap className="w-4 h-4 mr-2" />Executar</>}
                </GlassButton>
              </div>
            </div>
          </div>

          {status === 'executing' && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-4 h-4 text-cyan-400" />
                <h2 className="text-sm font-medium text-white/70">Squads Ativados</h2>
              </div>
              <div className="space-y-3">
                {['copywriting', 'design'].map((squad) => (
                  <div key={squad} className="p-4 rounded-2xl border bg-white/5 border-white/10">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/5">
                        <Layers className="w-5 h-5 text-cyan-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-white" aria-label={`Squad ${squad}`}>{squad}</h3>
                        <p className="text-xs text-white/50">3 agentes</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Center Panel */}
        <div className="flex-1 p-6 overflow-auto">
          {status === 'idle' && (
            <div className="h-full flex items-center justify-center">
              <div className="text-center max-w-md">
                <div className="w-32 h-32 mx-auto mb-8 rounded-3xl bg-gradient-to-br from-cyan-500/10 to-blue-500/10 flex items-center justify-center border border-cyan-500/20">
                  <Sparkles className="w-16 h-16 text-cyan-400/50" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-3">Pronto para Orquestrar</h2>
                <p className="text-white/50 leading-relaxed">
                  Digite sua demanda e observe o orquestrador master selecionar squads e coordenar a execucao dos agentes em tempo real.
                </p>
              </div>
            </div>
          )}

          {status === 'completed' && (
            <div className="p-6 rounded-2xl bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/30 text-center">
              <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-3" />
              <h2 className="text-xl font-bold text-white mb-2">Tarefa Concluida!</h2>
              <p className="text-white/60">{agentCount || 3} agentes executados com sucesso</p>
            </div>
          )}

          {status === 'failed' && (
            <div className="p-6 rounded-2xl bg-gradient-to-r from-red-500/10 to-rose-500/10 border border-red-500/30 text-center">
              <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
              <h2 className="text-xl font-bold text-white mb-2">Erro na Execucao</h2>
              <p className="text-white/60">LLM provider timeout after 30s</p>
            </div>
          )}

          {isRunning && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Loader2 className="w-12 h-12 animate-spin text-cyan-400 mx-auto mb-4" />
                <p className="text-white/60">Processando demanda...</p>
              </div>
            </div>
          )}
        </div>

        {/* Right Panel - Events */}
        {status !== 'idle' && (
          <div className="w-80 border-l border-white/10 p-6 overflow-hidden">
            <div className="flex items-center gap-2 mb-4">
              <Terminal className="w-5 h-5 text-cyan-400" />
              <h2 className="font-semibold text-white">Eventos em Tempo Real</h2>
            </div>
            <div className="space-y-2">
              {['task:analyzing', 'task:squads-selected', 'task:planning'].map((evt, i) => (
                <div key={i} className="p-3 rounded-xl bg-white/5 border border-white/10">
                  <span className="text-xs font-mono text-cyan-400">{evt}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const meta: Meta<typeof TaskOrchestratorShell> = {
  title: 'Orchestration/TaskOrchestrator',
  component: TaskOrchestratorShell,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Real-time task orchestration interface with demand input, phase progress indicator, squad activation, agent output streaming, and event panel. Connects to SSE for live updates.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    status: {
      control: 'select',
      options: ['idle', 'analyzing', 'planning', 'executing', 'completed', 'failed'],
      description: 'Current orchestration status',
    },
    demand: { control: 'text', description: 'User demand text' },
    agentCount: { control: 'number', description: 'Number of agents involved' },
    tokenCount: { control: 'number', description: 'Total tokens consumed' },
    elapsed: { control: 'text', description: 'Elapsed time string' },
  },
  decorators: [
    (Story) => (
      <div style={{ height: '100vh', overflow: 'auto' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Idle: Story = {
  args: { status: 'idle' },
};

export const Analyzing: Story = {
  args: { status: 'analyzing', demand: 'Create a marketing campaign for our new product launch', elapsed: '00:12', tokenCount: 450, agentCount: 0 },
};

export const Executing: Story = {
  args: { status: 'executing', demand: 'Create a marketing campaign for our new product launch', elapsed: '01:35', tokenCount: 8500, agentCount: 4 },
};

export const Completed: Story = {
  args: { status: 'completed', demand: 'Create a marketing campaign for our new product launch', elapsed: '03:22', tokenCount: 24000, agentCount: 6 },
};

export const Failed: Story = {
  args: { status: 'failed', demand: 'Create a marketing campaign for our new product launch', elapsed: '00:30', tokenCount: 1200, agentCount: 1 },
};
