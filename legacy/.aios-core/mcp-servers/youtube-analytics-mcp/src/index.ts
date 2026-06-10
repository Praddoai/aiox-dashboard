#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { google } from 'googleapis';

// ── YouTube Analytics Client ────────────────────────────────────────────────
//
// Uses two Google APIs:
//   - YouTube Data API v3: channel info, video metadata, playlists
//   - YouTube Analytics API v2: views, watch time, demographics, traffic sources
//
// Auth: OAuth2 with refresh token (auto-refreshes access token)

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.YOUTUBE_REFRESH_TOKEN;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('Error: GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are required.');
  process.exit(1);
}

if (!REFRESH_TOKEN) {
  console.error('Error: YOUTUBE_REFRESH_TOKEN is required. Run `npm run auth` to generate one.');
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET);
oauth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });

const youtube = google.youtube({ version: 'v3', auth: oauth2Client });
const youtubeAnalytics = google.youtubeAnalytics({ version: 'v2', auth: oauth2Client });

// Cache channel ID on first use
let cachedChannelId: string | null = null;

async function getChannelId(): Promise<string> {
  if (cachedChannelId) return cachedChannelId;
  const res = await youtube.channels.list({ part: ['id'], mine: true });
  const id = res.data.items?.[0]?.id;
  if (!id) throw new Error('No YouTube channel found for authenticated user');
  cachedChannelId = id;
  return id;
}

// Helper to get default date range (last 28 days)
function defaultDates(): { startDate: string; endDate: string } {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 28);
  return {
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0],
  };
}

// ── MCP Server ──────────────────────────────────────────────────────────────

const server = new McpServer(
  { name: 'youtube-analytics-mcp', version: '1.0.0' },
  { capabilities: { tools: {} } },
);

// ── 1. Channel Info ─────────────────────────────────────────────────────────

server.tool(
  'get_channel_info',
  'Get YouTube channel profile: title, description, customUrl, subscriberCount, viewCount, videoCount, thumbnails, publishedAt.',
  {},
  async () => {
    try {
      const res = await youtube.channels.list({
        part: ['snippet', 'statistics', 'brandingSettings', 'contentDetails'],
        mine: true,
      });
      return { content: [{ type: 'text', text: JSON.stringify(res.data, null, 2) }] };
    } catch (e) {
      return { content: [{ type: 'text', text: `Error: ${(e as Error).message}` }], isError: true };
    }
  },
);

// ── 2. Channel Analytics (time-series) ──────────────────────────────────────

server.tool(
  'get_channel_analytics',
  'Get YouTube channel time-series analytics: views, estimatedMinutesWatched, likes, comments, shares, subscribersGained, subscribersLost. Dates in YYYY-MM-DD format.',
  {
    metrics: z.string().optional().describe('Comma-separated metrics. Available: views,estimatedMinutesWatched,averageViewDuration,likes,comments,shares,subscribersGained,subscribersLost. Default: views,estimatedMinutesWatched,likes,comments,shares,subscribersGained'),
    startDate: z.string().optional().describe('Start date (YYYY-MM-DD). Default: 28 days ago.'),
    endDate: z.string().optional().describe('End date (YYYY-MM-DD). Default: today.'),
    dimensions: z.string().optional().describe('Dimension for grouping: day, month. Default: day'),
  },
  async (params) => {
    try {
      const defaults = defaultDates();
      const res = await youtubeAnalytics.reports.query({
        ids: 'channel==MINE',
        startDate: params.startDate || defaults.startDate,
        endDate: params.endDate || defaults.endDate,
        metrics: params.metrics || 'views,estimatedMinutesWatched,likes,comments,shares,subscribersGained',
        dimensions: params.dimensions || 'day',
      });
      return { content: [{ type: 'text', text: JSON.stringify(res.data, null, 2) }] };
    } catch (e) {
      return { content: [{ type: 'text', text: `Error: ${(e as Error).message}` }], isError: true };
    }
  },
);

// ── 3. Traffic Sources ──────────────────────────────────────────────────────

