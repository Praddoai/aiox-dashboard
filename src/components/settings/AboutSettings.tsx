import { GlassCard, GlassButton } from '../ui';
import { InfoRow, LinkRow } from './SettingsHelpers';

export function AboutSettings() {
  return (
    <div className="space-y-6">
      <GlassCard>
        <div className="text-center py-4">
          <div className="h-20 w-20 mx-auto rounded-2xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg mb-4">
            <span className="text-white font-bold text-3xl">A</span>
          </div>
          <h2 className="text-2xl font-bold text-primary">AIOS Core</h2>
          <p className="text-secondary">Platform v1.0.0</p>
        </div>
      </GlassCard>

      <GlassCard>
        <h2 className="text-lg font-semibold text-primary mb-4">Informações do Sistema</h2>

        <div className="space-y-3">
          <InfoRow label="Versão" value="1.0.0" />
          <InfoRow label="Build" value="2024.02.03" />
          <InfoRow label="React" value="18.3.1" />
          <InfoRow label="Node" value="20.x" />
        </div>
      </GlassCard>

      <GlassCard>
        <h2 className="text-lg font-semibold text-primary mb-4">Links Úteis</h2>

        <div className="space-y-2">
          <LinkRow label="Documentação" href="#" />
          <LinkRow label="GitHub" href="#" />
          <LinkRow label="Changelog" href="#" />
          <LinkRow label="Suporte" href="#" />
          <LinkRow label="Termos de Uso" href="#" />
          <LinkRow label="Política de Privacidade" href="#" />
        </div>
      </GlassCard>

      <GlassCard>
        <h2 className="text-lg font-semibold text-primary mb-4">Licenças</h2>
        <p className="text-sm text-secondary">
          Este software utiliza bibliotecas open source. Veja a lista completa de licenças na documentação.
        </p>
        <GlassButton variant="ghost" size="sm" className="mt-3">
          Ver licenças
        </GlassButton>
      </GlassCard>
    </div>
  );
}
