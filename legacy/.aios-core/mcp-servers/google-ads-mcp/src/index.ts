#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

// ── Google Ads API Client (REST v23) ────────────────────────────────────────
//
// Docs: https://developers.google.com/google-ads/api/rest/overview
// GAQL: https://developers.google.com/google-ads/api/docs/query/overview
//
// Requires:
//   - GOOGLE_ADS_CLIENT_ID (OAuth2 Client ID)
//   - GOOGLE_ADS_CLIENT_SECRET (OAuth2 Client Secret)
//   - GOOGLE_ADS_REFRESH_TOKEN (OAuth2 Refresh Token)
//   - GOOGLE_ADS_DEVELOPER_TOKEN (Developer Token from Google Ads API Center)
//   - GOOGLE_ADS_CUSTOMER_ID (Customer ID without dashes, e.g. 1234567890)
//   - GOOGLE_ADS_LOGIN_CUSTOMER_ID (Manager/MCC ID if using manager account)

const API_VERSION = 'v23';
const API_BASE = `https://googleads.googleapis.com/${API_VERSION}`;

const CLIENT_ID = process.env.GOOGLE_ADS_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_ADS_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.GOOGLE_ADS_REFRESH_TOKEN;
const DEVELOPER_TOKEN = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
const CUSTOMER_ID = process.env.GOOGLE_ADS_CUSTOMER_ID?.replace(/-/g, '');
const LOGIN_CUSTOMER_ID = process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID?.replace(/-/g, '');

if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN || !DEVELOPER_TOKEN || !CUSTOMER_ID) {
  console.error('Error: GOOGLE_ADS_CLIENT_ID, GOOGLE_ADS_CLIENT_SECRET, GOOGLE_ADS_REFRESH_TOKEN, GOOGLE_ADS_DEVELOPER_TOKEN, and GOOGLE_ADS_CUSTOMER_ID are required.');
  process.exit(1);
}

// ── OAuth2 Token Management ─────────────────────────────────────────────────

let cachedAccessToken: string | null = null;
let tokenExpiresAt = 0;

async function getAccessToken(): Promise<string> {
  if (cachedAccessToken && Date.now() < tokenExpiresAt - 60000) {
    return cachedAccessToken;
  }

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID!,
      client_secret: CLIENT_SECRET!,
      refresh_token: REFRESH_TOKEN!,
      grant_type: 'refresh_token',
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OAuth2 token refresh failed (${res.status}): ${text}`);
  }

  const data = await res.json() as { access_token: string; expires_in: number };
  cachedAccessToken = data.access_token;
  tokenExpiresAt = Date.now() + data.expires_in * 1000;
  return cachedAccessToken;
}

// ── Google Ads API Client ───────────────────────────────────────────────────

interface GaqlResponse {
  results?: Array<Record<string, unknown>>;
  nextPageToken?: string;
  totalResultsCount?: string;
  fieldMask?: string;
  [key: string]: unknown;
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const accessToken = await getAccessToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'developer-token': DEVELOPER_TOKEN!,
    'Authorization': `Bearer ${accessToken}`,
  };
  if (LOGIN_CUSTOMER_ID) {
    headers['login-customer-id'] = LOGIN_CUSTOMER_ID;
  }
  return headers;
}

async function gaqlSearch(
  query: string,
  customerId?: string,
  pageToken?: string,
  pageSize?: number,
): Promise<GaqlResponse> {
  const cid = customerId || CUSTOMER_ID!;
  const headers = await getAuthHeaders();

  const body: Record<string, unknown> = { query };
  if (pageToken) body.pageToken = pageToken;
  if (pageSize) body.pageSize = pageSize;

  const res = await fetch(`${API_BASE}/customers/${cid}/googleAds:search`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google Ads API error (${res.status}): ${text}`);
  }

  return res.json() as Promise<GaqlResponse>;
}

async function gaqlSearchStream(
  query: string,
  customerId?: string,
): Promise<unknown[]> {
  const cid = customerId || CUSTOMER_ID!;
  const headers = await getAuthHeaders();

  const res = await fetch(`${API_BASE}/customers/${cid}/googleAds:searchStream`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google Ads API error (${res.status}): ${text}`);
  }

  const data = await res.json() as Array<{ results?: unknown[] }>;
  // searchStream returns array of batches
  const allResults: unknown[] = [];
  for (const batch of data) {
    if (batch.results) {
      allResults.push(...batch.results);
    }
  }
  return allResults;
}

async function googleAdsGet(path: string): Promise<unknown> {
  const headers = await getAuthHeaders();

  const res = await fetch(`${API_BASE}${path}`, {
    method: 'GET',
    headers,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google Ads API error (${res.status}): ${text}`);
  }

  return res.json();
}

