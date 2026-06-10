/**
 * SharedTaskView — Read-only view of a shared orchestration task.
 * Accessed via /share/{taskId} URL.
 */
import { useEffect, useState, lazy, Suspense } from 'react';
import { motion } from 'framer-motion';
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  Users,
  Clock,
  Coins,
  Layers,
  ArrowLeft,
  Copy,
  Check,
} from 'lucide-react';
import { GlassButton } from '../ui/GlassButton';
const MarkdownRenderer = lazy(() => import('../chat/MarkdownRenderer'));
import { getSquadInlineStyle } from '../../lib/theme';
import { supabaseTasksService } from '../../services/supabase/tasks';
import { tasksApi, type Task } from '../../services/api/tasks';
import { useUIStore } from '../../stores/uiStore';
import { cn } from '../../lib/utils';

export default function SharedTaskView() {
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { setCurrentView } = useUIStore();

  const taskId = sessionStorage.getItem('shared-task-id');

  useEffect(() => {
    if (!taskId) {
      setError('No task ID provided');
      setLoading(false);
      return;
    }

    async function fetchTask() {
      try {
        // Try Supabase first
        if (supabaseTasksService.isAvailable()) {
          const result = await supabaseTasksService.getTask(taskId!);
          if (result) {
            setTask(result);
            setLoading(false);
            return;
          }
        }
        // Fallback to API
        const result = await tasksApi.getTask(taskId!);
        setTask(result);
      } catch {
        setError('Task not found or unavailable');
      } finally {
        setLoading(false);
      }
    }

    fetchTask();
  }, [taskId]);

  const handleCopyLink = async () => {
    const url = window.location.href;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-white/40 mx-auto" />
          <p className="text-sm text-white/50">Loading shared task...</p>
        </div>
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
          <h2 className="text-lg font-semibold text-white/90">Task Not Found</h2>
          <p className="text-sm text-white/50">{error || 'This shared link may have expired or the task does not exist.'}</p>
          <GlassButton variant="ghost" size="sm" onClick={() => setCurrentView('chat')}>
            <ArrowLeft size={14} />
            Back to Chat
          </GlassButton>
        </div>
      </div>
    );
  }

  const isCompleted = task.status === 'completed';
  const isFailed = task.status === 'failed';
  const durationSec = task.totalDuration ? Math.round(task.totalDuration / 1000) : null;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 md:p-6 border-b border-white/10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 md:gap-3 min-w-0">
            <GlassButton variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={() => setCurrentView('chat')}>
              <ArrowLeft size={16} />
            </GlassButton>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-base md:text-lg font-semibold text-white/90">Shared Orchestration</h1>
                <span
                  className={cn(
                    'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
                    isCompleted && 'bg-emerald-500/20 text-emerald-400',
                    isFailed && 'bg-red-500/20 text-red-400',
                    !isCompleted && !isFailed && 'bg-yellow-500/20 text-yellow-400'
                  )}
                >
                  {isCompleted && <CheckCircle2 size={12} />}
                  {isFailed && <AlertCircle size={12} />}
                  {task.status}
                </span>
              </div>
              <p className="text-xs text-white/40 mt-0.5">
                {task.createdAt ? new Date(task.createdAt).toLocaleString() : ''}
              </p>
            </div>
          </div>

          <GlassButton
            variant="ghost"
            size="sm"
            onClick={handleCopyLink}
            className="text-xs"
          >
            {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            {copied ? 'Copied!' : 'Copy Link'}
          </GlassButton>
        </div>

        {/* Demand */}
        <div className="glass-card border border-white/10 rounded-xl p-4">
          <p className="text-sm text-white/80">{task.demand}</p>
        </div>

        {/* Stats */}
        <div className="flex flex-wrap gap-3 md:gap-4 mt-3 md:mt-4">
          {task.squads.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-white/50">
              <Users size={14} />
              {task.squads.length} squad{task.squads.length > 1 ? 's' : ''}
            </div>
          )}
          {task.stepCount && (
            <div className="flex items-center gap-1.5 text-xs text-white/50">
              <Layers size={14} />
              {task.completedSteps || 0}/{task.stepCount} steps
            </div>
          )}
          {durationSec !== null && (
            <div className="flex items-center gap-1.5 text-xs text-white/50">
              <Clock size={14} />
              {durationSec}s
            </div>
          )}
          {task.totalTokens && (
            <div className="flex items-center gap-1.5 text-xs text-white/50">
              <Coins size={14} />
              {task.totalTokens.toLocaleString()} tokens
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 md:space-y-6 glass-scrollbar">
        {/* Squads */}
        {task.squads.length > 0 && (
          <section>
            <h2 className="text-sm font-medium text-white/70 mb-3">Squads</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {task.squads.map((squad) => {
                const style = getSquadInlineStyle(squad.squadId);
                return (
                  <motion.div
                    key={squad.squadId}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-card border border-white/10 rounded-xl p-3"
                    style={{ borderLeftColor: style.color, borderLeftWidth: 3 }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-medium" style={{ color: style.color }}>
                        {squad.squadId}
                      </span>
                      <span className="text-xs text-white/40">Chief: {squad.chief}</span>
                    </div>
                    {squad.agents && (
                      <div className="flex flex-wrap gap-1">
                        {squad.agents.map((agent) => (
                          <span key={agent.id} className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-white/50">
                            {agent.name || agent.id}
                          </span>
                        ))}
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </section>
        )}

        {/* Agent Outputs */}
        {task.outputs.length > 0 && (
          <section>
            <h2 className="text-sm font-medium text-white/70 mb-3">Agent Outputs</h2>
            <div className="space-y-4">
              {task.outputs.map((output, idx) => {
                const agentName = output.output.agent?.name || output.output.agent?.id || 'Agent';
                const response = output.output.response || output.output.content || '';
                const timeMs = output.output.processingTimeMs;

                return (
                  <motion.div
                    key={output.stepId}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="glass-card border border-white/10 rounded-xl p-4"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-white/30">#{idx + 1}</span>
                        <span className="text-sm font-medium text-white/80">{output.stepName}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-white/40">
                        <span>{agentName}</span>
                        {timeMs && <span>({Math.round(timeMs / 1000)}s)</span>}
                      </div>
                    </div>
                    {response && (
                      <div className="text-sm text-white/70 mt-2 prose prose-invert prose-sm max-w-none">
                        <Suspense fallback={<div className="text-sm text-white/50 animate-pulse">…</div>}>
                          <MarkdownRenderer content={response} />
                        </Suspense>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </section>
        )}

        {/* Error */}
        {task.error && (
          <section>
            <h2 className="text-sm font-medium text-red-400 mb-2">Error</h2>
            <div className="glass-card border border-red-500/20 rounded-xl p-4">
              <pre className="text-xs text-red-300 whitespace-pre-wrap">{task.error}</pre>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
