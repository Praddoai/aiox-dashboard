#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

// ── Meta Marketing API Client (v22.0) ──────────────────────────────────────
//
// Provides read + write access to Meta Ads Manager:
//   - Account info and spending (read)
//   - Campaigns, ad sets, ads with metrics (read)
//   - Ad creatives and Entity IDs (read)
//   - Insights with breakdowns and date ranges (read)
//   - Campaign, ad set, ad, creative creation (write)
//   - Image upload (write)
//
// Required permissions: ads_read, read_insights, ads_management
// Env vars: META_ACCESS_TOKEN, META_AD_ACCOUNT_ID

const API_BASE = 'https://graph.facebook.com/v22.0';

const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
const AD_ACCOUNT_ID = process.env.META_AD_ACCOUNT_ID;

if (!ACCESS_TOKEN) {
  console.error('Error: META_ACCESS_TOKEN is required.');
  process.exit(1);
}

if (!AD_ACCOUNT_ID) {
  console.error('Error: META_AD_ACCOUNT_ID is required.');
  process.exit(1);
}

// Normalize: ensure account ID has act_ prefix
const actId = AD_ACCOUNT_ID.startsWith('act_') ? AD_ACCOUNT_ID : `act_${AD_ACCOUNT_ID}`;

interface GraphApiResponse {
  data?: unknown[];
  paging?: { cursors?: { before?: string; after?: string }; next?: string };
  summary?: unknown;
  [key: string]: unknown;
}

async function metaApi(path: string, params?: Record<string, string>): Promise<GraphApiResponse> {
  const url = new URL(`${API_BASE}${path}`);
  url.searchParams.set('access_token', ACCESS_TOKEN!);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v) url.searchParams.set(k, v);
    }
  }

  const res = await fetch(url.toString());

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Meta API error (${res.status}): ${text}`);
  }

  return res.json() as Promise<GraphApiResponse>;
}

async function metaApiPost(path: string, body: Record<string, unknown>): Promise<GraphApiResponse> {
  const url = new URL(`${API_BASE}${path}`);
  url.searchParams.set('access_token', ACCESS_TOKEN!);

  // Meta Marketing API requires application/x-www-form-urlencoded for most creation endpoints
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(body)) {
    if (value === undefined || value === null) continue;
    params.set(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
  }

  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Meta API POST error (${res.status}): ${text}`);
  }

  return res.json() as Promise<GraphApiResponse>;
}