server.tool(
  'get_traffic_sources',
  'How viewers find your YouTube content: SEARCH, SUGGESTED, EXTERNAL, BROWSE, etc. Returns views and estimatedMinutesWatched per traffic source.',
  {
    startDate: z.string().optional().describe('Start date (YYYY-MM-DD). Default: 28 days ago.'),
    endDate: z.string().optional().describe('End date (YYYY-MM-DD). Default: today.'),
    metrics: z.string().optional().describe('Metrics. Default: views,estimatedMinutesWatched'),
  },
  async (params) => {
    try {
      const defaults = defaultDates();
      const res = await youtubeAnalytics.reports.query({
        ids: 'channel==MINE',
        startDate: params.startDate || defaults.startDate,
        endDate: params.endDate || defaults.endDate,
        metrics: params.metrics || 'views,estimatedMinutesWatched',
        dimensions: 'insightTrafficSourceType',
        sort: '-views',
      });
      return { content: [{ type: 'text', text: JSON.stringify(res.data, null, 2) }] };
    } catch (e) {
      return { content: [{ type: 'text', text: `Error: ${(e as Error).message}` }], isError: true };
    }
  },
);

// ── 4. Demographics ─────────────────────────────────────────────────────────

server.tool(
  'get_demographics',
  'YouTube audience demographics: viewerPercentage breakdown by ageGroup and gender.',
  {
    startDate: z.string().optional().describe('Start date (YYYY-MM-DD). Default: 28 days ago.'),
    endDate: z.string().optional().describe('End date (YYYY-MM-DD). Default: today.'),
  },
  async (params) => {
    try {
      const defaults = defaultDates();
      const res = await youtubeAnalytics.reports.query({
        ids: 'channel==MINE',
        startDate: params.startDate || defaults.startDate,
        endDate: params.endDate || defaults.endDate,
        metrics: 'viewerPercentage',
        dimensions: 'ageGroup,gender',
      });
      return { content: [{ type: 'text', text: JSON.stringify(res.data, null, 2) }] };
    } catch (e) {
      return { content: [{ type: 'text', text: `Error: ${(e as Error).message}` }], isError: true };
    }
  },
);

// ── 5. Geography ────────────────────────────────────────────────────────────

server.tool(
  'get_geography',
  'YouTube performance by country: views, estimatedMinutesWatched, averageViewDuration, subscribersGained.',
  {
    startDate: z.string().optional().describe('Start date (YYYY-MM-DD). Default: 28 days ago.'),
    endDate: z.string().optional().describe('End date (YYYY-MM-DD). Default: today.'),
    maxResults: z.string().optional().describe('Max countries to return (default 25)'),
  },
  async (params) => {
    try {
      const defaults = defaultDates();
      const res = await youtubeAnalytics.reports.query({
        ids: 'channel==MINE',
        startDate: params.startDate || defaults.startDate,
        endDate: params.endDate || defaults.endDate,
        metrics: 'views,estimatedMinutesWatched,averageViewDuration,subscribersGained',
        dimensions: 'country',
        sort: '-views',
        maxResults: parseInt(params.maxResults || '25', 10),
      });
      return { content: [{ type: 'text', text: JSON.stringify(res.data, null, 2) }] };
    } catch (e) {
      return { content: [{ type: 'text', text: `Error: ${(e as Error).message}` }], isError: true };
    }
  },
);

// ── 6. Device Analytics ─────────────────────────────────────────────────────

server.tool(
  'get_device_analytics',
  'YouTube performance by device type: DESKTOP, MOBILE, TABLET, TV, GAME_CONSOLE.',
  {
    startDate: z.string().optional().describe('Start date (YYYY-MM-DD). Default: 28 days ago.'),
    endDate: z.string().optional().describe('End date (YYYY-MM-DD). Default: today.'),
  },
  async (params) => {
    try {
      const defaults = defaultDates();
      const res = await youtubeAnalytics.reports.query({
        ids: 'channel==MINE',
        startDate: params.startDate || defaults.startDate,
        endDate: params.endDate || defaults.endDate,
        metrics: 'views,estimatedMinutesWatched',
        dimensions: 'deviceType',
        sort: '-views',
      });
      return { content: [{ type: 'text', text: JSON.stringify(res.data, null, 2) }] };
    } catch (e) {
      return { content: [{ type: 'text', text: `Error: ${(e as Error).message}` }], isError: true };
    }
  },
);

// ── 7. Video List ───────────────────────────────────────────────────────────

