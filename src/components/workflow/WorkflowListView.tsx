import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';
import type { WorkflowMission } from './types';

export function WorkflowListView({
  mission,
  selectedNodeId,
  onSelectNode,
}: {
  mission: WorkflowMission;
  selectedNodeId: string | null;
  onSelectNode: (id: string | null) => void;
}) {
  return (
    <div className="p-6 space-y-4 overflow-y-auto h-full">
      {mission.nodes.map((node, index) => (
        <motion.div
          key={node.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.05 }}
          onClick={() => onSelectNode(node.id)}
          className={cn(
            'glass-subtle rounded-xl p-4 cursor-pointer transition-all',
            'hover:bg-white/10',
            selectedNodeId === node.id && 'ring-2 ring-blue-500'
          )}
        >
          <div className="flex items-center gap-4">
            <div
              className={cn(
                'h-10 w-10 rounded-xl flex items-center justify-center text-sm font-bold',
                node.status === 'completed' && 'bg-green-500/20 text-green-500',
                node.status === 'active' && 'bg-orange-500/20 text-orange-500',
                node.status === 'waiting' && 'bg-yellow-500/20 text-yellow-500',
                node.status === 'idle' && 'bg-gray-500/20 text-gray-500'
              )}
            >
              {index + 1}
            </div>
            <div className="flex-1">
              <p className="text-primary font-medium">{node.label}</p>
              {node.agentName && (
                <p className="text-secondary text-sm">{node.agentName}</p>
              )}
            </div>
            {node.progress !== undefined && (
              <div className="text-right">
                <p className="text-primary text-sm font-medium">{node.progress}%</p>
                <p className="text-tertiary text-xs">{node.status}</p>
              </div>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
