#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

// ── Hotmart OAuth2 Client ────────────────────────────────────────────────────

const TOKEN_ENDPOINT = 'https://api-sec-vlc.hotmart.com/security/oauth/token';
const API_BASE = 'https://developers.hotmart.com';

const CLIENT_ID = process.env.HOTMART_CLIENT_ID;
const CLIENT_SECRET = process.env.HOTMART_CLIENT_SECRET;
const BASIC_AUTH = process.env.HOTMART_BASIC_AUTH;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('Error: HOTMART_CLIENT_ID and HOTMART_CLIENT_SECRET are required.');
  process.exit(1);
}

let cachedToken: { access_token: string; expires_at: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expires_at - 60000) {
    return cachedToken.access_token;
  }

  // Always generate auth from CLIENT_ID:CLIENT_SECRET (most reliable).
  // BASIC_AUTH env var is only used as fallback if it looks like valid base64.
  const generatedAuth = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');

  let authHeader = generatedAuth;
  if (BASIC_AUTH) {
    // Strip "Basic" prefix (with or without trailing space), newlines, whitespace
    const cleaned = BASIC_AUTH.replace(/^Basic\s*/i, '').replace(/[\r\n\s]/g, '');
    // Only use BASIC_AUTH if it's a valid-looking base64 string (min 20 chars, base64 charset)
    if (cleaned.length >= 20 && /^[A-Za-z0-9+/]+=*$/.test(cleaned)) {
      // Ensure proper padding
      let padded = cleaned;
      if (padded.length % 4 !== 0) {
        padded += '='.repeat(4 - (padded.length % 4));
      }
      authHeader = padded;
    }
  }

  const res = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${authHeader}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token request failed (${res.status}): ${text}`);
  }

  const data = await res.json() as { access_token: string; expires_in: number };
  cachedToken = {
    access_token: data.access_token,
    expires_at: Date.now() + data.expires_in * 1000,
  };

  return cachedToken.access_token;
}

async function hotmartApi(path: string, params?: Record<string, string>): Promise<unknown> {
  let token = await getAccessToken();
  const url = new URL(path, API_BASE);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v) url.searchParams.set(k, v);
    }
  }

  let res = await fetch(url.toString(), {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  // Retry once on 401: invalidate cached token, get a fresh one, and retry
  if (res.status === 401) {
    cachedToken = null;
    token = await getAccessToken();
    res = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Hotmart API error (${res.status}): ${text}`);
  }

  return res.json();
}

// ── MCP Server ───────────────────────────────────────────────────────────────

const server = new McpServer(
  { name: 'hotmart-mcp', version: '1.0.0' },
  { capabilities: { tools: {} } },
);

// ── Sales History ────────────────────────────────────────────────────────────

