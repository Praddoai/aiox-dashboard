'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ThemeToggleSwitch } from '@/components/ui/ThemeToggle';
import { useUIStore, type SettingsSection } from '@/stores/uiStore';
import { useSettingsStore } from '@/stores/settings-store';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';
import { ThemeIcons } from '@/lib/icons';
import { CategoryManager } from './CategoryManager';
import { MemoryManager } from './MemoryManager';
import { WorkflowManager } from './WorkflowManager';
import { apiClient } from '@/services/api/client';

// Icons
const UserIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const KeyIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
  </svg>
);

const PaletteIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
    <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
    <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
    <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
    <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.555C21.965 6.012 17.461 2 12 2z" />
  </svg>
);

const BellIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

const ShieldIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const InfoIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);

const ChevronRightIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

const RefreshIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="23 4 23 10 17 10" />
    <polyline points="1 20 1 14 7 14" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </svg>
);

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const EyeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeOffIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

const LayersIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="12 2 2 7 12 12 22 7 12 2" />
    <polyline points="2 17 12 22 22 17" />
    <polyline points="2 12 12 17 22 12" />
  </svg>
);

const BrainIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z" />
    <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z" />
  </svg>
);

const WorkflowIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="5" r="3" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <circle cx="6" cy="19" r="3" />
    <circle cx="18" cy="19" r="3" />
    <line x1="12" y1="12" x2="6" y2="16" />
    <line x1="12" y1="12" x2="18" y2="16" />
  </svg>
);

const DashboardIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="7" height="9" rx="1" />
    <rect x="14" y="3" width="7" height="5" rx="1" />
    <rect x="14" y="12" width="7" height="9" rx="1" />
    <rect x="3" y="16" width="7" height="5" rx="1" />
  </svg>
);

// Section configurations for header display
interface SectionConfig {
  id: SettingsSection;
  label: string;
  icon: React.ReactNode;
  description: string;
}

const settingsSections: SectionConfig[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <DashboardIcon />, description: 'Demo mode, refresh e cores de agentes' },
  { id: 'categories', label: 'Categorias & Squads', icon: <LayersIcon />, description: 'Organize squads em categorias' },
  { id: 'memory', label: 'Memórias', icon: <BrainIcon />, description: 'Gerencie memórias de AI' },
  { id: 'workflows', label: 'Workflows', icon: <WorkflowIcon />, description: 'Visualize fluxos de trabalho' },
  { id: 'profile', label: 'Perfil', icon: <UserIcon />, description: 'Informações da conta' },
  { id: 'api', label: 'API Keys', icon: <KeyIcon />, description: 'Chaves de API dos provedores' },
  { id: 'appearance', label: 'Aparência', icon: <PaletteIcon />, description: 'Tema e personalização' },
  { id: 'notifications', label: 'Notificações', icon: <BellIcon />, description: 'Alertas e avisos' },
  { id: 'privacy', label: 'Privacidade', icon: <ShieldIcon />, description: 'Dados e segurança' },
  { id: 'about', label: 'Sobre', icon: <InfoIcon />, description: 'Informações do sistema' },
];