server.tool(
  'get_video_list',
  'List recent YouTube videos with metadata and statistics (viewCount, likeCount, commentCount, duration).',
  {
    maxResults: z.string().optional().describe('Number of videos (default 25, max 50)'),
    pageToken: z.string().optional().describe('Pagination token for next page'),
  },
  async (params) => {
    try {
      // First get the uploads playlist
      const channelRes = await youtube.channels.list({
        part: ['contentDetails'],
        mine: true,
      });
      const uploadsPlaylistId = channelRes.data.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
      if (!uploadsPlaylistId) throw new Error('Could not find uploads playlist');

      // Get videos from uploads playlist
      const playlistRes = await youtube.playlistItems.list({
        part: ['snippet', 'contentDetails'],
        playlistId: uploadsPlaylistId,
        maxResults: parseInt(params.maxResults || '25', 10),
        pageToken: params.pageToken || undefined,
      });

      // Get detailed stats for each video
      const videoIds = playlistRes.data.items?.map(i => i.contentDetails?.videoId).filter(Boolean) as string[];
      if (videoIds.length === 0) {
        return { content: [{ type: 'text', text: JSON.stringify({ items: [], totalResults: 0 }, null, 2) }] };
      }

      const videoRes = await youtube.videos.list({
        part: ['snippet', 'statistics', 'contentDetails'],
        id: videoIds,
      });

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            items: videoRes.data.items,
            nextPageToken: playlistRes.data.nextPageToken,
            totalResults: playlistRes.data.pageInfo?.totalResults,
          }, null, 2),
        }],
      };
    } catch (e) {
      return { content: [{ type: 'text', text: `Error: ${(e as Error).message}` }], isError: true };
    }
  },
);

// ── 8. Video Analytics ──────────────────────────────────────────────────────

server.tool(
  'get_video_analytics',
  'Get analytics for specific video(s): views, estimatedMinutesWatched, averageViewDuration, likes, comments, shares, subscribersGained.',
  {
    videoId: z.string().describe('YouTube video ID (or comma-separated IDs)'),
    startDate: z.string().optional().describe('Start date (YYYY-MM-DD). Default: 28 days ago.'),
    endDate: z.string().optional().describe('End date (YYYY-MM-DD). Default: today.'),
    metrics: z.string().optional().describe('Comma-separated metrics. Default: views,estimatedMinutesWatched,averageViewDuration,likes,comments,shares,subscribersGained'),
  },
  async (params) => {
    try {
      const defaults = defaultDates();
      const res = await youtubeAnalytics.reports.query({
        ids: 'channel==MINE',
        startDate: params.startDate || defaults.startDate,
        endDate: params.endDate || defaults.endDate,
        metrics: params.metrics || 'views,estimatedMinutesWatched,averageViewDuration,likes,comments,shares,subscribersGained',
        filters: `video==${params.videoId}`,
        dimensions: 'video',
      });
      return { content: [{ type: 'text', text: JSON.stringify(res.data, null, 2) }] };
    } catch (e) {
      return { content: [{ type: 'text', text: `Error: ${(e as Error).message}` }], isError: true };
    }
  },
);

// ── 9. Top Videos ───────────────────────────────────────────────────────────

