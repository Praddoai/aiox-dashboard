import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { createHmac } from 'crypto';
import { log } from '../lib/logger';

// ============================================================
// WhatsApp Integration — Multi-Provider
// Supports: WAHA (self-hosted) and Meta Cloud API (official)
//
// Provider is selected via WHATSAPP_PROVIDER env var:
//   "waha"  — WAHA (default, easiest setup)
//   "meta"  — Meta Cloud API (official, requires business verification)
// ============================================================

// -- Config --

type Provider = 'waha' | 'meta';

const PROVIDER = (process.env.WHATSAPP_PROVIDER || 'waha') as Provider;

// WAHA config
const WAHA_URL = process.env.WAHA_URL || 'http://localhost:3000';
const WAHA_API_KEY = process.env.WAHA_API_KEY || '';
const WAHA_SESSION = process.env.WAHA_SESSION || 'default';

// Meta config
const META_VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || '';
const META_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN || '';
const META_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
const META_APP_SECRET = process.env.WHATSAPP_APP_SECRET || '';
const META_API_VERSION = process.env.WHATSAPP_API_VERSION || 'v21.0';
const META_API_BASE = `https://graph.facebook.com/${META_API_VERSION}`;

function isConfigured(): boolean {
  if (PROVIDER === 'waha') return Boolean(WAHA_URL);
  return Boolean(META_ACCESS_TOKEN && META_PHONE_NUMBER_ID && META_VERIFY_TOKEN);
}

// -- SSE Client Management --

interface SSEClient {
  id: string;
  write: (event: string, data: string) => Promise<void>;
}

const clients = new Set<SSEClient>();

interface BufferedEvent {
  event: string;
  data: string;
  timestamp: number;
}

const recentEvents: BufferedEvent[] = [];
const MAX_BUFFER = 100;

function broadcast(event: string, data: unknown): void {
  const json = JSON.stringify(data);
  recentEvents.push({ event, data: json, timestamp: Date.now() });
  if (recentEvents.length > MAX_BUFFER) recentEvents.shift();

  log.debug('SSE broadcast', { event, clients: clients.size });

  for (const client of clients) {
    client.write(event, json).catch(() => {
      clients.delete(client);
    });
  }
}

// -- WAHA Webhook Payload --

interface WahaWebhookPayload {
  event: string; // "message", "message.ack", "session.status"
  session: string;
  engine?: string;
  payload: {
    id: string;
    timestamp: number;
    from: string;       // "5511999999999@c.us"
    to: string;
    body: string;
    hasMedia: boolean;
    fromMe: boolean;
    ack?: number | null;
    _data?: {
      notifyName?: string;
    };
  };
}

// -- Meta Webhook Payload --

interface MetaWebhookPayload {
  object: string;
  entry: Array<{
    id: string;
    changes: Array<{
      value: {
        messaging_product: string;
        metadata: {
          display_phone_number: string;
          phone_number_id: string;
        };
        contacts?: Array<{
          profile: { name: string };
          wa_id: string;
        }>;
        messages?: Array<{
          from: string;
          id: string;
          timestamp: string;
          text?: { body: string };
          type: string;
        }>;
        statuses?: Array<{
          id: string;
          status: 'sent' | 'delivered' | 'read' | 'failed';
          timestamp: string;
          recipient_id: string;
        }>;
      };
      field: string;
    }>;
  }>;
}

// -- Helpers --

function wahaPhoneToNumber(waId: string): string {
  // "5511999999999@c.us" → "5511999999999"
  return waId.replace('@c.us', '').replace('@s.whatsapp.net', '');
}

function numberToWahaId(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return `${digits}@c.us`;
}

function wahaHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (WAHA_API_KEY) headers['Authorization'] = `Bearer ${WAHA_API_KEY}`;
  return headers;
}

function verifyMetaSignature(rawBody: string, signatureHeader: string): boolean {
  if (!META_APP_SECRET) return true;
  const expected = signatureHeader.replace('sha256=', '');
  const computed = createHmac('sha256', META_APP_SECRET)
    .update(rawBody)
    .digest('hex');
  return computed === expected;
}

// ─── Route Builder ────────────────────────────────────────

const whatsapp = new Hono();