export function SettingsPage() {
  const { settingsSection, setSettingsSection } = useUIStore();

  const renderContent = () => {
    switch (settingsSection) {
      case 'dashboard':
        return <DashboardSettings />;
      case 'categories':
        return <CategoryManager />;
      case 'memory':
        return <MemoryManager />;
      case 'workflows':
        return <WorkflowManager />;
      case 'profile':
        return <ProfileSettings />;
      case 'api':
        return <APISettings />;
      case 'appearance':
        return <AppearanceSettings />;
      case 'notifications':
        return <NotificationSettings />;
      case 'privacy':
        return <PrivacySettings />;
      case 'about':
        return <AboutSettings />;
      default:
        return null;
    }
  };

  const currentSection = settingsSections.find(s => s.id === settingsSection);

  return (
    <div className="h-full flex overflow-hidden">
      {/* Section Navigation */}
      <nav className="w-52 flex-shrink-0 border-r border-glass-10 pr-3 mr-4 overflow-y-auto glass-scrollbar">
        <ul className="space-y-1">
          {settingsSections.map((section) => {
            const isActive = settingsSection === section.id;
            return (
              <li key={section.id}>
                <button
                  onClick={() => setSettingsSection(section.id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all',
                    isActive
                      ? 'bg-blue-500/15 text-blue-400'
                      : 'text-secondary hover:text-primary hover:bg-glass-5'
                  )}
                >
                  <span className={cn('flex-shrink-0', isActive ? 'text-blue-400' : 'text-tertiary')}>
                    {section.icon}
                  </span>
                  <span className="text-sm font-medium truncate">{section.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Section Header */}
        <div className="flex items-center gap-3 mb-4 pb-4 border-b border-glass-10 flex-shrink-0">
          <div className="text-blue-500">{currentSection?.icon}</div>
          <div>
            <h2 className="text-lg font-semibold text-primary">{currentSection?.label}</h2>
            <p className="text-xs text-tertiary">{currentSection?.description}</p>
          </div>
        </div>

        {/* Section Content */}
        <div className="flex-1 overflow-y-auto glass-scrollbar pr-2">
          <AnimatePresence mode="wait">
            <motion.div
              key={settingsSection}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// Dashboard Settings (Auto Refresh, Agent Colors)
function DashboardSettings() {
  const {
    settings: { autoRefresh, refreshInterval, storiesPath, agentColors },
    setAutoRefresh,
    setRefreshInterval,
    setStoriesPath,
    setAgentColor,
    resetToDefaults,
  } = useSettingsStore();
  const { success } = useToast();

  const intervalOptions = [
    { value: 10, label: '10s' },
    { value: 30, label: '30s' },
    { value: 60, label: '1 min' },
    { value: 300, label: '5 min' },
  ];

  return (
    <div className="space-y-6">
      {/* Auto Refresh */}
      <Card>
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
                          ? 'bg-blue-500 text-foreground-primary'
                          : 'bg-glass-10 text-secondary hover:bg-glass-20'
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
      </Card>

      {/* Agent Colors */}
      <Card>
        <h2 className="text-lg font-semibold text-primary mb-4">Cores dos Agentes</h2>
        <div className="grid grid-cols-2 gap-3">
          {Object.entries(agentColors).map(([id, color]) => (
            <div
              key={id}
              className="flex items-center gap-3 p-3 rounded-xl glass-subtle"
            >
              <input
                type="color"
                value={color}
                onChange={(e) => setAgentColor(id, e.target.value)}
                className="h-8 w-8 rounded-lg cursor-pointer border-0 bg-transparent"
              />
              <div>
                <p className="text-sm text-primary font-medium">@{id}</p>
                <p className="text-[10px] text-tertiary font-mono">{color}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Reset */}
      <div className="flex justify-end">
        <Button
          variant="ghost"
          onClick={() => {
            resetToDefaults();
            success('Restaurado', 'Configurações restauradas ao padrão');
          }}
          className="text-red-400 hover:bg-red-500/10"
        >
          Restaurar padrões
        </Button>
      </div>
    </div>
  );
}

// Profile Settings
function ProfileSettings() {
  const [name, setName] = useState('Rafael Costa');
  const [email, setEmail] = useState('rafael@example.com');
  const { success } = useToast();

  const handleSave = () => {
    success('Salvo!', 'Perfil atualizado com sucesso');
  };

  return (
    <div className="space-y-6">
      <Card>
        {/* Avatar */}
        <div className="flex items-center gap-4 mb-6">
          <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-foreground-primary text-2xl font-bold">
            {name.split(' ').map(n => n[0]).join('').slice(0, 2)}
          </div>
          <div>
            <Button variant="ghost" size="sm">
              Alterar foto
            </Button>
            <p className="text-xs text-tertiary mt-1">JPG, PNG. Max 2MB</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-secondary mb-2">Nome completo</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Seu nome"
            />
          </div>

          <div>
            <label className="block text-sm text-secondary mb-2">Email</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
            />
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-primary mb-4">Preferências de Conta</h2>

        <div className="space-y-4">
          <SettingRow
            label="Idioma"
            description="Idioma da interface"
            action={
              <select className="p-2 rounded-lg glass-subtle text-primary bg-transparent border border-glass-10 text-sm">
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
              <select className="p-2 rounded-lg glass-subtle text-primary bg-transparent border border-glass-10 text-sm">
                <option value="America/Sao_Paulo">São Paulo (GMT-3)</option>
                <option value="America/New_York">New York (GMT-5)</option>
                <option value="Europe/London">London (GMT+0)</option>
              </select>
            }
          />
        </div>
      </Card>

      <div className="flex justify-end">
        <Button variant="default" onClick={handleSave}>
          Salvar alterações
        </Button>
      </div>
    </div>
  );
}

// API Key Provider configuration
interface APIKeyProvider {
  id: string;
  name: string;
  description: string;
  placeholder: string;
  color: string;
  icon: string;
  category: 'llm' | 'database' | 'scraper' | 'messaging' | 'crm' | 'other';
  envVar?: string;
}

const predefinedProviders: APIKeyProvider[] = [
  // LLM Providers
  { id: 'anthropic', name: 'Claude (Anthropic)', description: 'claude.ai/api', placeholder: 'sk-ant-api03-...', color: 'purple', icon: 'C', category: 'llm', envVar: 'ANTHROPIC_API_KEY' },
  { id: 'openai', name: 'OpenAI', description: 'platform.openai.com', placeholder: 'sk-...', color: 'green', icon: 'O', category: 'llm', envVar: 'OPENAI_API_KEY' },
  // Google Services
  { id: 'google-ads', name: 'Google Ads', description: 'ads.google.com', placeholder: 'Developer Token', color: 'blue', icon: 'GA', category: 'other', envVar: 'GOOGLE_ADS_DEVELOPER_TOKEN' },
  { id: 'google-analytics', name: 'Google Analytics 4', description: 'analytics.google.com', placeholder: 'G-XXXXXXXXXX', color: 'orange', icon: 'G4', category: 'other', envVar: 'GA4_MEASUREMENT_ID' },
  { id: 'google-gtm', name: 'Google Tag Manager', description: 'tagmanager.google.com', placeholder: 'GTM-XXXXXXX', color: 'blue', icon: 'TM', category: 'other', envVar: 'GTM_CONTAINER_ID' },
  // Database
  { id: 'supabase', name: 'Supabase', description: 'supabase.com', placeholder: 'eyJ...', color: 'emerald', icon: 'S', category: 'database', envVar: 'SUPABASE_KEY' },
  { id: 'qdrant', name: 'Qdrant', description: 'qdrant.tech', placeholder: 'api-key...', color: 'red', icon: 'Q', category: 'database', envVar: 'QDRANT_API_KEY' },
  // Scraper
  { id: 'apify', name: 'Apify', description: 'apify.com', placeholder: 'apify_api_...', color: 'cyan', icon: 'A', category: 'scraper', envVar: 'APIFY_API_TOKEN' },
  // Messaging
  { id: 'telegram', name: 'Telegram Bot', description: 'telegram.org', placeholder: '123456:ABC-...', color: 'blue', icon: 'T', category: 'messaging', envVar: 'TELEGRAM_BOT_TOKEN' },
  // CRM
  { id: 'activecampaign', name: 'ActiveCampaign', description: 'activecampaign.com', placeholder: 'api-key...', color: 'indigo', icon: 'AC', category: 'crm', envVar: 'ACTIVECAMPAIGN_API_KEY' },
  { id: 'clickup', name: 'ClickUp', description: 'clickup.com', placeholder: 'pk_...', color: 'pink', icon: 'CU', category: 'other', envVar: 'CLICKUP_API_TOKEN' },
];

const colorClasses: Record<string, { border: string; bg: string; text: string; iconBg: string }> = {
  purple: { border: 'border-purple-500/20', bg: 'bg-purple-500/5', text: 'text-purple-400', iconBg: 'bg-purple-500/20' },
  green: { border: 'border-green-500/20', bg: 'bg-green-500/5', text: 'text-green-400', iconBg: 'bg-green-500/20' },
  emerald: { border: 'border-emerald-500/20', bg: 'bg-emerald-500/5', text: 'text-emerald-400', iconBg: 'bg-emerald-500/20' },
  red: { border: 'border-red-500/20', bg: 'bg-red-500/5', text: 'text-red-400', iconBg: 'bg-red-500/20' },
  cyan: { border: 'border-cyan-500/20', bg: 'bg-cyan-500/5', text: 'text-cyan-400', iconBg: 'bg-cyan-500/20' },
  blue: { border: 'border-blue-500/20', bg: 'bg-blue-500/5', text: 'text-blue-400', iconBg: 'bg-blue-500/20' },
  indigo: { border: 'border-indigo-500/20', bg: 'bg-indigo-500/5', text: 'text-indigo-400', iconBg: 'bg-indigo-500/20' },
  pink: { border: 'border-pink-500/20', bg: 'bg-pink-500/5', text: 'text-pink-400', iconBg: 'bg-pink-500/20' },
  orange: { border: 'border-orange-500/20', bg: 'bg-orange-500/5', text: 'text-orange-400', iconBg: 'bg-orange-500/20' },
  yellow: { border: 'border-yellow-500/20', bg: 'bg-yellow-500/5', text: 'text-yellow-400', iconBg: 'bg-yellow-500/20' },
  gray: { border: 'border-gray-500/20', bg: 'bg-gray-500/5', text: 'text-gray-400', iconBg: 'bg-gray-500/20' },
};

const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const TrashIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

interface StoredAPIKey {
  id: string;
  providerId: string;
  name: string;
  value: string;
  color: string;
  icon: string;
  isCustom: boolean;
}

// Environment variable status type
interface EnvVarStatus {
  [key: string]: {
    isSet: boolean;
    preview?: string;
  };
}

// API Settings
function APISettings() {
  const { success, error: showError } = useToast();

  // Fetch environment variables status from API
  const { data: envVarsStatus, refetch: refetchEnvVars } = useQuery<EnvVarStatus>({
    queryKey: ['env-vars-status'],
    queryFn: async () => {
      try {
        const response = await apiClient.get<{ envVars: EnvVarStatus }>('/system/env-vars');
        return response.envVars || {};
      } catch {
        return {};
      }
    },
    staleTime: 60000,
  });

  // Load saved keys from localStorage
  const [apiKeys, setApiKeys] = useState<StoredAPIKey[]>(() => {
    if (typeof window === 'undefined') return [];
    const saved = localStorage.getItem('aios-api-keys');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return [];
      }
    }
    return predefinedProviders.slice(0, 2).map(p => ({
      id: p.id,
      providerId: p.id,
      name: p.name,
      value: '',
      color: p.color,
      icon: p.icon,
      isCustom: false,
    }));
  });

  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const toggleKeyVisibility = (keyId: string) => {
    setVisibleKeys((prev) => {
      const next = new Set(prev);
      if (next.has(keyId)) {
        next.delete(keyId);
      } else {
        next.add(keyId);
      }
      return next;
    });
  };

  const updateKeyValue = (keyId: string, value: string) => {
    setApiKeys((prev) =>
      prev.map((k) => (k.id === keyId ? { ...k, value } : k))
    );
  };

  const deleteKey = (keyId: string) => {
    setApiKeys((prev) => prev.filter((k) => k.id !== keyId));
    success('Removido', 'API Key removida');
  };

  const addProvider = (provider: APIKeyProvider) => {
    const exists = apiKeys.some((k) => k.providerId === provider.id);
    if (exists) {
      showError('Já existe', `${provider.name} já foi adicionado`);
      return;
    }

    setApiKeys((prev) => [
      ...prev,
      {
        id: `${provider.id}-${Date.now()}`,
        providerId: provider.id,
        name: provider.name,
        value: '',
        color: provider.color,
        icon: provider.icon,
        isCustom: false,
      },
    ]);
    setShowAddModal(false);
    success('Adicionado', `${provider.name} adicionado`);
  };

  const addCustomKey = (name: string, color: string) => {
    setApiKeys((prev) => [
      ...prev,
      {
        id: `custom-${Date.now()}`,
        providerId: 'custom',
        name,
        value: '',
        color,
        icon: name.charAt(0).toUpperCase(),
        isCustom: true,
      },
    ]);
    setShowAddModal(false);
    success('Adicionado', `${name} adicionado`);
  };

  const handleSaveKeys = () => {
    localStorage.setItem('aios-api-keys', JSON.stringify(apiKeys));
    success('Salvo!', 'API Keys salvas com sucesso');
  };

  const availableProviders = predefinedProviders.filter(
    (p) => !apiKeys.some((k) => k.providerId === p.id)
  );

  const filteredProviders = selectedCategory === 'all'
    ? availableProviders
    : availableProviders.filter((p) => p.category === selectedCategory);

  const isEnvVarSet = (envVar?: string): boolean => {
    if (!envVar || !envVarsStatus) return false;
    return envVarsStatus[envVar]?.isSet || false;
  };

  const getEnvVarPreview = (envVar?: string): string | undefined => {
    if (!envVar || !envVarsStatus) return undefined;
    return envVarsStatus[envVar]?.preview;
  };

  const envVarCount = predefinedProviders.filter(p => p.envVar && isEnvVarSet(p.envVar)).length;
  const manualCount = apiKeys.filter(k => k.value).length;

  return (
    <div className="space-y-6">
      {/* Sync Status Banner */}
      <Card className="!bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-blue-500/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-blue-400">
                <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
              </svg>
            </div>
            <div>
              <p className="text-primary font-medium">Sincronização de Chaves</p>
              <p className="text-xs text-tertiary">
                {envVarCount > 0 ? (
                  <>
                    <span className="text-green-400">{envVarCount} via env</span>
                    {manualCount > 0 && <span className="text-secondary"> • {manualCount} manual</span>}
                  </>
                ) : (
                  <span>As chaves podem ser configuradas via variáveis de ambiente ou manualmente</span>
                )}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetchEnvVars()}
            title="Verificar variáveis de ambiente"
          >
            <RefreshIcon />
            <span className="ml-1 text-xs">Sincronizar</span>
          </Button>
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm text-tertiary">
              Configure suas chaves de API. Chaves via variáveis de ambiente têm prioridade.
            </p>
          </div>
          <Button variant="default" size="sm" onClick={() => setShowAddModal(true)}>
            <PlusIcon />
            <span className="ml-1">Adicionar</span>
          </Button>
        </div>

        <div className="space-y-4">
          {apiKeys.length === 0 ? (
            <div className="text-center py-8 text-tertiary">
              <p>Nenhuma API Key configurada</p>
              <p className="text-xs mt-1">Clique em "Adicionar" para começar</p>
            </div>
          ) : (
            apiKeys.map((key) => {
              const colors = colorClasses[key.color] || colorClasses.gray;
              const isVisible = visibleKeys.has(key.id);
              const provider = predefinedProviders.find((p) => p.id === key.providerId);
              const hasEnvVar = provider?.envVar && isEnvVarSet(provider.envVar);
              const envPreview = provider?.envVar ? getEnvVarPreview(provider.envVar) : undefined;

              return (
                <div
                  key={key.id}
                  className={cn(
                    'p-4 rounded-xl border',
                    hasEnvVar ? 'border-green-500/30 bg-green-500/5' : colors.border,
                    !hasEnvVar && colors.bg
                  )}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center', colors.iconBg)}>
                      <span className={cn('font-bold text-sm', colors.text)}>{key.icon}</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-primary font-medium">{key.name}</p>
                        {hasEnvVar && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] bg-green-500/20 text-green-400 border border-green-500/30">
                            ENV
                          </span>
                        )}
                      </div>
                      {provider && (
                        <p className="text-xs text-tertiary">{provider.description}</p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteKey(key.id)}
                      className="text-red-400 hover:bg-red-500/10"
                      title="Remover"
                    >
                      <TrashIcon />
                    </Button>
                  </div>

                  {hasEnvVar ? (
                    <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                      <div className="flex items-center gap-2 mb-1">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green-400">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        <span className="text-xs text-green-400 font-medium">Configurado via variável de ambiente</span>
                      </div>
                      <p className="text-[10px] text-green-400/70">
                        <code className="bg-green-500/10 px-1 rounded">{provider?.envVar}</code>
                        {envPreview && <span className="ml-2">= {envPreview}</span>}
                      </p>
                      <p className="text-[10px] text-tertiary mt-1">
                        Para alterar, atualize a variável de ambiente no servidor
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="relative">
                        <Input
                          type={isVisible ? 'text' : 'password'}
                          value={key.value}
                          onChange={(e) => updateKeyValue(key.id, e.target.value)}
                          placeholder={provider?.placeholder || 'Sua API key...'}
                          className="pr-10"
                        />
                        <button
                          onClick={() => toggleKeyVisibility(key.id)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-tertiary hover:text-primary"
                        >
                          {isVisible ? <EyeOffIcon /> : <EyeIcon />}
                        </button>
                      </div>
                      {provider?.envVar && (
                        <p className="text-[10px] text-tertiary mt-2">
                          Ou defina a variável: <code className="bg-glass-10 px-1 rounded">{provider.envVar}</code>
                        </p>
                      )}
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-primary mb-4">Configurações de Modelo</h2>

        <div className="space-y-4">
          <SettingRow
            label="Modelo padrão"
            description="Modelo usado quando não especificado"
            action={
              <select className="p-2 rounded-lg glass-subtle text-primary bg-transparent border border-glass-10 text-sm">
                <option value="claude-sonnet">Claude Sonnet 4</option>
                <option value="claude-opus">Claude Opus 4</option>
                <option value="gpt-4o">GPT-4o</option>
              </select>
            }
          />

          <SettingRow
            label="Temperatura"
            description="Criatividade das respostas (0-1)"
            action={
              <input
                type="range"
                min="0"
                max="100"
                defaultValue="70"
                className="w-24 accent-blue-500"
              />
            }
          />

          <SettingRow
            label="Max tokens"
            description="Limite de tokens por resposta"
            action={
              <select className="p-2 rounded-lg glass-subtle text-primary bg-transparent border border-glass-10 text-sm">
                <option value="2048">2048</option>
                <option value="4096">4096</option>
                <option value="8192">8192</option>
              </select>
            }
          />
        </div>
      </Card>

      <div className="flex justify-end">
        <Button variant="default" onClick={handleSaveKeys}>
          Salvar API Keys
        </Button>
      </div>

      {/* Add API Key Modal */}
      <AnimatePresence>
        {showAddModal && (
          <AddAPIKeyModal
            providers={filteredProviders}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
            onAddProvider={addProvider}
            onAddCustom={addCustomKey}
            onClose={() => setShowAddModal(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// Add API Key Modal
function AddAPIKeyModal({
  providers,
  selectedCategory,
  onSelectCategory,
  onAddProvider,
  onAddCustom,
  onClose,
}: {
  providers: APIKeyProvider[];
  selectedCategory: string;
  onSelectCategory: (cat: string) => void;
  onAddProvider: (provider: APIKeyProvider) => void;
  onAddCustom: (name: string, color: string) => void;
  onClose: () => void;
}) {
  const [customName, setCustomName] = useState('');
  const [customColor, setCustomColor] = useState('gray');
  const [showCustomForm, setShowCustomForm] = useState(false);

  const categories = [
    { id: 'all', label: 'Todos' },
    { id: 'llm', label: 'LLMs' },
    { id: 'database', label: 'Database' },
    { id: 'scraper', label: 'Scrapers' },
    { id: 'messaging', label: 'Messaging' },
    { id: 'crm', label: 'CRM' },
    { id: 'other', label: 'Outros' },
  ];

  const colorOptions = ['purple', 'green', 'blue', 'cyan', 'red', 'orange', 'pink', 'indigo', 'yellow', 'gray'];

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-scrim-80 backdrop-blur-md z-[100]"
        onClick={onClose}
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg z-[101] max-h-[80vh] overflow-hidden px-4"
      >
        <Card className="flex flex-col max-h-[80vh] !bg-gray-900/95 border border-glass-10 shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-primary">Adicionar API Key</h2>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </Button>
          </div>

          {!showCustomForm ? (
            <>
              {/* Category Filter */}
              <div className="flex flex-wrap gap-2 mb-4">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => onSelectCategory(cat.id)}
                    className={cn(
                      'px-3 py-1 rounded-lg text-xs transition-colors',
                      selectedCategory === cat.id
                        ? 'bg-blue-500 text-foreground-primary'
                        : 'bg-glass-10 text-secondary hover:bg-glass-20'
                    )}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Provider List */}
              <div className="flex-1 overflow-y-auto glass-scrollbar space-y-2 mb-4">
                {providers.length === 0 ? (
                  <div className="text-center py-8 text-tertiary">
                    <p>Todos os provedores já foram adicionados</p>
                  </div>
                ) : (
                  providers.map((provider) => {
                    const colors = colorClasses[provider.color] || colorClasses.gray;
                    return (
                      <button
                        key={provider.id}
                        onClick={() => onAddProvider(provider)}
                        className={cn(
                          'w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left',
                          colors.border,
                          'hover:bg-glass-5'
                        )}
                      >
                        <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center', colors.iconBg)}>
                          <span className={cn('font-bold text-sm', colors.text)}>{provider.icon}</span>
                        </div>
                        <div className="flex-1">
                          <p className="text-primary font-medium">{provider.name}</p>
                          <p className="text-xs text-tertiary">{provider.description}</p>
                        </div>
                        <PlusIcon />
                      </button>
                    );
                  })
                )}
              </div>

              {/* Custom Key Button */}
              <button
                onClick={() => setShowCustomForm(true)}
                className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed border-glass-20 text-secondary hover:text-primary hover:border-glass-40 transition-colors"
              >
                <PlusIcon />
                <span>Adicionar chave personalizada</span>
              </button>
            </>
          ) : (
            <>
              {/* Custom Key Form */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-secondary mb-2">Nome do serviço</label>
                  <Input
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="Ex: Stripe, Twilio, etc."
                  />
                </div>

                <div>
                  <label className="block text-sm text-secondary mb-2">Cor</label>
                  <div className="flex flex-wrap gap-2">
                    {colorOptions.map((color) => {
                      const colors = colorClasses[color];
                      return (
                        <button
                          key={color}
                          onClick={() => setCustomColor(color)}
                          className={cn(
                            'w-8 h-8 rounded-lg border-2 transition-all',
                            colors.iconBg,
                            customColor === color
                              ? 'border-white scale-110'
                              : 'border-transparent hover:scale-105'
                          )}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="flex gap-2 mt-6">
                <Button variant="ghost" onClick={() => setShowCustomForm(false)} className="flex-1">
                  Voltar
                </Button>
                <Button
                  variant="default"
                  onClick={() => customName && onAddCustom(customName, customColor)}
                  disabled={!customName}
                  className="flex-1"
                >
                  Adicionar
                </Button>
              </div>
            </>
          )}
        </Card>
      </motion.div>
    </>
  );
}

// Appearance Settings
function AppearanceSettings() {
  const { theme, setTheme } = useUIStore();
  const { success } = useToast();

  const themes = [
    { id: 'light' as const, label: 'Claro', description: 'Interface clara para ambientes iluminados' },
    { id: 'dark' as const, label: 'Escuro', description: 'Interface escura para conforto visual' },
    { id: 'glass' as const, label: 'Liquid Glass', description: 'Painéis de vidro fosco sobre fundo colorido vibrante' },
    { id: 'matrix' as const, label: 'Matrix', description: 'Verde neon sobre preto — modo hacker' },
    { id: 'aiox' as const, label: 'AIOX Cockpit', description: 'Lima neon sobre preto — modo cockpit' },
    { id: 'system' as const, label: 'Sistema', description: 'Segue as preferências do sistema' },
  ];

  const isMatrix = theme === 'matrix';
  const isAiox = theme === 'aiox';

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-primary">Tema</h2>
            <p className="text-sm text-tertiary mt-1">Escolha o visual da interface</p>
          </div>
          <ThemeToggleSwitch />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {themes.map((t) => {
            const isActive = theme === t.id;
            const isMatrixCard = t.id === 'matrix';
            const isGlassCard = t.id === 'glass';
            const isAioxCard = t.id === 'aiox';
            return (
              <button
                key={t.id}
                onClick={() => {
                  setTheme(t.id as 'light' | 'dark' | 'system' | 'matrix' | 'glass' | 'aiox');
                  success('Tema alterado', `Tema ${t.label} aplicado`);
                }}
                className={cn(
                  'p-4 rounded-xl border-2 transition-all text-center group',
                  isActive && isAioxCard
                    ? 'border-lime-400 bg-lime-400/10'
                    : isActive && isMatrixCard
                    ? 'border-green-500 bg-green-500/10'
                    : isActive && isGlassCard
                    ? 'border-purple-500 bg-purple-500/10'
                    : isActive
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-transparent glass-subtle hover:border-glass-20'
                )}
              >
                <span className="text-2xl mb-2 block group-hover:scale-110 transition-transform">
                  {(() => { const Icon = ThemeIcons[t.id]; return <Icon size={24} />; })()}
                </span>
                <span className="text-sm text-primary font-medium">{t.label}</span>
                <p className="text-[10px] text-tertiary mt-1 leading-tight">{t.description}</p>
                {isActive && (
                  <div className={cn(
                    'mt-2',
                    isAioxCard ? 'text-lime-400' : isMatrixCard ? 'text-green-500' : isGlassCard ? 'text-purple-500' : 'text-blue-500'
                  )}>
                    <CheckIcon />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-primary mb-4">Interface</h2>

        <div className="space-y-4">
          <SettingToggle
            label="Sidebar compacta"
            description="Reduzir largura da sidebar"
            defaultChecked={false}
          />

          <SettingToggle
            label="Animações"
            description="Ativar animações de transição"
            defaultChecked={true}
          />

          <SettingToggle
            label="Painel de atividades"
            description="Mostrar painel lateral direito"
            defaultChecked={true}
          />

          <SettingRow
            label="Densidade"
            description="Espaçamento entre elementos"
            action={
              <select className="p-2 rounded-lg glass-subtle text-primary bg-transparent border border-glass-10 text-sm">
                <option value="comfortable">Confortável</option>
                <option value="compact">Compacto</option>
              </select>
            }
          />
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-primary mb-4">Fontes</h2>

        <div className="space-y-4">
          <SettingRow
            label="Tamanho da fonte"
            description="Tamanho base do texto"
            action={
              <select className="p-2 rounded-lg glass-subtle text-primary bg-transparent border border-glass-10 text-sm">
                <option value="sm">Pequeno</option>
                <option value="md">Médio</option>
                <option value="lg">Grande</option>
              </select>
            }
          />

          <SettingRow
            label="Fonte do código"
            description="Fonte para blocos de código"
            action={
              <select className="p-2 rounded-lg glass-subtle text-primary bg-transparent border border-glass-10 text-sm">
                <option value="fira">Fira Code</option>
                <option value="jetbrains">JetBrains Mono</option>
                <option value="source">Source Code Pro</option>
              </select>
            }
          />
        </div>
      </Card>
    </div>
  );
}

// Notification Settings
function NotificationSettings() {
  return (
    <div className="space-y-6">
      <Card>
        <h2 className="text-lg font-semibold text-primary mb-4">Notificações Push</h2>
        <div className="space-y-4">
          <SettingToggle label="Ativar notificações" description="Receber notificações no navegador" defaultChecked={true} />
          <SettingToggle label="Sons" description="Tocar som ao receber notificação" defaultChecked={false} />
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-primary mb-4">Tipos de Notificação</h2>
        <div className="space-y-4">
          <SettingToggle label="Execuções concluídas" description="Quando um agent terminar uma tarefa" defaultChecked={true} />
          <SettingToggle label="Erros" description="Quando ocorrer um erro de execução" defaultChecked={true} />
          <SettingToggle label="Mensagens de agents" description="Quando um agent enviar uma mensagem" defaultChecked={true} />
          <SettingToggle label="Atualizações do sistema" description="Novidades e atualizações da plataforma" defaultChecked={false} />
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-primary mb-4">Email</h2>
        <div className="space-y-4">
          <SettingToggle label="Resumo diário" description="Receber resumo das atividades por email" defaultChecked={false} />
          <SettingToggle label="Alertas importantes" description="Receber alertas críticos por email" defaultChecked={true} />
        </div>
      </Card>
    </div>
  );
}

// Privacy Settings
function PrivacySettings() {
  const { success } = useToast();

  return (
    <div className="space-y-6">
      <Card>
        <h2 className="text-lg font-semibold text-primary mb-4">Dados e Privacidade</h2>
        <div className="space-y-4">
          <SettingToggle label="Salvar histórico" description="Manter histórico de conversas localmente" defaultChecked={true} />
          <SettingToggle label="Analytics" description="Enviar dados de uso anônimos para melhorias" defaultChecked={false} />
          <SettingToggle label="Logs de debug" description="Armazenar logs para diagnóstico" defaultChecked={false} />
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-primary mb-4">Gerenciar Dados</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-xl glass-subtle">
            <div>
              <p className="text-primary font-medium">Exportar dados</p>
              <p className="text-xs text-tertiary">Baixar todos os seus dados</p>
            </div>
            <Button variant="ghost" size="sm">Exportar</Button>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl glass-subtle">
            <div>
              <p className="text-primary font-medium">Limpar histórico</p>
              <p className="text-xs text-tertiary">Remover todas as conversas</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-red-500 hover:bg-red-500/10"
              onClick={() => success('Histórico limpo', 'Todas as conversas foram removidas')}
            >
              Limpar
            </Button>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl border border-red-500/20 bg-red-500/5">
            <div>
              <p className="text-red-400 font-medium">Excluir conta</p>
              <p className="text-xs text-tertiary">Remover permanentemente sua conta</p>
            </div>
            <Button variant="ghost" size="sm" className="text-red-500 hover:bg-red-500/10">
              Excluir
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

// About Settings
function AboutSettings() {
  return (
    <div className="space-y-6">
      <Card>
        <div className="text-center py-4">
          <div className="h-20 w-20 mx-auto rounded-2xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg mb-4">
            <span className="text-foreground-primary font-bold text-3xl">A</span>
          </div>
          <h2 className="text-2xl font-bold text-primary">AIOS Core</h2>
          <p className="text-secondary">Platform v1.0.0</p>
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-primary mb-4">Informações do Sistema</h2>
        <div className="space-y-3">
          <InfoRow label="Versão" value="1.0.0" />
          <InfoRow label="Build" value="2024.02.03" />
          <InfoRow label="React" value="18.3.1" />
          <InfoRow label="Node" value="20.x" />
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-primary mb-4">Links Úteis</h2>
        <div className="space-y-2">
          <LinkRow label="Documentação" href="#" />
          <LinkRow label="GitHub" href="#" />
          <LinkRow label="Changelog" href="#" />
          <LinkRow label="Suporte" href="#" />
          <LinkRow label="Termos de Uso" href="#" />
          <LinkRow label="Política de Privacidade" href="#" />
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-primary mb-4">Licenças</h2>
        <p className="text-sm text-secondary">
          Este software utiliza bibliotecas open source. Veja a lista completa de licenças na documentação.
        </p>
        <Button variant="ghost" size="sm" className="mt-3">
          Ver licenças
        </Button>
      </Card>
    </div>
  );
}

// Helper Components
function SettingRow({ label, description, action }: {
  label: string;
  description: string;
  action: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <p className="text-primary font-medium">{label}</p>
        <p className="text-xs text-tertiary">{description}</p>
      </div>
      {action}
    </div>
  );
}

function SettingToggle({ label, description, defaultChecked, onChange }: {
  label: string;
  description: string;
  defaultChecked: boolean;
  onChange?: (value: boolean) => void;
}) {
  const [checked, setChecked] = useState(defaultChecked);

  const handleToggle = () => {
    const next = !checked;
    setChecked(next);
    onChange?.(next);
  };

  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <p className="text-primary font-medium">{label}</p>
        <p className="text-xs text-tertiary">{description}</p>
      </div>
      <button
        onClick={handleToggle}
        className={cn(
          'w-11 h-6 rounded-full transition-colors relative',
          checked ? 'bg-blue-500' : 'bg-glass-20'
        )}
      >
        <div
          className={cn(
            'absolute top-1 w-4 h-4 rounded-full bg-white transition-transform',
            checked ? 'translate-x-6' : 'translate-x-1'
          )}
        />
      </button>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-glass-5 last:border-0">
      <span className="text-secondary">{label}</span>
      <span className="text-primary font-medium">{value}</span>
    </div>
  );
}

function LinkRow({ label, href }: { label: string; href: string }) {
  return (
    <a
      href={href}
      className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-glass-5 transition-colors"
    >
      <span className="text-primary">{label}</span>
      <ChevronRightIcon />
    </a>
  );
}
