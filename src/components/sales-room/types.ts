// ─── Sales Room Domain Types ───────────────────────────

export type AgentStatus = 'atendendo' | 'ocioso' | 'recuperando-carrinho' | 'follow-up' | 'pausado';
export type LeadTemperature = 'hot' | 'warm' | 'cold';
export type MessageDirection = 'agent' | 'lead';
export type MessageSource = 'whatsapp' | 'instagram' | 'site' | 'mock';
export type ActivityType = 'message-sent' | 'message-received' | 'cart-recovered' | 'lead-qualified' | 'sale-closed' | 'follow-up-scheduled' | 'lead-lost';
export type Sentiment = 'positive' | 'neutral' | 'resistant';

export interface Message {
  id: string;
  direction: MessageDirection;
  text: string;
  timestamp: Date;
  source?: MessageSource;
}

export interface Lead {
  id: string;
  name: string;
  phone: string;
  temperature: LeadTemperature;
  source: string;
  cartValue?: number;
  product?: string;
}

export interface SalesAgent {
  id: string;
  name: string;
  avatar: string;
  status: AgentStatus;
  currentLead: Lead | null;
  messages: Message[];
  activeConversations: number;
  resolvedToday: number;
  conversionRate: number;
  avgResponseTime: number;
}

export interface ActivityEvent {
  id: string;
  agentId: string;
  agentName: string;
  type: ActivityType;
  description: string;
  timestamp: Date;
  value?: number;
}

export interface SalesMetrics {
  activeConversations: number;
  cartsRecovered: number;
  cartRecoveryValue: number;
  avgResponseTime: number;
  conversionRate: number;
  leadsToday: number;
  salesClosed: number;
  totalRevenue: number;
}

// ─── Intelligence Types ────────────────────────────────

export interface ConversationInsight {
  closeProbability: number;       // 0-100
  sentiment: Sentiment;
  suggestedResponse: string | null;
  staleMinutes: number;
  isStale: boolean;               // > 5 min since last msg
}

// ─── WhatsApp Types ────────────────────────────────────

export interface WhatsAppIncoming {
  from: string;       // phone number
  name: string;
  text: string;
  timestamp: number;
  messageId: string;
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';
