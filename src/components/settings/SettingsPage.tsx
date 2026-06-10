import { motion, AnimatePresence } from 'framer-motion';
import { useUIStore, type SettingsSection } from '../../stores/uiStore';
import { cn } from '../../lib/utils';
import { CategoryManager } from './CategoryManager';
import { MemoryManager } from './MemoryManager';
import { WorkflowManager } from './WorkflowManager';
import { DashboardSettings } from './DashboardSettings';
import { ProfileSettings } from './ProfileSettings';
import { APISettings } from './APISettings';
import { AppearanceSettings } from './AppearanceSettings';
import { NotificationSettings } from './NotificationSettings';
import { PrivacySettings } from './PrivacySettings';
import { AboutSettings } from './AboutSettings';

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
      <nav aria-label="Secoes de configuracao" className="w-52 flex-shrink-0 border-r border-white/10 pr-3 mr-4 overflow-y-auto glass-scrollbar">
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
                      : 'text-secondary hover:text-primary hover:bg-white/5'
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
        <div className="flex items-center gap-3 mb-4 pb-4 border-b border-white/10 flex-shrink-0">
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
