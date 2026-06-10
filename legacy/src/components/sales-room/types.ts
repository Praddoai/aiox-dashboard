import type { LucideIcon } from 'lucide-react';

// ─── Domain Types ─────────────────────────────────────

export type AgentStatus = 'atendendo' | 'ocioso' | 'recuperando-carrinho' | 'follow-up' | 'pausado';
export type LeadTemperature = 'hot' | 'warm' | 'cold';
export type MessageDirection = 'agent' | 'lead';
export type ActivityType = 'message-sent' | 'message-received' | 'cart-recovered' | 'lead-qualified' | 'sale-closed' | 'follow-up-scheduled' | 'lead-lost';

export interface Message {
  id: string;
  direction: MessageDirection;
  text: string;
  timestamp: Date;
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
  avgResponseTime: number; // seconds
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

// ─── Config Types ─────────────────────────────────────

export interface StatusConfig {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  pulse?: boolean;
}

export interface TempConfig {
  label: string;
  color: string;
  icon: LucideIcon;
}

export interface ActivityConfig {
  icon: LucideIcon;
  color: string;
  bgColor: string;
}
