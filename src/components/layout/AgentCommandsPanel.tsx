import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '../ui';
import { useChat } from '../../hooks/useChat';
import { apiClient } from '../../services/api/client';
import { cn } from '../../lib/utils';
import { ActionIcon, CommandIcon, PromptIcon, TaskIcon, WorkflowIcon } from './activity-panel-icons';
import type { AgentWithUI } from '../../hooks/useAgents';
import type { AgentAction } from './activity-panel-types';

export interface SquadCommand {
  id: string;
  name: string;
  description: string;
  type: 'task' | 'workflow';
  file: string;
}

export function AgentCommandsPanel({ agent }: { agent: AgentWithUI & { actions?: AgentAction[] } }) {
  const { sendMessage } = useChat();
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  // Fetch squad tasks and workflows
  const { data: squadCommands } = useQuery<{ tasks: SquadCommand[]; workflows: SquadCommand[] }>({
    queryKey: ['squad-commands', agent.squad],
    queryFn: async () => {
      try {
        return await apiClient.get<{ tasks: SquadCommand[]; workflows: SquadCommand[] }>(`/squads/${agent.squad}/commands`);
      } catch {
        return { tasks: [], workflows: [] };
      }
    },
    enabled: !!agent.squad,
  });

  // Agent-level data
  const agentActions = agent.actions || [];
  const agentCommands = agent.commands || [];
  const agentPrompts = agent.sampleTasks || [];

  // Squad-level data
  const tasks = squadCommands?.tasks || [];
  const workflows = squadCommands?.workflows || [];

  const handleUse = (command: string) => {
    sendMessage(command);
  };

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }));
  };

  // Command categories configuration
  const categories: Array<{
    id: string;
    label: string;
    icon: React.ReactNode;
    items: unknown[];
    color: string;
    getCommand: (item: unknown) => string;
    getLabel: (item: unknown) => string;
    getDescription: (item: unknown) => string | null | undefined;
  }> = [
    {
      id: 'actions',
      label: 'Ações',
      icon: <ActionIcon />,
      items: agentActions,
      color: 'yellow',
      getCommand: (item: unknown) => { const a = item as AgentAction; return a.description || a.name; },
      getLabel: (item: unknown) => (item as AgentAction).name,
      getDescription: (item: unknown) => (item as AgentAction).trigger,
    },
    {
      id: 'commands',
      label: 'Comandos',
      icon: <CommandIcon />,
      items: agentCommands,
      color: 'purple',
      getCommand: (item: unknown) => (item as { command: string }).command,
      getLabel: (item: unknown) => (item as { command: string }).command,
      getDescription: (item: unknown) => (item as { description?: string }).description,
    },
    {
      id: 'prompts',
      label: 'Prompts',
      icon: <PromptIcon />,
      items: agentPrompts,
      color: 'green',
      getCommand: (item: unknown) => item as string,
      getLabel: (item: unknown) => { const s = item as string; return s.slice(0, 40) + (s.length > 40 ? '...' : ''); },
      getDescription: () => null,
    },
    {
      id: 'tasks',
      label: 'Tasks',
      icon: <TaskIcon />,
      items: tasks,
      color: 'orange',
      getCommand: (item: unknown) => `*${(item as SquadCommand).id}`,
      getLabel: (item: unknown) => { const c = item as SquadCommand; return c.name || c.id; },
      getDescription: (item: unknown) => (item as SquadCommand).description,
    },
    {
      id: 'workflows',
      label: 'Workflows',
      icon: <WorkflowIcon />,
      items: workflows,
      color: 'cyan',
      getCommand: (item: unknown) => `@workflow:${(item as SquadCommand).id}`,
      getLabel: (item: unknown) => { const c = item as SquadCommand; return c.name || c.id; },
      getDescription: (item: unknown) => (item as SquadCommand).description,
    },
  ];

  const colorClasses: Record<string, string> = {
    yellow: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400 hover:bg-yellow-500/20',
    purple: 'bg-purple-500/10 border-purple-500/20 text-purple-400 hover:bg-purple-500/20',
    green: 'bg-green-500/10 border-green-500/20 text-green-400 hover:bg-green-500/20',
    orange: 'bg-orange-500/10 border-orange-500/20 text-orange-400 hover:bg-orange-500/20',
    cyan: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/20',
  };

  const totalItems = agentActions.length + agentCommands.length + agentPrompts.length + tasks.length + workflows.length;

  if (totalItems === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-tertiary text-xs">Nenhum comando disponível</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {categories.map((category) => {
        if (category.items.length === 0) return null;

        const isExpanded = expandedCategories[category.id];
        const hasMore = category.items.length > 3;
        const displayItems = isExpanded ? category.items : category.items.slice(0, 3);

        return (
          <div key={category.id}>
            {/* Category Header */}
            <div className="flex items-center gap-2 mb-2">
              <span className={cn('p-1 rounded', colorClasses[category.color])}>
                {category.icon}
              </span>
              <span className="text-xs font-medium text-secondary">{category.label}</span>
              <Badge variant="count" size="sm">{category.items.length}</Badge>
            </div>

            {/* Category Items */}
            <div className="space-y-1.5">
              <AnimatePresence initial={false}>
                {displayItems.map((item: unknown, index: number) => (
                  <motion.button
                    key={index}
                    initial={index >= 3 ? { opacity: 0, height: 0 } : false}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    onClick={() => handleUse(category.getCommand(item))}
                    className={cn(
                      'w-full text-left p-2 rounded-lg border transition-colors',
                      colorClasses[category.color]
                    )}
                  >
                    <p className="text-xs font-medium text-primary truncate">
                      {category.getLabel(item)}
                    </p>
                    {category.getDescription(item) && (
                      <p className="text-[10px] text-tertiary truncate mt-0.5">
                        {category.getDescription(item)}
                      </p>
                    )}
                  </motion.button>
                ))}
              </AnimatePresence>

              {/* Expand/Collapse Button */}
              {hasMore && (
                <button
                  onClick={() => toggleCategory(category.id)}
                  className="w-full text-[10px] text-tertiary hover:text-secondary text-center py-1.5 rounded-lg hover:bg-white/5 transition-colors flex items-center justify-center gap-1"
                >
                  {isExpanded ? (
                    <>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="18 15 12 9 6 15" />
                      </svg>
                      Mostrar menos
                    </>
                  ) : (
                    <>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                      +{category.items.length - 3} mais
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
