import { useState } from 'react';
import {
  Clock,
  Hash,
  User,
  Network,
  Zap,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Circle,
  Loader2,
  Copy,
  Check,
} from 'lucide-react';
import { Dialog, GlassButton, GlassCard, useToast } from '../ui';
import { cn } from '../../lib/utils';
import { useGetJob, useCancelJob } from '../../hooks/useEngine';
import JobLogsViewer from './JobLogsViewer';
import type { EngineJob } from '../../services/api/engine';

interface JobDetailModalProps {
  jobId: string | null;
  onClose: () => void;
}

const statusColors: Record<string, string> = {
  done: 'text-green-400',
  running: 'text-blue-400',
  pending: 'text-yellow-400',
  failed: 'text-red-400',
  rejected: 'text-orange-400',
  cancelled: 'text-gray-400',
  timeout: 'text-red-300',
};

const statusIcons: Record<string, typeof CheckCircle2> = {
  done: CheckCircle2,
  running: Loader2,
  pending: Circle,
  failed: XCircle,
  rejected: AlertTriangle,
  cancelled: XCircle,
  timeout: AlertTriangle,
};

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR');
}

function formatDuration(start?: string, end?: string): string {
  if (!start) return '—';
  const s = new Date(start).getTime();
  const e = end ? new Date(end).getTime() : Date.now();
  const ms = e - s;
  if (ms < 1000) return `${ms}ms`;
  const secs = Math.floor(ms / 1000);
  if (secs < 60) return `${secs}s`;
  return `${Math.floor(secs / 60)}m ${secs % 60}s`;
}

function InfoRow({ icon: Icon, label, value, mono }: {
  icon: typeof Clock;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 py-1.5">
      <Icon className="h-3.5 w-3.5 text-tertiary flex-shrink-0" />
      <span className="text-xs text-tertiary w-24 flex-shrink-0">{label}</span>
      <span className={cn('text-sm text-primary truncate', mono && 'font-mono text-xs')}>
        {value}
      </span>
    </div>
  );
}

export default function JobDetailModal({ jobId, onClose }: JobDetailModalProps) {
  const { data } = useGetJob(jobId);
  const cancelJob = useCancelJob();
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const job: EngineJob | undefined = data?.job;
  const StatusIcon = job ? (statusIcons[job.status] || Circle) : Circle;
  const canCancel = job?.status === 'running' || job?.status === 'pending';

  function handleCopyId() {
    if (!job) return;
    navigator.clipboard.writeText(job.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function handleCancel() {
    if (!job) return;
    cancelJob.mutate(job.id, {
      onSuccess: () => {
        toast.success('Job cancelado', job.id.slice(0, 12));
        setShowCancelConfirm(false);
        onClose();
      },
    });
  }

  const footer = job ? (
    <div className="flex items-center gap-2 w-full justify-between">
      <div className="flex items-center gap-2">
        <StatusIcon
          className={cn(
            'h-4 w-4',
            statusColors[job.status],
            job.status === 'running' && 'animate-spin',
          )}
        />
        <span className={cn('text-sm font-medium', statusColors[job.status])}>
          {job.status}
        </span>
      </div>
      <div className="flex items-center gap-2">
        {canCancel && !showCancelConfirm && (
          <GlassButton
            size="sm"
            variant="danger"
            onClick={() => setShowCancelConfirm(true)}
          >
            Cancelar Job
          </GlassButton>
        )}
        {showCancelConfirm && (
          <>
            <span className="text-xs text-red-400">Confirmar cancelamento?</span>
            <GlassButton
              size="sm"
              variant="danger"
              onClick={handleCancel}
              loading={cancelJob.isPending}
            >
              Sim, cancelar
            </GlassButton>
            <GlassButton
              size="sm"
              variant="ghost"
              onClick={() => setShowCancelConfirm(false)}
            >
              Não
            </GlassButton>
          </>
        )}
      </div>
    </div>
  ) : undefined;

  return (
    <Dialog
      isOpen={!!jobId}
      onClose={onClose}
      title="Job Detail"
      size="lg"
      footer={footer}
    >
      {!job ? (
        <div className="text-secondary text-sm p-4 text-center">Carregando...</div>
      ) : (
        <div className="space-y-4">
          {/* ID + Copy */}
          <div className="flex items-center gap-2">
            <code className="text-xs font-mono text-tertiary flex-1 truncate">
              {job.id}
            </code>
            <GlassButton size="sm" variant="ghost" onClick={handleCopyId} aria-label="Copiar ID">
              {copied ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
            </GlassButton>
          </div>

          {/* Info grid */}
          <GlassCard padding="sm" variant="subtle">
            <InfoRow icon={User} label="Agent" value={job.agent_id} />
            <InfoRow icon={Network} label="Squad" value={job.squad_id} />
            <InfoRow icon={Zap} label="Trigger" value={job.trigger_type} />
            <InfoRow icon={Hash} label="Priority" value={`P${job.priority}`} />
            <InfoRow icon={Hash} label="Attempt" value={`${job.attempt}${job.max_attempts ? ` / ${job.max_attempts}` : ''}`} />
            {job.pid && <InfoRow icon={Hash} label="PID" value={String(job.pid)} mono />}
          </GlassCard>

          {/* Timestamps */}
          <GlassCard padding="sm" variant="subtle">
            <InfoRow icon={Clock} label="Criado" value={formatDateTime(job.created_at)} />
            <InfoRow icon={Clock} label="Iniciado" value={formatDateTime(job.started_at)} />
            <InfoRow icon={Clock} label="Concluído" value={formatDateTime(job.completed_at)} />
            <InfoRow icon={Clock} label="Duração" value={formatDuration(job.started_at, job.completed_at)} />
          </GlassCard>

          {/* Error */}
          {job.error_message && (
            <GlassCard padding="sm" variant="subtle" className="border border-red-500/20">
              <div className="text-xs text-tertiary mb-1">Erro</div>
              <div className="text-sm text-red-400 font-mono whitespace-pre-wrap break-all">
                {job.error_message}
              </div>
            </GlassCard>
          )}

          {/* Logs */}
          <JobLogsViewer jobId={job.id} jobStatus={job.status} />

          {/* Output preview */}
          {job.output_result && (
            <GlassCard padding="sm" variant="subtle">
              <div className="text-xs text-tertiary mb-1">Output</div>
              <pre className="text-xs text-secondary font-mono whitespace-pre-wrap break-all max-h-40 overflow-auto">
                {job.output_result.slice(0, 2000)}
                {job.output_result.length > 2000 && '\n... (truncated)'}
              </pre>
            </GlassCard>
          )}
        </div>
      )}
    </Dialog>
  );
}
