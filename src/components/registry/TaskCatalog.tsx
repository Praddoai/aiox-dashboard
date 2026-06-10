import { useState, useMemo, memo } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, Terminal, Zap } from 'lucide-react';
import { cn } from '../../lib/utils';
import { getAgentColor } from '../../lib/agent-colors';
import { aiosRegistry } from '../../data/aios-registry.generated';
import type { TaskDefinition } from '../../data/registry-types';

// ── Task Row ──

const TaskRow = memo(function TaskRow({ task }: { task: TaskDefinition }) {
  const color = getAgentColor(task.agent);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3 px-4 py-3 border-b border-white/5 hover:bg-white/[0.03] transition-colors"
    >
      <code className="text-xs font-mono text-primary flex-shrink-0 w-48 truncate" title={task.id}>
        {task.id}
      </code>
      <p className="text-xs text-white/60 flex-1 truncate" title={task.description}>
        {task.description}
      </p>
      <span
        className="text-[10px] px-2 py-0.5 rounded-full flex-shrink-0"
        style={{
          backgroundColor: `${color}20`,
          color,
          border: `1px solid ${color}30`,
        }}
      >
        {task.agent}
      </span>
      {task.hasElicitation && (
        <span className="text-[10px] text-yellow-400 flex-shrink-0 flex items-center gap-1">
          <Zap className="w-3 h-3" />
          interactive
        </span>
      )}
    </motion.div>
  );
});

// ── Agent Pill ──

const AgentPill = memo(function AgentPill({
  agent,
  isActive,
  onClick,
}: {
  agent: string;
  isActive: boolean;
  onClick: () => void;
}) {
  const color = getAgentColor(agent);

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Filter by agent @${agent}`}
      aria-pressed={isActive}
      className={cn(
        'text-[10px] px-3 py-1 rounded-full transition-all whitespace-nowrap',
        isActive
          ? 'ring-1'
          : 'hover:opacity-80',
      )}
      style={{
        backgroundColor: isActive ? `${color}30` : `${color}10`,
        color,
        borderColor: isActive ? color : 'transparent',
        ...(isActive ? { '--tw-ring-color': color } as React.CSSProperties : {}),
      }}
    >
      {agent}
    </button>
  );
});

// ── TaskCatalog ──

export default function TaskCatalog() {
  const [search, setSearch] = useState('');
  const [agentFilter, setAgentFilter] = useState<string | null>(null);

  // Get unique agents for filter
  const agents = useMemo(
    () => [...new Set(aiosRegistry.tasks.map((t) => t.agent))].sort(),
    [],
  );

  // Filter tasks
  const filtered = useMemo(() => {
    let tasks = aiosRegistry.tasks;
    if (agentFilter) tasks = tasks.filter((t) => t.agent === agentFilter);
    if (search) {
      const q = search.toLowerCase();
      tasks = tasks.filter(
        (t) =>
          t.id.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.taskName.toLowerCase().includes(q) ||
          t.agent.toLowerCase().includes(q),
      );
    }
    return tasks;
  }, [search, agentFilter]);

  const totalCount = aiosRegistry.tasks.length;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col h-full"
    >
      {/* Header */}
      <div className="flex flex-col gap-3 px-4 py-4 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold text-white/90">Task Catalog</h2>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/50 tabular-nums">
            {filtered.length}/{totalCount}
          </span>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks by name, description, or agent..."
            className={cn(
              'w-full pl-9 pr-3 py-2 text-xs rounded-lg',
              'bg-white/[0.05] border border-white/10 text-white/80',
              'placeholder:text-white/30',
              'focus:outline-none focus:border-white/20 focus:ring-1 focus:ring-white/10',
              'transition-colors',
            )}
          />
        </div>

        {/* Agent filter pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          <Filter className="w-3 h-3 text-white/30 flex-shrink-0" />
          <button
            type="button"
            onClick={() => setAgentFilter(null)}
            className={cn(
              'text-[10px] px-3 py-1 rounded-full transition-all whitespace-nowrap',
              agentFilter === null
                ? 'bg-white/20 text-white/90'
                : 'bg-white/[0.05] text-white/40 hover:text-white/60',
            )}
          >
            All
          </button>
          {agents.map((agent) => (
            <AgentPill
              key={agent}
              agent={agent}
              isActive={agentFilter === agent}
              onClick={() => setAgentFilter(agentFilter === agent ? null : agent)}
            />
          ))}
        </div>
      </div>

      {/* Task list */}
      <div className="flex-1 overflow-y-auto" tabIndex={0} role="region" aria-label="Task list">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-white/30">
            <Terminal className="w-8 h-8 mb-3 opacity-40" />
            <p className="text-xs">No tasks match your search.</p>
          </div>
        ) : (
          filtered.map((task) => <TaskRow key={task.id} task={task} />)
        )}
      </div>
    </motion.div>
  );
}
