#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

// ── Facebook Page Insights Client (Graph API v21.0) ─────────────────────────
//
// Uses System User token (META_ACCESS_TOKEN) → auto-exchanged for Page Token.
//
// v21.0 working page metrics:
//   page_views_total, page_post_engagements, page_actions_post_reactions_total,
//   page_video_views, page_impressions_unique, page_follows
//
// v21.0 broken/deprecated page metrics (System User + this app):
//   page_engaged_users, page_fan_adds, page_fan_removes, page_consumptions,
//   page_fans_online, page_fans, page_followers, page_fans_country,
//   page_fans_gender_age, page_fans_locale, page_fans_city
//
// Endpoint limitations (requires Page Public Content Access feature):
//   /feed, /{post_id} reactions detail
//
// Endpoint bugs (Meta 500 with System User tokens):
//   /videos (all field combinations)

const API_BASE = 'https://graph.facebook.com/v21.0';

const USER_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
const PAGE_ID = process.env.FACEBOOK_PAGE_ID;

if (!USER_ACCESS_TOKEN) {
  console.error('Error: META_ACCESS_TOKEN is required.');
  process.exit(1);
}

if (!PAGE_ID) {
  console.error('Error: FACEBOOK_PAGE_ID is required.');
  process.exit(1);
}

// Facebook Page endpoints require a Page Access Token (not user token).
// We auto-exchange on first API call and cache it.
let pageAccessToken: string | null = null;

async function getPageToken(): Promise<string> {
  if (pageAccessToken) return pageAccessToken;

  const url = new URL(`${API_BASE}/${PAGE_ID}`);
  url.searchParams.set('fields', 'access_token');
  url.searchParams.set('access_token', USER_ACCESS_TOKEN!);

  const res = await fetch(url.toString());
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to get Page Access Token (${res.status}): ${text}`);
  }

  const data = await res.json() as { access_token: string };
  pageAccessToken = data.access_token;
  return pageAccessToken;
}

interface GraphApiResponse {
  data?: unknown[];
  paging?: { cursors?: { before?: string; after?: string }; next?: string };
  [key: string]: unknown;
}

async function fbApi(path: string, params?: Record<string, string>): Promise<GraphApiResponse> {
  const token = await getPageToken();
  const url = new URL(`${API_BASE}${path}`);
  url.searchParams.set('access_token', token);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v) url.searchParams.set(k, v);
    }
  }

  const res = await fetch(url.toString());

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Facebook API error (${res.status}): ${text}`);
  }

  return res.json() as Promise<GraphApiResponse>;
}

// ── MCP Server ──────────────────────────────────────────────────────────────

const server = new McpServer(
  { name: 'facebook-page-insights-mcp', version: '1.1.0' },
  { capabilities: { tools: {} } },
);

// ── 1. Page Info ────────────────────────────────────────────────────────────

