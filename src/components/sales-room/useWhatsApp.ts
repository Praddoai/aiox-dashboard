import { useEffect, useRef } from 'react';
import { useSalesStore } from './store';
import type { WhatsAppIncoming, Message, Lead } from './types';

const WA_SSE_URL =
  import.meta.env.VITE_WHATSAPP_SSE_URL || '/engine/whatsapp/events';

/**
 * WhatsApp integration hook.
 *
 * Connects via SSE to the engine's WhatsApp relay endpoint
 * (/engine/whatsapp/events → proxied to engine:4002).
 *
 * When connected, disables simulation and routes real messages
 * into the store.
 *
 * Backend SSE events:
 *   event: connected    — handshake with { clientId, configured }
 *   event: message      — { from, name, text, timestamp, messageId }
 *   event: status       — { phone, status, messageId }
 *   event: message_sent — { to, text, messageId }
 *   event: heartbeat    — keepalive
 *
 * To enable: set VITE_WHATSAPP_SSE_URL=/engine/whatsapp/events in .env
 */
export function useWhatsApp() {
  const esRef = useRef<EventSource | null>(null);
  const setStatus = useSalesStore((s) => s.setWhatsappStatus);
  const setSim = useSalesStore((s) => s.setSimulationEnabled);

  useEffect(() => {
    // Only connect if URL is explicitly configured
    if (!import.meta.env.VITE_WHATSAPP_SSE_URL) return;

    setStatus('connecting');

    const es = new EventSource(WA_SSE_URL);
    esRef.current = es;

    // -- Connection established --
    es.addEventListener('connected', (ev) => {
      try {
        const info = JSON.parse(ev.data);
        if (info.configured) {
          setStatus('connected');
          setSim(false);
        } else {
          // Engine running but WhatsApp not configured
          setStatus('error');
        }
      } catch {
        setStatus('connected');
        setSim(false);
      }
    });

    // -- Incoming message from lead --
    es.addEventListener('message', (ev) => {
      try {
        const data: WhatsAppIncoming = JSON.parse(ev.data);
        if (data.from && data.text) {
          handleIncomingMessage(data);
        }
      } catch {
        // ignore malformed events
      }
    });

    // -- Outbound message confirmation --
    es.addEventListener('message_sent', (ev) => {
      try {
        const data = JSON.parse(ev.data) as {
          to: string;
          text: string;
          messageId: string;
          timestamp: number;
        };
        handleOutboundConfirmation(data);
      } catch {
        // ignore
      }
    });

    // -- Status update (delivered/read) --
    es.addEventListener('status', (ev) => {
      try {
        const data = JSON.parse(ev.data) as {
          phone: string;
          status: string;
          messageId: string;
        };
        handleStatusUpdate(data);
      } catch {
        // ignore
      }
    });

    // -- Heartbeat (no action needed, keeps connection alive) --
    es.addEventListener('heartbeat', () => {
      // Connection is alive
    });

    // -- EventSource native events --
    es.onopen = () => {
      // onopen fires before our custom 'connected' event
    };

    es.onerror = () => {
      setStatus('error');
      // EventSource auto-reconnects
    };

    return () => {
      es.close();
      esRef.current = null;
      setStatus('disconnected');
      setSim(true);
    };
  }, [setStatus, setSim]);
}

// -- Send a message through WhatsApp --
export async function sendWhatsAppMessage(
  to: string,
  text: string,
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const res = await fetch('/engine/whatsapp/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, text }),
    });
    return await res.json();
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

// -- Handlers --

function handleIncomingMessage(data: WhatsAppIncoming) {
  const store = useSalesStore.getState();
  const fromNormalized = data.from.replace(/\D/g, '');

  // Find agent handling this phone number
  const agent = store.agents.find(
    (a) => a.currentLead?.phone.replace(/\D/g, '') === fromNormalized,
  );

  if (!agent) {
    // Unknown lead — assign to first idle agent
    const idle = store.agents.find((a) => a.status === 'ocioso');
    if (!idle) return;

    // Create new lead and assign
    const newLead: Lead = {
      id: `lead-wa-${fromNormalized}`,
      name: data.name,
      phone: data.from,
      temperature: 'warm',
      source: 'WhatsApp',
    };

    // Update agent with new lead
    store.updateAgentStatus(idle.id, 'atendendo');
    useSalesStore.setState((s) => ({
      agents: s.agents.map((a) =>
        a.id === idle.id ? { ...a, currentLead: newLead, activeConversations: a.activeConversations + 1 } : a,
      ),
    }));

    const msg: Message = {
      id: data.messageId,
      direction: 'lead',
      text: data.text,
      timestamp: new Date(data.timestamp * 1000),
      source: 'whatsapp',
    };

    store.addMessage(idle.id, msg);
    store.addActivity({
      id: `wa-new-${data.messageId}`,
      agentId: idle.id,
      agentName: idle.name,
      type: 'lead-qualified',
      description: `Novo lead WhatsApp · ${data.name}`,
      timestamp: new Date(),
    });

    store.incrementMetric('leadsToday');
    return;
  }

  const msg: Message = {
    id: data.messageId,
    direction: 'lead',
    text: data.text,
    timestamp: new Date(data.timestamp * 1000),
    source: 'whatsapp',
  };

  store.addMessage(agent.id, msg);
  store.addActivity({
    id: `wa-${data.messageId}`,
    agentId: agent.id,
    agentName: agent.name,
    type: 'message-received',
    description: `WhatsApp · ${data.name}`,
    timestamp: new Date(),
  });
}

function handleOutboundConfirmation(data: {
  to: string;
  text: string;
  messageId: string;
  timestamp: number;
}) {
  const store = useSalesStore.getState();
  const toNormalized = data.to.replace(/\D/g, '');

  const agent = store.agents.find(
    (a) => a.currentLead?.phone.replace(/\D/g, '') === toNormalized,
  );

  if (!agent) return;

  const msg: Message = {
    id: data.messageId,
    direction: 'agent',
    text: data.text,
    timestamp: new Date(data.timestamp * 1000),
    source: 'whatsapp',
  };

  store.addMessage(agent.id, msg);
  store.addActivity({
    id: `wa-sent-${data.messageId}`,
    agentId: agent.id,
    agentName: agent.name,
    type: 'message-sent',
    description: `WhatsApp enviado`,
    timestamp: new Date(),
  });
}

function handleStatusUpdate(data: {
  phone: string;
  status: string;
  messageId: string;
}) {
  // Status updates (delivered, read) can be used to update
  // message delivery indicators in the future.
  // For now, log as activity if it's a "read" receipt.
  if (data.status !== 'read') return;

  const store = useSalesStore.getState();
  const phoneNormalized = data.phone.replace(/\D/g, '');

  const agent = store.agents.find(
    (a) => a.currentLead?.phone.replace(/\D/g, '') === phoneNormalized,
  );

  if (!agent) return;

  store.addActivity({
    id: `wa-read-${data.messageId}`,
    agentId: agent.id,
    agentName: agent.name,
    type: 'message-received',
    description: `Lead leu a mensagem`,
    timestamp: new Date(),
  });
}
