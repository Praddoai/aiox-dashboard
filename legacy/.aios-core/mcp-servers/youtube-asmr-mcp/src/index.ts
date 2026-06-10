#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { google } from 'googleapis';
import fs from 'node:fs';
import path from 'node:path';

// ── YouTube ASMR Channel MCP ────────────────────────────────────────────────
//
// Full management MCP for the ASMR Shorts channel:
//   - Upload Shorts (video + metadata)
//   - Set custom thumbnails
//   - Schedule publishing
//   - Manage playlists
//   - Read analytics
//
// Auth: OAuth2 with refresh token (upload + management scopes)

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.YOUTUBE_ASMR_REFRESH_TOKEN;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('Error: GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are required.');
  process.exit(1);
}

if (!REFRESH_TOKEN) {
  console.error('Error: YOUTUBE_ASMR_REFRESH_TOKEN is required.');
  console.error('Run: cd .aios-core/mcp-servers/youtube-asmr-mcp && npm run build && npm run auth');
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET);
oauth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });

const youtube = google.youtube({ version: 'v3', auth: oauth2Client });
const youtubeAnalytics = google.youtubeAnalytics({ version: 'v2', auth: oauth2Client });

// Cache channel ID
let cachedChannelId: string | null = process.env.YOUTUBE_ASMR_CHANNEL_ID || null;

async function getChannelId(): Promise<string> {
  if (cachedChannelId) return cachedChannelId;
  const res = await youtube.channels.list({ part: ['id'], mine: true });
  const id = res.data.items?.[0]?.id;
  if (!id) throw new Error('No YouTube channel found for authenticated ASMR account');
  cachedChannelId = id;
  return id;
}

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
  { name: 'youtube-asmr-mcp', version: '1.0.0' },
  { capabilities: { tools: {} } },
);

// ═══════════════════════════════════════════════════════════════════════════
// UPLOAD & PUBLISHING TOOLS
// ═══════════════════════════════════════════════════════════════════════════

// ── 1. Upload Short ─────────────────────────────────────────────────────────

server.tool(
  'upload_short',
  'Upload a YouTube Short video file with metadata. Automatically adds #Shorts tag. Video must be <= 60s and 9:16 aspect ratio.',
  {
    filePath: z.string().describe('Absolute path to the video file (mp4, webm, mov)'),
    title: z.string().describe('Video title (max 100 chars). Will auto-append #Shorts if missing.'),
    description: z.string().optional().describe('Video description with hashtags and CTA'),
    tags: z.array(z.string()).optional().describe('Tags array (max 500 chars total)'),
    categoryId: z.string().optional().describe('YouTube category ID. Default: 22 (People & Blogs)'),
    privacyStatus: z.enum(['public', 'unlisted', 'private']).optional().describe('Privacy status. Default: private'),
    publishAt: z.string().optional().describe('ISO 8601 datetime for scheduled publish (e.g., 2026-02-15T17:00:00Z). Requires privacyStatus=private.'),
    language: z.string().optional().describe('Video language code (e.g., en, pt). Default: en'),
  },
  async (params) => {
    try {
      // Validate file exists
      if (!fs.existsSync(params.filePath)) {
        return {
          content: [{ type: 'text', text: `Error: File not found: ${params.filePath}` }],
          isError: true,
        };
      }

      const fileStream = fs.createReadStream(params.filePath);
      const fileSize = fs.statSync(params.filePath).size;

      // Auto-add #Shorts to title if missing
      let title = params.title;
      if (!title.includes('#Shorts') && !title.includes('#shorts')) {
        title = title.length <= 92 ? `${title} #Shorts` : title;
      }

      // Auto-add #Shorts to description if missing
      let description = params.description || '';
      if (!description.includes('#Shorts') && !description.includes('#shorts')) {
        description += '\n\n#Shorts';
      }

      const isScheduled = !!params.publishAt;

      const res = await youtube.videos.insert({
        part: ['snippet', 'status'],
        notifySubscribers: !isScheduled, // Don't notify for scheduled
        requestBody: {
          snippet: {
            title,
            description,
            tags: params.tags || [],
            categoryId: params.categoryId || '22',
            defaultLanguage: params.language || 'en',
          },
          status: {
            privacyStatus: isScheduled ? 'private' : (params.privacyStatus || 'private'),
            publishAt: params.publishAt || undefined,
            selfDeclaredMadeForKids: false,
            embeddable: true,
          },
        },
        media: {
          body: fileStream,
        },
      });

      const videoId = res.data.id;
      const sizeMB = (fileSize / 1024 / 1024).toFixed(2);

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            videoId,
            title: res.data.snippet?.title,
            status: res.data.status?.privacyStatus,
            publishAt: res.data.status?.publishAt || null,
            uploadStatus: res.data.status?.uploadStatus,
            fileSizeMB: sizeMB,
            url: `https://youtube.com/shorts/${videoId}`,
            studioUrl: `https://studio.youtube.com/video/${videoId}/edit`,
          }, null, 2),
        }],
      };
    } catch (e) {
      return {
        content: [{ type: 'text', text: `Upload error: ${(e as Error).message}` }],
        isError: true,
      };
    }
  },
);

