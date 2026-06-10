import { useState, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Server,
  Cpu,
  ListTodo,
  Clock,
  Shield,
  Users,
  RefreshCw,
  Play,
  Pause,
  Plus,
  Trash2,
  Circle,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
  Radio,
  Database,
  Minus,
  ChevronRight,
} from 'lucide-react';
import { GlassCard, GlassButton, StatusDot, Badge, Skeleton, useToast } from '../ui';
import { cn } from '../../lib/utils';
import {
  useEngineHealth,
  useEnginePool,
  useEngineJobs,
  useWorkflowDefs,
  useCronJobs,
  useTeamBundles,
  useToggleCron,
  useActivateBundle,
  useCancelJob,
  useDeleteCron,
  useAuditLog,
  useResizePool,
  useActiveWorkflows,
} from '../../hooks/useEngine';
import { useMonitorStore } from '../../stores/monitorStore';
import type { WorkflowDef } from '../../services/api/engine';

const JobDetailModal = lazy(() => import('./JobDetailModal'));
const ExecuteAgentForm = lazy(() => import('./ExecuteAgentForm'));
const WorkflowTriggerModal = lazy(() => import('./WorkflowTriggerModal'));
const CronJobEditor = lazy(() => import('./CronJobEditor'));
const EngineEventFeed = lazy(() => import('./EngineEventFeed'));
const MemoryBrowser = lazy(() => import('./MemoryBrowser'));

type TabId = 'pool' | 'jobs' | 'workflows' | 'crons' | 'bundles' | 'audit' | 'events' | 'memory';

const tabs: Array<{ id: TabId; label: string; icon: typeof Server }> = [
  { id: 'pool', label: 'Pool', icon: Cpu },
  { id: 'jobs', label: 'Jobs', icon: ListTodo },
  { id: 'events', label: 'Events', icon: Radio },
  { id: 'workflows', label: 'Workflows', icon: RefreshCw },
  { id: 'crons', label: 'Crons', icon: Clock },
  { id: 'bundles', label: 'Bundles', icon: Users },
  { id: 'audit', label: 'Audit', icon: Shield },
  { id: 'memory', label: 'Memory', icon: Database },
];

function formatUptime(ms: number): string {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
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

// -- Skeleton --

function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02]">
          <Skeleton variant="circular" width={16} height={16} />
          <div className="flex-1 space-y-1.5">
            <Skeleton width="40%" height={14} />
            <Skeleton width="70%" height={10} />
          </div>
          <Skeleton width={48} height={14} />
        </div>
      ))}
    </div>
  );
}

function GridSkeleton({ cols = 5 }: { cols?: number }) {
  return (
    <div className={`grid grid-cols-${cols} gap-3`}>
      {Array.from({ length: cols }, (_, i) => (
        <div key={i} className="p-3 rounded-xl bg-white/[0.02] text-center space-y-2">
          <Skeleton width="60%" height={10} className="mx-auto" />
          <Skeleton variant="circular" width={12} height={12} className="mx-auto" />
        </div>
      ))}
    </div>
  );
}

// -- Sub-components --

