#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

// ── Instagram Graph API Client (v21.0) ──────────────────────────────────────
//
// API v21.0 splits metrics into two types:
//   - time_series: reach, follower_count (use period=day/week/days_28)
//   - total_value: views, profile_views, total_interactions, accounts_engaged,
//                  likes, comments, shares, saves, replies, follows_and_unfollows,
//                  engaged_audience_demographics, reached_audience_demographics,
//                  follower_demographics (requires metric_type=total_value)

const API_BASE = 'https://graph.facebook.com/v21.0';

const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
const IG_USER_ID = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;

if (!ACCESS_TOKEN) {
  console.error('Error: META_ACCESS_TOKEN is required.');
  process.exit(1);
}

if (!IG_USER_ID) {
  console.error('Error: INSTAGRAM_BUSINESS_ACCOUNT_ID is required.');
  process.exit(1);
}

interface GraphApiResponse {
  data?: unknown[];
  paging?: { cursors?: { before?: string; after?: string }; next?: string };
  [key: string]: unknown;
}

async function igApi(path: string, params?: Record<string, string>): Promise<GraphApiResponse> {
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
    throw new Error(`Instagram API error (${res.status}): ${text}`);
  }

  return res.json() as Promise<GraphApiResponse>;
}

// ── MCP Server ──────────────────────────────────────────────────────────────

const server = new McpServer(
  { name: 'instagram-insights-mcp', version: '1.0.0' },
  { capabilities: { tools: {} } },
);

// ── 1. Account Info ─────────────────────────────────────────────────────────

