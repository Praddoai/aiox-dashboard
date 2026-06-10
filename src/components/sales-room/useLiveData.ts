import { useEffect, useRef, useCallback } from 'react';
import { useSalesStore } from './store';
import { AGENT_META } from './seed';
import type { SalesAgent, Lead, Message, ActivityEvent, AgentStatus } from './types';

// ─── Config ──────────────────────────────────────────────

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const POLL_INTERVAL = 30_000; // 30s

// ─── Supabase types ──────────────────────────────────────

interface SupaConversation {
  id: string;
  phone: string;
  channel: string;
  current_agent: string;
  state: string;
  lead_name: string | null;
  lead_email: string | null;
  metadata: Record<string, unknown>;
  is_active: boolean;
  started_at: string;
  last_message_at: string;
}

interface SupaMessage {
  id: string;
  conversation_id: string;
  direction: 'inbound' | 'outbound';
  content: string | null;
  source: string;
  agent_id: string | null;
  created_at: string;
  approval_status?: string;
}

// ─── State mapping ───────────────────────────────────────

function mapConversationStateToAgentStatus(state: string): AgentStatus {
  switch (state) {
    case 'new':
    case 'qualifying':
    case 'triaging':
    case 'in_progress':
      return 'atendendo';
    case 'qualified':
    case 'negotiating':
    case 'closing':
      return 'atendendo';
    case 'follow_up':
    case 'waiting_customer':
      return 'follow-up';
    case 'post_sale':
    case 'customer':
      return 'follow-up';
    case 'closed':
    case 'resolved':
      return 'ocioso';
    default:
      return 'ocioso';
  }
}

// ─── Supabase fetch helpers ──────────────────────────────

async function supaFetch<T>(table: string, query: string): Promise<T[]> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return [];

  const url = `${SUPABASE_URL}/rest/v1/${table}?${query}`;
  try {
    const res = await fetch(url, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
      },
    });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

// ─── Main hook ───────────────────────────────────────────

export function useLiveData() {
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isConfigured = Boolean(SUPABASE_URL && SUPABASE_KEY);

  const fetchLive = useCallback(async () => {
    if (!isConfigured) return;

    try {
      // 1. Fetch active conversations
      const conversations = await supaFetch<SupaConversation>(
        'conversations',
        'is_active=eq.true&order=last_message_at.desc&limit=50'
      );

      if (conversations.length === 0) return;

      // 2. Fetch recent messages for active conversations
      const convIds = conversations.map((c) => c.id);
      const messages = await supaFetch<SupaMessage>(
        'messages',
        `conversation_id=in.(${convIds.join(',')})&order=created_at.desc&limit=200`
      );

      // Group messages by conversation
      const msgByConv: Record<string, SupaMessage[]> = {};
      for (const m of messages) {
        if (!msgByConv[m.conversation_id]) msgByConv[m.conversation_id] = [];
        msgByConv[m.conversation_id].push(m);
      }

      // 3. Build agent state from conversations
      const agentConvs: Record<string, SupaConversation[]> = {};
      for (const conv of conversations) {
        const agentId = conv.current_agent;
        if (!agentConvs[agentId]) agentConvs[agentId] = [];
        agentConvs[agentId].push(conv);
      }

      // 4. Update store agents
      const store = useSalesStore.getState();
      const updatedAgents: SalesAgent[] = store.agents.map((agent) => {
        const convs = agentConvs[agent.id] || [];
        if (convs.length === 0) {
          return { ...agent, status: 'ocioso' as AgentStatus, activeConversations: 0, currentLead: null, messages: [] };
        }

        // Use the most recent conversation as the "current lead"
        const primaryConv = convs[0];
        const convMessages = (msgByConv[primaryConv.id] || [])
          .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

        const lead: Lead = {
          id: primaryConv.id,
          name: primaryConv.lead_name || primaryConv.phone,
          phone: primaryConv.phone,
          temperature: inferTemperature(primaryConv.state),
          source: primaryConv.channel === 'waha' ? 'WhatsApp' : primaryConv.channel,
          product: (primaryConv.metadata?.product as string) || undefined,
          cartValue: (primaryConv.metadata?.cart_value as number) || undefined,
        };

        const mappedMessages: Message[] = convMessages.slice(-20).map((m) => ({
          id: m.id,
          direction: m.direction === 'inbound' ? 'lead' as const : 'agent' as const,
          text: m.content || '',
          timestamp: new Date(m.created_at),
          source: 'whatsapp' as const,
        }));

        return {
          ...agent,
          status: mapConversationStateToAgentStatus(primaryConv.state),
          activeConversations: convs.length,
          currentLead: lead,
          messages: mappedMessages,
        };
      });

      // 5. Compute metrics
      const totalActive = conversations.length;
      const salesConvs = conversations.filter((c) =>
        ['sdr-aaron-ross', 'pre-venda-jeb-blount', 'closer-jordan-belfort', 'pos-venda-joey-coleman'].includes(c.current_agent)
      );
      const closedToday = conversations.filter(
        (c) => c.state === 'closed' || c.state === 'post_sale' || c.state === 'customer'
      );

      // 6. Generate activities from recent messages
      const recentActivities: ActivityEvent[] = messages
        .slice(0, 30)
        .map((m) => {
          const conv = conversations.find((c) => c.id === m.conversation_id);
          const agentId = conv?.current_agent || 'unknown';
          const agentDef = store.agents.find((a) => a.id === agentId);

          return {
            id: `live-${m.id}`,
            agentId,
            agentName: agentDef?.name || agentId,
            type: m.direction === 'inbound' ? 'message-received' as const : 'message-sent' as const,
            description: m.direction === 'inbound'
              ? `${conv?.lead_name || 'Lead'}: ${(m.content || '').slice(0, 40)}...`
              : `Resposta enviada`,
            timestamp: new Date(m.created_at),
          };
        });

      // 7. Apply to store
      useSalesStore.setState({
        agents: updatedAgents,
        activities: recentActivities,
        metrics: {
          activeConversations: totalActive,
          cartsRecovered: 0,
          cartRecoveryValue: 0,
          avgResponseTime: 0,
          conversionRate: salesConvs.length > 0
            ? Math.round((closedToday.length / salesConvs.length) * 100)
            : 0,
          leadsToday: conversations.filter((c) => isToday(c.started_at)).length,
          salesClosed: closedToday.length,
          totalRevenue: 0,
        },
      });

      // Disable simulation when live data flows
      if (totalActive > 0) {
        useSalesStore.getState().setSimulationEnabled(false);
      }
    } catch (err) {
      console.warn('[useLiveData] Failed to fetch:', err);
    }
  }, [isConfigured]);

  useEffect(() => {
    if (!isConfigured) return;

    // Initial fetch
    fetchLive();

    // Poll
    timerRef.current = setInterval(fetchLive, POLL_INTERVAL);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isConfigured, fetchLive]);

  return { isConfigured, refetch: fetchLive };
}

// ─── Helpers ─────────────────────────────────────────────

function inferTemperature(state: string): 'hot' | 'warm' | 'cold' {
  if (['negotiating', 'closing', 'post_sale', 'customer'].includes(state)) return 'hot';
  if (['qualified', 'qualifying', 'in_progress'].includes(state)) return 'warm';
  return 'cold';
}

function isToday(dateStr: string): boolean {
  const d = new Date(dateStr);
  const now = new Date();
  return d.getFullYear() === now.getFullYear()
    && d.getMonth() === now.getMonth()
    && d.getDate() === now.getDate();
}

export { AGENT_META };
