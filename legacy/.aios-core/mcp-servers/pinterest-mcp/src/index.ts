#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

// ── Pinterest API Client (v5) ──────────────────────────────────────────────
//
// Docs: https://developers.pinterest.com/docs/api/v5/
//
// Requires:
//   - PINTEREST_ACCESS_TOKEN (OAuth 2.0 Bearer token)

const API_BASE = 'https://api.pinterest.com/v5';

const ACCESS_TOKEN = process.env.PINTEREST_ACCESS_TOKEN;

if (!ACCESS_TOKEN) {
  console.error('Error: PINTEREST_ACCESS_TOKEN is required.');
  process.exit(1);
}

interface PinterestApiResponse {
  items?: unknown[];
  bookmark?: string;
  [key: string]: unknown;
}

async function pinterestApi(path: string, params?: Record<string, string>, method: string = 'GET', body?: Record<string, unknown>): Promise<PinterestApiResponse> {
  const url = new URL(`${API_BASE}${path}`);

  if (method === 'GET' && params) {
    for (const [k, v] of Object.entries(params)) {
      if (v) url.searchParams.set(k, v);
    }
  }

  const headers: Record<string, string> = {
    'Authorization': `Bearer ${ACCESS_TOKEN}`,
    'Content-Type': 'application/json',
  };

  const fetchOptions: RequestInit = { method, headers };
  if (method !== 'GET' && body) {
    fetchOptions.body = JSON.stringify(body);
  }

  const res = await fetch(url.toString(), fetchOptions);

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Pinterest API error (${res.status}): ${text}`);
  }

  return res.json() as Promise<PinterestApiResponse>;
}

// ── MCP Server ──────────────────────────────────────────────────────────────

const server = new McpServer(
  { name: 'pinterest-mcp', version: '1.0.0' },
  { capabilities: { tools: {} } },
);

// ── 1. Get User Account ─────────────────────────────────────────────────────

server.tool(
  'get_account',
  'Get Pinterest user account info: username, profile image, website, follower count, pin count.',
  {},
  async () => {
    try {
      const data = await pinterestApi('/user_account');
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (e) {
      return { content: [{ type: 'text', text: `Error: ${(e as Error).message}` }], isError: true };
    }
  },
);

// ── 2. Get Account Analytics ────────────────────────────────────────────────

server.tool(
  'get_account_analytics',
  'Get Pinterest account-level analytics: impressions, engagements, pin clicks, outbound clicks, saves over a date range.',
  {
    start_date: z.string().describe('Start date YYYY-MM-DD'),
    end_date: z.string().describe('End date YYYY-MM-DD'),
    metric_types: z.string().optional().describe('Comma-separated metrics. Available: IMPRESSION,PIN_CLICK,OUTBOUND_CLICK,SAVE,ENGAGEMENT. Default: IMPRESSION,PIN_CLICK,OUTBOUND_CLICK,SAVE'),
    from_claimed_content: z.enum(['OTHER', 'CLAIMED', 'BOTH']).optional().describe('Filter by content source. Default: BOTH'),
    app_types: z.enum(['ALL', 'MOBILE', 'TABLET', 'WEB']).optional().describe('Filter by device. Default: ALL'),
    split_field: z.enum(['NO_SPLIT', 'APP_TYPE', 'OWNED_CONTENT', 'PIN_FORMAT']).optional().describe('Split results by dimension. Default: NO_SPLIT'),
  },
  async (params) => {
    try {
      const data = await pinterestApi('/user_account/analytics', {
        start_date: params.start_date,
        end_date: params.end_date,
        metric_types: params.metric_types || 'IMPRESSION,PIN_CLICK,OUTBOUND_CLICK,SAVE',
        from_claimed_content: params.from_claimed_content || 'BOTH',
        app_types: params.app_types || 'ALL',
        split_field: params.split_field || 'NO_SPLIT',
      });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (e) {
      return { content: [{ type: 'text', text: `Error: ${(e as Error).message}` }], isError: true };
    }
  },
);

// ── 3. Get Top Pins Analytics ───────────────────────────────────────────────

server.tool(
  'get_top_pins',
  'Get top performing pins by metric for a date range.',
  {
    start_date: z.string().describe('Start date YYYY-MM-DD'),
    end_date: z.string().describe('End date YYYY-MM-DD'),
    sort_by: z.enum(['IMPRESSION', 'PIN_CLICK', 'OUTBOUND_CLICK', 'SAVE', 'ENGAGEMENT']).optional().describe('Sort by metric. Default: IMPRESSION'),
    num_of_pins: z.string().optional().describe('Number of pins to return (default 10, max 50)'),
  },
  async (params) => {
    try {
      const data = await pinterestApi('/user_account/analytics/top_pins', {
        start_date: params.start_date,
        end_date: params.end_date,
        sort_by: params.sort_by || 'IMPRESSION',
        num_of_pins: params.num_of_pins || '10',
        metric_types: 'IMPRESSION,PIN_CLICK,OUTBOUND_CLICK,SAVE,ENGAGEMENT',
        from_claimed_content: 'BOTH',
      });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (e) {
      return { content: [{ type: 'text', text: `Error: ${(e as Error).message}` }], isError: true };
    }
  },
);

// ── 4. Get Top Video Pins ───────────────────────────────────────────────────

server.tool(
  'get_top_video_pins',
  'Get top performing video pins by metric for a date range.',
  {
    start_date: z.string().describe('Start date YYYY-MM-DD'),
    end_date: z.string().describe('End date YYYY-MM-DD'),
    sort_by: z.enum(['IMPRESSION', 'SAVE', 'OUTBOUND_CLICK', 'VIDEO_MRC_VIEW', 'VIDEO_AVG_WATCH_TIME', 'VIDEO_V50_WATCH_TIME', 'QUARTILE_95_PERCENT_VIEW']).optional().describe('Sort by metric. Default: IMPRESSION'),
    num_of_pins: z.string().optional().describe('Number of pins to return (default 10, max 50)'),
  },
  async (params) => {
    try {
      const data = await pinterestApi('/user_account/analytics/top_video_pins', {
        start_date: params.start_date,
        end_date: params.end_date,
        sort_by: params.sort_by || 'IMPRESSION',
        num_of_pins: params.num_of_pins || '10',
        metric_types: 'IMPRESSION,SAVE,VIDEO_MRC_VIEW,VIDEO_AVG_WATCH_TIME,QUARTILE_95_PERCENT_VIEW,OUTBOUND_CLICK',
        from_claimed_content: 'BOTH',
      });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (e) {
      return { content: [{ type: 'text', text: `Error: ${(e as Error).message}` }], isError: true };
    }
  },
);

// ── 5. List Boards ──────────────────────────────────────────────────────────

server.tool(
  'list_boards',
  'List Pinterest boards for the authenticated user.',
  {
    page_size: z.string().optional().describe('Number of boards per page (default 25, max 250)'),
    bookmark: z.string().optional().describe('Pagination bookmark for next page'),
    privacy: z.enum(['PUBLIC', 'PROTECTED', 'ALL']).optional().describe('Filter by privacy. Default: ALL'),
  },
  async (params) => {
    try {
      const data = await pinterestApi('/boards', {
        page_size: params.page_size || '25',
        bookmark: params.bookmark || '',
        privacy: params.privacy || 'ALL',
      });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (e) {
      return { content: [{ type: 'text', text: `Error: ${(e as Error).message}` }], isError: true };
    }
  },
);

// ── 6. Get Board Details ────────────────────────────────────────────────────

server.tool(
  'get_board',
  'Get details of a specific Pinterest board by ID.',
  {
    board_id: z.string().describe('The board ID'),
  },
  async (params) => {
    try {
      const data = await pinterestApi(`/boards/${params.board_id}`);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (e) {
      return { content: [{ type: 'text', text: `Error: ${(e as Error).message}` }], isError: true };
    }
  },
);

// ── 7. List Board Pins ──────────────────────────────────────────────────────

server.tool(
  'list_board_pins',
  'List pins on a specific Pinterest board.',
  {
    board_id: z.string().describe('The board ID'),
    page_size: z.string().optional().describe('Number of pins per page (default 25, max 250)'),
    bookmark: z.string().optional().describe('Pagination bookmark'),
  },
  async (params) => {
    try {
      const data = await pinterestApi(`/boards/${params.board_id}/pins`, {
        page_size: params.page_size || '25',
        bookmark: params.bookmark || '',
      });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (e) {
      return { content: [{ type: 'text', text: `Error: ${(e as Error).message}` }], isError: true };
    }
  },
);

// ── 8. Get Pin Details ──────────────────────────────────────────────────────

server.tool(
  'get_pin',
  'Get details of a specific Pinterest pin by ID.',
  {
    pin_id: z.string().describe('The pin ID'),
  },
  async (params) => {
    try {
      const data = await pinterestApi(`/pins/${params.pin_id}`);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (e) {
      return { content: [{ type: 'text', text: `Error: ${(e as Error).message}` }], isError: true };
    }
  },
);

// ── 9. Get Pin Analytics ────────────────────────────────────────────────────

server.tool(
  'get_pin_analytics',
  'Get analytics for a specific pin: impressions, saves, clicks, outbound clicks.',
  {
    pin_id: z.string().describe('The pin ID'),
    start_date: z.string().describe('Start date YYYY-MM-DD'),
    end_date: z.string().describe('End date YYYY-MM-DD'),
    metric_types: z.string().optional().describe('Comma-separated metrics. Default: IMPRESSION,PIN_CLICK,OUTBOUND_CLICK,SAVE'),
  },
  async (params) => {
    try {
      const data = await pinterestApi(`/pins/${params.pin_id}/analytics`, {
        start_date: params.start_date,
        end_date: params.end_date,
        metric_types: params.metric_types || 'IMPRESSION,PIN_CLICK,OUTBOUND_CLICK,SAVE',
        app_types: 'ALL',
      });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (e) {
      return { content: [{ type: 'text', text: `Error: ${(e as Error).message}` }], isError: true };
    }
  },
);

// ── 10. Create Pin ──────────────────────────────────────────────────────────

server.tool(
  'create_pin',
  'Create a new Pinterest pin on a board. Requires image URL and board ID.',
  {
    board_id: z.string().describe('Board ID to pin to'),
    title: z.string().optional().describe('Pin title (max 100 chars)'),
    description: z.string().optional().describe('Pin description (max 800 chars)'),
    link: z.string().optional().describe('Destination URL when pin is clicked'),
    image_url: z.string().describe('Source image URL for the pin'),
    alt_text: z.string().optional().describe('Alt text for accessibility'),
  },
  async (params) => {
    try {
      const pinBody: Record<string, unknown> = {
        board_id: params.board_id,
        media_source: {
          source_type: 'image_url',
          url: params.image_url,
        },
      };
      if (params.title) pinBody.title = params.title;
      if (params.description) pinBody.description = params.description;
      if (params.link) pinBody.link = params.link;
      if (params.alt_text) pinBody.alt_text = params.alt_text;

      const data = await pinterestApi('/pins', undefined, 'POST', pinBody);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (e) {
      return { content: [{ type: 'text', text: `Error: ${(e as Error).message}` }], isError: true };
    }
  },
);

// ── 11. Search Pins ─────────────────────────────────────────────────────────

server.tool(
  'search_pins',
  'Search for pins using a text query. Returns public pins matching the search term.',
  {
    query: z.string().describe('Search query text'),
    page_size: z.string().optional().describe('Results per page (default 10, max 100)'),
    bookmark: z.string().optional().describe('Pagination bookmark'),
  },
  async (params) => {
    try {
      const data = await pinterestApi('/search/pins', {
        query: params.query,
        page_size: params.page_size || '10',
        bookmark: params.bookmark || '',
      });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (e) {
      return { content: [{ type: 'text', text: `Error: ${(e as Error).message}` }], isError: true };
    }
  },
);

// ── 12. Get Audience Insights ───────────────────────────────────────────────

server.tool(
  'get_audience_insights',
  'Get audience demographics and interests for the authenticated account.',
  {
    ad_account_id: z.string().optional().describe('Ad account ID (required for advertiser-level insights)'),
  },
  async (params) => {
    try {
      if (params.ad_account_id) {
        const data = await pinterestApi(`/ad_accounts/${params.ad_account_id}/audience_insights`, {
          audience_insight_type: 'YOUR_TOTAL_AUDIENCE',
        });
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      }
      // Fallback: use account analytics with split
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const data = await pinterestApi('/user_account/analytics', {
        start_date: thirtyDaysAgo.toISOString().split('T')[0],
        end_date: now.toISOString().split('T')[0],
        metric_types: 'IMPRESSION,ENGAGEMENT,PIN_CLICK,SAVE',
        split_field: 'APP_TYPE',
      });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (e) {
      return { content: [{ type: 'text', text: `Error: ${(e as Error).message}` }], isError: true };
    }
  },
);

// ── Start Server ────────────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
