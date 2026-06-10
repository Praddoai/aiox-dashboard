import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { safePersistStorage } from '../lib/safeStorage';

export type Locale = 'pt' | 'en';

type TranslationDict = Record<string, string>;

const translations: Record<Locale, TranslationDict> = {
  pt: {
    // Navigation
    'nav.chat': 'Chat',
    'nav.dashboard': 'Dashboard',
    'nav.kanban': 'Kanban',
    'nav.agents': 'Agentes',
    'nav.monitor': 'Monitor',
    'nav.insights': 'Insights',
    'nav.roadmap': 'Roadmap',
    'nav.settings': 'Configurações',
    'nav.stories': 'Stories',
    'nav.squads': 'Squads',
    'nav.world': 'Mundo',
    'nav.knowledge': 'Base de Conhecimento',
    'nav.context': 'Contexto',
    'nav.github': 'GitHub',
    'nav.terminals': 'Terminais',
    'nav.cockpit': 'Cockpit',

    // Header
    'header.search': 'Buscar agents, squads...',
    'header.searchMobile': 'Buscar...',
    'header.notifications': 'Notificações',
    'header.noNotifications': 'Nenhuma notificação',
    'header.markAllRead': 'Marcar todas como lidas',
    'header.clearAll': 'Limpar todas',
    'header.activityPanel': 'Painel de Atividade',
    'header.workflow': 'Visualizar Workflow',
    'header.explorer': 'Explorar Agents',
    'header.focusMode': 'Modo Foco',

    // Dashboard
    'dashboard.title': 'Dashboard',
    'dashboard.overview': 'Visão Geral',
    'dashboard.metrics': 'Métricas',

    // Insights
    'insights.title': 'Insights',
    'insights.velocity': 'Velocidade',
    'insights.cycleTime': 'Tempo de Ciclo',
    'insights.errorRate': 'Taxa de Erro',
    'insights.completed': 'Concluídos',
    'insights.agentPerformance': 'Performance dos Agentes',
    'insights.weeklyActivity': 'Atividade Semanal',
    'insights.bottlenecks': 'Gargalos',
    'insights.storiesStuck': 'stories travadas',
    'insights.live': 'Ao Vivo',
    'insights.mock': 'Mock',

    // Kanban
    'kanban.addStory': 'Adicionar Story',
    'kanban.noStories': 'Nenhuma story nesta coluna',
    'kanban.dragHere': 'Arraste uma story para cá',

    // Common
    'common.loading': 'Carregando...',
    'common.save': 'Salvar',
    'common.cancel': 'Cancelar',
    'common.delete': 'Excluir',
    'common.edit': 'Editar',
    'common.close': 'Fechar',
    'common.back': 'Voltar',
    'common.next': 'Próximo',
    'common.export': 'Exportar',
    'common.share': 'Compartilhar',
    'common.copyLink': 'Copiar link',
    'common.copied': 'Copiado!',
    'common.language': 'Idioma',

    // Focus Mode
    'focus.enter': 'Entrar no Modo Foco',
    'focus.exit': 'Sair do Modo Foco',
    'focus.active': 'Modo Foco ativo',
  },
  en: {
    // Navigation
    'nav.chat': 'Chat',
    'nav.dashboard': 'Dashboard',
    'nav.kanban': 'Kanban',
    'nav.agents': 'Agents',
    'nav.monitor': 'Monitor',
    'nav.insights': 'Insights',
    'nav.roadmap': 'Roadmap',
    'nav.settings': 'Settings',
    'nav.stories': 'Stories',
    'nav.squads': 'Squads',
    'nav.world': 'World',
    'nav.knowledge': 'Knowledge Base',
    'nav.context': 'Context',
    'nav.github': 'GitHub',
    'nav.terminals': 'Terminals',
    'nav.cockpit': 'Cockpit',

    // Header
    'header.search': 'Search agents, squads...',
    'header.searchMobile': 'Search...',
    'header.notifications': 'Notifications',
    'header.noNotifications': 'No notifications',
    'header.markAllRead': 'Mark all as read',
    'header.clearAll': 'Clear all',
    'header.activityPanel': 'Activity Panel',
    'header.workflow': 'View Workflow',
    'header.explorer': 'Explore Agents',
    'header.focusMode': 'Focus Mode',

    // Dashboard
    'dashboard.title': 'Dashboard',
    'dashboard.overview': 'Overview',
    'dashboard.metrics': 'Metrics',

    // Insights
    'insights.title': 'Insights',
    'insights.velocity': 'Velocity',
    'insights.cycleTime': 'Cycle Time',
    'insights.errorRate': 'Error Rate',
    'insights.completed': 'Completed',
    'insights.agentPerformance': 'Agent Performance',
    'insights.weeklyActivity': 'Weekly Activity',
    'insights.bottlenecks': 'Bottlenecks',
    'insights.storiesStuck': 'stories stuck',
    'insights.live': 'Live',
    'insights.mock': 'Mock',

    // Kanban
    'kanban.addStory': 'Add Story',
    'kanban.noStories': 'No stories in this column',
    'kanban.dragHere': 'Drag a story here',

    // Common
    'common.loading': 'Loading...',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.close': 'Close',
    'common.back': 'Back',
    'common.next': 'Next',
    'common.export': 'Export',
    'common.share': 'Share',
    'common.copyLink': 'Copy link',
    'common.copied': 'Copied!',
    'common.language': 'Language',

    // Focus Mode
    'focus.enter': 'Enter Focus Mode',
    'focus.exit': 'Exit Focus Mode',
    'focus.active': 'Focus Mode active',
  },
};

interface I18nState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
}

export const useI18nStore = create<I18nState>()(
  persist(
    (set, get) => ({
      locale: 'pt',
      setLocale: (locale) => set({ locale }),
      toggleLocale: () => set({ locale: get().locale === 'pt' ? 'en' : 'pt' }),
    }),
    {
      name: 'aios-i18n',
      storage: safePersistStorage,
    }
  )
);

export function useI18n() {
  const { locale, setLocale, toggleLocale } = useI18nStore();

  const t = (key: string, params?: Record<string, string | number>): string => {
    let text = translations[locale]?.[key] || translations.pt[key] || key;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        text = text.replace(`{${k}}`, String(v));
      });
    }
    return text;
  };

  return { t, locale, setLocale, toggleLocale };
}
