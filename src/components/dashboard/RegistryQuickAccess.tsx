import {
  UsersRound,
  ListTodo,
  Workflow,
  Shield,
  ChevronRight,
} from 'lucide-react';
import { GlassCard, Badge } from '../ui';
import { useUIStore } from '../../stores/uiStore';
import { aiosRegistry } from '../../data/aios-registry.generated';

export function RegistryQuickAccess() {
  const { setCurrentView } = useUIStore();
  const items = [
    { id: 'agent-directory' as const, label: 'Agentes', value: aiosRegistry.meta.agentCount, icon: UsersRound, color: '#0099FF' },
    { id: 'task-catalog' as const, label: 'Tasks', value: aiosRegistry.meta.taskCount, icon: ListTodo, color: '#4ADE80' },
    { id: 'workflow-catalog' as const, label: 'Workflows', value: aiosRegistry.meta.workflowCount, icon: Workflow, color: '#8B5CF6' },
    { id: 'authority-matrix' as const, label: 'Autoridade', value: aiosRegistry.agents.filter(a => a.exclusiveOps.length > 0).length + ' agents', icon: Shield, color: '#f59e0b' },
  ];

  return (
    <GlassCard>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-primary">AIOS Registry</h2>
        <Badge variant="count" size="sm">
          {aiosRegistry.meta.agentCount + aiosRegistry.meta.taskCount + aiosRegistry.meta.workflowCount} itens
        </Badge>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => setCurrentView(item.id)}
            className="group flex flex-col items-center gap-2 p-3 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/15 transition-all"
          >
            <item.icon size={20} style={{ color: item.color }} />
            <span className="text-lg font-bold text-white/90">{item.value}</span>
            <span className="text-[10px] text-white/40 group-hover:text-white/60 flex items-center gap-1">
              {item.label} <ChevronRight size={10} />
            </span>
          </button>
        ))}
      </div>
    </GlassCard>
  );
}