server.tool(
  'get_page_info',
  'Get Facebook Page profile: name, username, followers_count, category, website, cover photo, about.',
  {},
  async () => {
    try {
      const data = await fbApi(`/${PAGE_ID}`, {
        fields: 'id,name,username,about,category,followers_count,website,cover,picture,fan_count,new_like_count',
      });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (e) {
      return { content: [{ type: 'text', text: `Error: ${(e as Error).message}` }], isError: true };
    }
  },
);

// ── 2. Page Insights (time-series) ──────────────────────────────────────────

server.tool(
  'get_page_insights',
  'Get Facebook Page time-series insights. Working v21.0 metrics: page_views_total, page_post_engagements, page_actions_post_reactions_total, page_video_views, page_impressions_unique, page_follows. Period: day, week, or days_28. Since/until are Unix timestamps.',
  {
    metric: z.string().optional().describe('Comma-separated metrics. Working in v21: page_views_total,page_post_engagements,page_actions_post_reactions_total,page_video_views,page_impressions_unique,page_follows. Default: page_views_total,page_post_engagements,page_impressions_unique,page_follows'),
    period: z.enum(['day', 'week', 'days_28']).optional().describe('Aggregation period. Default: day'),
    since: z.string().optional().describe('Start time as Unix timestamp (seconds).'),
    until: z.string().optional().describe('End time as Unix timestamp (seconds).'),
  },
  async (params) => {
    try {
      const data = await fbApi(`/${PAGE_ID}/insights`, {
        metric: params.metric || 'page_views_total,page_post_engagements,page_impressions_unique,page_follows',
        period: params.period || 'day',
        since: params.since || '',
        until: params.until || '',
      });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (e) {
      return { content: [{ type: 'text', text: `Error: ${(e as Error).message}` }], isError: true };
    }
  },
);

// ── 3. Page Engagement Metrics ──────────────────────────────────────────────

server.tool(
  'get_page_engagement',
  'Get Facebook Page engagement totals: page_post_engagements, page_actions_post_reactions_total, page_video_views. Period: day, week, or days_28.',
  {
    metric: z.string().optional().describe('Comma-separated metrics. Working in v21: page_post_engagements,page_actions_post_reactions_total,page_video_views,page_video_views_organic,page_video_views_paid. Default: page_post_engagements,page_actions_post_reactions_total,page_video_views'),
    period: z.enum(['day', 'week', 'days_28']).optional().describe('Aggregation period. Default: day'),
    since: z.string().optional().describe('Start time as Unix timestamp.'),
    until: z.string().optional().describe('End time as Unix timestamp.'),
  },
  async (params) => {
    try {
      const data = await fbApi(`/${PAGE_ID}/insights`, {
        metric: params.metric || 'page_post_engagements,page_actions_post_reactions_total,page_video_views',
        period: params.period || 'day',
        since: params.since || '',
        until: params.until || '',
      });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (e) {
      return { content: [{ type: 'text', text: `Error: ${(e as Error).message}` }], isError: true };
    }
  },
);

// ── 4. Page Reach & Views ───────────────────────────────────────────────────

server.tool(
  'get_page_reach',
  'Get Facebook Page reach and views metrics. Period: day, week, or days_28.',
  {
    metric: z.string().optional().describe('Comma-separated metrics. Working in v21: page_views_total,page_impressions_unique. Default: page_views_total,page_impressions_unique'),
    period: z.enum(['day', 'week', 'days_28']).optional().describe('Aggregation period. Default: day'),
    since: z.string().optional().describe('Start time as Unix timestamp.'),
    until: z.string().optional().describe('End time as Unix timestamp.'),
  },
  async (params) => {
    try {
      const data = await fbApi(`/${PAGE_ID}/insights`, {
        metric: params.metric || 'page_views_total,page_impressions_unique',
        period: params.period || 'day',
        since: params.since || '',
        until: params.until || '',
      });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (e) {
      return { content: [{ type: 'text', text: `Error: ${(e as Error).message}` }], isError: true };
    }
  },
);

// ── 5. Page Published Posts ─────────────────────────────────────────────────

server.tool(
  'get_page_posts',
  'List recent published Facebook Page posts with message, permalink, shares, and attachments. Uses /published_posts endpoint.',
  {
    limit: z.string().optional().describe('Number of posts (default 25, max 100)'),
    after: z.string().optional().describe('Pagination cursor for next page'),
  },
  async (params) => {
    try {
      const data = await fbApi(`/${PAGE_ID}/published_posts`, {
        fields: 'id,message,created_time,permalink_url,status_type,shares,attachments',
        limit: params.limit || '25',
        after: params.after || '',
      });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (e) {
      return { content: [{ type: 'text', text: `Error: ${(e as Error).message}` }], isError: true };
    }
  },
);

// ── 6. Post Insights ────────────────────────────────────────────────────────

server.tool(
  'get_post_insights',
  'Get insights for a specific Facebook post: post_clicks, post_reactions_by_type_total, post_activity_by_action_type. Note: post_engaged_users and post_impressions are deprecated in v21+.',
  {
    post_id: z.string().describe('The Facebook post ID (format: pageId_postId)'),
    metric: z.string().optional().describe('Comma-separated metrics. Working in v21: post_clicks,post_reactions_by_type_total,post_activity_by_action_type,post_video_views_organic,post_video_views_paid. Default: post_clicks,post_reactions_by_type_total,post_activity_by_action_type'),
  },
  async (params) => {
    try {
      const data = await fbApi(`/${params.post_id}/insights`, {
        metric: params.metric || 'post_clicks,post_reactions_by_type_total,post_activity_by_action_type',
      });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (e) {
      return { content: [{ type: 'text', text: `Error: ${(e as Error).message}` }], isError: true };
    }
  },
);

// ── 7. Video Insights ───────────────────────────────────────────────────────

server.tool(
  'get_video_insights',
  'Get insights for a specific Facebook video/reel. Pass the video ID (get from get_page_reels). Metrics: total_video_views, total_video_views_unique, total_video_avg_time_watched, total_video_view_total_time.',
  {
    video_id: z.string().describe('The Facebook video/reel ID'),
    metric: z.string().optional().describe('Comma-separated metrics. Available: total_video_views,total_video_views_unique,total_video_avg_time_watched,total_video_view_total_time,total_video_10s_views,total_video_30s_views,total_video_60s_views,total_video_complete_views. Default: total_video_views,total_video_views_unique,total_video_avg_time_watched,total_video_view_total_time'),
  },
  async (params) => {
    try {
      const data = await fbApi(`/${params.video_id}/video_insights`, {
        metric: params.metric || 'total_video_views,total_video_views_unique,total_video_avg_time_watched,total_video_view_total_time',
      });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (e) {
      return { content: [{ type: 'text', text: `Error: ${(e as Error).message}` }], isError: true };
    }
  },
);

// ── 8. Page Reels ───────────────────────────────────────────────────────────

server.tool(
  'get_page_reels',
  'List Facebook Reels from a Page with metadata. Use get_video_insights on individual reel IDs for performance metrics.',
  {
    limit: z.string().optional().describe('Number of reels (default 25)'),
    after: z.string().optional().describe('Pagination cursor for next page'),
  },
  async (params) => {
    try {
      const data = await fbApi(`/${PAGE_ID}/video_reels`, {
        fields: 'id,title,description,created_time,permalink_url,length',
        limit: params.limit || '25',
        after: params.after || '',
      });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (e) {
      return { content: [{ type: 'text', text: `Error: ${(e as Error).message}` }], isError: true };
    }
  },
);

// ── 9. Page Followers Growth ────────────────────────────────────────────────

server.tool(
  'get_page_followers_growth',
  'Get Facebook Page followers growth over time using page_follows metric. Shows new follows per period.',
  {
    period: z.enum(['day', 'week', 'days_28']).optional().describe('Aggregation period. Default: day'),
    since: z.string().optional().describe('Start time as Unix timestamp.'),
    until: z.string().optional().describe('End time as Unix timestamp.'),
  },
  async (params) => {
    try {
      const data = await fbApi(`/${PAGE_ID}/insights`, {
        metric: 'page_follows',
        period: params.period || 'day',
        since: params.since || '',
        until: params.until || '',
      });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (e) {
      return { content: [{ type: 'text', text: `Error: ${(e as Error).message}` }], isError: true };
    }
  },
);

// ── 10. Page Video Views ────────────────────────────────────────────────────

server.tool(
  'get_page_video_views',
  'Get Facebook Page video view metrics (organic, paid, and total). Period: day, week, or days_28.',
  {
    period: z.enum(['day', 'week', 'days_28']).optional().describe('Aggregation period. Default: day'),
    since: z.string().optional().describe('Start time as Unix timestamp.'),
    until: z.string().optional().describe('End time as Unix timestamp.'),
  },
  async (params) => {
    try {
      const data = await fbApi(`/${PAGE_ID}/insights`, {
        metric: 'page_video_views,page_video_views_organic,page_video_views_paid',
        period: params.period || 'day',
        since: params.since || '',
        until: params.until || '',
      });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (e) {
      return { content: [{ type: 'text', text: `Error: ${(e as Error).message}` }], isError: true };
    }
  },
);

// ── 11. Post Video Views ────────────────────────────────────────────────────

server.tool(
  'get_post_video_views',
  'Get video view metrics for a specific Facebook post (organic vs paid breakdown).',
  {
    post_id: z.string().describe('The Facebook post ID (format: pageId_postId)'),
  },
  async (params) => {
    try {
      const data = await fbApi(`/${params.post_id}/insights`, {
        metric: 'post_video_views_organic,post_video_views_paid',
      });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (e) {
      return { content: [{ type: 'text', text: `Error: ${(e as Error).message}` }], isError: true };
    }
  },
);

// ── 12. Page Actions (Reactions Total) ──────────────────────────────────────

server.tool(
  'get_page_reactions',
  'Get total reactions on the Facebook Page over time (all reaction types combined). Period: day, week, or days_28.',
  {
    period: z.enum(['day', 'week', 'days_28']).optional().describe('Aggregation period. Default: day'),
    since: z.string().optional().describe('Start time as Unix timestamp.'),
    until: z.string().optional().describe('End time as Unix timestamp.'),
  },
  async (params) => {
    try {
      const data = await fbApi(`/${PAGE_ID}/insights`, {
        metric: 'page_actions_post_reactions_total',
        period: params.period || 'day',
        since: params.since || '',
        until: params.until || '',
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
