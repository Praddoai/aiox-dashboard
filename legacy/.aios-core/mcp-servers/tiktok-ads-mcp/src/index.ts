#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

// ── TikTok Business API Client (v1.3) ──────────────────────────────────────
//
// Docs: https://business-api.tiktok.com/portal/docs
//
// Requires:
//   - TIKTOK_ACCESS_TOKEN (from TikTok for Business developer portal)
//   - TIKTOK_ADVERTISER_ID (your advertiser account ID)

const API_BASE = 'https://business-api.tiktok.com/open_api/v1.3';

const ACCESS_TOKEN = process.env.TIKTOK_ACCESS_TOKEN;
const ADVERTISER_ID = process.env.TIKTOK_ADVERTISER_ID;

if (!ACCESS_TOKEN) {
  console.error('Error: TIKTOK_ACCESS_TOKEN is required.');
  process.exit(1);
}

if (!ADVERTISER_ID) {
  console.error('Error: TIKTOK_ADVERTISER_ID is required.');
  process.exit(1);
}

interface TikTokApiResponse {
  code: number;
  message: string;
  data: unknown;
  request_id?: string;
}

async function tiktokApi(path: string, params?: Record<string, unknown>, method: string = 'GET'): Promise<TikTokApiResponse> {
  const url = new URL(`${API_BASE}${path}`);

  const headers: Record<string, string> = {
    'Access-Token': ACCESS_TOKEN!,
    'Content-Type': 'application/json',
  };

  let fetchOptions: RequestInit;

  if (method === 'GET') {
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== null && v !== '') {
          url.searchParams.set(k, String(v));
        }
      }
    }
    fetchOptions = { method, headers };
  } else {
    fetchOptions = {
      method,
      headers,
      body: JSON.stringify(params || {}),
    };
  }

  const res = await fetch(url.toString(), fetchOptions);

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`TikTok API HTTP error (${res.status}): ${text}`);
  }

  const json = await res.json() as TikTokApiResponse;
  if (json.code !== 0) {
    throw new Error(`TikTok API error (code ${json.code}): ${json.message}`);
  }

  return json;
}

// ── MCP Server ──────────────────────────────────────────────────────────────

const server = new McpServer(
  { name: 'tiktok-ads-mcp', version: '1.0.0' },
  { capabilities: { tools: {} } },
);

// ── 1. Get Advertiser Info ──────────────────────────────────────────────────

