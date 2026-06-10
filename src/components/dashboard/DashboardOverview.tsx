import React, { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import {
  type LucideIcon,
  BarChart3,
  Bot,
  PlugZap,
  DollarSign,
  Settings,
} from 'lucide-react';
import { GlassButton } from '../ui';
import { ICON_SIZES } from '../../lib/icons';
import { cn } from '../../lib/utils';
import { WidgetCustomizer } from './WidgetCustomizer';
import { RefreshIcon } from './dashboard-icons';
import { OverviewTab } from './OverviewTab';
import { AgentsTab } from './AgentsTab';
import { MCPTab } from './MCPTab';
import { CostsTab } from './CostsTab';
import { SystemTab } from './SystemTab';

type TabType = 'overview' | 'agents' | 'mcp' | 'costs' | 'system';

export function DashboardOverview({ viewToggle }: { viewToggle?: React.ReactNode } = {}) {
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  const tabs: { id: string; label: string; icon: LucideIcon }[] = [
    { id: 'overview', label: 'Visão Geral', icon: BarChart3 },
    { id: 'agents', label: 'Agents', icon: Bot },
    { id: 'mcp', label: 'MCP & Tools', icon: PlugZap },
    { id: 'costs', label: 'Custos', icon: DollarSign },
    { id: 'system', label: 'Sistema', icon: Settings },
  ];

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold text-primary">Dashboard</h1>
            <p className="text-secondary text-sm mt-0.5">
              Analytics do AIOS Core Platform
            </p>
          </div>
          {viewToggle}
        </div>
        <div className="flex items-center gap-2">
          <WidgetCustomizer />
          <GlassButton variant="ghost" size="sm" leftIcon={<RefreshIcon />}>
            Atualizar
          </GlassButton>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 p-1 glass-subtle rounded-xl mb-4 flex-shrink-0 overflow-x-auto" role="tablist" aria-label="Abas do painel">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            tabIndex={activeTab === tab.id ? 0 : -1}
            onClick={() => setActiveTab(tab.id as TabType)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap',
              activeTab === tab.id
                ? 'glass text-primary shadow-sm'
                : 'text-secondary hover:text-primary'
            )}
          >
            <tab.icon size={ICON_SIZES.md} />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto glass-scrollbar">
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && <OverviewTab key="overview" />}
          {activeTab === 'agents' && <AgentsTab key="agents" />}
          {activeTab === 'mcp' && <MCPTab key="mcp" />}
          {activeTab === 'costs' && <CostsTab key="costs" />}
          {activeTab === 'system' && <SystemTab key="system" />}
        </AnimatePresence>
      </div>
    </div>
  );
}
