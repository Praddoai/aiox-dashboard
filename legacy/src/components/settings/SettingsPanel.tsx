'use client';

import { useEffect } from 'react';
import { Sun, Moon, Monitor, RotateCcw, Layers, Terminal, Crosshair } from 'lucide-react';
import { cn } from '@/lib/utils';
import { iconMap } from '@/lib/icons';
import { useSettingsStore, type Theme } from '@/stores/settings-store';
import { AGENT_CONFIG, type AgentId } from '@/types';

const THEME_OPTIONS: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'glass', label: 'Glass', icon: Layers },
  { value: 'matrix', label: 'Matrix', icon: Terminal },
  { value: 'aiox', label: 'AIOX', icon: Crosshair },
  { value: 'system', label: 'System', icon: Monitor },
];

const REFRESH_OPTIONS = [
  { value: 10, label: '10 seconds' },
  { value: 30, label: '30 seconds' },
  { value: 60, label: '1 minute' },
  { value: 300, label: '5 minutes' },
];

export function SettingsPanel() {
  const {
    settings,
    setTheme,
    setUseMockData,
    setAutoRefresh,
    setRefreshInterval,
    setStoriesPath,
    setAgentColor,
    resetToDefaults,
  } = useSettingsStore();

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;

    // Clean up
    root.classList.remove('dark');
    root.removeAttribute('data-theme');

    if (settings.theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.toggle('dark', prefersDark);
    } else if (settings.theme === 'glass') {
      root.classList.add('dark');
      root.setAttribute('data-theme', 'glass');
    } else if (settings.theme === 'matrix') {
      root.classList.add('dark');
      root.setAttribute('data-theme', 'matrix');
    } else if (settings.theme === 'aiox') {
      root.classList.add('dark');
      root.setAttribute('data-theme', 'aiox');
    } else {
      root.classList.toggle('dark', settings.theme === 'dark');
    }
  }, [settings.theme]);

  return (
    <div className="h-full flex flex-col bg-[var(--bg-base)]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[var(--border-subtle)]">
        <div>
          <span className="text-detail uppercase tracking-[0.2em] block mb-1 text-gold">Configuration</span>
          <h2 className="text-sm font-light text-text-primary">Settings</h2>
        </div>
        <button
          onClick={resetToDefaults}
          className="flex items-center gap-1.5 px-3 py-1.5 text-label border transition-luxury hover:opacity-80 text-text-secondary border-[var(--border)] bg-[var(--bg-hover)]"
        >
          <RotateCcw className="h-3 w-3" />
          Reset
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-refined">
        {/* Appearance Section */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <span className="text-detail uppercase tracking-[0.2em] text-gold">Appearance</span>
            <div className="flex-1 h-px gold-line" />
          </div>

          <div className="space-y-4">
            {/* Theme */}
            <div>
              <label className="text-label uppercase tracking-wider mb-3 block text-text-muted">Theme</label>
              <div className="flex gap-2">
                {THEME_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  const isSelected = settings.theme === option.value;
                  return (
                    <button
                      key={option.value}
                      onClick={() => setTheme(option.value)}
                      className="flex items-center gap-2 px-4 py-2 border transition-luxury"
                      style={{
                        borderColor: isSelected ? 'var(--border-gold)' : 'var(--border-subtle)',
                        backgroundColor: isSelected ? 'var(--accent-gold-bg)' : 'var(--bg-hover)',
                        color: isSelected ? 'var(--accent-gold)' : 'var(--text-muted)',
                      }}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="text-label">{option.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* Data Section */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <span className="text-detail uppercase tracking-[0.2em] text-gold">Data</span>
            <div className="flex-1 h-px gold-line" />
          </div>

          <div className="space-y-4">
            {/* Mock Data Toggle */}
            <div
              className="flex items-center justify-between p-4 border bg-[var(--status-warning-bg)] border-[var(--status-warning-border)]"
            >
              <div>
                <label className="text-label font-medium text-status-warning">Demo Mode</label>
                <p className="text-detail mt-0.5 text-text-muted">
                  Use mock data for visualization
                </p>
              </div>
              <button
                onClick={() => setUseMockData(!settings.useMockData)}
                className="relative w-11 h-6 transition-luxury"
                style={{ backgroundColor: settings.useMockData ? 'var(--status-warning)' : 'var(--border)' }}
              >
                <span
                  className={cn(
                    'absolute top-1 w-4 h-4 bg-white transition-luxury',
                    settings.useMockData ? 'left-6' : 'left-1'
                  )}
                />
              </button>
            </div>

            {/* Stories Path */}
            <div>
              <label className="text-label uppercase tracking-wider mb-2 block text-text-muted">
                Stories Directory
              </label>
              <input
                type="text"
                value={settings.storiesPath}
                onChange={(e) => setStoriesPath(e.target.value)}
                disabled={settings.useMockData}
                className={cn(
                  'w-full px-3 py-2 border text-label focus:outline-none transition-colors text-text-secondary border-[var(--border)] bg-[var(--bg-hover)]',
                  settings.useMockData && 'opacity-40 cursor-not-allowed'
                )}
                placeholder="docs/stories"
              />
              <p className="text-detail mt-1.5 text-border">
                Relative path from project root
              </p>
            </div>

            {/* Auto Refresh */}
            <div
              className="flex items-center justify-between p-4 border bg-[var(--bg-hover)] border-[var(--border-subtle)]"
            >
              <div>
                <label className="text-label font-medium text-text-secondary">Auto Refresh</label>
                <p className="text-detail mt-0.5 text-text-muted">
                  Automatically refresh data
                </p>
              </div>
              <button
                onClick={() => setAutoRefresh(!settings.autoRefresh)}
                className="relative w-11 h-6 transition-luxury"
                style={{ backgroundColor: settings.autoRefresh ? 'var(--status-success)' : 'var(--border)' }}
              >
                <span
                  className={cn(
                    'absolute top-1 w-4 h-4 bg-white transition-luxury',
                    settings.autoRefresh ? 'left-6' : 'left-1'
                  )}
                />
              </button>
            </div>

            {/* Refresh Interval */}
            {settings.autoRefresh && (
              <div>
                <label className="text-label uppercase tracking-wider mb-2 block text-text-muted">
                  Refresh Interval
                </label>
                <select
                  value={settings.refreshInterval}
                  onChange={(e) => setRefreshInterval(Number(e.target.value))}
                  className="w-full px-3 py-2 border text-label focus:outline-none transition-colors cursor-pointer text-text-secondary border-[var(--border)] bg-[var(--bg-surface)]"
                >
                  {REFRESH_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </section>

        {/* Agents Section */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <span className="text-detail uppercase tracking-[0.2em] text-gold">Agent Colors</span>
            <div className="flex-1 h-px gold-line" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {(Object.keys(AGENT_CONFIG) as AgentId[]).map((agentId) => {
              const config = AGENT_CONFIG[agentId];
              return (
                <div
                  key={agentId}
                  className="flex items-center gap-3 p-3 border transition-colors hover:border-[rgba(255,255,255,0.08)] bg-[var(--bg-hover)] border-[var(--border-subtle)]"
                >
                  {(() => {
                    const IconComponent = iconMap[config.icon];
                    return IconComponent ? <IconComponent className="h-4 w-4" style={{ color: config.color }} /> : null;
                  })()}
                  <span className="flex-1 text-label font-light text-text-tertiary">@{agentId}</span>
                  <input
                    type="color"
                    value={settings.agentColors[agentId] || '#888888'}
                    onChange={(e) => setAgentColor(agentId, e.target.value)}
                    className="w-6 h-6 cursor-pointer border-0 bg-transparent"
                  />
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* Footer */}
      <div
        className="px-4 py-2 border-t border-[var(--border-subtle)] bg-[var(--bg-elevated)]"
      >
        <p className="text-detail text-center text-border">
          Settings are automatically saved to localStorage
        </p>
      </div>
    </div>
  );
}