server.tool(
  'get_top_videos',
  'Ranked list of best-performing YouTube videos by views, watch time, or subscribers gained.',
  {
    startDate: z.string().optional().describe('Start date (YYYY-MM-DD). Default: 28 days ago.'),
    endDate: z.string().optional().describe('End date (YYYY-MM-DD). Default: today.'),
    maxResults: z.string().optional().describe('Number of results (default 10, max 200)'),
    sortBy: z.string().optional().describe('Sort by: views, estimatedMinutesWatched, subscribersGained. Default: views'),
  },
  async (params) => {
    try {
      const defaults = defaultDates();
      const sortMetric = params.sortBy || 'views';
      const res = await youtubeAnalytics.reports.query({
        ids: 'channel==MINE',
        startDate: params.startDate || defaults.startDate,
        endDate: params.endDate || defaults.endDate,
        metrics: 'views,estimatedMinutesWatched,averageViewDuration,likes,comments,shares,subscribersGained',
        dimensions: 'video',
        sort: `-${sortMetric}`,
        maxResults: parseInt(params.maxResults || '10', 10),
      });

      // Enrich with video titles
      const rows = res.data.rows;
      if (rows && rows.length > 0) {
        const videoIds = rows.map((r: unknown[]) => r[0] as string);
        const videoRes = await youtube.videos.list({
          part: ['snippet'],
          id: videoIds,
        });
        const titleMap = new Map<string, string>();
        videoRes.data.items?.forEach(v => {
          if (v.id && v.snippet?.title) titleMap.set(v.id, v.snippet.title);
        });

        // Add title as first column
        const enrichedRows = rows.map((r: unknown[]) => ({
          videoId: r[0],
          title: titleMap.get(r[0] as string) || 'Unknown',
          views: r[1],
          estimatedMinutesWatched: r[2],
          averageViewDuration: r[3],
          likes: r[4],
          comments: r[5],
          shares: r[6],
          subscribersGained: r[7],
        }));

        return { content: [{ type: 'text', text: JSON.stringify(enrichedRows, null, 2) }] };
      }

      return { content: [{ type: 'text', text: JSON.stringify(res.data, null, 2) }] };
    } catch (e) {
      return { content: [{ type: 'text', text: `Error: ${(e as Error).message}` }], isError: true };
    }
  },
);

// ── 10. Audience Retention ──────────────────────────────────────────────────

server.tool(
  'get_audience_retention',
  'Viewer retention curve for a specific video. Shows what percentage of viewers are watching at each point. Only supports single video per request.',
  {
    videoId: z.string().describe('Single YouTube video ID'),
  },
  async (params) => {
    try {
      const res = await youtubeAnalytics.reports.query({
        ids: 'channel==MINE',
        startDate: '2010-01-01',
        endDate: new Date().toISOString().split('T')[0],
        metrics: 'audienceWatchRatio,relativeRetentionPerformance',
        dimensions: 'elapsedVideoTimeRatio',
        filters: `video==${params.videoId}`,
      });
      return { content: [{ type: 'text', text: JSON.stringify(res.data, null, 2) }] };
    } catch (e) {
      return { content: [{ type: 'text', text: `Error: ${(e as Error).message}` }], isError: true };
    }
  },
);

// ── 11. Subscriber Activity ─────────────────────────────────────────────────

server.tool(
  'get_subscriber_activity',
  'Subscriber gains and losses over time. Shows daily subscribersGained and subscribersLost.',
  {
    startDate: z.string().optional().describe('Start date (YYYY-MM-DD). Default: 28 days ago.'),
    endDate: z.string().optional().describe('End date (YYYY-MM-DD). Default: today.'),
  },
  async (params) => {
    try {
      const defaults = defaultDates();
      const res = await youtubeAnalytics.reports.query({
        ids: 'channel==MINE',
        startDate: params.startDate || defaults.startDate,
        endDate: params.endDate || defaults.endDate,
        metrics: 'subscribersGained,subscribersLost',
        dimensions: 'day',
      });
      return { content: [{ type: 'text', text: JSON.stringify(res.data, null, 2) }] };
    } catch (e) {
      return { content: [{ type: 'text', text: `Error: ${(e as Error).message}` }], isError: true };
    }
  },
);

// ── 12. Content Type Analytics ──────────────────────────────────────────────

server.tool(
  'get_content_type_analytics',
  'Performance by content type: SHORTS, VIDEO_ON_DEMAND, LIVE_STREAM. Shows views and watch time per type.',
  {
    startDate: z.string().optional().describe('Start date (YYYY-MM-DD). Default: 28 days ago.'),
    endDate: z.string().optional().describe('End date (YYYY-MM-DD). Default: today.'),
    metrics: z.string().optional().describe('Metrics. Default: views,estimatedMinutesWatched,averageViewDuration'),
  },
  async (params) => {
    try {
      const defaults = defaultDates();
      const res = await youtubeAnalytics.reports.query({
        ids: 'channel==MINE',
        startDate: params.startDate || defaults.startDate,
        endDate: params.endDate || defaults.endDate,
        metrics: params.metrics || 'views,estimatedMinutesWatched,averageViewDuration',
        dimensions: 'creatorContentType',
      });
      return { content: [{ type: 'text', text: JSON.stringify(res.data, null, 2) }] };
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