async function metaApiPostForm(path: string, formData: FormData): Promise<GraphApiResponse> {
  const url = new URL(`${API_BASE}${path}`);
  url.searchParams.set('access_token', ACCESS_TOKEN!);

  const res = await fetch(url.toString(), {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Meta API POST form error (${res.status}): ${text}`);
  }

  return res.json() as Promise<GraphApiResponse>;
}

// Helper: format tool response
function ok(data: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
}

function okCompact(data: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(data) }] };
}

function err(e: unknown) {
  return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
}

// ── Compact Insights Engine ──────────────────────────────────────────────────
//
// The Meta API returns actions[], action_values[], cost_per_action_type[] with
// 15-30 entries each (post_engagement, video_view, page_like, etc.).
// Most are irrelevant for a given objective. This engine provides:
//
//   compact = "off"        → full verbose JSON (default, backwards compatible)
//   compact = "sales"      → purchase, link_click, lpv
//   compact = "leads"      → lead, link_click, lpv, messaging
//   compact = "traffic"    → link_click, lpv, outbound_click, page_engagement
//   compact = "engagement" → post_engagement, reactions, comments, shares, video_view
//   compact = "awareness"  → video_view, post_engagement (mostly scalar fields)
//   compact = "kpi"        → NO action arrays at all — smallest possible
//   compact = "all"        → keep ALL actions, but compact JSON + remove nulls
//   compact = "auto"       → detect from campaign objective (dashboard only)
//
// All modes (except "off") use compact JSON (no indentation) and strip
// null/empty values from scalar fields.

type CompactMode = 'off' | 'sales' | 'leads' | 'traffic' | 'engagement' | 'awareness' | 'kpi' | 'all' | 'auto';

const ACTION_PRESETS: Record<string, Set<string>> = {
  sales: new Set([
    'offsite_conversion.fb_pixel_purchase', 'omni_purchase', 'purchase',
    'link_click', 'landing_page_view',
    'onsite_conversion.post_save',
  ]),
  leads: new Set([
    'lead', 'offsite_conversion.fb_pixel_lead', 'onsite_conversion.lead_grouped',
    'link_click', 'landing_page_view',
    'onsite_conversion.messaging_conversation_started_7d', 'onsite_conversion.messaging_first_reply',
    'onsite_conversion.post_save',
  ]),
  traffic: new Set([
    'link_click', 'landing_page_view', 'outbound_click',
    'page_engagement', 'post_engagement',
  ]),
  engagement: new Set([
    'post_engagement', 'post_reaction', 'comment', 'like', 'share',
    'video_view', 'page_engagement',
    'onsite_conversion.post_save', 'onsite_conversion.messaging_conversation_started_7d',
  ]),
  awareness: new Set([
    'video_view', 'post_engagement', 'post_reaction',
  ]),
};

// Map Meta campaign objectives to compact presets
const OBJECTIVE_TO_PRESET: Record<string, string> = {
  OUTCOME_SALES: 'sales',
  OUTCOME_LEADS: 'leads',
  OUTCOME_TRAFFIC: 'traffic',
  OUTCOME_ENGAGEMENT: 'engagement',
  OUTCOME_AWARENESS: 'awareness',
  OUTCOME_APP_PROMOTION: 'traffic',
};

const ARRAY_FIELDS = new Set([
  'actions', 'action_values', 'cost_per_action_type',
  'video_avg_time_watched_actions', 'video_p25_watched_actions',
  'video_p50_watched_actions', 'video_p75_watched_actions',
  'video_p100_watched_actions',
]);

interface ActionEntry {
  action_type: string;
  value: string;
  [key: string]: unknown;
}

interface InsightsRow {
  [key: string]: unknown;
  actions?: ActionEntry[];
  action_values?: ActionEntry[];
  cost_per_action_type?: ActionEntry[];
}

function compactRow(row: InsightsRow, mode: CompactMode): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  // Step 1: Copy scalar fields, strip nulls/empty
  for (const [k, v] of Object.entries(row)) {
    if (ARRAY_FIELDS.has(k)) continue;
    if (v !== null && v !== undefined && v !== '' && v !== '0') result[k] = v;
  }

  // Step 2: Handle action arrays based on mode
  if (mode === 'kpi') {
    // No action arrays at all — smallest possible
    return result;
  }

  if (mode === 'all') {
    // Keep ALL actions, just compact format
    if (row.actions) result.actions = row.actions;
    if (row.action_values) result.action_values = row.action_values;
    if (row.cost_per_action_type) result.cost_per_action_type = row.cost_per_action_type;
    return result;
  }

  // Filter actions to preset
  const preset = ACTION_PRESETS[mode] || ACTION_PRESETS.sales;

  if (row.actions) {
    const filtered = row.actions.filter(a => preset.has(a.action_type));
    if (filtered.length > 0) result.actions = filtered;
  }
  if (row.action_values) {
    const filtered = row.action_values.filter(a => preset.has(a.action_type));
    if (filtered.length > 0) result.action_values = filtered;
  }
  if (row.cost_per_action_type) {
    const filtered = row.cost_per_action_type.filter(a => preset.has(a.action_type));
    if (filtered.length > 0) result.cost_per_action_type = filtered;
  }

  return result;
}

function extractKpis(row: InsightsRow, mode: CompactMode = 'sales'): Record<string, unknown> {
  const compacted = compactRow(row, mode);
  const spend = parseFloat(String(row.spend || '0'));

  // Add derived KPIs based on mode
  if (mode === 'sales' || mode === 'auto') {
    const purchases = row.actions?.find(a =>
      a.action_type === 'offsite_conversion.fb_pixel_purchase' ||
      a.action_type === 'omni_purchase' ||
      a.action_type === 'purchase'
    );
    const revenue = row.action_values?.find(a =>
      a.action_type === 'offsite_conversion.fb_pixel_purchase' ||
      a.action_type === 'omni_purchase' ||
      a.action_type === 'purchase'
    );
    const purchaseCount = purchases ? parseInt(purchases.value, 10) : 0;
    const revenueVal = revenue ? parseFloat(revenue.value) : 0;

    if (purchaseCount > 0) compacted.purchases = purchaseCount;
    if (revenueVal > 0) compacted.revenue = revenueVal;
    if (spend > 0 && revenueVal > 0) compacted.roas = Math.round((revenueVal / spend) * 100) / 100;
  }

  if (mode === 'leads') {
    const leads = row.actions?.find(a =>
      a.action_type === 'lead' ||
      a.action_type === 'offsite_conversion.fb_pixel_lead' ||
      a.action_type === 'onsite_conversion.lead_grouped'
    );
    if (leads) {
      compacted.leads = parseInt(leads.value, 10);
      if (spend > 0) compacted.cpl = Math.round((spend / parseInt(leads.value, 10)) * 100) / 100;
    }
  }

  // Common derived KPIs
  const linkClicks = row.actions?.find(a => a.action_type === 'link_click');
  const lpv = row.actions?.find(a => a.action_type === 'landing_page_view');
  if (linkClicks) compacted.link_clicks = parseInt(linkClicks.value, 10);
  if (lpv) compacted.lpv = parseInt(lpv.value, 10);

  return compacted;
}

function compactInsightsData(data: GraphApiResponse, mode: CompactMode = 'sales'): unknown {
  if (!data.data || !Array.isArray(data.data)) return data;
  return {
    data: data.data.map((row: unknown) => {
      if (mode === 'kpi' || mode === 'all') return compactRow(row as InsightsRow, mode);
      return extractKpis(row as InsightsRow, mode);
    }),
    ...(data.paging ? { paging: data.paging } : {}),
  };
}

function resolveCompactMode(compact: string | undefined): CompactMode {
  if (!compact || compact === 'off' || compact === 'false') return 'off';
  if (compact === 'true') return 'sales'; // backwards compat: compact=true → sales
  return compact as CompactMode;
}

const COMPACT_DESCRIPTION = `Compact mode reduces response ~80%. Values: "off" (full verbose, default), "sales" (purchase/click/lpv), "leads" (lead/click/messaging), "traffic" (clicks/lpv), "engagement" (reactions/shares/video), "awareness" (video/reach), "kpi" (no actions — smallest), "all" (all actions, compact JSON). Use "true" as shorthand for "sales".`;

// ── MCP Server ──────────────────────────────────────────────────────────────

const server = new McpServer(
  { name: 'meta-ads-mcp', version: '3.0.0' },
  { capabilities: { tools: {} } },
);

// ── 0. Campaigns Dashboard (COMPACT — single call for all campaigns) ────────

server.tool(
  'get_campaigns_dashboard',
  'Get a COMPACT performance dashboard for ALL active campaigns in a single call. Auto-detects each campaign objective (sales/leads/traffic/engagement/awareness) and extracts relevant KPIs. ~50x smaller than calling get_campaign_insights per campaign. USE THIS FIRST for overview/diagnostics.',
  {
    date_preset: z.string().optional().describe('Date range: today, yesterday, last_7d, last_14d, last_30d, last_90d. Default: last_14d'),
    status: z.string().optional().describe('Campaign status filter: ACTIVE (default), PAUSED, ALL'),
    include_daily: z.boolean().optional().describe('Include daily breakdown per campaign. Default: false (aggregated only)'),
    compact: z.string().optional().describe('Override auto-detection. ' + COMPACT_DESCRIPTION + ' Default: "auto" (detects from campaign objective)'),
  },
  async (params) => {
    try {
      const datePreset = params.date_preset || 'last_14d';
      const statusFilter = params.status || 'ACTIVE';
      const globalMode = resolveCompactMode(params.compact || 'auto');

      // Step 1: Get campaign list with objectives
      const campaignParams: Record<string, string> = {
        fields: 'id,name,status,effective_status,objective,daily_budget,lifetime_budget',
        limit: '50',
      };
      if (statusFilter !== 'ALL') {
        campaignParams.filtering = JSON.stringify([
          { field: 'effective_status', operator: 'IN', value: [statusFilter] },
        ]);
      }
      const campaigns = await metaApi(`/${actId}/campaigns`, campaignParams);
      const campaignList = (campaigns.data || []) as Record<string, unknown>[];

      if (campaignList.length === 0) {
        return okCompact({ campaigns: [], message: 'No campaigns found with the given filter.' });
      }

      // Build objective map for auto mode
      const objectiveMap = new Map<string, string>();
      for (const c of campaignList) {
        objectiveMap.set(String(c.id), String(c.objective || ''));
      }

      // Step 2: Use account-level insights with level=campaign for a SINGLE API call
      const insightsParams: Record<string, string> = {
        fields: 'campaign_id,campaign_name,spend,impressions,reach,frequency,clicks,ctr,cpc,cpm,actions,action_values,cost_per_action_type,website_purchase_roas',
        date_preset: datePreset,
        level: 'campaign',
        limit: '100',
      };
      if (statusFilter !== 'ALL') {
        insightsParams.filtering = JSON.stringify([
          { field: 'campaign.effective_status', operator: 'IN', value: [statusFilter] },
        ]);
      }
      if (params.include_daily) {
        insightsParams.time_increment = '1';
      }

      const insights = await metaApi(`/${actId}/insights`, insightsParams);
      const rows = (insights.data || []) as InsightsRow[];

      // Step 3: Extract KPIs with per-campaign objective awareness
      const campaignMap = new Map<string, Record<string, unknown>[]>();
      for (const row of rows) {
        const cid = String(row.campaign_id || '');
        // Resolve mode: auto → detect from objective, otherwise use global
        let mode = globalMode;
        if (mode === 'auto') {
          const objective = objectiveMap.get(cid) || '';
          mode = (OBJECTIVE_TO_PRESET[objective] || 'sales') as CompactMode;
        }
        const kpis = extractKpis(row, mode);
        if (!campaignMap.has(cid)) campaignMap.set(cid, []);
        campaignMap.get(cid)!.push(kpis);
      }

      // Step 4: Build compact response
      const dashboard: Record<string, unknown>[] = [];
      let totalSpend = 0;
      let totalPurchases = 0;
      let totalRevenue = 0;

      for (const camp of campaignList) {
        const cid = String(camp.id);
        const kpiRows = campaignMap.get(cid) || [];
        const objective = String(camp.objective || '');
        const presetUsed = globalMode === 'auto' ? (OBJECTIVE_TO_PRESET[objective] || 'sales') : globalMode;

        if (params.include_daily) {
          const campSpend = kpiRows.reduce((s, r) => s + parseFloat(String(r.spend || '0')), 0);
          const campPurchases = kpiRows.reduce((s, r) => s + (Number(r.purchases) || 0), 0);
          const campRevenue = kpiRows.reduce((s, r) => s + (Number(r.revenue) || 0), 0);

          dashboard.push({
            id: cid,
            name: camp.name,
            objective,
            preset: presetUsed,
            budget: camp.daily_budget ? `R$${(Number(camp.daily_budget) / 100).toFixed(0)}/d` : camp.lifetime_budget ? `R$${(Number(camp.lifetime_budget) / 100).toFixed(0)} LT` : 'N/A',
            totals: { spend: campSpend, purchases: campPurchases, revenue: campRevenue, roas: campSpend > 0 ? Math.round((campRevenue / campSpend) * 100) / 100 : 0 },
            daily: kpiRows,
          });
          totalSpend += campSpend;
          totalPurchases += campPurchases;
          totalRevenue += campRevenue;
        } else {
          const agg = kpiRows[0] || {};
          const spend = parseFloat(String(agg.spend || '0'));
          dashboard.push({
            id: cid,
            name: camp.name,
            objective,
            preset: presetUsed,
            budget: camp.daily_budget ? `R$${(Number(camp.daily_budget) / 100).toFixed(0)}/d` : camp.lifetime_budget ? `R$${(Number(camp.lifetime_budget) / 100).toFixed(0)} LT` : 'N/A',
            ...agg,
          });
          totalSpend += spend;
          totalPurchases += Number(agg.purchases) || 0;
          totalRevenue += Number(agg.revenue) || 0;
        }
      }

      const result = {
        period: datePreset,
        account_totals: {
          spend: Math.round(totalSpend * 100) / 100,
          purchases: totalPurchases,
          revenue: Math.round(totalRevenue * 100) / 100,
          roas: totalSpend > 0 ? Math.round((totalRevenue / totalSpend) * 100) / 100 : 0,
        },
        campaigns: dashboard,
      };

      return okCompact(result);
    } catch (e) { return err(e); }
  },
);

// ── 1. Account Info ─────────────────────────────────────────────────────────

server.tool(
  'get_account_info',
  'Get Meta Ad Account profile: name, status, currency, timezone, business, spending limits, amount spent.',
  {},
  async () => {
    try {
      const data = await metaApi(`/${actId}`, {
        fields: 'id,name,account_status,currency,timezone_name,business,spend_cap,amount_spent,balance,age',
      });
      return ok(data);
    } catch (e) { return err(e); }
  },
);

// ── 2. Account Insights ─────────────────────────────────────────────────────

server.tool(
  'get_account_insights',
  'Get account-level performance metrics. ' + COMPACT_DESCRIPTION,
  {
    date_preset: z.string().optional().describe('Date range preset: today, yesterday, last_7d, last_14d, last_30d, last_90d, this_month, last_month. Default: last_30d'),
    time_range_since: z.string().optional().describe('Start date (YYYY-MM-DD). Use with time_range_until instead of date_preset.'),
    time_range_until: z.string().optional().describe('End date (YYYY-MM-DD). Use with time_range_since.'),
    breakdowns: z.string().optional().describe('Comma-separated breakdowns: age, gender, country, publisher_platform, platform_position, device_platform, impression_device'),
    level: z.string().optional().describe('Aggregation level: account, campaign, adset, ad. Default: account'),
    compact: z.string().optional().describe(COMPACT_DESCRIPTION),
  },
  async (params) => {
    try {
      const mode = resolveCompactMode(params.compact);
      const p: Record<string, string> = {
        fields: 'spend,impressions,reach,frequency,clicks,ctr,cpc,cpm,cpp,actions,action_values,cost_per_action_type,website_purchase_roas',
      };
      if (params.time_range_since && params.time_range_until) {
        p.time_range = JSON.stringify({ since: params.time_range_since, until: params.time_range_until });
      } else {
        p.date_preset = params.date_preset || 'last_30d';
      }
      if (params.breakdowns) p.breakdowns = params.breakdowns;
      if (params.level) p.level = params.level;

      const data = await metaApi(`/${actId}/insights`, p);
      if (mode !== 'off') return okCompact(compactInsightsData(data, mode));
      return ok(data);
    } catch (e) { return err(e); }
  },
);

// ── 3. List Campaigns ───────────────────────────────────────────────────────

server.tool(
  'get_campaigns',
  'List campaigns in the ad account. Filter by status (ACTIVE, PAUSED, ARCHIVED). Returns id, name, status, objective, budget, bid strategy.',
  {
    status: z.string().optional().describe('Filter: ACTIVE, PAUSED, ARCHIVED, or ALL. Default: ALL'),
    limit: z.union([z.string(), z.number()]).optional().transform(v => v != null ? String(v) : undefined).describe('Max results. Default: 25'),
    after: z.string().optional().describe('Pagination cursor'),
  },
  async (params) => {
    try {
      const p: Record<string, string> = {
        fields: 'id,name,status,effective_status,objective,buying_type,daily_budget,lifetime_budget,budget_remaining,bid_strategy,start_time,stop_time,created_time,updated_time',
        limit: params.limit || '25',
      };
      if (params.status && params.status !== 'ALL') {
        p.filtering = JSON.stringify([{ field: 'effective_status', operator: 'IN', value: [params.status] }]);
      }
      if (params.after) p.after = params.after;

      const data = await metaApi(`/${actId}/campaigns`, p);
      return ok(data);
    } catch (e) { return err(e); }
  },
);

// ── 4. Campaign Insights ────────────────────────────────────────────────────

server.tool(
  'get_campaign_insights',
  'Get performance metrics for a specific campaign. For multi-campaign overview, prefer get_campaigns_dashboard instead. ' + COMPACT_DESCRIPTION,
  {
    campaign_id: z.string().describe('Campaign ID'),
    date_preset: z.string().optional().describe('Date range: today, yesterday, last_7d, last_14d, last_30d, last_90d. Default: last_30d'),
    time_increment: z.union([z.string(), z.number()]).optional().transform(v => v != null ? String(v) : undefined).describe('Time granularity: 1 (daily), 7 (weekly), monthly, all_days. Default: all_days'),
    compact: z.string().optional().describe(COMPACT_DESCRIPTION),
  },
  async (params) => {
    try {
      const mode = resolveCompactMode(params.compact);
      const p: Record<string, string> = {
        fields: 'campaign_name,spend,impressions,reach,frequency,clicks,ctr,cpc,cpm,actions,action_values,cost_per_action_type,website_purchase_roas',
        date_preset: params.date_preset || 'last_30d',
      };
      if (params.time_increment) p.time_increment = params.time_increment;

      const data = await metaApi(`/${params.campaign_id}/insights`, p);
      if (mode !== 'off') return okCompact(compactInsightsData(data, mode));
      return ok(data);
    } catch (e) { return err(e); }
  },
);

// ── 5. List Ad Sets ─────────────────────────────────────────────────────────

server.tool(
  'get_adsets',
  'List ad sets in the account or for a specific campaign. Returns targeting, budget, optimization, bid strategy, status.',
  {
    campaign_id: z.string().optional().describe('Filter by campaign ID. If omitted, returns all ad sets.'),
    status: z.string().optional().describe('Filter: ACTIVE, PAUSED, ARCHIVED. Default: ALL'),
    limit: z.union([z.string(), z.number()]).optional().transform(v => v != null ? String(v) : undefined).describe('Max results. Default: 25'),
  },
  async (params) => {
    try {
      const base = params.campaign_id ? `/${params.campaign_id}/adsets` : `/${actId}/adsets`;
      const p: Record<string, string> = {
        fields: 'id,name,status,effective_status,campaign_id,daily_budget,lifetime_budget,bid_amount,bid_strategy,billing_event,optimization_goal,targeting,start_time,end_time,attribution_spec',
        limit: params.limit || '25',
      };
      if (params.status && params.status !== 'ALL') {
        p.filtering = JSON.stringify([{ field: 'effective_status', operator: 'IN', value: [params.status] }]);
      }

      const data = await metaApi(base, p);
      return ok(data);
    } catch (e) { return err(e); }
  },
);

// ── 6. Ad Set Insights ──────────────────────────────────────────────────────

server.tool(
  'get_adset_insights',
  'Get performance metrics for a specific ad set. ' + COMPACT_DESCRIPTION,
  {
    adset_id: z.string().describe('Ad Set ID'),
    date_preset: z.string().optional().describe('Date range. Default: last_30d'),
    time_increment: z.union([z.string(), z.number()]).optional().transform(v => v != null ? String(v) : undefined).describe('Time granularity: 1 (daily), 7 (weekly), monthly, all_days'),
    compact: z.string().optional().describe(COMPACT_DESCRIPTION),
  },
  async (params) => {
    try {
      const mode = resolveCompactMode(params.compact);
      const p: Record<string, string> = {
        fields: 'adset_name,spend,impressions,reach,frequency,clicks,ctr,cpc,cpm,actions,action_values,cost_per_action_type,website_purchase_roas',
        date_preset: params.date_preset || 'last_30d',
      };
      if (params.time_increment) p.time_increment = params.time_increment;

      const data = await metaApi(`/${params.adset_id}/insights`, p);
      if (mode !== 'off') return okCompact(compactInsightsData(data, mode));
      return ok(data);
    } catch (e) { return err(e); }
  },
);

// ── 7. List Ads ─────────────────────────────────────────────────────────────

server.tool(
  'get_ads',
  'List ads in the account, campaign, or ad set. Returns ad details with creative info including Entity ID (for Andromeda analysis).',
  {
    campaign_id: z.string().optional().describe('Filter by campaign ID'),
    adset_id: z.string().optional().describe('Filter by ad set ID'),
    status: z.string().optional().describe('Filter: ACTIVE, PAUSED, ARCHIVED. Default: ALL'),
    limit: z.union([z.string(), z.number()]).optional().transform(v => v != null ? String(v) : undefined).describe('Max results. Default: 25'),
  },
  async (params) => {
    try {
      let base: string;
      if (params.adset_id) base = `/${params.adset_id}/ads`;
      else if (params.campaign_id) base = `/${params.campaign_id}/ads`;
      else base = `/${actId}/ads`;

      const p: Record<string, string> = {
        fields: 'id,name,status,effective_status,adset_id,campaign_id,creative{id,name,title,body,call_to_action_type,thumbnail_url,image_url,video_id,object_story_spec},created_time,updated_time',
        limit: params.limit || '25',
      };
      if (params.status && params.status !== 'ALL') {
        p.filtering = JSON.stringify([{ field: 'effective_status', operator: 'IN', value: [params.status] }]);
      }

      const data = await metaApi(base, p);
      return ok(data);
    } catch (e) { return err(e); }
  },
);

// ── 8. Ad Insights ──────────────────────────────────────────────────────────

server.tool(
  'get_ad_insights',
  'Get performance metrics for a specific ad. ' + COMPACT_DESCRIPTION,
  {
    ad_id: z.string().describe('Ad ID'),
    date_preset: z.string().optional().describe('Date range. Default: last_30d'),
    time_increment: z.union([z.string(), z.number()]).optional().transform(v => v != null ? String(v) : undefined).describe('Time granularity: 1 (daily), 7 (weekly), monthly, all_days'),
    compact: z.string().optional().describe(COMPACT_DESCRIPTION),
  },
  async (params) => {
    try {
      const mode = resolveCompactMode(params.compact);
      const p: Record<string, string> = {
        fields: 'ad_name,spend,impressions,reach,frequency,clicks,ctr,cpc,cpm,actions,action_values,cost_per_action_type,website_purchase_roas,video_avg_time_watched_actions,video_p25_watched_actions,video_p50_watched_actions,video_p75_watched_actions,video_p100_watched_actions',
        date_preset: params.date_preset || 'last_30d',
      };
      if (params.time_increment) p.time_increment = params.time_increment;

      const data = await metaApi(`/${params.ad_id}/insights`, p);
      if (mode !== 'off') return okCompact(compactInsightsData(data, mode));
      return ok(data);
    } catch (e) { return err(e); }
  },
);

// ── 9. Ad Creative Details ──────────────────────────────────────────────────

server.tool(
  'get_ad_creative',
  'Get full creative details for an ad: image/video, copy (title, body, description), CTA, link, object_story_spec. Use to analyze creative diversity.',
  {
    creative_id: z.string().describe('Ad Creative ID'),
  },
  async (params) => {
    try {
      const data = await metaApi(`/${params.creative_id}`, {
        fields: 'id,name,title,body,call_to_action_type,image_url,image_hash,video_id,thumbnail_url,object_story_spec,link_url,url_tags,asset_feed_spec',
      });
      return ok(data);
    } catch (e) { return err(e); }
  },
);

// ── 10. Campaign Structure Analysis ─────────────────────────────────────────

server.tool(
  'analyze_campaign_structure',
  'Analyze a campaign structure for Andromeda compliance: counts ad sets, ads per ad set, targeting type, budget type. Returns a diagnostic summary.',
  {
    campaign_id: z.string().describe('Campaign ID to analyze'),
  },
  async (params) => {
    try {
      // Get campaign info
      const campaign = await metaApi(`/${params.campaign_id}`, {
        fields: 'id,name,status,objective,buying_type,daily_budget,lifetime_budget,bid_strategy',
      });

      // Get ad sets
      const adsets = await metaApi(`/${params.campaign_id}/adsets`, {
        fields: 'id,name,status,daily_budget,lifetime_budget,optimization_goal,targeting,bid_strategy',
        limit: '100',
      });

      // Get ads count per ad set
      const adsetData = adsets.data || [];
      const analysis = {
        campaign,
        adset_count: adsetData.length,
        adsets: adsetData,
        andromeda_compliance: {
          single_adset: adsetData.length === 1,
          uses_cbo: !!(campaign as Record<string, unknown>).daily_budget || !!(campaign as Record<string, unknown>).lifetime_budget,
          adset_count_status: adsetData.length === 1 ? 'IDEAL' : adsetData.length <= 3 ? 'ACCEPTABLE' : 'RED_FLAG',
        },
      };

      // Get ad count for each ad set
      for (const adset of analysis.adsets as Record<string, unknown>[]) {
        try {
          const ads = await metaApi(`/${adset.id}/ads`, { fields: 'id', limit: '200' });
          (adset as Record<string, unknown>).ad_count = (ads.data || []).length;
        } catch {
          (adset as Record<string, unknown>).ad_count = 'error';
        }
      }

      return ok(analysis);
    } catch (e) { return err(e); }
  },
);

// ── 11. Creative Diversity Audit ────────────────────────────────────────────

server.tool(
  'audit_creative_diversity',
  'Audit creative diversity across a campaign: lists all ad creatives with their thumbnails, copy, format, and CTA. Use to assess Entity ID diversity and P.D.A. coverage.',
  {
    campaign_id: z.string().describe('Campaign ID to audit'),
  },
  async (params) => {
    try {
      // Get all ads in campaign with creative details
      const ads = await metaApi(`/${params.campaign_id}/ads`, {
        fields: 'id,name,status,effective_status,creative{id,name,title,body,call_to_action_type,thumbnail_url,image_url,video_id,object_story_spec}',
        limit: '100',
      });

      const adList = (ads.data || []) as Record<string, unknown>[];
      const creatives = adList.map((ad) => {
        const creative = ad.creative as Record<string, unknown> | undefined;
        return {
          ad_id: ad.id,
          ad_name: ad.name,
          ad_status: ad.effective_status,
          creative_id: creative?.id,
          title: creative?.title || '(no title)',
          body: creative?.body ? String(creative.body).substring(0, 100) : '(no body)',
          cta: creative?.call_to_action_type || '(no CTA)',
          has_image: !!creative?.image_url,
          has_video: !!creative?.video_id,
          thumbnail: creative?.thumbnail_url,
        };
      });

      const summary = {
        total_ads: adList.length,
        active_ads: adList.filter((a) => a.effective_status === 'ACTIVE').length,
        with_video: creatives.filter((c) => c.has_video).length,
        with_image: creatives.filter((c) => !c.has_video && c.has_image).length,
        unique_ctas: [...new Set(creatives.map((c) => c.cta))],
        creatives,
      };

      return ok(summary);
    } catch (e) { return err(e); }
  },
);

// ── 12. Delivery Insights ───────────────────────────────────────────────────

server.tool(
  'get_delivery_insights',
  'Get delivery-specific insights: frequency, reach, CPM by placement and platform. ' + COMPACT_DESCRIPTION,
  {
    object_id: z.string().describe('Campaign, Ad Set, or Ad ID'),
    date_preset: z.string().optional().describe('Date range. Default: last_30d'),
    breakdowns: z.string().optional().describe('Breakdowns: publisher_platform, platform_position, device_platform, impression_device, age, gender. Default: publisher_platform,platform_position'),
    compact: z.string().optional().describe(COMPACT_DESCRIPTION),
  },
  async (params) => {
    try {
      const mode = resolveCompactMode(params.compact);
      const p: Record<string, string> = {
        fields: 'spend,impressions,reach,frequency,cpm,cpc,ctr,actions,action_values',
        date_preset: params.date_preset || 'last_30d',
        breakdowns: params.breakdowns || 'publisher_platform,platform_position',
      };

      const data = await metaApi(`/${params.object_id}/insights`, p);
      if (mode !== 'off') return okCompact(compactInsightsData(data, mode));
      return ok(data);
    } catch (e) { return err(e); }
  },
);

// ── 13. Create Campaign ───────────────────────────────────────────────────

server.tool(
  'create_campaign',
  'Create a new Meta Ads campaign. For Advantage+ Sales (ASC), use objective OUTCOME_SALES with bid_strategy LOWEST_COST_WITHOUT_CAP and set daily_budget at campaign level. The system auto-enables Advantage+ when budget+audience+placement automation are all set.',
  {
    name: z.string().describe('Campaign name'),
    objective: z.string().describe('Campaign objective: OUTCOME_SALES, OUTCOME_TRAFFIC, OUTCOME_AWARENESS, OUTCOME_LEADS, OUTCOME_ENGAGEMENT, OUTCOME_APP_PROMOTION'),
    status: z.string().optional().describe('Initial status: PAUSED (default) or ACTIVE'),
    daily_budget: z.number().optional().describe('Daily budget in CENTS (e.g., 15000 = R$150.00). Required for Advantage+ campaigns.'),
    lifetime_budget: z.number().optional().describe('Lifetime budget in CENTS. Alternative to daily_budget.'),
    bid_strategy: z.string().optional().describe('Bid strategy: LOWEST_COST_WITHOUT_CAP (default), COST_CAP, LOWEST_COST_WITH_BID_CAP, LOWEST_COST_WITH_MIN_ROAS'),
    special_ad_categories: z.array(z.string()).optional().describe('Special categories: NONE, EMPLOYMENT, HOUSING, CREDIT, ISSUES_ELECTIONS_POLITICS. Default: empty array (NONE)'),
  },
  async (params) => {
    try {
      const body: Record<string, unknown> = {
        name: params.name,
        objective: params.objective,
        status: params.status || 'PAUSED',
        special_ad_categories: params.special_ad_categories || [],
        buying_type: 'AUCTION',
      };

      if (params.daily_budget) {
        body.daily_budget = params.daily_budget;
        // CBO: enable campaign budget optimization
        body.is_campaign_budget_optimization = true;
      } else {
        // ABO: no campaign budget, ad sets manage their own budgets
        body.is_adset_budget_sharing_enabled = false;
      }
      if (params.lifetime_budget) body.lifetime_budget = params.lifetime_budget;
      if (params.bid_strategy) body.bid_strategy = params.bid_strategy;

      const data = await metaApiPost(`/${actId}/campaigns`, body);
      return ok(data);
    } catch (e) { return err(e); }
  },
);

// ── 14. Create Ad Set ─────────────────────────────────────────────────────

server.tool(
  'create_adset',
  'Create a new ad set within a campaign. For Advantage+ Sales, use broad targeting (geo only) with targeting_automation advantage_audience=1, OFFSITE_CONVERSIONS optimization, and IMPRESSIONS billing.',
  {
    name: z.string().describe('Ad set name'),
    campaign_id: z.string().describe('Parent campaign ID'),
    optimization_goal: z.string().describe('Optimization goal: OFFSITE_CONVERSIONS (purchases), LINK_CLICKS, LANDING_PAGE_VIEWS, IMPRESSIONS, REACH, VALUE'),
    billing_event: z.string().optional().describe('Billing event: IMPRESSIONS (default), LINK_CLICKS'),
    daily_budget: z.number().optional().describe('Daily budget in CENTS (only if campaign has NO budget set)'),
    bid_strategy: z.string().optional().describe('Bid strategy (overrides campaign level)'),
    bid_amount: z.number().optional().describe('Bid amount in CENTS (for COST_CAP or BID_CAP strategies)'),
    targeting: z.string().describe('Targeting JSON string. For broad/Advantage+: {"geo_locations":{"countries":["BR"]},"targeting_automation":{"advantage_audience":1}}'),
    promoted_object: z.string().optional().describe('Promoted object JSON. For conversions: {"pixel_id":"123","custom_event_type":"PURCHASE"}'),
    status: z.string().optional().describe('Initial status: PAUSED (default) or ACTIVE'),
    start_time: z.string().optional().describe('Start time ISO 8601 format'),
    end_time: z.string().optional().describe('End time ISO 8601 format'),
  },
  async (params) => {
    try {
      const body: Record<string, unknown> = {
        name: params.name,
        campaign_id: params.campaign_id,
        optimization_goal: params.optimization_goal,
        billing_event: params.billing_event || 'IMPRESSIONS',
        status: params.status || 'PAUSED',
      };

      // Parse targeting JSON
      body.targeting = JSON.parse(params.targeting);

      if (params.promoted_object) body.promoted_object = JSON.parse(params.promoted_object);
      if (params.daily_budget) body.daily_budget = params.daily_budget;
      if (params.bid_strategy) body.bid_strategy = params.bid_strategy;
      if (params.bid_amount) body.bid_amount = params.bid_amount;
      if (params.start_time) body.start_time = params.start_time;
      if (params.end_time) body.end_time = params.end_time;

      const data = await metaApiPost(`/${actId}/adsets`, body);
      return ok(data);
    } catch (e) { return err(e); }
  },
);

// ── 15. Upload Image ──────────────────────────────────────────────────────

server.tool(
  'upload_image',
  'Upload an image to Meta Ads from a URL. Returns image_hash to use when creating ad creatives. Supports PNG, JPG, JPEG.',
  {
    image_url: z.string().describe('Public URL of the image to upload (CDN URL, must be accessible)'),
    name: z.string().optional().describe('Optional name for the image'),
  },
  async (params) => {
    try {
      // Download image from URL
      const imgRes = await fetch(params.image_url);
      if (!imgRes.ok) throw new Error(`Failed to download image: ${imgRes.status}`);
      const imgBuffer = await imgRes.arrayBuffer();
      const imgBlob = new Blob([imgBuffer], { type: imgRes.headers.get('content-type') || 'image/png' });

      // Upload via multipart form
      const formData = new FormData();
      const fileName = params.name ? (params.name.match(/\.(png|jpg|jpeg)$/i) ? params.name : `${params.name}.png`) : 'creative.png';
      formData.append('source', imgBlob, fileName);
      if (params.name) formData.append('name', params.name);

      const data = await metaApiPostForm(`/${actId}/adimages`, formData);
      return ok(data);
    } catch (e) { return err(e); }
  },
);

// ── 16. Create Ad Creative ────────────────────────────────────────────────

server.tool(
  'create_ad_creative',
  'Create an ad creative with image, copy, headline, and link. Requires an image_hash (from upload_image tool) and a Facebook page_id.',
  {
    name: z.string().describe('Creative name'),
    page_id: z.string().describe('Facebook Page ID to use as the ad identity'),
    image_hash: z.string().describe('Image hash from upload_image tool'),
    message: z.string().describe('Primary text (the main ad copy above the image)'),
    headline: z.string().optional().describe('Headline text (below the image, bold)'),
    description: z.string().optional().describe('Description text (below headline, smaller)'),
    link: z.string().describe('Destination URL (e.g., Hotmart checkout link with UTMs)'),
    call_to_action_type: z.string().optional().describe('CTA type: LEARN_MORE (default), SHOP_NOW, SIGN_UP, SUBSCRIBE, GET_OFFER, BUY_NOW, BOOK_TRAVEL, DOWNLOAD, GET_QUOTE, APPLY_NOW'),
    instagram_actor_id: z.string().optional().describe('Instagram business account ID (for Instagram placements)'),
  },
  async (params) => {
    try {
      const objectStorySpec: Record<string, unknown> = {
        page_id: params.page_id,
        link_data: {
          image_hash: params.image_hash,
          message: params.message,
          link: params.link,
          call_to_action: {
            type: params.call_to_action_type || 'LEARN_MORE',
            value: { link: params.link },
          },
        },
      };

      const linkData = objectStorySpec.link_data as Record<string, unknown>;
      if (params.headline) linkData.name = params.headline;
      if (params.description) linkData.description = params.description;

      if (params.instagram_actor_id) {
        objectStorySpec.instagram_actor_id = params.instagram_actor_id;
      }

      const body: Record<string, unknown> = {
        name: params.name,
        object_story_spec: objectStorySpec,
      };

      const data = await metaApiPost(`/${actId}/adcreatives`, body);
      return ok(data);
    } catch (e) { return err(e); }
  },
);

// ── 17. Create Ad ─────────────────────────────────────────────────────────

server.tool(
  'create_ad',
  'Create a new ad within an ad set, linking it to an existing creative. The ad will inherit targeting and budget from the ad set.',
  {
    name: z.string().describe('Ad name'),
    adset_id: z.string().describe('Parent ad set ID'),
    creative_id: z.string().describe('Ad creative ID (from create_ad_creative tool)'),
    status: z.string().optional().describe('Initial status: PAUSED (default) or ACTIVE'),
    tracking_specs: z.string().optional().describe('Tracking specs JSON. For pixel tracking: [{"action.type":["offsite_conversion"],"fb_pixel":["PIXEL_ID"]}]'),
  },
  async (params) => {
    try {
      const body: Record<string, unknown> = {
        name: params.name,
        adset_id: params.adset_id,
        creative: { creative_id: params.creative_id },
        status: params.status || 'PAUSED',
      };

      if (params.tracking_specs) body.tracking_specs = JSON.parse(params.tracking_specs);

      const data = await metaApiPost(`/${actId}/ads`, body);
      return ok(data);
    } catch (e) { return err(e); }
  },
);

// ── 18. Update Campaign Status ────────────────────────────────────────────

server.tool(
  'update_campaign_status',
  'Update a campaign status (pause, activate, archive). Can also update name and budget.',
  {
    campaign_id: z.string().describe('Campaign ID to update'),
    status: z.string().optional().describe('New status: ACTIVE, PAUSED, ARCHIVED'),
    name: z.string().optional().describe('New campaign name'),
    daily_budget: z.number().optional().describe('New daily budget in CENTS'),
  },
  async (params) => {
    try {
      const body: Record<string, unknown> = {};
      if (params.status) body.status = params.status;
      if (params.name) body.name = params.name;
      if (params.daily_budget) body.daily_budget = params.daily_budget;

      const data = await metaApiPost(`/${params.campaign_id}`, body);
      return ok(data);
    } catch (e) { return err(e); }
  },
);

// ── Start ───────────────────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