function PoolTab() {
  const { data: pool, isLoading } = useEnginePool();
  const resizePool = useResizePool();
  const toast = useToast();

  if (isLoading || !pool) {
    return <GridSkeleton cols={5} />;
  }

  function handleResize(delta: number) {
    const newSize = pool!.total + delta;
    if (newSize < 1 || newSize > 20) return;
    resizePool.mutate(newSize, {
      onSuccess: () => toast.success('Pool redimensionado', `${newSize} slots`),
    });
  }

  return (
    <div className="space-y-4">
      {/* Slot grid */}
      <div className="grid grid-cols-5 gap-3">
        {pool.slots.map((slot) => (
          <GlassCard
            key={slot.id}
            padding="sm"
            variant={slot.status === 'running' ? 'default' : 'subtle'}
            className={cn(
              'text-center transition-all',
              slot.status === 'running' && 'ring-1 ring-blue-500/30'
            )}
          >
            <div className="text-xs text-tertiary mb-1">Slot {slot.id}</div>
            <StatusDot
              status={slot.status === 'running' ? 'working' : 'idle'}
              size="md"
              pulse={slot.status === 'running'}
              label={slot.status === 'running' ? slot.agentId || '' : 'idle'}
            />
            {slot.status === 'running' && (
              <div className="mt-2 space-y-0.5">
                <div className="text-xs font-medium text-primary truncate">
                  {slot.agentId}
                </div>
                <div className="text-[10px] text-tertiary truncate">
                  {slot.squadId}
                </div>
                <div className="text-[10px] text-tertiary">
                  PID {slot.pid}
                </div>
              </div>
            )}
          </GlassCard>
        ))}
      </div>

      {/* Summary bar + Resize */}
      <GlassCard padding="sm" variant="subtle">
        <div className="flex items-center justify-between text-sm">
          <span className="text-secondary">
            <span className="text-primary font-semibold">{pool.occupied}</span> / {pool.total} slots ocupados
          </span>
          <div className="flex items-center gap-3">
            <span className="text-secondary">
              Queue: <span className="text-primary font-semibold">{pool.queue_depth}</span>
            </span>
            <div className="flex items-center gap-1 border-l border-white/10 pl-3">
              <GlassButton
                size="sm"
                variant="ghost"
                onClick={() => handleResize(-1)}
                disabled={pool.total <= 1 || resizePool.isPending}
                aria-label="Reduzir pool"
              >
                <Minus className="h-3 w-3" />
              </GlassButton>
              <span className="text-xs text-primary font-mono w-6 text-center">
                {pool.total}
              </span>
              <GlassButton
                size="sm"
                variant="ghost"
                onClick={() => handleResize(1)}
                disabled={pool.total >= 20 || resizePool.isPending}
                aria-label="Aumentar pool"
              >
                <Plus className="h-3 w-3" />
              </GlassButton>
            </div>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}

function JobsTab({ onSelectJob }: { onSelectJob: (id: string) => void }) {
  const [filter, setFilter] = useState<string>('');
  const { data, isLoading } = useEngineJobs({ status: filter || undefined, limit: 30 });
  const cancelJob = useCancelJob();

  const filters = ['', 'running', 'pending', 'done', 'failed', 'rejected'];

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="flex gap-1.5 flex-wrap">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'px-2.5 py-1 text-xs rounded-md transition-all',
              filter === f
                ? 'bg-primary/20 text-primary font-medium'
                : 'text-tertiary hover:text-secondary hover:bg-white/5'
            )}
          >
            {f || 'All'}
          </button>
        ))}
      </div>

      {/* Job list */}
      {isLoading ? (
        <ListSkeleton rows={5} />
      ) : !data?.jobs.length ? (
        <div className="text-tertiary text-sm p-4 text-center">Nenhum job encontrado</div>
      ) : (
        <div className="space-y-1.5 max-h-[60vh] overflow-auto">
          {data.jobs.map((job) => {
            const StatusIcon = statusIcons[job.status] || Circle;
            const canCancel = job.status === 'running' || job.status === 'pending';
            return (
              <GlassCard
                key={job.id}
                padding="sm"
                variant="subtle"
                className="group cursor-pointer hover:ring-1 hover:ring-white/10 transition-all"
                onClick={() => onSelectJob(job.id)}
              >
                <div className="flex items-center gap-3">
                  <StatusIcon
                    className={cn(
                      'h-4 w-4 flex-shrink-0',
                      statusColors[job.status] || 'text-gray-400',
                      job.status === 'running' && 'animate-spin'
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-primary">
                        {job.agent_id}
                      </span>
                      <span className="text-xs text-tertiary">{job.squad_id}</span>
                      <Badge variant="default" className="text-[10px]">
                        P{job.priority}
                      </Badge>
                    </div>
                    <div className="text-[10px] text-tertiary truncate">
                      {job.id.slice(0, 16)}... | {job.trigger_type} | {formatDate(job.created_at)}
                      {job.error_message && (
                        <span className="text-red-400 ml-2">{job.error_message.slice(0, 60)}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn('text-xs font-medium', statusColors[job.status])}>
                      {job.status}
                    </span>
                    {canCancel && (
                      <GlassButton
                        size="sm"
                        variant="danger"
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          cancelJob.mutate(job.id);
                        }}
                        loading={cancelJob.isPending}
                        aria-label="Cancelar job"
                      >
                        <XCircle className="h-3 w-3" />
                      </GlassButton>
                    )}
                  </div>
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}
    </div>
  );
}

const workflowPhaseColors: Record<string, string> = {
  completed: 'bg-green-400',
  running: 'bg-blue-400 animate-pulse',
  pending: 'bg-white/20',
  failed: 'bg-red-400',
};

function WorkflowsTab({ onSelectWorkflow }: { onSelectWorkflow: (wf: WorkflowDef) => void }) {
  const { data, isLoading } = useWorkflowDefs();
  const { data: activeData } = useActiveWorkflows();

  const activeWorkflows = activeData?.workflows || [];

  if (isLoading || !data) {
    return <ListSkeleton rows={4} />;
  }

  return (
    <div className="space-y-6">
      {/* Active workflow instances */}
      {activeWorkflows.length > 0 && (
        <div className="space-y-3">
          <div className="text-xs text-tertiary uppercase tracking-wider font-medium">
            Em Execução ({activeWorkflows.length})
          </div>
          {activeWorkflows.map((wf) => (
            <GlassCard key={wf.id} padding="md" variant="default" className="ring-1 ring-blue-500/20">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-sm font-medium text-primary">{wf.definitionId}</div>
                  <div className="text-[10px] text-tertiary font-mono">{wf.id}</div>
                </div>
                <Badge variant="default" className="text-xs">
                  {wf.status}
                </Badge>
              </div>
              {/* Phase tracker */}
              <div className="flex items-center gap-1">
                {Array.from({ length: 4 }, (_, i) => {
                  const phaseNum = i + 1;
                  const phaseName = `phase-${phaseNum}`;
                  const currentPhaseNum = parseInt(wf.currentPhase.replace(/\D/g, '')) || 1;
                  let phaseStatus: string;
                  if (phaseNum < currentPhaseNum) phaseStatus = 'completed';
                  else if (phaseNum === currentPhaseNum) phaseStatus = wf.status === 'failed' ? 'failed' : 'running';
                  else phaseStatus = 'pending';

                  return (
                    <div key={phaseName} className="flex items-center flex-1">
                      <div className="flex flex-col items-center flex-1">
                        <div
                          className={cn(
                            'h-2 w-full rounded-full transition-all',
                            workflowPhaseColors[phaseStatus],
                          )}
                        />
                        <span className="text-[9px] text-tertiary mt-1">
                          Phase {phaseNum}
                        </span>
                      </div>
                      {i < 3 && (
                        <ChevronRight className="h-3 w-3 text-tertiary/30 mx-0.5 flex-shrink-0" />
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="text-[10px] text-tertiary mt-2">
                Fase atual: <span className="text-primary">{wf.currentPhase}</span>
                {' | '}Iniciado: {formatDate(wf.createdAt)}
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {/* Available workflow definitions */}
      <div className="space-y-3">
        {activeWorkflows.length > 0 && (
          <div className="text-xs text-tertiary uppercase tracking-wider font-medium">
            Definições Disponíveis
          </div>
        )}
        {!data.workflows.length ? (
          <div className="text-tertiary text-sm p-8 text-center">Nenhum workflow definido</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {data.workflows.map((wf) => (
              <GlassCard key={wf.id} padding="md" variant="subtle" className="group">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-primary">{wf.name}</div>
                    <div className="text-xs text-tertiary mt-0.5">{wf.id}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="default">{wf.phases} phases</Badge>
                    <GlassButton
                      size="sm"
                      variant="primary"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      leftIcon={<Play className="h-3 w-3" />}
                      onClick={() => onSelectWorkflow(wf)}
                    >
                      Start
                    </GlassButton>
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CronsTab({ onCreateCron }: { onCreateCron: () => void }) {
  const { data, isLoading } = useCronJobs();
  const toggleCron = useToggleCron();
  const deleteCron = useDeleteCron();
  const toast = useToast();
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  if (isLoading || !data) {
    return <ListSkeleton rows={3} />;
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <GlassButton
          size="sm"
          variant="primary"
          leftIcon={<Plus className="h-3.5 w-3.5" />}
          onClick={onCreateCron}
        >
          Novo Cron
        </GlassButton>
      </div>

      {!data.crons.length ? (
        <div className="text-tertiary text-sm p-8 text-center">
          Nenhum cron job configurado
        </div>
      ) : (
        <div className="space-y-2">
          {data.crons.map((cron) => (
            <GlassCard key={cron.id} padding="sm" variant="subtle" className="group">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-primary">{cron.description || cron.name || cron.id}</div>
                  <div className="text-xs text-tertiary">
                    <code className="bg-white/5 px-1 rounded">{cron.schedule}</code>
                    {' '}{cron.squad_id}/{cron.agent_id}
                    {cron.last_run_at && ` | Last: ${formatDate(cron.last_run_at)}`}
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <GlassButton
                    size="sm"
                    variant={cron.enabled ? 'default' : 'ghost'}
                    leftIcon={cron.enabled ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                    onClick={() => toggleCron.mutate(
                      { id: cron.id, enabled: !cron.enabled },
                      { onSuccess: () => toast.success(cron.enabled ? 'Cron pausado' : 'Cron ativado', cron.name) },
                    )}
                    loading={toggleCron.isPending}
                  >
                    {cron.enabled ? 'On' : 'Off'}
                  </GlassButton>
                  {deleteConfirm === cron.id ? (
                    <div className="flex items-center gap-1">
                      <GlassButton
                        size="sm"
                        variant="danger"
                        onClick={() => {
                          deleteCron.mutate(cron.id, {
                            onSuccess: () => {
                              toast.success('Cron deletado', cron.name);
                              setDeleteConfirm(null);
                            },
                          });
                        }}
                        loading={deleteCron.isPending}
                      >
                        Sim
                      </GlassButton>
                      <GlassButton size="sm" variant="ghost" onClick={() => setDeleteConfirm(null)}>
                        Não
                      </GlassButton>
                    </div>
                  ) : (
                    <GlassButton
                      size="sm"
                      variant="ghost"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => setDeleteConfirm(cron.id)}
                      aria-label="Deletar cron"
                    >
                      <Trash2 className="h-3 w-3 text-red-400" />
                    </GlassButton>
                  )}
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
}

function BundlesTab() {
  const { data, isLoading } = useTeamBundles();
  const activateBundle = useActivateBundle();

  if (isLoading || !data) {
    return <ListSkeleton rows={3} />;
  }

  return (
    <div className="space-y-2">
      {data.bundles.map((bundle) => {
        const isActive = data.active === bundle.id;
        return (
          <GlassCard
            key={bundle.id}
            padding="md"
            variant={isActive ? 'default' : 'subtle'}
            className={cn(isActive && 'ring-1 ring-lime-500/30')}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-primary">
                  {bundle.name}
                  {isActive && (
                    <span className="ml-2 text-xs text-lime-400 font-normal">active</span>
                  )}
                </div>
                <div className="text-xs text-tertiary mt-0.5">{bundle.id}</div>
              </div>
              <GlassButton
                size="sm"
                variant={isActive ? 'danger' : 'primary'}
                onClick={() => activateBundle.mutate(isActive ? null : bundle.id)}
                loading={activateBundle.isPending}
              >
                {isActive ? 'Deactivate' : 'Activate'}
              </GlassButton>
            </div>
          </GlassCard>
        );
      })}
    </div>
  );
}

function AuditTab() {
  const { data, isLoading } = useAuditLog(50);
  const auditData = data as { entries: Array<Record<string, unknown>> } | undefined;

  if (isLoading || !auditData) {
    return <ListSkeleton rows={5} />;
  }

  if (!auditData.entries.length) {
    return <div className="text-tertiary text-sm p-8 text-center">Nenhuma entrada no audit log</div>;
  }

  return (
    <div className="space-y-1.5 max-h-[60vh] overflow-auto">
      {auditData.entries.map((entry: Record<string, unknown>, i: number) => {
        const allowed = entry.allowed === true;
        return (
          <GlassCard key={i} padding="sm" variant="subtle">
            <div className="flex items-center gap-3">
              {allowed ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-green-400 flex-shrink-0" />
              ) : (
                <XCircle className="h-3.5 w-3.5 text-red-400 flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-primary">
                    {String(entry.agentId || entry.agent_id || '—')}
                  </span>
                  <span className="text-xs text-tertiary">
                    {String(entry.squadId || entry.squad_id || '')}
                  </span>
                  <Badge variant="default" className="text-[10px]">
                    {String(entry.operation || '—')}
                  </Badge>
                </div>
                <div className="text-[10px] text-tertiary truncate">
                  {!!entry.reason && <span className={allowed ? 'text-green-400/70' : 'text-red-400/70'}>{String(entry.reason)}</span>}
                  {!!entry.timestamp && ` • ${formatDate(String(entry.timestamp))}`}
                  {!!entry.suggestAgent && (
                    <span className="text-yellow-400 ml-2">Sugestão: @{String(entry.suggestAgent)}</span>
                  )}
                </div>
              </div>
              <span className={cn('text-xs font-medium', allowed ? 'text-green-400' : 'text-red-400')}>
                {allowed ? 'ALLOWED' : 'BLOCKED'}
              </span>
            </div>
          </GlassCard>
        );
      })}
    </div>
  );
}

// -- Main --

export default function EngineWorkspace() {
  const [activeTab, setActiveTab] = useState<TabId>('pool');
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [showExecuteForm, setShowExecuteForm] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowDef | null>(null);
  const [showCronEditor, setShowCronEditor] = useState(false);
  const { data: health } = useEngineHealth();
  const { data: poolData } = useEnginePool();
  const { data: jobsData } = useEngineJobs({ limit: 30 });
  const { data: cronsData } = useCronJobs();
  const events = useMonitorStore((s) => s.events);
  const connectionMode = useMonitorStore((s) => s.connectionMode);

  const isEngineUp = !!health && health.status === 'ok';

  // Tab counters
  const tabCounts: Partial<Record<TabId, number>> = {
    pool: poolData?.occupied,
    jobs: jobsData?.jobs.length,
    events: events.length || undefined,
    crons: cronsData?.crons.length,
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Server className="h-5 w-5 text-primary" />
          <div>
            <h1 className="text-lg font-bold text-primary">Engine</h1>
            <p className="text-xs text-tertiary">
              AIOS Agent Execution Engine
            </p>
          </div>
        </div>

        {/* Status badges + Execute button */}
        <div className="flex items-center gap-3">
          {isEngineUp && (
            <GlassButton
              size="sm"
              variant="primary"
              leftIcon={<Plus className="h-3.5 w-3.5" />}
              onClick={() => setShowExecuteForm(true)}
            >
              Executar
            </GlassButton>
          )}
          {health && (
            <>
              <Badge variant="default" className="text-xs">
                v{health.version}
              </Badge>
              <Badge variant="default" className="text-xs">
                {formatUptime(health.uptime_ms)}
              </Badge>
              <Badge variant="default" className="text-xs">
                {health.ws_clients} WS
              </Badge>
            </>
          )}
          <StatusDot
            status={isEngineUp ? 'working' : 'offline'}
            size="md"
            glow={isEngineUp}
            pulse={isEngineUp}
            label={
              isEngineUp
                ? connectionMode === 'engine' ? 'Engine' : 'API'
                : 'Offline'
            }
          />
        </div>
      </div>

      {/* Engine offline warning */}
      {!isEngineUp && (
        <GlassCard padding="md" variant="subtle" className="mb-4 border border-yellow-500/20">
          <div className="flex items-center gap-3 text-yellow-400">
            <AlertTriangle className="h-5 w-5 flex-shrink-0" />
            <div>
              <div className="text-sm font-medium">Engine offline</div>
              <div className="text-xs text-yellow-400/70">
                Inicie com: <code className="bg-white/5 px-1 rounded">cd engine && bun run src/index.ts</code>
              </div>
            </div>
          </div>
        </GlassCard>
      )}

      {/* Tabs */}
      <div className="flex gap-1.5 mb-4 flex-shrink-0 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const count = tabCounts[tab.id];
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-all whitespace-nowrap',
                activeTab === tab.id
                  ? 'bg-primary/20 text-primary font-medium'
                  : 'text-tertiary hover:text-secondary hover:bg-white/5'
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
              {count !== undefined && count > 0 && (
                <span className={cn(
                  'ml-0.5 text-[10px] px-1.5 py-0.5 rounded-full min-w-[18px] text-center',
                  activeTab === tab.id
                    ? 'bg-primary/30 text-primary'
                    : 'bg-white/10 text-tertiary'
                )}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
          >
            {activeTab === 'pool' && <PoolTab />}
            {activeTab === 'jobs' && <JobsTab onSelectJob={setSelectedJobId} />}
            {activeTab === 'workflows' && <WorkflowsTab onSelectWorkflow={setSelectedWorkflow} />}
            {activeTab === 'crons' && <CronsTab onCreateCron={() => setShowCronEditor(true)} />}
            {activeTab === 'bundles' && <BundlesTab />}
            {activeTab === 'audit' && <AuditTab />}
            {activeTab === 'events' && (
              <Suspense fallback={<div className="text-secondary text-sm p-4">Carregando...</div>}>
                <EngineEventFeed />
              </Suspense>
            )}
            {activeTab === 'memory' && (
              <Suspense fallback={<div className="text-secondary text-sm p-4">Carregando...</div>}>
                <MemoryBrowser />
              </Suspense>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Modals */}
      <Suspense fallback={null}>
        <JobDetailModal
          jobId={selectedJobId}
          onClose={() => setSelectedJobId(null)}
        />
        <ExecuteAgentForm
          isOpen={showExecuteForm}
          onClose={() => setShowExecuteForm(false)}
        />
        <WorkflowTriggerModal
          workflow={selectedWorkflow}
          onClose={() => setSelectedWorkflow(null)}
        />
        <CronJobEditor
          isOpen={showCronEditor}
          onClose={() => setShowCronEditor(false)}
        />
      </Suspense>
    </div>
  );
}