// ── 2. Set Custom Thumbnail ─────────────────────────────────────────────────

server.tool(
  'set_thumbnail',
  'Set a custom thumbnail image for a YouTube video. Image should be 1280x720 (16:9) or 768x1344 (9:16 for Shorts). Max 2MB, JPG/PNG.',
  {
    videoId: z.string().describe('YouTube video ID'),
    imagePath: z.string().describe('Absolute path to the thumbnail image (jpg/png)'),
  },
  async (params) => {
    try {
      if (!fs.existsSync(params.imagePath)) {
        return {
          content: [{ type: 'text', text: `Error: Image not found: ${params.imagePath}` }],
          isError: true,
        };
      }

      const imageStream = fs.createReadStream(params.imagePath);
      const ext = path.extname(params.imagePath).toLowerCase();
      const mimeType = ext === '.png' ? 'image/png' : 'image/jpeg';

      const res = await youtube.thumbnails.set({
        videoId: params.videoId,
        media: {
          mimeType,
          body: imageStream,
        },
      });

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            videoId: params.videoId,
            thumbnails: res.data.items?.[0]?.default,
          }, null, 2),
        }],
      };
    } catch (e) {
      return {
        content: [{ type: 'text', text: `Thumbnail error: ${(e as Error).message}` }],
        isError: true,
      };
    }
  },
);

// ── 3. Update Video Metadata ────────────────────────────────────────────────

server.tool(
  'update_video',
  'Update metadata for an existing YouTube video: title, description, tags, category, privacy status.',
  {
    videoId: z.string().describe('YouTube video ID'),
    title: z.string().optional().describe('New title'),
    description: z.string().optional().describe('New description'),
    tags: z.array(z.string()).optional().describe('New tags array'),
    categoryId: z.string().optional().describe('New category ID'),
    privacyStatus: z.enum(['public', 'unlisted', 'private']).optional().describe('New privacy status'),
  },
  async (params) => {
    try {
      // First get current video data
      const current = await youtube.videos.list({
        part: ['snippet', 'status'],
        id: [params.videoId],
      });

      const video = current.data.items?.[0];
      if (!video) {
        return {
          content: [{ type: 'text', text: `Error: Video not found: ${params.videoId}` }],
          isError: true,
        };
      }

      // Merge updates with current data
      const snippet = video.snippet || {};
      const status = video.status || {};

      const updateParts: string[] = [];
      const requestBody: Record<string, unknown> = { id: params.videoId };

      if (params.title || params.description || params.tags || params.categoryId) {
        updateParts.push('snippet');
        requestBody.snippet = {
          title: params.title || snippet.title,
          description: params.description !== undefined ? params.description : snippet.description,
          tags: params.tags || snippet.tags,
          categoryId: params.categoryId || snippet.categoryId,
        };
      }

      if (params.privacyStatus) {
        updateParts.push('status');
        requestBody.status = {
          privacyStatus: params.privacyStatus,
          selfDeclaredMadeForKids: status.selfDeclaredMadeForKids || false,
          embeddable: true,
        };
      }

      if (updateParts.length === 0) {
        return {
          content: [{ type: 'text', text: 'No fields to update. Provide at least one field.' }],
          isError: true,
        };
      }

      const res = await youtube.videos.update({
        part: updateParts,
        requestBody: requestBody as any,
      });

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            videoId: res.data.id,
            title: res.data.snippet?.title,
            privacyStatus: res.data.status?.privacyStatus,
          }, null, 2),
        }],
      };
    } catch (e) {
      return {
        content: [{ type: 'text', text: `Update error: ${(e as Error).message}` }],
        isError: true,
      };
    }
  },
);

// ── 4. Delete Video ─────────────────────────────────────────────────────────

