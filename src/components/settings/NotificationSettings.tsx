import { GlassCard } from '../ui';
import { useNotificationPrefsStore } from '../../stores/notificationPrefsStore';
import { useToastStore } from '../../stores/toastStore';
import { SettingToggle } from './SettingsHelpers';

export function NotificationSettings() {
  const prefs = useNotificationPrefsStore();
  const enableDesktop = useToastStore((s) => s.enableDesktopNotifications);

  const handlePushToggle = async (enabled: boolean) => {
    prefs.setPref('pushEnabled', enabled);
    if (enabled) {
      await enableDesktop();
    } else {
      useToastStore.getState().setDesktopNotifications(false);
    }
  };

  return (
    <div className="space-y-6">
      <GlassCard>
        <h2 className="text-lg font-semibold text-primary mb-4">Notificações Push</h2>

        <div className="space-y-4">
          <SettingToggle
            label="Ativar notificações"
            description="Receber notificações no navegador"
            defaultChecked={prefs.pushEnabled}
            onChange={handlePushToggle}
          />

          <SettingToggle
            label="Sons"
            description="Tocar som ao receber notificação"
            defaultChecked={prefs.soundEnabled}
            onChange={(v) => prefs.setPref('soundEnabled', v)}
          />
        </div>
      </GlassCard>

      <GlassCard>
        <h2 className="text-lg font-semibold text-primary mb-4">Tipos de Notificação</h2>

        <div className="space-y-4">
          <SettingToggle
            label="Execuções concluídas"
            description="Quando um agent terminar uma tarefa"
            defaultChecked={prefs.executionComplete}
            onChange={(v) => prefs.setPref('executionComplete', v)}
          />

          <SettingToggle
            label="Erros"
            description="Quando ocorrer um erro de execução"
            defaultChecked={prefs.errors}
            onChange={(v) => prefs.setPref('errors', v)}
          />

          <SettingToggle
            label="Mensagens de agents"
            description="Quando um agent enviar uma mensagem"
            defaultChecked={prefs.agentMessages}
            onChange={(v) => prefs.setPref('agentMessages', v)}
          />

          <SettingToggle
            label="Atualizações do sistema"
            description="Novidades e atualizações da plataforma"
            defaultChecked={prefs.systemUpdates}
            onChange={(v) => prefs.setPref('systemUpdates', v)}
          />
        </div>
      </GlassCard>

      <GlassCard>
        <h2 className="text-lg font-semibold text-primary mb-4">Email</h2>

        <div className="space-y-4">
          <SettingToggle
            label="Resumo diário"
            description="Receber resumo das atividades por email"
            defaultChecked={prefs.dailySummary}
            onChange={(v) => prefs.setPref('dailySummary', v)}
          />

          <SettingToggle
            label="Alertas importantes"
            description="Receber alertas críticos por email"
            defaultChecked={prefs.criticalAlerts}
            onChange={(v) => prefs.setPref('criticalAlerts', v)}
          />
        </div>
      </GlassCard>
    </div>
  );
}