server.tool(
  'get_sales_history',
  'Retrieve sales history from Hotmart. Returns list of sales with buyer info, product, status, price.',
  {
    start_date: z.string().optional().describe('Start date in epoch milliseconds (e.g. 1704067200000)'),
    end_date: z.string().optional().describe('End date in epoch milliseconds'),
    product_id: z.string().optional().describe('Filter by product ID'),
    transaction_status: z.string().optional().describe('Filter by status: APPROVED, REFUNDED, CANCELLED, etc.'),
    max_results: z.string().optional().describe('Max results per page (default 50, max 500)'),
    page_token: z.string().optional().describe('Pagination token from previous response'),
  },
  async (params) => {
    try {
      const data = await hotmartApi('/payments/api/v1/sales/history', {
        start_date: params.start_date || '',
        end_date: params.end_date || '',
        product_id: params.product_id || '',
        transaction_status: params.transaction_status || '',
        max_results: params.max_results || '50',
        page_token: params.page_token || '',
      });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (e) {
      return { content: [{ type: 'text', text: `Error: ${(e as Error).message}` }], isError: true };
    }
  },
);

// ── Sales Summary ────────────────────────────────────────────────────────────

server.tool(
  'get_sales_summary',
  'Get sales summary/totals from Hotmart for a date range.',
  {
    start_date: z.string().optional().describe('Start date in epoch milliseconds'),
    end_date: z.string().optional().describe('End date in epoch milliseconds'),
    product_id: z.string().optional().describe('Filter by product ID'),
  },
  async (params) => {
    try {
      const data = await hotmartApi('/payments/api/v1/sales/summary', {
        start_date: params.start_date || '',
        end_date: params.end_date || '',
        product_id: params.product_id || '',
      });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (e) {
      return { content: [{ type: 'text', text: `Error: ${(e as Error).message}` }], isError: true };
    }
  },
);

// ── Sales Commissions ────────────────────────────────────────────────────────

server.tool(
  'get_sales_commissions',
  'Get commission details for sales participants (producer, affiliates, co-producers).',
  {
    start_date: z.string().optional().describe('Start date in epoch milliseconds'),
    end_date: z.string().optional().describe('End date in epoch milliseconds'),
    transaction_status: z.string().optional().describe('Filter by status'),
    max_results: z.string().optional().describe('Max results (default 50)'),
    page_token: z.string().optional().describe('Pagination token'),
  },
  async (params) => {
    try {
      const data = await hotmartApi('/payments/api/v1/sales/commissions', {
        start_date: params.start_date || '',
        end_date: params.end_date || '',
        transaction_status: params.transaction_status || '',
        max_results: params.max_results || '50',
        page_token: params.page_token || '',
      });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (e) {
      return { content: [{ type: 'text', text: `Error: ${(e as Error).message}` }], isError: true };
    }
  },
);

// ── Subscriptions ────────────────────────────────────────────────────────────

server.tool(
  'get_subscriptions',
  'List all subscriptions from Hotmart. Shows subscriber info, plan, status, dates.',
  {
    product_id: z.string().optional().describe('Filter by product ID'),
    subscriber_email: z.string().optional().describe('Filter by subscriber email'),
    status: z.string().optional().describe('Filter: ACTIVE, INACTIVE, CANCELLED_BY_CUSTOMER, etc.'),
    max_results: z.string().optional().describe('Max results (default 50)'),
    page_token: z.string().optional().describe('Pagination token'),
  },
  async (params) => {
    try {
      const data = await hotmartApi('/payments/api/v1/subscriptions', {
        product_id: params.product_id || '',
        subscriber_email: params.subscriber_email || '',
        status: params.status || '',
        max_results: params.max_results || '50',
        page_token: params.page_token || '',
      });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (e) {
      return { content: [{ type: 'text', text: `Error: ${(e as Error).message}` }], isError: true };
    }
  },
);

// ── Subscription Summary ─────────────────────────────────────────────────────

server.tool(
  'get_subscription_summary',
  'Get subscription summary with totals by status.',
  {
    product_id: z.string().optional().describe('Filter by product ID'),
  },
  async (params) => {
    try {
      const data = await hotmartApi('/payments/api/v1/subscriptions/summary', {
        product_id: params.product_id || '',
      });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (e) {
      return { content: [{ type: 'text', text: `Error: ${(e as Error).message}` }], isError: true };
    }
  },
);

// ── Sales Price Details ──────────────────────────────────────────────────────

server.tool(
  'get_sales_price_details',
  'Get detailed pricing breakdown for a specific transaction.',
  {
    transaction: z.string().describe('Transaction code (e.g. HP12345678901234)'),
  },
  async (params) => {
    try {
      const data = await hotmartApi('/payments/api/v1/sales/price/details', {
        transaction: params.transaction,
      });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (e) {
      return { content: [{ type: 'text', text: `Error: ${(e as Error).message}` }], isError: true };
    }
  },
);

// ── Members Area: Modules ────────────────────────────────────────────────────

server.tool(
  'get_club_modules',
  'List modules from Hotmart Members Area (Club). Shows course structure.',
  {
    subdomain: z.string().describe('Members area subdomain'),
    is_extra: z.string().optional().describe('Filter extra content (true/false)'),
  },
  async (params) => {
    try {
      const data = await hotmartApi('/club/api/v1/modules', {
        subdomain: params.subdomain,
        is_extra: params.is_extra || '',
      });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (e) {
      return { content: [{ type: 'text', text: `Error: ${(e as Error).message}` }], isError: true };
    }
  },
);

// ── Members Area: Students ───────────────────────────────────────────────────

server.tool(
  'get_club_students',
  'List students/users from Hotmart Members Area. Shows enrollment info.',
  {
    subdomain: z.string().describe('Members area subdomain'),
    email: z.string().optional().describe('Filter by student email'),
    max_results: z.string().optional().describe('Max results (default 50)'),
    page_token: z.string().optional().describe('Pagination token'),
  },
  async (params) => {
    try {
      const data = await hotmartApi('/club/api/v1/users', {
        subdomain: params.subdomain,
        email: params.email || '',
        max_results: params.max_results || '50',
        page_token: params.page_token || '',
      });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (e) {
      return { content: [{ type: 'text', text: `Error: ${(e as Error).message}` }], isError: true };
    }
  },
);

// ── Sales Participants ───────────────────────────────────────────────────────

server.tool(
  'get_sales_participants',
  'Get participants involved in sales (producer, affiliates, co-producers) and their commissions.',
  {
    transaction: z.string().describe('Transaction code'),
  },
  async (params) => {
    try {
      const data = await hotmartApi('/payments/api/v1/sales/users', {
        transaction: params.transaction,
      });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (e) {
      return { content: [{ type: 'text', text: `Error: ${(e as Error).message}` }], isError: true };
    }
  },
);

// ── Start Server ─────────────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
