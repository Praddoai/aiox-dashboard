import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '../ui';
import { useMCPStatus } from '../../hooks/useDashboard';
import { cn } from '../../lib/utils';
import { SpinnerIcon, ServerIcon, PlugIcon, ToolIcon } from './activity-panel-icons';

export function ExternalToolsPanel() {
  const { data: mcpServers, isLoading } = useMCPStatus();
  const [expandedServers, setExpandedServers] = useState<Record<string, boolean>>({});

  const toggleServer = (serverName: string) => {
    setExpandedServers(prev => ({
      ...prev,
      [serverName]: !prev[serverName],
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <SpinnerIcon />
      </div>
    );
  }

  if (!mcpServers || mcpServers.length === 0) {
    return (
      <div className="text-center py-3">
        <p className="text-tertiary text-xs">Nenhuma ferramenta externa conectada</p>
      </div>
    );
  }

  const connectedServers = mcpServers.filter(s => s.status === 'connected');
  const disconnectedServers = mcpServers.filter(s => s.status !== 'connected');
  const totalTools = connectedServers.reduce((sum, s) => sum + s.tools.length, 0);

  return (
    <div className="space-y-2">
      {/* Summary */}
      <div className="flex items-center gap-2 text-[10px] text-tertiary px-1 mb-2">
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
          {connectedServers.length} MCP{connectedServers.length !== 1 ? 's' : ''}
        </span>
        <span>•</span>
        <span>{totalTools} tools</span>
        {disconnectedServers.length > 0 && (
          <>
            <span>•</span>
            <span className="text-red-400">{disconnectedServers.length} offline</span>
          </>
        )}
      </div>

      {/* Server List */}
      <div className="space-y-1.5">
        {mcpServers.map((server) => {
          const isConnected = server.status === 'connected';
          const isExpanded = expandedServers[server.name];
          const hasTools = server.tools.length > 0;

          return (
            <div
              key={server.name}
              className={cn(
                'rounded-lg border transition-colors',
                isConnected
                  ? 'border-white/10 bg-white/5'
                  : 'border-red-500/20 bg-red-500/5'
              )}
            >
              {/* Server Header */}
              <button
                onClick={() => hasTools && toggleServer(server.name)}
                className={cn(
                  'w-full flex items-center gap-2 p-2 text-left',
                  hasTools && 'hover:bg-white/5'
                )}
                disabled={!hasTools}
              >
                <span className={cn(
                  'h-1.5 w-1.5 rounded-full flex-shrink-0',
                  isConnected ? 'bg-green-500' : 'bg-red-500'
                )} />
                <PlugIcon />
                <span className="text-xs text-primary truncate flex-1">
                  {server.name}
                </span>
                {hasTools && (
                  <>
                    <Badge variant="count" size="sm">{server.tools.length}</Badge>
                    <motion.svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="text-tertiary"
                      animate={{ rotate: isExpanded ? 180 : 0 }}
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </motion.svg>
                  </>
                )}
                {!isConnected && (
                  <span className="text-[9px] text-red-400">offline</span>
                )}
              </button>

              {/* Tools List */}
              <AnimatePresence>
                {isExpanded && hasTools && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-2 pb-2 space-y-1">
                      {server.tools.slice(0, 8).map((tool) => (
                        <div
                          key={tool.name}
                          className="flex items-center gap-2 py-1 px-2 rounded bg-white/5"
                        >
                          <ToolIcon />
                          <span className="text-[10px] text-secondary truncate flex-1">
                            {tool.name}
                          </span>
                          {tool.calls > 0 && (
                            <span className="text-[9px] text-tertiary">
                              {tool.calls}x
                            </span>
                          )}
                        </div>
                      ))}
                      {server.tools.length > 8 && (
                        <p className="text-[9px] text-tertiary text-center py-1">
                          +{server.tools.length - 8} mais tools
                        </p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* Resources if any */}
      {connectedServers.some(s => s.resources.length > 0) && (
        <div className="pt-2 border-t border-white/5">
          <p className="text-[10px] text-tertiary mb-1.5">Resources</p>
          <div className="space-y-1">
            {connectedServers.flatMap(s => s.resources).slice(0, 4).map((resource, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 py-1 px-2 rounded bg-white/5 text-[10px] text-secondary"
              >
                <ServerIcon />
                <span className="truncate">{resource.name || resource.uri}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
