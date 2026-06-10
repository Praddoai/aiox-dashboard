import { useState, useRef } from 'react';
import { GlassCard, GlassButton, GlassInput } from '../ui';
import { useToast } from '../ui/Toast';
import { SettingRow } from './SettingsHelpers';

export function ProfileSettings() {
  const [name, setName] = useState('Rafael Costa');
  const [email, setEmail] = useState('rafael@example.com');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { success, error: showError } = useToast();

  const handleSave = () => {
    success('Salvo!', 'Perfil atualizado com sucesso');
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showError('Formato inválido', 'Selecione um arquivo JPG ou PNG');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      showError('Arquivo muito grande', 'O tamanho máximo é 2MB');
      return;
    }

    const url = URL.createObjectURL(file);
    setAvatarUrl(url);
    success('Foto atualizada', 'A foto do perfil foi alterada');
  };

  return (
    <div className="space-y-6">
      <GlassCard>
        {/* Avatar */}
        <div className="flex items-center gap-4 mb-6">
          <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-2xl font-bold overflow-hidden">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
            ) : (
              name.split(' ').map(n => n[0]).join('').slice(0, 2)
            )}
          </div>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png"
              className="hidden"
              onChange={handlePhotoChange}
            />
            <GlassButton variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()}>
              Alterar foto
            </GlassButton>
            <p className="text-xs text-tertiary mt-1">JPG, PNG. Max 2MB</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-secondary mb-2">Nome completo</label>
            <GlassInput
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Seu nome"
            />
          </div>

          <div>
            <label className="block text-sm text-secondary mb-2">Email</label>
            <GlassInput
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
            />
          </div>
        </div>
      </GlassCard>

      <GlassCard>
        <h2 className="text-lg font-semibold text-primary mb-4">Preferências de Conta</h2>

        <div className="space-y-4">
          <SettingRow
            label="Idioma"
            description="Idioma da interface"
            action={
              <select className="p-2 rounded-lg text-sm border border-white/10 bg-[#1a1a1a] text-white cursor-pointer" aria-label="Selecionar idioma">
                <option value="pt-BR">Português (BR)</option>
                <option value="en">English</option>
                <option value="es">Español</option>
              </select>
            }
          />

          <SettingRow
            label="Fuso horário"
            description="Para exibição de datas e horários"
            action={
              <select className="p-2 rounded-lg text-sm border border-white/10 bg-[#1a1a1a] text-white cursor-pointer" aria-label="Selecionar fuso horário">
                <option value="America/Sao_Paulo">São Paulo (GMT-3)</option>
                <option value="America/New_York">New York (GMT-5)</option>
                <option value="Europe/London">London (GMT+0)</option>
              </select>
            }
          />
        </div>
      </GlassCard>

      <div className="flex justify-end">
        <GlassButton variant="primary" onClick={handleSave}>
          Salvar alterações
        </GlassButton>
      </div>
    </div>
  );
}
