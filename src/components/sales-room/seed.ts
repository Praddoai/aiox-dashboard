import type { SalesAgent, ActivityEvent, SalesMetrics } from './types';

// ─── Real WAHA Sales Agents (Supabase Edge Functions) ────

export const INITIAL_AGENTS: SalesAgent[] = [
  // === SALES PIPELINE (4 agents) ===
  {
    id: 'sdr-aaron-ross', name: 'Aaron (SDR)', avatar: 'A', status: 'ocioso',
    activeConversations: 0, resolvedToday: 0, conversionRate: 0, avgResponseTime: 0,
    currentLead: null, messages: [],
  },
  {
    id: 'pre-venda-jeb-blount', name: 'Jeb (Pre-Venda)', avatar: 'J', status: 'ocioso',
    activeConversations: 0, resolvedToday: 0, conversionRate: 0, avgResponseTime: 0,
    currentLead: null, messages: [],
  },
  {
    id: 'closer-jordan-belfort', name: 'Jordan (Closer)', avatar: 'J', status: 'ocioso',
    activeConversations: 0, resolvedToday: 0, conversionRate: 0, avgResponseTime: 0,
    currentLead: null, messages: [],
  },
  {
    id: 'pos-venda-joey-coleman', name: 'Joey (Pos-Venda)', avatar: 'P', status: 'ocioso',
    activeConversations: 0, resolvedToday: 0, conversionRate: 0, avgResponseTime: 0,
    currentLead: null, messages: [],
  },
  // === SUPPORT PIPELINE (4 agents) ===
  {
    id: 'triage-natasha', name: 'Natasha (Triagem)', avatar: 'N', status: 'ocioso',
    activeConversations: 0, resolvedToday: 0, conversionRate: 0, avgResponseTime: 0,
    currentLead: null, messages: [],
  },
  {
    id: 'tech-lucas', name: 'Lucas (Tech)', avatar: 'L', status: 'ocioso',
    activeConversations: 0, resolvedToday: 0, conversionRate: 0, avgResponseTime: 0,
    currentLead: null, messages: [],
  },
  {
    id: 'billing-amanda', name: 'Amanda (Financeiro)', avatar: 'F', status: 'ocioso',
    activeConversations: 0, resolvedToday: 0, conversionRate: 0, avgResponseTime: 0,
    currentLead: null, messages: [],
  },
  {
    id: 'content-diego', name: 'Diego (Conteudo)', avatar: 'D', status: 'ocioso',
    activeConversations: 0, resolvedToday: 0, conversionRate: 0, avgResponseTime: 0,
    currentLead: null, messages: [],
  },
];

export const INITIAL_ACTIVITIES: ActivityEvent[] = [];

export const INITIAL_METRICS: SalesMetrics = {
  activeConversations: 0,
  cartsRecovered: 0,
  cartRecoveryValue: 0,
  avgResponseTime: 0,
  conversionRate: 0,
  leadsToday: 0,
  salesClosed: 0,
  totalRevenue: 0,
};

// ─── Agent metadata for display ──────────────────────────

export const AGENT_META: Record<string, {
  pipeline: 'sales' | 'support';
  role: string;
  states: string[];
}> = {
  'sdr-aaron-ross': {
    pipeline: 'sales',
    role: 'SDR / Qualificacao',
    states: ['new', 'qualifying'],
  },
  'pre-venda-jeb-blount': {
    pipeline: 'sales',
    role: 'Pre-Venda / Discovery',
    states: ['qualified'],
  },
  'closer-jordan-belfort': {
    pipeline: 'sales',
    role: 'Closer / Fechamento',
    states: ['negotiating', 'closing'],
  },
  'pos-venda-joey-coleman': {
    pipeline: 'sales',
    role: 'Pos-Venda / Success',
    states: ['post_sale', 'customer'],
  },
  'triage-natasha': {
    pipeline: 'support',
    role: 'Triagem / Routing',
    states: ['new', 'triaging', 'resolved'],
  },
  'tech-lucas': {
    pipeline: 'support',
    role: 'Suporte Tecnico',
    states: ['open', 'in_progress', 'waiting_customer'],
  },
  'billing-amanda': {
    pipeline: 'support',
    role: 'Financeiro / Billing',
    states: ['open', 'in_progress', 'waiting_customer'],
  },
  'content-diego': {
    pipeline: 'support',
    role: 'Conteudo / Duvidas',
    states: ['open', 'in_progress', 'waiting_customer'],
  },
};
