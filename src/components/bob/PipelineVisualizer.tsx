import { CheckCircle2, Loader2, AlertTriangle } from 'lucide-react';
import { GlassCard, ProgressBar } from '../ui';
import type { Pipeline, PipelinePhase } from '../../stores/bobStore';
import { cn } from '../../lib/utils';

function PhaseStep({ phase, index, total }: { phase: PipelinePhase; index: number; total: number }) {
  const isLast = index === total - 1;

  const statusIcon = (() => {
    switch (phase.status) {
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'in_progress':
        return <Loader2 className="h-5 w-5 text-blue-400 animate-spin" />;
      case 'failed':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      default:
        return (
          <span className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-white/20">
            <span className="h-2 w-2 rounded-full bg-white/20" />
          </span>
        );
    }
  })();

  return (
    <div className="flex items-start gap-3">
      {/* Step circle + connecting line */}
      <div className="flex flex-col items-center">
        <div
          className={cn(
            'flex items-center justify-center h-9 w-9 rounded-full flex-shrink-0',
            phase.status === 'completed' && 'bg-green-500/15',
            phase.status === 'in_progress' && 'bg-blue-500/15 ring-2 ring-blue-500/30',
            phase.status === 'failed' && 'bg-red-500/15',
            phase.status === 'pending' && 'bg-white/5',
          )}
        >
          {statusIcon}
        </div>
        {!isLast && (
          <div
            className={cn(
              'w-0.5 h-6 mt-1',
              phase.status === 'completed' ? 'bg-green-500/40' : 'bg-white/10',
            )}
          />
        )}
      </div>

      {/* Phase info */}
      <div className="pt-1.5 min-w-0">
        <span
          className={cn(
            'text-sm font-medium',
            phase.status === 'in_progress' && 'text-blue-400',
            phase.status === 'completed' && 'text-green-400',
            phase.status === 'failed' && 'text-red-400',
            phase.status === 'pending' && 'text-secondary',
          )}
        >
          {phase.label}
        </span>
        <div className="flex items-center gap-2 mt-0.5">
          {phase.duration && (
            <span className="text-[10px] text-tertiary">{phase.duration}</span>
          )}
          {phase.status === 'in_progress' && phase.progress !== undefined && (
            <span className="text-[10px] text-blue-400 font-medium">{phase.progress}%</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PipelineVisualizer({ pipeline }: { pipeline: Pipeline }) {
  const overallProgress =
    (pipeline.phases.filter((p) => p.status === 'completed').length / pipeline.phases.length) * 100;

  return (
    <GlassCard padding="md">
      <div className="flex flex-col">
        {pipeline.phases.map((phase, i) => (
          <PhaseStep key={phase.id} phase={phase} index={i} total={pipeline.phases.length} />
        ))}
      </div>

      {pipeline.status === 'active' && (
        <div className="mt-4 pt-3 border-t border-white/5">
          <ProgressBar
            value={overallProgress}
            size="sm"
            variant="info"
            showLabel
            label="Overall progress"
          />
        </div>
      )}
    </GlassCard>
  );
}
