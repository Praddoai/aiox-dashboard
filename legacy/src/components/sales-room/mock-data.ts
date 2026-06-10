import {
  Send,
  MessageSquare,
  ShoppingCart,
  CheckCircle2,
  Zap,
  Clock,
  AlertCircle,
  TrendingUp,
  ArrowDown,
} from 'lucide-react';
import type {
  AgentStatus,
  LeadTemperature,
  ActivityType,
  SalesAgent,
  ActivityEvent,
  SalesMetrics,
  StatusConfig,
  TempConfig,
  ActivityConfig,
} from './types';

// ─── Config Maps ──────────────────────────────────────

export const STATUS_CONFIG: Record<AgentStatus, StatusConfig> = {
  'atendendo': { label: 'Atendendo', color: '#4ADE80', bgColor: 'rgba(74,222,128,0.12)', borderColor: 'rgba(74,222,128,0.3)', pulse: true },
  'recuperando-carrinho': { label: 'Recuperando Carrinho', color: '#0099FF', bgColor: 'rgba(0,153,255,0.12)', borderColor: 'rgba(0,153,255,0.3)', pulse: true },
  'follow-up': { label: 'Follow-up', color: '#f59e0b', bgColor: 'rgba(245,158,11,0.12)', borderColor: 'rgba(245,158,11,0.3)' },
  'ocioso': { label: 'Disponivel', color: '#999999', bgColor: 'rgba(153,153,153,0.12)', borderColor: 'rgba(153,153,153,0.3)' },
  'pausado': { label: 'Pausado', color: '#696969', bgColor: 'rgba(105,105,105,0.12)', borderColor: 'rgba(105,105,105,0.3)' },
};

export const TEMP_CONFIG: Record<LeadTemperature, TempConfig> = {
  hot: { label: 'Quente', color: '#EF4444', icon: Zap },
  warm: { label: 'Morno', color: '#f59e0b', icon: TrendingUp },
  cold: { label: 'Frio', color: '#0099FF', icon: ArrowDown },
};

export const ACTIVITY_CONFIG: Record<ActivityType, ActivityConfig> = {
  'message-sent': { icon: Send, color: '#0099FF', bgColor: 'rgba(0,153,255,0.12)' },
  'message-received': { icon: MessageSquare, color: '#4ADE80', bgColor: 'rgba(74,222,128,0.12)' },
  'cart-recovered': { icon: ShoppingCart, color: '#D1FF00', bgColor: 'rgba(209,255,0,0.12)' },
  'lead-qualified': { icon: CheckCircle2, color: '#4ADE80', bgColor: 'rgba(74,222,128,0.12)' },
  'sale-closed': { icon: Zap, color: '#D1FF00', bgColor: 'rgba(209,255,0,0.15)' },
  'follow-up-scheduled': { icon: Clock, color: '#f59e0b', bgColor: 'rgba(245,158,11,0.12)' },
  'lead-lost': { icon: AlertCircle, color: '#EF4444', bgColor: 'rgba(239,68,68,0.12)' },
};

// ─── Helpers ──────────────────────────────────────────