server.tool(
  'get_advertiser_info',
  'Get TikTok Ads advertiser account info: name, status, currency, timezone, balance.',
  {},
  async () => {
    try {
      const data = await tiktokApi('/advertiser/info/', {
        advertiser_ids: JSON.stringify([ADVERTISER_ID]),
      });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (e) {
      return { content: [{ type: 'text', text: `Error: ${(e as Error).message}` }], isError: true };
    }
  },
);

// ── 2. Get Campaigns ────────────────────────────────────────────────────────

server.tool(
  'get_campaigns',
  'List TikTok Ads campaigns with status, budget, objective.',
  {
    page: z.string().optional().describe('Page number (default 1)'),
    page_size: z.string().optional().describe('Results per page (default 20, max 1000)'),
    status: z.string().optional().describe('Filter by status: CAMPAIGN_STATUS_ENABLE, CAMPAIGN_STATUS_DISABLE, CAMPAIGN_STATUS_DELETE'),
  },
  async (params) => {
    try {
      const reqParams: Record<string, unknown> = {
        advertiser_id: ADVERTISER_ID,
        page: params.page || '1',
        page_size: params.page_size || '20',
      };
      if (params.status) {
        reqParams.filtering = JSON.stringify({ status: params.status });
      }
      const data = await tiktokApi('/campaign/get/', reqParams);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (e) {
      return { content: [{ type: 'text', text: `Error: ${(e as Error).message}` }], isError: true };
    }
  },
);

// ── 3. Get Ad Groups ────────────────────────────────────────────────────────

server.tool(
  'get_adgroups',
  'List TikTok Ads ad groups with targeting, budget, optimization goal.',
  {
    campaign_id: z.string().optional().describe('Filter by campaign ID'),
    page: z.string().optional().describe('Page number (default 1)'),
    page_size: z.string().optional().describe('Results per page (default 20, max 1000)'),
  },
  async (params) => {
    try {
      const reqParams: Record<string, unknown> = {
        advertiser_id: ADVERTISER_ID,
        page: params.page || '1',
        page_size: params.page_size || '20',
      };
      if (params.campaign_id) {
        reqParams.filtering = JSON.stringify({ campaign_ids: [params.campaign_id] });
      }
      const data = await tiktokApi('/adgroup/get/', reqParams);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (e) {
      return { content: [{ type: 'text', text: `Error: ${(e as Error).message}` }], isError: true };
    }
  },
);

// ── 4. Get Ads ──────────────────────────────────────────────────────────────

server.tool(
  'get_ads',
  'List TikTok Ads with creative details, status, and delivery info.',
  {
    adgroup_id: z.string().optional().describe('Filter by ad group ID'),
    campaign_id: z.string().optional().describe('Filter by campaign ID'),
    page: z.string().optional().describe('Page number (default 1)'),
    page_size: z.string().optional().describe('Results per page (default 20, max 1000)'),
  },
  async (params) => {
    try {
      const filtering: Record<string, unknown> = {};
      if (params.adgroup_id) filtering.adgroup_ids = [params.adgroup_id];
      if (params.campaign_id) filtering.campaign_ids = [params.campaign_id];

      const reqParams: Record<string, unknown> = {
        advertiser_id: ADVERTISER_ID,
        page: params.page || '1',
        page_size: params.page_size || '20',
      };
      if (Object.keys(filtering).length > 0) {
        reqParams.filtering = JSON.stringify(filtering);
      }
      const data = await tiktokApi('/ad/get/', reqParams);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (e) {
      return { content: [{ type: 'text', text: `Error: ${(e as Error).message}` }], isError: true };
    }
  },
);

// ── 5. Get Campaign Insights ────────────────────────────────────────────────

server.tool(
  'get_campaign_insights',
  'Get performance metrics for campaigns: spend, impressions, clicks, conversions, CTR, CPC, CPM, CPA.',
  {
    campaign_ids: z.string().optional().describe('Comma-separated campaign IDs. If empty, returns all campaigns.'),
    start_date: z.string().describe('Start date YYYY-MM-DD'),
    end_date: z.string().describe('End date YYYY-MM-DD'),
    metrics: z.string().optional().describe('Comma-separated metrics. Default: spend,impressions,clicks,ctr,cpc,cpm,reach,conversions,cost_per_conversion,result'),
    data_level: z.enum(['AUCTION_CAMPAIGN', 'AUCTION_ADGROUP', 'AUCTION_AD']).optional().describe('Reporting level. Default: AUCTION_CAMPAIGN'),
  },
  async (params) => {
    try {
      const reqParams: Record<string, unknown> = {
        advertiser_id: ADVERTISER_ID,
        report_type: 'BASIC',
        data_level: params.data_level || 'AUCTION_CAMPAIGN',
        dimensions: JSON.stringify(['campaign_id', 'stat_time_day']),
        metrics: JSON.stringify((params.metrics || 'spend,impressions,clicks,ctr,cpc,cpm,reach,conversions,cost_per_conversion,result').split(',')),
        start_date: params.start_date,
        end_date: params.end_date,
        page_size: '200',
      };
      if (params.campaign_ids) {
        reqParams.filtering = JSON.stringify({ campaign_ids: params.campaign_ids.split(',') });
      }
      const data = await tiktokApi('/report/integrated/get/', reqParams);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (e) {
      return { content: [{ type: 'text', text: `Error: ${(e as Error).message}` }], isError: true };
    }
  },
);

// ── 6. Get Ad Group Insights ────────────────────────────────────────────────

server.tool(
  'get_adgroup_insights',
  'Get performance metrics at ad group level with optional breakdowns.',
  {
    adgroup_ids: z.string().optional().describe('Comma-separated ad group IDs'),
    start_date: z.string().describe('Start date YYYY-MM-DD'),
    end_date: z.string().describe('End date YYYY-MM-DD'),
    metrics: z.string().optional().describe('Comma-separated metrics. Default: spend,impressions,clicks,ctr,cpc,cpm,reach,conversions,cost_per_conversion'),
  },
  async (params) => {
    try {
      const reqParams: Record<string, unknown> = {
        advertiser_id: ADVERTISER_ID,
        report_type: 'BASIC',
        data_level: 'AUCTION_ADGROUP',
        dimensions: JSON.stringify(['adgroup_id', 'stat_time_day']),
        metrics: JSON.stringify((params.metrics || 'spend,impressions,clicks,ctr,cpc,cpm,reach,conversions,cost_per_conversion').split(',')),
        start_date: params.start_date,
        end_date: params.end_date,
        page_size: '200',
      };
      if (params.adgroup_ids) {
        reqParams.filtering = JSON.stringify({ adgroup_ids: params.adgroup_ids.split(',') });
      }
      const data = await tiktokApi('/report/integrated/get/', reqParams);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (e) {
      return { content: [{ type: 'text', text: `Error: ${(e as Error).message}` }], isError: true };
    }
  },
);

// ── 7. Get Ad Insights ──────────────────────────────────────────────────────

server.tool(
  'get_ad_insights',
  'Get performance metrics at ad level.',
  {
    ad_ids: z.string().optional().describe('Comma-separated ad IDs'),
    start_date: z.string().describe('Start date YYYY-MM-DD'),
    end_date: z.string().describe('End date YYYY-MM-DD'),
    metrics: z.string().optional().describe('Comma-separated metrics. Default: spend,impressions,clicks,ctr,cpc,cpm,reach,conversions,cost_per_conversion,video_play_actions,video_watched_2s,video_watched_6s'),
  },
  async (params) => {
    try {
      const reqParams: Record<string, unknown> = {
        advertiser_id: ADVERTISER_ID,
        report_type: 'BASIC',
        data_level: 'AUCTION_AD',
        dimensions: JSON.stringify(['ad_id', 'stat_time_day']),
        metrics: JSON.stringify((params.metrics || 'spend,impressions,clicks,ctr,cpc,cpm,reach,conversions,cost_per_conversion,video_play_actions,video_watched_2s,video_watched_6s').split(',')),
        start_date: params.start_date,
        end_date: params.end_date,
        page_size: '200',
      };
      if (params.ad_ids) {
        reqParams.filtering = JSON.stringify({ ad_ids: params.ad_ids.split(',') });
      }
      const data = await tiktokApi('/report/integrated/get/', reqParams);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (e) {
      return { content: [{ type: 'text', text: `Error: ${(e as Error).message}` }], isError: true };
    }
  },
);

// ── 8. Get Audience Insights ────────────────────────────────────────────────

server.tool(
  'get_audience_insights',
  'Get audience breakdown by demographics (age, gender, country, platform) for campaigns.',
  {
    campaign_ids: z.string().optional().describe('Comma-separated campaign IDs'),
    start_date: z.string().describe('Start date YYYY-MM-DD'),
    end_date: z.string().describe('End date YYYY-MM-DD'),
    breakdown: z.enum(['age', 'gender', 'country_code', 'platform']).optional().describe('Breakdown dimension. Default: age'),
  },
  async (params) => {
    try {
      const dimension = params.breakdown || 'age';
      const reqParams: Record<string, unknown> = {
        advertiser_id: ADVERTISER_ID,
        report_type: 'AUDIENCE',
        data_level: 'AUCTION_CAMPAIGN',
        dimensions: JSON.stringify(['campaign_id', dimension]),
        metrics: JSON.stringify(['spend', 'impressions', 'clicks', 'ctr', 'conversions', 'cost_per_conversion']),
        start_date: params.start_date,
        end_date: params.end_date,
        page_size: '200',
      };
      if (params.campaign_ids) {
        reqParams.filtering = JSON.stringify({ campaign_ids: params.campaign_ids.split(',') });
      }
      const data = await tiktokApi('/report/integrated/get/', reqParams);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (e) {
      return { content: [{ type: 'text', text: `Error: ${(e as Error).message}` }], isError: true };
    }
  },
);

// ── 9. Get Pixel Events ─────────────────────────────────────────────────────

server.tool(
  'get_pixel_events',
  'Get TikTok Pixel event data and conversion tracking info.',
  {
    pixel_id: z.string().optional().describe('Pixel ID. Default: uses TIKTOK_PIXEL_ID env var'),
  },
  async (params) => {
    try {
      const pixelId = params.pixel_id || process.env.TIKTOK_PIXEL_ID;
      if (!pixelId) throw new Error('No pixel ID provided and TIKTOK_PIXEL_ID not set');

      const data = await tiktokApi('/pixel/list/', {
        advertiser_id: ADVERTISER_ID,
        pixel_ids: JSON.stringify([pixelId]),
      });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (e) {
      return { content: [{ type: 'text', text: `Error: ${(e as Error).message}` }], isError: true };
    }
  },
);

// ── 10. Get Ad Creative ─────────────────────────────────────────────────────

server.tool(
  'get_ad_creative',
  'Get creative details (video, image, text, CTA) for specific ads.',
  {
    ad_ids: z.string().describe('Comma-separated ad IDs to get creative info for'),
  },
  async (params) => {
    try {
      const data = await tiktokApi('/ad/get/', {
        advertiser_id: ADVERTISER_ID,
        filtering: JSON.stringify({ ad_ids: params.ad_ids.split(',') }),
        fields: JSON.stringify(['ad_id', 'ad_name', 'ad_text', 'call_to_action', 'landing_page_url', 'image_ids', 'video_id', 'creative_type']),
      });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (e) {
      return { content: [{ type: 'text', text: `Error: ${(e as Error).message}` }], isError: true };
    }
  },
);

// ── 11. Get Account Budget ──────────────────────────────────────────────────

server.tool(
  'get_account_budget',
  'Get advertiser account balance and budget information.',
  {},
  async () => {
    try {
      const data = await tiktokApi('/advertiser/fund/get/', {
        advertiser_id: ADVERTISER_ID,
      });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (e) {
      return { content: [{ type: 'text', text: `Error: ${(e as Error).message}` }], isError: true };
    }
  },
);

// ── 12. Get Video Info ──────────────────────────────────────────────────────

server.tool(
  'get_video_info',
  'Get video asset details (preview URL, duration, size) from the TikTok ads library.',
  {
    video_ids: z.string().describe('Comma-separated video IDs'),
  },
  async (params) => {
    try {
      const data = await tiktokApi('/file/video/ad/info/', {
        advertiser_id: ADVERTISER_ID,
        video_ids: JSON.stringify(params.video_ids.split(',')),
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