server.tool(
  'delete_video',
  'Delete a YouTube video permanently. Use with caution.',
  {
    videoId: z.string().describe('YouTube video ID to delete'),
  },
  async (params) => {
    try {
      await youtube.videos.delete({ id: params.videoId });
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ success: true, deleted: params.videoId }, null, 2),
        }],
      };
    } catch (e) {
      return {
        content: [{ type: 'text', text: `Delete error: ${(e as Error).message}` }],
        isError: true,
      };
    }
  },
);

// ═══════════════════════════════════════════════════════════════════════════
// CHANNEL & VIDEO MANAGEMENT TOOLS
// ═══════════════════════════════════════════════════════════════════════════

// ── 5. Get Channel Info ─────────────────────────────────────────────────────

server.tool(
  'get_channel_info',
  'Get ASMR YouTube channel profile: title, description, subscriberCount, viewCount, videoCount, thumbnails.',
  {},
  async () => {
    try {
      const res = await youtube.channels.list({
        part: ['snippet', 'statistics', 'brandingSettings', 'contentDetails', 'status'],
        mine: true,
      });
      return { content: [{ type: 'text', text: JSON.stringify(res.data, null, 2) }] };
    } catch (e) {
      return { content: [{ type: 'text', text: `Error: ${(e as Error).message}` }], isError: true };
    }
  },
);

// ── 6. List Videos ──────────────────────────────────────────────────────────

server.tool(
  'list_videos',
  'List uploaded videos on the ASMR channel with metadata and statistics.',
  {
    maxResults: z.union([z.string(), z.number()]).optional().describe('Number of videos (default 25, max 50)'),
    pageToken: z.string().optional().describe('Pagination token'),
  },
  async (params) => {
    try {
      const channelRes = await youtube.channels.list({
        part: ['contentDetails'],
        mine: true,
      });
      const uploadsPlaylistId = channelRes.data.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
      if (!uploadsPlaylistId) throw new Error('Could not find uploads playlist');

      const maxResults = parseInt(String(params.maxResults || '25'), 10);

      const playlistRes = await youtube.playlistItems.list({
        part: ['snippet', 'contentDetails'],
        playlistId: uploadsPlaylistId,
        maxResults,
        pageToken: params.pageToken || undefined,
      });

      const videoIds = playlistRes.data.items
        ?.map(i => i.contentDetails?.videoId)
        .filter(Boolean) as string[];

      if (!videoIds || videoIds.length === 0) {
        return { content: [{ type: 'text', text: JSON.stringify({ items: [], totalResults: 0 }, null, 2) }] };
      }

      const videoRes = await youtube.videos.list({
        part: ['snippet', 'statistics', 'contentDetails', 'status'],
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

// ── 7. Get Video Details ────────────────────────────────────────────────────

server.tool(
  'get_video_details',
  'Get full details for a specific video: snippet, statistics, status, processing details.',
  {
    videoId: z.string().describe('YouTube video ID'),
  },
  async (params) => {
    try {
      const res = await youtube.videos.list({
        part: ['snippet', 'statistics', 'contentDetails', 'status', 'processingDetails'],
        id: [params.videoId],
      });

      if (!res.data.items || res.data.items.length === 0) {
        return {
          content: [{ type: 'text', text: `Video not found: ${params.videoId}` }],
          isError: true,
        };
      }

      return { content: [{ type: 'text', text: JSON.stringify(res.data.items[0], null, 2) }] };
    } catch (e) {
      return { content: [{ type: 'text', text: `Error: ${(e as Error).message}` }], isError: true };
    }
  },
);

// ═══════════════════════════════════════════════════════════════════════════
// PLAYLIST TOOLS
// ═══════════════════════════════════════════════════════════════════════════

// ── 8. Create Playlist ──────────────────────────────────────────────────────

server.tool(
  'create_playlist',
  'Create a new playlist on the ASMR channel for organizing Shorts by series/category.',
  {
    title: z.string().describe('Playlist title'),
    description: z.string().optional().describe('Playlist description'),
    privacyStatus: z.enum(['public', 'unlisted', 'private']).optional().describe('Privacy. Default: public'),
  },
  async (params) => {
    try {
      const res = await youtube.playlists.insert({
        part: ['snippet', 'status'],
        requestBody: {
          snippet: {
            title: params.title,
            description: params.description || '',
          },
          status: {
            privacyStatus: params.privacyStatus || 'public',
          },
        },
      });

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            playlistId: res.data.id,
            title: res.data.snippet?.title,
            url: `https://www.youtube.com/playlist?list=${res.data.id}`,
          }, null, 2),
        }],
      };
    } catch (e) {
      return { content: [{ type: 'text', text: `Error: ${(e as Error).message}` }], isError: true };
    }
  },
);

