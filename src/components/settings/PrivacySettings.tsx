import { GlassCard, GlassButton } from '../ui';
import { useToast } from '../ui/Toast';
import { SettingToggle } from './SettingsHelpers';

export function PrivacySettings() {
  const { success } = useToast();

  return (
    <div className="space-y-6">
      <GlassCard>
        <h2 className="text-lg font-semibold text-primary mb-4">Dados e Privacidade</h2>

        <div className="space-y-4">
          <SettingToggle
            label="Salvar histórico"
            description="Manter histórico de conversas localmente"
            defaultChecked={true}
          />

          <SettingToggle
            label="Analytics"
            description="Enviar dados de uso anônimos para melhorias"
            defaultChecked={false}
          />

          <SettingToggle
            label="Logs de debug"
            description="Armazenar logs para diagnóstico"
            defaultChecked={false}
          />
        </div>
      </GlassCard>

      <GlassCard>
        <h2 className="text-lg font-semibold text-primary mb-4">Gerenciar Dados</h2>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-xl glass-subtle">
            <div>
              <p className="text-primary font-medium">Exportar dados</p>
              <p className="text-xs text-tertiary">Baixar todos os seus dados</p>
            </div>
            <GlassButton variant="ghost" size="sm">
              Exportar
            </GlassButton>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl glass-subtle">
            <div>
              <p className="text-primary font-medium">Limpar histórico</p>
              <p className="text-xs text-tertiary">Remover todas as conversas</p>
            </div>
            <GlassButton
              variant="ghost"
              size="sm"
              className="text-red-500 hover:bg-red-500/10"
              onClick={() => success('Histórico limpo', 'Todas as conversas foram removidas')}
            >
              Limpar
            </GlassButton>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl border border-red-500/20 bg-red-500/5">
            <div>
              <p className="text-red-400 font-medium">Excluir conta</p>
              <p className="text-xs text-tertiary">Remover permanentemente sua conta</p>
            </div>
            <GlassButton
              variant="ghost"
              size="sm"
              className="text-red-500 hover:bg-red-500/10"
            >
              Excluir
            </GlassButton>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