// GET /status — Check configuration and WAHA session
whatsapp.get('/status', async (c) => {
  const base = {
    provider: PROVIDER,
    configured: isConfigured(),
    connectedClients: clients.size,
    bufferedEvents: recentEvents.length,
  };

  if (PROVIDER === 'waha' && isConfigured()) {
    try {
      const res = await fetch(`${WAHA_URL}/api/sessions`, {
        headers: wahaHeaders(),
      });
      const sessions = await res.json() as Array<{ name: string; status: string }>;
      const session = sessions.find((s) => s.name === WAHA_SESSION);
      return c.json({
        ...base,
        wahaUrl: WAHA_URL,
        session: session ? { name: session.name, status: session.status } : null,
        sessions: sessions.map((s) => ({ name: s.name, status: s.status })),
      });
    } catch (err) {
      return c.json({
        ...base,
        wahaUrl: WAHA_URL,
        error: `Cannot reach WAHA: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }

  if (PROVIDER === 'meta') {
    return c.json({
      ...base,
      phoneNumberId: META_PHONE_NUMBER_ID || null,
    });
  }

  return c.json(base);
});

// GET /qr — Get WAHA QR code for pairing
whatsapp.get('/qr', async (c) => {
  if (PROVIDER !== 'waha') {
    return c.json({ error: 'QR code only available with WAHA provider' }, 400);
  }

  try {
    // Start session if not exists
    await fetch(`${WAHA_URL}/api/sessions/${WAHA_SESSION}/start`, {
      method: 'POST',
      headers: wahaHeaders(),
      body: JSON.stringify({ name: WAHA_SESSION }),
    });

    // Get QR code
    const res = await fetch(`${WAHA_URL}/api/${WAHA_SESSION}/auth/qr`, {
      headers: wahaHeaders(),
    });

    if (!res.ok) {
      const body = await res.text();
      return c.json({ error: 'QR not available (session may already be authenticated)', details: body }, 400);
    }

    const contentType = res.headers.get('content-type') || '';

    // WAHA returns QR as image or as JSON with base64
    if (contentType.includes('image')) {
      const buffer = await res.arrayBuffer();
      return new Response(buffer, {
        headers: { 'Content-Type': contentType },
      });
    }

    const data = await res.json();
    return c.json(data);
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

// GET /webhook — Meta verification handshake (Meta only)
whatsapp.get('/webhook', (c) => {
  if (PROVIDER !== 'meta') {
    return c.text('Meta webhook verification not applicable for WAHA', 200);
  }

  const mode = c.req.query('hub.mode');
  const token = c.req.query('hub.verify_token');
  const challenge = c.req.query('hub.challenge');

  if (mode === 'subscribe' && token === META_VERIFY_TOKEN) {
    log.info('WhatsApp Meta webhook verified');
    return c.text(challenge || '', 200);
  }

  log.warn('Meta webhook verification failed', { mode });
  return c.text('Forbidden', 403);
});

// POST /webhook — Receive incoming messages (auto-detects provider format)
whatsapp.post('/webhook', async (c) => {
  const rawBody = await c.req.text();

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return c.text('Invalid JSON', 400);
  }

  // Auto-detect payload format
  const obj = payload as Record<string, unknown>;

  if (obj.event && obj.payload) {
    // WAHA format
    return handleWahaWebhook(obj as unknown as WahaWebhookPayload, c);
  }

  if (obj.object === 'whatsapp_business_account') {
    // Meta format
    const signature = c.req.header('x-hub-signature-256') || '';
    if (META_APP_SECRET && !verifyMetaSignature(rawBody, signature)) {
      log.warn('Meta webhook signature mismatch');
      return c.text('Invalid signature', 401);
    }
    return handleMetaWebhook(obj as unknown as MetaWebhookPayload, c);
  }

  log.warn('Unknown webhook format', { keys: Object.keys(obj) });
  return c.text('OK', 200);
});

// -- WAHA Webhook Handler --

function handleWahaWebhook(data: WahaWebhookPayload, c: { text: (body: string, status?: number) => Response }) {
  const { event, payload } = data;

  if (event === 'message' && !payload.fromMe) {
    const phone = wahaPhoneToNumber(payload.from);
    const name = payload._data?.notifyName || phone;

    const sseData = {
      from: phone,
      name,
      text: payload.body,
      timestamp: payload.timestamp,
      messageId: payload.id,
    };

    log.info('WAHA message received', {
      from: phone,
      name,
      text: payload.body.slice(0, 50),
    });

    broadcast('message', sseData);
  }

  if (event === 'message' && payload.fromMe) {
    const phone = wahaPhoneToNumber(payload.to);

    broadcast('message_sent', {
      to: phone,
      text: payload.body,
      messageId: payload.id,
      timestamp: payload.timestamp,
    });
  }

  if (event === 'message.ack') {
    const ackMap: Record<number, string> = {
      1: 'sent',
      2: 'delivered',
      3: 'read',
    };
    const status = ackMap[payload.ack ?? 0];
    if (status) {
      const phone = wahaPhoneToNumber(payload.fromMe ? payload.to : payload.from);
      broadcast('status', {
        phone,
        status,
        messageId: payload.id,
        timestamp: payload.timestamp,
      });
    }
  }

  if (event === 'session.status') {
    broadcast('session_status', {
      session: data.session,
      status: (payload as unknown as Record<string, unknown>).status,
    });
  }

  return c.text('OK', 200);
}

// -- Meta Webhook Handler --

function handleMetaWebhook(payload: MetaWebhookPayload, c: { text: (body: string, status?: number) => Response }) {
  for (const entry of payload.entry) {
    for (const change of entry.changes) {
      if (change.field !== 'messages') continue;
      const value = change.value;

      if (value.messages) {
        for (const msg of value.messages) {
          if (msg.type !== 'text' || !msg.text) continue;

          const contact = value.contacts?.find((ct) => ct.wa_id === msg.from);

          broadcast('message', {
            from: msg.from,
            name: contact?.profile.name || msg.from,
            text: msg.text.body,
            timestamp: parseInt(msg.timestamp, 10),
            messageId: msg.id,
          });
        }
      }

      if (value.statuses) {
        for (const status of value.statuses) {
          broadcast('status', {
            phone: status.recipient_id,
            status: status.status,
            messageId: status.id,
            timestamp: parseInt(status.timestamp, 10),
          });
        }
      }
    }
  }

  return c.text('OK', 200);
}

// GET /events — SSE stream for frontend
whatsapp.get('/events', (c) => {
  return streamSSE(c, async (stream) => {
    const clientId = `sse-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    let active = true;

    const client: SSEClient = {
      id: clientId,
      write: async (event, data) => {
        if (!active) return;
        await stream.writeSSE({ event, data });
      },
    };

    clients.add(client);
    log.info('SSE client connected', { clientId, total: clients.size });

    stream.onAbort(() => {
      active = false;
      clients.delete(client);
      log.info('SSE client disconnected', { clientId, total: clients.size });
    });

    // Send initial connection status
    await stream.writeSSE({
      event: 'connected',
      data: JSON.stringify({
        clientId,
        provider: PROVIDER,
        configured: isConfigured(),
        buffered: recentEvents.length,
      }),
    });

    // Send buffered events (catch-up)
    for (const buffered of recentEvents) {
      if (!active) break;
      await stream.writeSSE({ event: buffered.event, data: buffered.data });
    }

    // Heartbeat loop keeps connection alive
    while (active) {
      try {
        await stream.sleep(15_000);
        if (active) {
          await stream.writeSSE({
            event: 'heartbeat',
            data: JSON.stringify({ t: Date.now(), clients: clients.size }),
          });
        }
      } catch {
        break;
      }
    }
  });
});

// POST /send — Send message (auto-routes to correct provider)
whatsapp.post('/send', async (c) => {
  if (!isConfigured()) {
    return c.json({ error: 'WhatsApp not configured' }, 503);
  }

  const body = await c.req.json<{ to: string; text: string }>();

  if (!body.to || !body.text) {
    return c.json({ error: 'Missing "to" and "text" fields' }, 400);
  }

  if (PROVIDER === 'waha') {
    return sendViaWaha(body.to, body.text, c);
  }

  return sendViaMeta(body.to, body.text, c);
});

// -- WAHA Send --

async function sendViaWaha(to: string, text: string, c: { json: (data: unknown, status?: number) => Response }) {
  const chatId = numberToWahaId(to);

  try {
    const res = await fetch(`${WAHA_URL}/api/sendText`, {
      method: 'POST',
      headers: wahaHeaders(),
      body: JSON.stringify({
        chatId,
        text,
        session: WAHA_SESSION,
      }),
    });

    const result = await res.json() as Record<string, unknown>;

    if (!res.ok) {
      log.error('WAHA send failed', { status: res.status, result });
      return c.json({ error: 'WAHA API error', details: result }, res.status as 400);
    }

    const messageId = (result.id as string) || `waha-${Date.now()}`;
    log.info('WAHA message sent', { to: chatId, messageId });

    broadcast('message_sent', {
      to: to.replace(/\D/g, ''),
      text,
      messageId,
      timestamp: Math.floor(Date.now() / 1000),
    });

    return c.json({ success: true, messageId });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error('WAHA send error', { error: msg });
    return c.json({ error: msg }, 500);
  }
}

// -- Meta Send --

async function sendViaMeta(to: string, text: string, c: { json: (data: unknown, status?: number) => Response }) {
  const phone = to.replace(/\D/g, '');

  try {
    const res = await fetch(`${META_API_BASE}/${META_PHONE_NUMBER_ID}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${META_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: phone,
        type: 'text',
        text: { body: text },
      }),
    });

    const result = await res.json() as Record<string, unknown>;

    if (!res.ok) {
      log.error('Meta send failed', { status: res.status, result });
      return c.json({ error: 'Meta API error', details: result }, res.status as 400);
    }

    const messages = result.messages as Array<{ id: string }> | undefined;
    const messageId = messages?.[0]?.id;
    log.info('Meta message sent', { to: phone, messageId });

    broadcast('message_sent', {
      to: phone,
      text,
      messageId,
      timestamp: Math.floor(Date.now() / 1000),
    });

    return c.json({ success: true, messageId });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error('Meta send error', { error: msg });
    return c.json({ error: msg }, 500);
  }
}

export { whatsapp };