// ── 9. Add Video to Playlist ────────────────────────────────────────────────

server.tool(
  'add_to_playlist',
  'Add a video to a playlist.',
  {
    playlistId: z.string().describe('Playlist ID'),
    videoId: z.string().describe('Video ID to add'),
    position: z.number().optional().describe('Position in playlist (0-based). Default: end of list.'),
  },
  async (params) => {
    try {
      const res = await youtube.playlistItems.insert({
        part: ['snippet'],
        requestBody: {
          snippet: {
            playlistId: params.playlistId,
            resourceId: {
              kind: 'youtube#video',
              videoId: params.videoId,
            },
            position: params.position,
          },
        },
      });

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            playlistItemId: res.data.id,
            playlistId: params.playlistId,
            videoId: params.videoId,
          }, null, 2),
        }],
      };
    } catch (e) {
      return { content: [{ type: 'text', text: `Error: ${(e as Error).message}` }], isError: true };
    }
  },
);

// ═══════════════════════════════════════════════════════════════════════════
// ANALYTICS TOOLS
// ═══════════════════════════════════════════════════════════════════════════

// ── 10. Channel Analytics ───────────────────────────────────────────────────

server.tool(
  'get_channel_analytics',
  'Get ASMR channel analytics: views, watch time, likes, comments, shares, subscriber changes.',
  {
    startDate: z.string().optional().describe('Start date (YYYY-MM-DD). Default: 28 days ago.'),
    endDate: z.string().optional().describe('End date (YYYY-MM-DD). Default: today.'),
    dimensions: z.string().optional().describe('Grouping: day, month. Default: day'),
  },
  async (params) => {
    try {
      const defaults = defaultDates();
      const res = await youtubeAnalytics.reports.query({
        ids: 'channel==MINE',
        startDate: params.startDate || defaults.startDate,
        endDate: params.endDate || defaults.endDate,
        metrics: 'views,estimatedMinutesWatched,averageViewDuration,likes,comments,shares,subscribersGained,subscribersLost',
        dimensions: params.dimensions || 'day',
      });
      return { content: [{ type: 'text', text: JSON.stringify(res.data, null, 2) }] };
    } catch (e) {
      return { content: [{ type: 'text', text: `Error: ${(e as Error).message}` }], isError: true };
    }
  },
);

// ── 11. Video Analytics ─────────────────────────────────────────────────────

server.tool(
  'get_video_analytics',
  'Get analytics for specific video(s): views, watch time, retention, likes, comments, shares.',
  {
    videoId: z.string().describe('YouTube video ID (or comma-separated IDs)'),
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
        metrics: 'views,estimatedMinutesWatched,averageViewDuration,likes,comments,shares,subscribersGained',
        filters: `video==${params.videoId}`,
        dimensions: 'video',
      });
      return { content: [{ type: 'text', text: JSON.stringify(res.data, null, 2) }] };
    } catch (e) {
      return { content: [{ type: 'text', text: `Error: ${(e as Error).message}` }], isError: true };
    }
  },
);

// ── 12. Top Shorts ──────────────────────────────────────────────────────────

server.tool(
  'get_top_shorts',
  'Ranked list of best-performing Shorts by views or watch time. Enriched with video titles.',
  {
    startDate: z.string().optional().describe('Start date (YYYY-MM-DD). Default: 28 days ago.'),
    endDate: z.string().optional().describe('End date (YYYY-MM-DD). Default: today.'),
    maxResults: z.union([z.string(), z.number()]).optional().describe('Number of results (default 10)'),
    sortBy: z.string().optional().describe('Sort by: views, estimatedMinutesWatched. Default: views'),
  },
  async (params) => {
    try {
      const defaults = defaultDates();
      const sortMetric = params.sortBy || 'views';
      const maxResults = parseInt(String(params.maxResults || '10'), 10);

      const res = await youtubeAnalytics.reports.query({
        ids: 'channel==MINE',
        startDate: params.startDate || defaults.startDate,
        endDate: params.endDate || defaults.endDate,
        metrics: 'views,estimatedMinutesWatched,averageViewDuration,likes,comments,shares,subscribersGained',
        dimensions: 'video',
        filters: 'creatorContentType==SHORTS',
        sort: `-${sortMetric}`,
        maxResults,
      });

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
          url: `https://youtube.com/shorts/${r[0]}`,
        }));

        return { content: [{ type: 'text', text: JSON.stringify(enrichedRows, null, 2) }] };
      }

      return { content: [{ type: 'text', text: JSON.stringify({ items: [], message: 'No Shorts data for this period' }, null, 2) }] };
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
