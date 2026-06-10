import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Loader2,
  AlertCircle,
  Clock,
  Users,
  RotateCcw,
  Eye,
  Terminal,
  GitBranch,
  History,
  ArrowLeft,
  Search,
  XCircle,
} from 'lucide-react';
import { AgentOutputCard } from './AgentOutputCard';
import type { TaskEvent } from './orchestration-types';
import { getSquadColor, statusLabel, formatDuration, formatTimeAgo } from './orchestration-types';
import { tasksApi } from '../../services/api/tasks';
import type { Task, TaskOutput, TaskSquadSelection } from '../../services/api/tasks';

export const EventsPanel = memo(function EventsPanel({ events, isActive }: { events: TaskEvent[]; isActive: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    if (containerRef.current && isActive) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [events, isActive]);

  const displayEvents = showAll ? events : events.slice(-10);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Terminal className="w-5 h-5 text-cyan-400" />
          <h2 className="font-semibold text-white">Eventos em Tempo Real</h2>
          {isActive && (
            <motion.div
              className="w-2 h-2 bg-green-400 rounded-full"
              animate={{ scale: [1, 1.5, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
          )}
        </div>
        {events.length > 10 && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
          >
            <Eye className="w-3 h-3" />
            {showAll ? 'Mostrar menos' : `Ver todos (${events.length})`}
          </button>
        )}
      </div>

      <div ref={containerRef} className="flex-1 overflow-auto space-y-2 pr-2">
        <AnimatePresence mode="popLayout">
          {displayEvents.map((event, index) => (
            <motion.div
              key={`${event.timestamp}-${index}`}
              initial={{ x: 20, opacity: 0, scale: 0.95 }}
              animate={{ x: 0, opacity: 1, scale: 1 }}
              exit={{ x: -20, opacity: 0, scale: 0.95 }}
              className="p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-mono text-cyan-400 flex items-center gap-1">
                  <GitBranch className="w-3 h-3" />
                  {event.event}
                </span>
                <span className="text-xs text-white/30 font-mono">
                  {event.timestamp ? new Date(event.timestamp).toLocaleTimeString() : ''}
                </span>
              </div>
              <div className="text-xs text-white/50 font-mono truncate">
                {JSON.stringify(event.data).substring(0, 100)}
                {JSON.stringify(event.data).length > 100 && '...'}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
});

export function TaskHistoryPanel({
  onSelectTask,
  onClose,
  visible,
}: {
  onSelectTask: (task: Task) => void;
  onClose: () => void;
  visible: boolean;
}) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [dbPersistence, setDbPersistence] = useState(false);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const params: { limit: number; status?: string } = { limit: 50 };
      if (filter) params.status = filter;
      const res = await tasksApi.listTasks(params);
      setTasks(res.tasks);
      setTotal(res.total);
      setDbPersistence(res.dbPersistence);
    } catch {
      // Silently fail — tasks will show from cache or be empty
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    if (visible) fetchTasks();
  }, [visible, fetchTasks]);

  const filtered = searchQuery
    ? tasks.filter((t) => t.demand.toLowerCase().includes(searchQuery.toLowerCase()))
    : tasks;

  const statusFilters = [
    { value: '', label: 'Todos' },
    { value: 'completed', label: 'Concluídos' },
    { value: 'failed', label: 'Falhas' },
    { value: 'executing', label: 'Em execução' },
  ];

  if (!visible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex flex-col h-full"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-cyan-400" />
          <h2 className="font-semibold text-white">Histórico</h2>
          <span className="px-2 py-0.5 rounded-full text-xs bg-white/10 text-white/50">
            {total}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchTasks}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors"
            aria-label="Atualizar"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors"
            aria-label="Fechar histórico"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Persistence indicator */}
      {!dbPersistence && (
        <div className="mb-3 px-3 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-xs text-yellow-400/80">
          Apenas memória — reiniciar o servidor apaga o histórico
        </div>
      )}

      {/* Search */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar demanda..."
          className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-500/50 transition-colors"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
          >
            <XCircle className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Status filters */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {statusFilters.map((sf) => (
          <button
            key={sf.value}
            onClick={() => setFilter(sf.value)}
            className={`px-2.5 py-1 text-xs rounded-lg transition-colors ${
              filter === sf.value
                ? 'bg-cyan-500/20 text-cyan-400 ring-1 ring-cyan-500/40'
                : 'bg-white/5 text-white/50 hover:bg-white/10'
            }`}
          >
            {sf.label}
          </button>
        ))}
      </div>

      {/* Task list */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {loading && filtered.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-white/30" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8 text-white/30 text-sm">
            {searchQuery ? 'Nenhuma demanda encontrada' : 'Nenhuma orquestração registrada'}
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {filtered.map((task) => {
              const st = statusLabel(task.status);
              return (
                <motion.button
                  key={task.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  onClick={() => onSelectTask(task)}
                  className="w-full text-left p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all group"
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <p className="text-sm text-white/90 line-clamp-2 leading-snug group-hover:text-white transition-colors">
                      {task.demand}
                    </p>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium whitespace-nowrap ${st.color}`}>
                      {st.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-white/40">
                    {task.createdAt && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTimeAgo(task.createdAt)}
                      </span>
                    )}
                    {task.totalDuration != null && task.totalDuration > 0 && (
                      <span>{formatDuration(task.totalDuration)}</span>
                    )}
                    {task.squads && task.squads.length > 0 && (
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {task.squads.length}
                      </span>
                    )}
                    {task.totalTokens != null && task.totalTokens > 0 && (
                      <span>{task.totalTokens.toLocaleString()} tok</span>
                    )}
                  </div>
                </motion.button>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </motion.div>
  );
}

export function TaskDetailView({
  task,
  onBack,
  onCopy,
  copiedIndex,
}: {
  task: Task;
  onBack: () => void;
  onCopy: (text: string, index: number) => void;
  copiedIndex: number | null;
}) {
  const outputs = (task.outputs || [])
    .map((o: TaskOutput, i: number) => {
      const out = o.output || {};
      return {
        stepId: o.stepId || `step-${i}`,
        stepName: o.stepName || `Step ${i + 1}`,
        agent: out.agent || { id: 'unknown', name: 'Unknown', squad: 'unknown' },
        role: (out.role as string) || 'specialist',
        response: (out.response as string) || (out.content as string) || '',
        processingTimeMs: (out.processingTimeMs as number) || 0,
        llmMetadata: out.llmMetadata,
      };
    })
    .filter((o) => o.response.length > 0);

  const st = statusLabel(task.status);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={onBack}
          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors"
          aria-label="Voltar"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-white/90 truncate">{task.demand}</p>
          <div className="flex items-center gap-3 mt-1 text-xs text-white/40">
            <span className={`px-1.5 py-0.5 rounded ${st.color}`}>{st.label}</span>
            {task.createdAt && (
              <span>{new Date(task.createdAt).toLocaleString('pt-BR')}</span>
            )}
            {task.totalDuration != null && task.totalDuration > 0 && (
              <span>{formatDuration(task.totalDuration)}</span>
            )}
            {task.totalTokens != null && task.totalTokens > 0 && (
              <span>{task.totalTokens.toLocaleString()} tokens</span>
            )}
          </div>
        </div>
      </div>

      {/* Squads summary */}
      {task.squads && task.squads.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {task.squads.map((sq: TaskSquadSelection) => {
            const color = getSquadColor(sq.squadId);
            return (
              <span
                key={sq.squadId}
                className="px-2.5 py-1 rounded-lg text-xs font-medium"
                style={{ backgroundColor: color.bg, color: color.text, border: `1px solid ${color.border}` }}
              >
                {sq.squadId} ({sq.agentCount})
              </span>
            );
          })}
        </div>
      )}

      {/* Outputs */}
      <div className="flex-1 overflow-y-auto space-y-4">
        {outputs.length === 0 ? (
          <div className="text-center py-12 text-white/30 text-sm">
            Nenhum output registrado para esta tarefa
          </div>
        ) : (
          outputs.map((output, index) => (
            <AgentOutputCard
              key={output.stepId}
              output={{
                ...output,
                agent: { ...output.agent, title: undefined },
                isStreaming: false,
              }}
              index={index}
              isReviewer={index === outputs.length - 1 && task.status === 'completed'}
              onCopy={(text) => onCopy(text, index)}
              copied={copiedIndex === index}
            />
          ))
        )}

        {/* Error display */}
        {task.error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-4 h-4 text-red-400" />
              <span className="text-sm font-medium text-red-400">Erro</span>
            </div>
            <p className="text-sm text-white/60">{task.error}</p>
          </div>
        )}
      </div>
    </div>
  );
}
