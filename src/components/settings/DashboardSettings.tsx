import { GlassCard, GlassButton } from '../ui';
import { useSettingsStore } from '../../stores/settingsStore';
import { useToast } from '../ui/Toast';
import { cn } from '../../lib/utils';
import { SettingRow, SettingToggle } from './SettingsHelpers';

const intervalOptions = [
  { value: 10, label: '10s' },
  { value: 30, label: '30s' },
  { value: 60, label: '1 min' },
  { value: 300, label: '5 min' },
];

export function DashboardSettings() {
  const {
    autoRefresh,
    setAutoRefresh,
    refreshInterval,
    setRefreshInterval,
    agentColors,
    setAgentColor,
    resetToDefaults,
  } = useSettingsStore();
  const { success } = useToast();

  return (
    <div className="space-y-6">
      {/* Auto Refresh */}
      <GlassCard>
        <h2 className="text-lg font-semibold text-primary mb-4">Auto Refresh</h2>
        <div className="space-y-4">
          <SettingToggle
            label="Atualização automática"
            description="Atualiza dados das views periodicamente"
            defaultChecked={autoRefresh}
            onChange={setAutoRefresh}
          />
          <div className={cn(!autoRefresh && 'opacity-50 pointer-events-none')}>
            <SettingRow
              label="Intervalo"
              description="Frequência de atualização"
              action={
                <div className="flex gap-1">
                  {intervalOptions.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setRefreshInterval(opt.value)}
                      disabled={!autoRefresh}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-xs transition-colors',
                        refreshInterval === opt.value
                          ? 'bg-blue-500 text-white'
                          : 'bg-white/10 text-secondary hover:bg-white/20'
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              }
            />
          </div>
        </div>
      </GlassCard>

      {/* Agent Colors */}
      <GlassCard>
        <h2 className="text-lg font-semibold text-primary mb-4">Cores dos Agentes</h2>
        <div className="grid grid-cols-2 gap-3">
          {agentColors.map((agent) => (
            <div
              key={agent.id}
              className="flex items-center gap-3 p-3 rounded-xl glass-subtle"
            >
              <input
                type="color"
                value={agent.color}
                onChange={(e) => setAgentColor(agent.id, e.target.value)}
                className="h-8 w-8 rounded-lg cursor-pointer border-0 bg-transparent"
                aria-label={`Cor do agente ${agent.label}`}
              />
              <div>
                <p className="text-sm text-primary font-medium">{agent.label}</p>
                <p className="text-[10px] text-tertiary font-mono">{agent.color}</p>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Reset */}
      <div className="flex justify-end">
        <GlassButton
          variant="ghost"
          onClick={() => {
            resetToDefaults();
            success('Restaurado', 'Configurações restauradas ao padrão');
          }}
          className="text-red-400 hover:bg-red-500/10"
        >
          Restaurar padrões
        </GlassButton>
      </div>
    </div>
  );
}