server.tool(
  'get_account_info',
  'Get Instagram Business Account profile: username, name, bio, followers_count, follows_count, media_count, profile_picture_url, website.',
  {},
  async () => {
    try {
      const data = await igApi(`/${IG_USER_ID}`, {
        fields: 'id,username,name,biography,followers_count,follows_count,media_count,profile_picture_url,website',
      });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (e) {
      return { content: [{ type: 'text', text: `Error: ${(e as Error).message}` }], isError: true };
    }
  },
);

// ── 2. Account Insights (time_series) ───────────────────────────────────────

server.tool(
  'get_account_insights',
  'Get Instagram account time-series insights: reach and follower_count over time. Period: day, week, or days_28. Since/until are Unix timestamps (seconds).',
  {
    metric: z.string().optional().describe('Comma-separated time_series metrics. Available: reach, follower_count. Default: reach,follower_count'),
    period: z.enum(['day', 'week', 'days_28']).optional().describe('Aggregation period. Default: day'),
    since: z.string().optional().describe('Start time as Unix timestamp (seconds). Max 30 days ago.'),
    until: z.string().optional().describe('End time as Unix timestamp (seconds).'),
  },
  async (params) => {
    try {
      const data = await igApi(`/${IG_USER_ID}/insights`, {
        metric: params.metric || 'reach,follower_count',
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

// ── 3. Account Engagement Metrics (total_value) ─────────────────────────────

server.tool(
  'get_engagement_metrics',
  'Get Instagram engagement totals for a period: views, profile_views, total_interactions, accounts_engaged, likes, comments, shares, saves, replies, follows_and_unfollows, website_clicks, profile_links_taps. Uses metric_type=total_value.',
  {
    metric: z.string().optional().describe('Comma-separated total_value metrics. Available: views,profile_views,total_interactions,accounts_engaged,likes,comments,shares,saves,replies,follows_and_unfollows,website_clicks,profile_links_taps. Default: views,profile_views,total_interactions,accounts_engaged,likes,comments,shares,saves'),
    period: z.enum(['day', 'week', 'days_28']).optional().describe('Aggregation period. Default: day'),
    since: z.string().optional().describe('Start time as Unix timestamp.'),
    until: z.string().optional().describe('End time as Unix timestamp.'),
  },
  async (params) => {
    try {
      const data = await igApi(`/${IG_USER_ID}/insights`, {
        metric: params.metric || 'views,profile_views,total_interactions,accounts_engaged,likes,comments,shares,saves',
        period: params.period || 'day',
        metric_type: 'total_value',
        since: params.since || '',
        until: params.until || '',
      });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (e) {
      return { content: [{ type: 'text', text: `Error: ${(e as Error).message}` }], isError: true };
    }
  },
);

// ── 4. Audience Demographics (total_value) ──────────────────────────────────

server.tool(
  'get_audience_insights',
  'Get Instagram audience demographics: follower_demographics, engaged_audience_demographics, reached_audience_demographics. Returns breakdowns by city, country, age, gender. Uses metric_type=total_value with period=lifetime.',
  {
    metric: z.enum(['follower_demographics', 'engaged_audience_demographics', 'reached_audience_demographics']).optional().describe('Which demographic metric. Default: follower_demographics'),
    breakdown: z.string().optional().describe('Breakdown type: city, country, age, gender. Default: age,gender'),
    timeframe: z.string().optional().describe('For engaged/reached: last_14_days, last_30_days, this_month, last_month, this_week, prev_month. Default: last_30_days'),
  },
  async (params) => {
    try {
      const metric = params.metric || 'follower_demographics';
      const apiParams: Record<string, string> = {
        metric,
        period: 'lifetime',
        metric_type: 'total_value',
        breakdown: params.breakdown || 'age,gender',
      };
      if (metric !== 'follower_demographics' && params.timeframe) {
        apiParams.timeframe = params.timeframe;
      }
      const data = await igApi(`/${IG_USER_ID}/insights`, apiParams);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (e) {
      return { content: [{ type: 'text', text: `Error: ${(e as Error).message}` }], isError: true };
    }
  },
);

// ── 5. Online Followers ─────────────────────────────────────────────────────

server.tool(
  'get_online_followers',
  'Get when followers are online (hourly breakdown). Returns online_followers metric. Essential for finding best posting times.',
  {
    since: z.string().optional().describe('Start time as Unix timestamp. Recommended: 2 days ago.'),
    until: z.string().optional().describe('End time as Unix timestamp. Recommended: now.'),
  },
  async (params) => {
    try {
      const data = await igApi(`/${IG_USER_ID}/insights`, {
        metric: 'online_followers',
        period: 'lifetime',
        since: params.since || '',
        until: params.until || '',
      });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (e) {
      return { content: [{ type: 'text', text: `Error: ${(e as Error).message}` }], isError: true };
    }
  },
);

// ── 6. List Recent Media ────────────────────────────────────────────────────

server.tool(
  'get_media_list',
  'List recent Instagram media (posts, reels, carousels). Returns IDs, captions, timestamps, types, permalink, like/comment counts.',
  {
    limit: z.string().optional().describe('Number of media items (default 25, max 100)'),
    after: z.string().optional().describe('Pagination cursor for next page'),
  },
  async (params) => {
    try {
      const data = await igApi(`/${IG_USER_ID}/media`, {
        fields: 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count',
        limit: params.limit || '25',
        after: params.after || '',
      });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (e) {
      return { content: [{ type: 'text', text: `Error: ${(e as Error).message}` }], isError: true };
    }
  },
);

// ── 7. Media Insights (single post) ─────────────────────────────────────────

server.tool(
  'get_media_insights',
  'Get insights for a specific media item (post/reel/carousel). Returns reach, likes, comments, shares, saved, total_interactions, etc. Note: "plays" metric was removed in v22+.',
  {
    media_id: z.string().describe('The Instagram media ID'),
    metric: z.string().optional().describe('Comma-separated metrics. Available: reach,likes,comments,shares,saved,total_interactions,ig_reels_avg_watch_time,ig_reels_video_view_total_time,views. Default: reach,likes,comments,shares,saved,total_interactions,views'),
  },
  async (params) => {
    try {
      const data = await igApi(`/${params.media_id}/insights`, {
        metric: params.metric || 'reach,likes,comments,shares,saved,total_interactions,views',
      });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (e) {
      return { content: [{ type: 'text', text: `Error: ${(e as Error).message}` }], isError: true };
    }
  },
);

// ── 8. Stories ──────────────────────────────────────────────────────────────

server.tool(
  'get_stories',
  'List currently active Instagram Stories with timestamps and IDs.',
  {},
  async () => {
    try {
      const data = await igApi(`/${IG_USER_ID}/stories`, {
        fields: 'id,media_type,media_url,timestamp,permalink',
      });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (e) {
      return { content: [{ type: 'text', text: `Error: ${(e as Error).message}` }], isError: true };
    }
  },
);

// ── 9. Story Insights ───────────────────────────────────────────────────────

server.tool(
  'get_story_insights',
  'Get insights for a specific story: reach, replies, exits, taps_forward, taps_back.',
  {
    story_id: z.string().describe('The Instagram story media ID'),
    metric: z.string().optional().describe('Comma-separated metrics. Available: reach,replies,exits,taps_forward,taps_back. Default: reach,replies,exits,taps_forward,taps_back'),
  },
  async (params) => {
    try {
      const data = await igApi(`/${params.story_id}/insights`, {
        metric: params.metric || 'reach,replies,exits,taps_forward,taps_back',
      });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (e) {
      return { content: [{ type: 'text', text: `Error: ${(e as Error).message}` }], isError: true };
    }
  },
);

// ── 10. Hashtag Search ──────────────────────────────────────────────────────

server.tool(
  'search_hashtag',
  'Search for a hashtag ID by name. Required before fetching hashtag top media.',
  {
    hashtag: z.string().describe('The hashtag name (without #)'),
  },
  async (params) => {
    try {
      const data = await igApi('/ig_hashtag_search', {
        q: params.hashtag,
        user_id: IG_USER_ID!,
      });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (e) {
      return { content: [{ type: 'text', text: `Error: ${(e as Error).message}` }], isError: true };
    }
  },
);

// ── 11. Hashtag Top Media ───────────────────────────────────────────────────

server.tool(
  'get_hashtag_top_media',
  'Get top media for a hashtag. Requires hashtag_id from search_hashtag.',
  {
    hashtag_id: z.string().describe('Hashtag ID from search_hashtag'),
    limit: z.string().optional().describe('Number of results (default 25)'),
  },
  async (params) => {
    try {
      const data = await igApi(`/${params.hashtag_id}/top_media`, {
        user_id: IG_USER_ID!,
        fields: 'id,caption,media_type,permalink,timestamp,like_count,comments_count',
        limit: params.limit || '25',
      });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (e) {
      return { content: [{ type: 'text', text: `Error: ${(e as Error).message}` }], isError: true };
    }
  },
);

// ── 12. Content Publishing Limit ────────────────────────────────────────────

server.tool(
  'get_content_publishing_limit',
  'Check Instagram content publishing rate limit for today.',
  {},
  async () => {
    try {
      const data = await igApi(`/${IG_USER_ID}/content_publishing_limit`, {
        fields: 'config,quota_usage',
      });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (e) {
      return { content: [{ type: 'text', text: `Error: ${(e as Error).message}` }], isError: true };
    }
  },
);

// ── 13. Media Children (Carousel) ───────────────────────────────────────────

server.tool(
  'get_carousel_children',
  'Get child media items from a carousel post.',
  {
    media_id: z.string().describe('The carousel media ID'),
  },
  async (params) => {
    try {
      const data = await igApi(`/${params.media_id}/children`, {
        fields: 'id,media_type,media_url,timestamp',
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