// ── MCP Server ──────────────────────────────────────────────────────────────

const server = new McpServer(
  { name: 'google-ads-mcp', version: '1.0.0' },
  { capabilities: { tools: {} } },
);

// ── 1. Get Account Info ─────────────────────────────────────────────────────

server.tool(
  'get_account_info',
  'Get Google Ads account info: name, currency, timezone, status, optimization score. Also lists accessible customer accounts.',
  {
    customer_id: z.string().optional().describe('Customer ID (without dashes). Default: uses GOOGLE_ADS_CUSTOMER_ID env var'),
  },
  async (params) => {
    try {
      const cid = params.customer_id?.replace(/-/g, '') || CUSTOMER_ID!;
      const query = `
        SELECT
          customer.id,
          customer.descriptive_name,
          customer.currency_code,
          customer.time_zone,
          customer.status,
          customer.optimization_score,
          customer.manager,
          customer.test_account
        FROM customer
        LIMIT 1
      `;
      const data = await gaqlSearch(query, cid);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (e) {
      return { content: [{ type: 'text', text: `Error: ${(e as Error).message}` }], isError: true };
    }
  },
);

// ── 2. List Accessible Customers ────────────────────────────────────────────

server.tool(
  'list_accessible_customers',
  'List all Google Ads customer accounts accessible with the current credentials. Useful to discover customer IDs.',
  {},
  async () => {
    try {
      const data = await googleAdsGet('/customers:listAccessibleCustomers');
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (e) {
      return { content: [{ type: 'text', text: `Error: ${(e as Error).message}` }], isError: true };
    }
  },
);

// ── 3. Get Campaigns ────────────────────────────────────────────────────────

server.tool(
  'get_campaigns',
  'List Google Ads campaigns with status, budget, bidding strategy, channel type, and performance metrics.',
  {
    status: z.enum(['ENABLED', 'PAUSED', 'REMOVED', 'ALL']).optional().describe('Filter by campaign status. Default: excludes REMOVED'),
    date_range: z.string().optional().describe('GAQL date range: LAST_7_DAYS, LAST_30_DAYS, LAST_90_DAYS, THIS_MONTH, LAST_MONTH, or custom YYYY-MM-DD format. Default: LAST_30_DAYS'),
    limit: z.string().optional().describe('Max results to return (default 50)'),
  },
  async (params) => {
    try {
      const dateRange = params.date_range || 'LAST_30_DAYS';
      const limit = params.limit || '50';
      const statusFilter = params.status === 'ALL'
        ? ''
        : `AND campaign.status ${params.status ? `= '${params.status}'` : "!= 'REMOVED'"}`;

      const query = `
        SELECT
          campaign.id,
          campaign.name,
          campaign.status,
          campaign.advertising_channel_type,
          campaign.bidding_strategy_type,
          campaign_budget.amount_micros,
          campaign.optimization_score,
          campaign.start_date,
          campaign.end_date,
          metrics.impressions,
          metrics.clicks,
          metrics.ctr,
          metrics.average_cpc,
          metrics.cost_micros,
          metrics.conversions,
          metrics.cost_per_conversion,
          metrics.conversions_value
        FROM campaign
        WHERE segments.date DURING ${dateRange}
          ${statusFilter}
        ORDER BY metrics.cost_micros DESC
        LIMIT ${limit}
      `;
      const data = await gaqlSearch(query);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (e) {
      return { content: [{ type: 'text', text: `Error: ${(e as Error).message}` }], isError: true };
    }
  },
);

// ── 4. Get Ad Groups ────────────────────────────────────────────────────────

server.tool(
  'get_ad_groups',
  'List Google Ads ad groups with status, type, CPC bid, and performance metrics.',
  {
    campaign_id: z.string().optional().describe('Filter by campaign ID'),
    status: z.enum(['ENABLED', 'PAUSED', 'REMOVED', 'ALL']).optional().describe('Filter by status. Default: excludes REMOVED'),
    date_range: z.string().optional().describe('GAQL date range. Default: LAST_30_DAYS'),
    limit: z.string().optional().describe('Max results (default 50)'),
  },
  async (params) => {
    try {
      const dateRange = params.date_range || 'LAST_30_DAYS';
      const limit = params.limit || '50';
      const statusFilter = params.status === 'ALL'
        ? ''
        : `AND ad_group.status ${params.status ? `= '${params.status}'` : "!= 'REMOVED'"}`;
      const campaignFilter = params.campaign_id
        ? `AND campaign.id = ${params.campaign_id}`
        : '';

      const query = `
        SELECT
          ad_group.id,
          ad_group.name,
          ad_group.status,
          ad_group.type,
          campaign.id,
          campaign.name,
          ad_group.cpc_bid_micros,
          metrics.impressions,
          metrics.clicks,
          metrics.ctr,
          metrics.average_cpc,
          metrics.cost_micros,
          metrics.conversions,
          metrics.cost_per_conversion
        FROM ad_group
        WHERE segments.date DURING ${dateRange}
          ${statusFilter}
          ${campaignFilter}
        ORDER BY metrics.cost_micros DESC
        LIMIT ${limit}
      `;
      const data = await gaqlSearch(query);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (e) {
      return { content: [{ type: 'text', text: `Error: ${(e as Error).message}` }], isError: true };
    }
  },
);

// ── 5. Get Ads ──────────────────────────────────────────────────────────────

server.tool(
  'get_ads',
  'List Google Ads with creative details, approval status, final URLs, and performance metrics.',
  {
    campaign_id: z.string().optional().describe('Filter by campaign ID'),
    ad_group_id: z.string().optional().describe('Filter by ad group ID'),
    status: z.enum(['ENABLED', 'PAUSED', 'REMOVED', 'ALL']).optional().describe('Filter by status. Default: excludes REMOVED'),
    date_range: z.string().optional().describe('GAQL date range. Default: LAST_30_DAYS'),
    limit: z.string().optional().describe('Max results (default 50)'),
  },
  async (params) => {
    try {
      const dateRange = params.date_range || 'LAST_30_DAYS';
      const limit = params.limit || '50';
      const statusFilter = params.status === 'ALL'
        ? ''
        : `AND ad_group_ad.status ${params.status ? `= '${params.status}'` : "!= 'REMOVED'"}`;
      const campaignFilter = params.campaign_id
        ? `AND campaign.id = ${params.campaign_id}`
        : '';
      const adGroupFilter = params.ad_group_id
        ? `AND ad_group.id = ${params.ad_group_id}`
        : '';

      const query = `
        SELECT
          ad_group_ad.ad.id,
          ad_group_ad.ad.name,
          ad_group_ad.ad.type,
          ad_group_ad.ad.final_urls,
          ad_group_ad.status,
          ad_group_ad.policy_summary.approval_status,
          ad_group.id,
          ad_group.name,
          campaign.id,
          campaign.name,
          metrics.impressions,
          metrics.clicks,
          metrics.ctr,
          metrics.average_cpc,
          metrics.cost_micros,
          metrics.conversions,
          metrics.cost_per_conversion
        FROM ad_group_ad
        WHERE segments.date DURING ${dateRange}
          ${statusFilter}
          ${campaignFilter}
          ${adGroupFilter}
        ORDER BY metrics.cost_micros DESC
        LIMIT ${limit}
      `;
      const data = await gaqlSearch(query);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (e) {
      return { content: [{ type: 'text', text: `Error: ${(e as Error).message}` }], isError: true };
    }
  },
);

// ── 6. Get Keywords ─────────────────────────────────────────────────────────

server.tool(
  'get_keywords',
  'List Google Ads keywords with match type, quality score, bid, and performance metrics.',
  {
    campaign_id: z.string().optional().describe('Filter by campaign ID'),
    ad_group_id: z.string().optional().describe('Filter by ad group ID'),
    date_range: z.string().optional().describe('GAQL date range. Default: LAST_30_DAYS'),
    limit: z.string().optional().describe('Max results (default 100)'),
  },
  async (params) => {
    try {
      const dateRange = params.date_range || 'LAST_30_DAYS';
      const limit = params.limit || '100';
      const campaignFilter = params.campaign_id
        ? `AND campaign.id = ${params.campaign_id}`
        : '';
      const adGroupFilter = params.ad_group_id
        ? `AND ad_group.id = ${params.ad_group_id}`
        : '';

      const query = `
        SELECT
          ad_group_criterion.keyword.text,
          ad_group_criterion.keyword.match_type,
          ad_group_criterion.status,
          ad_group_criterion.quality_info.quality_score,
          ad_group_criterion.effective_cpc_bid_micros,
          ad_group.id,
          ad_group.name,
          campaign.id,
          campaign.name,
          metrics.impressions,
          metrics.clicks,
          metrics.ctr,
          metrics.average_cpc,
          metrics.cost_micros,
          metrics.conversions,
          metrics.cost_per_conversion
        FROM keyword_view
        WHERE segments.date DURING ${dateRange}
          AND ad_group_criterion.status != 'REMOVED'
          ${campaignFilter}
          ${adGroupFilter}
        ORDER BY metrics.cost_micros DESC
        LIMIT ${limit}
      `;
      const data = await gaqlSearch(query);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (e) {
      return { content: [{ type: 'text', text: `Error: ${(e as Error).message}` }], isError: true };
    }
  },
);

// ── 7. Get Campaign Performance (Daily Breakdown) ───────────────────────────

server.tool(
  'get_campaign_performance',
  'Get daily campaign performance metrics: impressions, clicks, CTR, CPC, cost, conversions, conversion value, ROAS.',
  {
    campaign_id: z.string().optional().describe('Specific campaign ID. If omitted, returns all campaigns.'),
    date_range: z.string().optional().describe('GAQL date range. Default: LAST_30_DAYS'),
    limit: z.string().optional().describe('Max results (default 500)'),
  },
  async (params) => {
    try {
      const dateRange = params.date_range || 'LAST_30_DAYS';
      const limit = params.limit || '500';
      const campaignFilter = params.campaign_id
        ? `AND campaign.id = ${params.campaign_id}`
        : '';

      const query = `
        SELECT
          segments.date,
          campaign.id,
          campaign.name,
          campaign.status,
          campaign.advertising_channel_type,
          metrics.impressions,
          metrics.clicks,
          metrics.ctr,
          metrics.average_cpc,
          metrics.cost_micros,
          metrics.conversions,
          metrics.cost_per_conversion,
          metrics.conversions_value,
          metrics.all_conversions,
          metrics.interaction_rate
        FROM campaign
        WHERE segments.date DURING ${dateRange}
          AND campaign.status != 'REMOVED'
          ${campaignFilter}
        ORDER BY segments.date DESC
        LIMIT ${limit}
      `;
      const data = await gaqlSearch(query);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (e) {
      return { content: [{ type: 'text', text: `Error: ${(e as Error).message}` }], isError: true };
    }
  },
);

// ── 8. Get Audience/Demographics Performance ────────────────────────────────

server.tool(
  'get_audience_performance',
  'Get performance by audience demographics: age range, gender. Useful for audience optimization.',
  {
    campaign_id: z.string().optional().describe('Filter by campaign ID'),
    dimension: z.enum(['age_range', 'gender']).optional().describe('Breakdown dimension. Default: age_range'),
    date_range: z.string().optional().describe('GAQL date range. Default: LAST_30_DAYS'),
  },
  async (params) => {
    try {
      const dateRange = params.date_range || 'LAST_30_DAYS';
      const dimension = params.dimension || 'age_range';
      const campaignFilter = params.campaign_id
        ? `AND campaign.id = ${params.campaign_id}`
        : '';

      let query: string;
      if (dimension === 'age_range') {
        query = `
          SELECT
            ad_group_criterion.age_range.type,
            campaign.id,
            campaign.name,
            metrics.impressions,
            metrics.clicks,
            metrics.ctr,
            metrics.cost_micros,
            metrics.conversions,
            metrics.cost_per_conversion
          FROM age_range_view
          WHERE segments.date DURING ${dateRange}
            ${campaignFilter}
          ORDER BY metrics.cost_micros DESC
        `;
      } else {
        query = `
          SELECT
            ad_group_criterion.gender.type,
            campaign.id,
            campaign.name,
            metrics.impressions,
            metrics.clicks,
            metrics.ctr,
            metrics.cost_micros,
            metrics.conversions,
            metrics.cost_per_conversion
          FROM gender_view
          WHERE segments.date DURING ${dateRange}
            ${campaignFilter}
          ORDER BY metrics.cost_micros DESC
        `;
      }

      const data = await gaqlSearch(query);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (e) {
      return { content: [{ type: 'text', text: `Error: ${(e as Error).message}` }], isError: true };
    }
  },
);

// ── 9. Get Geographic Performance ───────────────────────────────────────────

server.tool(
  'get_geographic_performance',
  'Get performance by geographic location (country, region, city). Useful for location bid adjustments.',
  {
    campaign_id: z.string().optional().describe('Filter by campaign ID'),
    date_range: z.string().optional().describe('GAQL date range. Default: LAST_30_DAYS'),
    limit: z.string().optional().describe('Max results (default 50)'),
  },
  async (params) => {
    try {
      const dateRange = params.date_range || 'LAST_30_DAYS';
      const limit = params.limit || '50';
      const campaignFilter = params.campaign_id
        ? `AND campaign.id = ${params.campaign_id}`
        : '';

      const query = `
        SELECT
          geographic_view.country_criterion_id,
          geographic_view.location_type,
          campaign.id,
          campaign.name,
          metrics.impressions,
          metrics.clicks,
          metrics.ctr,
          metrics.cost_micros,
          metrics.conversions,
          metrics.cost_per_conversion
        FROM geographic_view
        WHERE segments.date DURING ${dateRange}
          ${campaignFilter}
        ORDER BY metrics.cost_micros DESC
        LIMIT ${limit}
      `;
      const data = await gaqlSearch(query);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (e) {
      return { content: [{ type: 'text', text: `Error: ${(e as Error).message}` }], isError: true };
    }
  },
);

// ── 10. Get Device Performance ──────────────────────────────────────────────

server.tool(
  'get_device_performance',
  'Get performance breakdown by device type (MOBILE, DESKTOP, TABLET). Useful for bid adjustments.',
  {
    campaign_id: z.string().optional().describe('Filter by campaign ID'),
    date_range: z.string().optional().describe('GAQL date range. Default: LAST_30_DAYS'),
  },
  async (params) => {
    try {
      const dateRange = params.date_range || 'LAST_30_DAYS';
      const campaignFilter = params.campaign_id
        ? `AND campaign.id = ${params.campaign_id}`
        : '';

      const query = `
        SELECT
          segments.device,
          campaign.id,
          campaign.name,
          metrics.impressions,
          metrics.clicks,
          metrics.ctr,
          metrics.average_cpc,
          metrics.cost_micros,
          metrics.conversions,
          metrics.cost_per_conversion
        FROM campaign
        WHERE segments.date DURING ${dateRange}
          AND campaign.status != 'REMOVED'
          ${campaignFilter}
        ORDER BY metrics.cost_micros DESC
      `;
      const data = await gaqlSearch(query);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (e) {
      return { content: [{ type: 'text', text: `Error: ${(e as Error).message}` }], isError: true };
    }
  },
);

// ── 11. Get Search Terms Report ─────────────────────────────────────────────

server.tool(
  'get_search_terms',
  'Get search terms that triggered your ads. Useful for finding new keywords or negative keywords.',
  {
    campaign_id: z.string().optional().describe('Filter by campaign ID'),
    ad_group_id: z.string().optional().describe('Filter by ad group ID'),
    date_range: z.string().optional().describe('GAQL date range. Default: LAST_30_DAYS'),
    limit: z.string().optional().describe('Max results (default 100)'),
  },
  async (params) => {
    try {
      const dateRange = params.date_range || 'LAST_30_DAYS';
      const limit = params.limit || '100';
      const campaignFilter = params.campaign_id
        ? `AND campaign.id = ${params.campaign_id}`
        : '';
      const adGroupFilter = params.ad_group_id
        ? `AND ad_group.id = ${params.ad_group_id}`
        : '';

      const query = `
        SELECT
          search_term_view.search_term,
          search_term_view.status,
          campaign.id,
          campaign.name,
          ad_group.id,
          ad_group.name,
          metrics.impressions,
          metrics.clicks,
          metrics.ctr,
          metrics.cost_micros,
          metrics.conversions,
          metrics.cost_per_conversion
        FROM search_term_view
        WHERE segments.date DURING ${dateRange}
          ${campaignFilter}
          ${adGroupFilter}
        ORDER BY metrics.impressions DESC
        LIMIT ${limit}
      `;
      const data = await gaqlSearch(query);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (e) {
      return { content: [{ type: 'text', text: `Error: ${(e as Error).message}` }], isError: true };
    }
  },
);

// ── 12. Run Custom GAQL Query ───────────────────────────────────────────────

server.tool(
  'run_gaql_query',
  'Run a custom GAQL (Google Ads Query Language) query. Full flexibility to query any resource. See: developers.google.com/google-ads/api/docs/query/overview',
  {
    query: z.string().describe('GAQL query string. Example: SELECT campaign.name, metrics.clicks FROM campaign WHERE segments.date DURING LAST_7_DAYS'),
    customer_id: z.string().optional().describe('Customer ID (without dashes). Default: uses GOOGLE_ADS_CUSTOMER_ID'),
    use_stream: z.boolean().optional().describe('Use searchStream instead of search (better for large result sets). Default: false'),
  },
  async (params) => {
    try {
      const cid = params.customer_id?.replace(/-/g, '');
      if (params.use_stream) {
        const results = await gaqlSearchStream(params.query, cid);
        return { content: [{ type: 'text', text: JSON.stringify({ results, totalResults: results.length }, null, 2) }] };
      }
      const data = await gaqlSearch(params.query, cid);
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