export function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h`;
}

export function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// ─── Mock Data ────────────────────────────────────────

export const MOCK_AGENTS: SalesAgent[] = [
  {
    id: 'agent-luna',
    name: 'Luna',
    avatar: 'L',
    status: 'atendendo',
    activeConversations: 3,
    resolvedToday: 12,
    conversionRate: 68,
    avgResponseTime: 8,
    currentLead: {
      id: 'lead-1',
      name: 'Maria Silva',
      phone: '(11) 99876-5432',
      temperature: 'hot',
      source: 'Instagram',
      cartValue: 347.90,
      product: 'Kit Skincare Premium',
    },
    messages: [
      { id: 'm1', direction: 'lead', text: 'Oi, vi o kit de skincare no Instagram, ainda tem?', timestamp: new Date(Date.now() - 180000) },
      { id: 'm2', direction: 'agent', text: 'Oi Maria! Sim, temos sim! O Kit Skincare Premium esta com 15% OFF hoje. Posso te ajudar com mais detalhes?', timestamp: new Date(Date.now() - 150000) },
      { id: 'm3', direction: 'lead', text: 'Qual o preco com desconto?', timestamp: new Date(Date.now() - 120000) },
      { id: 'm4', direction: 'agent', text: 'Com o desconto fica R$ 347,90 (de R$ 409,00). E o frete e gratis pra SP! Quer que eu reserve pra voce?', timestamp: new Date(Date.now() - 60000) },
    ],
  },
  {
    id: 'agent-kai',
    name: 'Kai',
    avatar: 'K',
    status: 'recuperando-carrinho',
    activeConversations: 2,
    resolvedToday: 8,
    conversionRate: 55,
    avgResponseTime: 12,
    currentLead: {
      id: 'lead-2',
      name: 'Joao Mendes',
      phone: '(21) 98765-1234',
      temperature: 'warm',
      source: 'Site',
      cartValue: 892.00,
      product: 'Combo Suplementos 90 dias',
    },
    messages: [
      { id: 'm5', direction: 'agent', text: 'Oi Joao! Vi que voce deixou o Combo Suplementos 90 dias no carrinho. Posso te ajudar com alguma duvida?', timestamp: new Date(Date.now() - 300000) },
      { id: 'm6', direction: 'lead', text: 'Ah sim, achei um pouco caro', timestamp: new Date(Date.now() - 240000) },
      { id: 'm7', direction: 'agent', text: 'Entendo! Tenho um cupom especial VOLTA10 que da 10% de desconto. Fica R$ 802,80 e parcela em ate 6x sem juros!', timestamp: new Date(Date.now() - 200000) },
    ],
  },
  {
    id: 'agent-neo',
    name: 'Neo',
    avatar: 'N',
    status: 'follow-up',
    activeConversations: 1,
    resolvedToday: 15,
    conversionRate: 72,
    avgResponseTime: 6,
    currentLead: {
      id: 'lead-3',
      name: 'Ana Costa',
      phone: '(31) 97654-3210',
      temperature: 'warm',
      source: 'WhatsApp',
      product: 'Plano Anual Fitness',
    },
    messages: [
      { id: 'm8', direction: 'agent', text: 'Oi Ana! Tudo bem? Passando pra saber se voce pensou sobre o Plano Anual Fitness que conversamos ontem.', timestamp: new Date(Date.now() - 60000) },
    ],
  },
  {
    id: 'agent-aria',
    name: 'Aria',
    avatar: 'A',
    status: 'ocioso',
    activeConversations: 0,
    resolvedToday: 10,
    conversionRate: 61,
    avgResponseTime: 9,
    currentLead: null,
    messages: [],
  },
  {
    id: 'agent-rex',
    name: 'Rex',
    avatar: 'R',
    status: 'atendendo',
    activeConversations: 4,
    resolvedToday: 18,
    conversionRate: 75,
    avgResponseTime: 5,
    currentLead: {
      id: 'lead-4',
      name: 'Carlos Ferreira',
      phone: '(41) 96543-2109',
      temperature: 'hot',
      source: 'Facebook Ads',
      cartValue: 1250.00,
      product: 'Curso Completo Marketing Digital',
    },
    messages: [
      { id: 'm9', direction: 'lead', text: 'Vi o anuncio do curso, quero saber mais', timestamp: new Date(Date.now() - 90000) },
      { id: 'm10', direction: 'agent', text: 'Oi Carlos! Otima escolha! O Curso Completo de Marketing Digital tem 120h de conteudo + mentoria ao vivo. Quer que eu envie o conteudo programatico?', timestamp: new Date(Date.now() - 45000) },
      { id: 'm11', direction: 'lead', text: 'Sim, manda!', timestamp: new Date(Date.now() - 20000) },
    ],
  },
  {
    id: 'agent-zara',
    name: 'Zara',
    avatar: 'Z',
    status: 'pausado',
    activeConversations: 0,
    resolvedToday: 6,
    conversionRate: 58,
    avgResponseTime: 11,
    currentLead: null,
    messages: [],
  },
];

export const MOCK_ACTIVITIES: ActivityEvent[] = [
  { id: 'a1', agentId: 'agent-rex', agentName: 'Rex', type: 'sale-closed', description: 'Venda fechada: Curso Basico SEO - R$ 497,00', timestamp: new Date(Date.now() - 30000), value: 497.00 },
  { id: 'a2', agentId: 'agent-kai', agentName: 'Kai', type: 'cart-recovered', description: 'Carrinho recuperado: Combo Vitaminas - R$ 234,50', timestamp: new Date(Date.now() - 120000), value: 234.50 },
  { id: 'a3', agentId: 'agent-luna', agentName: 'Luna', type: 'lead-qualified', description: 'Lead qualificado: Maria Silva (Instagram)', timestamp: new Date(Date.now() - 180000) },
  { id: 'a4', agentId: 'agent-neo', agentName: 'Neo', type: 'follow-up-scheduled', description: 'Follow-up agendado: Ana Costa - amanha 14h', timestamp: new Date(Date.now() - 300000) },
  { id: 'a5', agentId: 'agent-rex', agentName: 'Rex', type: 'message-sent', description: 'Mensagem enviada para Carlos Ferreira', timestamp: new Date(Date.now() - 45000) },
  { id: 'a6', agentId: 'agent-aria', agentName: 'Aria', type: 'sale-closed', description: 'Venda fechada: Pack Consultoria - R$ 1.890,00', timestamp: new Date(Date.now() - 600000), value: 1890.00 },
  { id: 'a7', agentId: 'agent-luna', agentName: 'Luna', type: 'message-received', description: 'Nova mensagem de Maria Silva', timestamp: new Date(Date.now() - 120000) },
  { id: 'a8', agentId: 'agent-kai', agentName: 'Kai', type: 'lead-lost', description: 'Lead perdido: Pedro Santos (sem resposta 48h)', timestamp: new Date(Date.now() - 900000) },
];

export const MOCK_METRICS: SalesMetrics = {
  activeConversations: 10,
  cartsRecovered: 7,
  cartRecoveryValue: 3421.50,
  avgResponseTime: 8,
  conversionRate: 64,
  leadsToday: 47,
  salesClosed: 14,
  totalRevenue: 12847.90,
};
