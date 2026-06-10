#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

// ── Threads API Client (v21.0) ──────────────────────────────────────────────
//
// Threads API uses the Meta Graph API infrastructure.
// Docs: https://developers.facebook.com/docs/threads
//
// Requires:
//   - META_ACCESS_TOKEN with threads_basic, threads_content_publish, threads_manage_insights
//   - THREADS_USER_ID (obtain via GET /me?fields=id using Threads token)

const API_BASE = 'https://graph.threads.net/v1.0';

const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
const THREADS_USER_ID = process.env.THREADS_USER_ID;

if (!ACCESS_TOKEN) {
  console.error('Error: META_ACCESS_TOKEN is required.');
  process.exit(1);
}

if (!THREADS_USER_ID) {
  console.error('Error: THREADS_USER_ID is required.');
  process.exit(1);
}

interface ThreadsApiResponse {
  data?: unknown[];
  paging?: { cursors?: { before?: string; after?: string }; next?: string };
  id?: string;
  [key: string]: unknown;
}

async function threadsApi(path: string, params?: Record<string, string>, method: string = 'GET'): Promise<ThreadsApiResponse> {
  const url = new URL(`${API_BASE}${path}`);
  url.searchParams.set('access_token', ACCESS_TOKEN!);

  if (method === 'GET' && params) {
    for (const [k, v] of Object.entries(params)) {
      if (v) url.searchParams.set(k, v);
    }
  }

  const fetchOptions: RequestInit = { method };
  if (method === 'POST' && params) {
    for (const [k, v] of Object.entries(params)) {
      if (v) url.searchParams.set(k, v);
    }
  }

  const res = await fetch(url.toString(), fetchOptions);

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Threads API error (${res.status}): ${text}`);
  }

  return res.json() as Promise<ThreadsApiResponse>;
}

// ── MCP Server ──────────────────────────────────────────────────────────────

const server = new McpServer(
  { name: 'threads-mcp', version: '1.0.0' },
  { capabilities: { tools: {} } },
);

// ── 1. Get Profile Info ─────────────────────────────────────────────────────

server.tool(
  'get_profile',
  'Get Threads user profile: username, name, bio, profile_picture_url, followers_count.',
  {},
  async () => {
    try {
      const data = await threadsApi(`/${THREADS_USER_ID}`, {
        fields: 'id,username,name,threads_biography,threads_profile_picture_url',
      });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (e) {
      return { content: [{ type: 'text', text: `Error: ${(e as Error).message}` }], isError: true };
    }
  },
);

// ── 2. Get User Threads (Posts) ─────────────────────────────────────────────

server.tool(
  'get_threads',
  'List recent Threads posts for the authenticated user. Returns IDs, text, media, timestamps, permalink.',
  {
    limit: z.string().optional().describe('Number of threads to return (default 25, max 100)'),
    since: z.string().optional().describe('Start date as Unix timestamp'),
    until: z.string().optional().describe('End date as Unix timestamp'),
    after: z.string().optional().describe('Pagination cursor for next page'),
  },
  async (params) => {
    try {
      const data = await threadsApi(`/${THREADS_USER_ID}/threads`, {
        fields: 'id,media_product_type,media_type,media_url,permalink,text,timestamp,shortcode,is_quote_post,has_replies,reply_audience',
        limit: params.limit || '25',
        since: params.since || '',
        until: params.until || '',
        after: params.after || '',
      });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (e) {
      return { content: [{ type: 'text', text: `Error: ${(e as Error).message}` }], isError: true };
    }
  },
);

// ── 3. Get Single Thread Details ────────────────────────────────────────────

server.tool(
  'get_thread',
  'Get details of a single Threads post by ID.',
  {
    thread_id: z.string().describe('The Threads media ID'),
  },
  async (params) => {
    try {
      const data = await threadsApi(`/${params.thread_id}`, {
        fields: 'id,media_product_type,media_type,media_url,permalink,text,timestamp,shortcode,is_quote_post,has_replies,reply_audience,children',
      });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (e) {
      return { content: [{ type: 'text', text: `Error: ${(e as Error).message}` }], isError: true };
    }
  },
);

// ── 4. Get Thread Insights ──────────────────────────────────────────────────

server.tool(
  'get_thread_insights',
  'Get insights for a specific Threads post: views, likes, replies, reposts, quotes.',
  {
    thread_id: z.string().describe('The Threads media ID'),
    metric: z.string().optional().describe('Comma-separated metrics. Available: views,likes,replies,reposts,quotes. Default: views,likes,replies,reposts,quotes'),
  },
  async (params) => {
    try {
      const data = await threadsApi(`/${params.thread_id}/insights`, {
        metric: params.metric || 'views,likes,replies,reposts,quotes',
      });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (e) {
      return { content: [{ type: 'text', text: `Error: ${(e as Error).message}` }], isError: true };
    }
  },
);

// ── 5. Get Account Insights ─────────────────────────────────────────────────

server.tool(
  'get_account_insights',
  'Get Threads account-level insights: views, likes, replies, reposts, quotes, followers_count, follower_demographics. Requires since/until (max 30 days range).',
  {
    metric: z.string().optional().describe('Comma-separated metrics. Available: views,likes,replies,reposts,quotes,followers_count,follower_demographics. Default: views,likes,replies,reposts,quotes,followers_count'),
    since: z.string().optional().describe('Start time as Unix timestamp (required for most metrics)'),
    until: z.string().optional().describe('End time as Unix timestamp'),
  },
  async (params) => {
    try {
      const data = await threadsApi(`/${THREADS_USER_ID}/threads_insights`, {
        metric: params.metric || 'views,likes,replies,reposts,quotes,followers_count',
        since: params.since || '',
        until: params.until || '',
      });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (e) {
      return { content: [{ type: 'text', text: `Error: ${(e as Error).message}` }], isError: true };
    }
  },
);

// ── 6. Create Text Thread ───────────────────────────────────────────────────

server.tool(
  'create_text_thread',
  'Create a new text-only Threads post. Two-step process: creates container then publishes.',
  {
    text: z.string().describe('The text content of the thread (max 500 chars)'),
    reply_control: z.enum(['everyone', 'accounts_you_follow', 'mentioned_only']).optional().describe('Who can reply. Default: everyone'),
  },
  async (params) => {
    try {
      // Step 1: Create media container
      const containerParams: Record<string, string> = {
        media_type: 'TEXT',
        text: params.text,
      };
      if (params.reply_control) {
        containerParams.reply_control = params.reply_control;
      }
      const container = await threadsApi(`/${THREADS_USER_ID}/threads`, containerParams, 'POST');

      if (!container.id) {
        throw new Error('Failed to create thread container');
      }

      // Step 2: Publish the container
      const published = await threadsApi(`/${THREADS_USER_ID}/threads_publish`, {
        creation_id: container.id as string,
      }, 'POST');

      return { content: [{ type: 'text', text: JSON.stringify({ container_id: container.id, published_id: published.id, status: 'published' }, null, 2) }] };
    } catch (e) {
      return { content: [{ type: 'text', text: `Error: ${(e as Error).message}` }], isError: true };
    }
  },
);

// ── 7. Create Image Thread ──────────────────────────────────────────────────

server.tool(
  'create_image_thread',
  'Create a Threads post with an image. Image must be a publicly accessible URL.',
  {
    text: z.string().optional().describe('Caption text (max 500 chars)'),
    image_url: z.string().describe('Publicly accessible image URL (JPEG, PNG)'),
    reply_control: z.enum(['everyone', 'accounts_you_follow', 'mentioned_only']).optional().describe('Who can reply. Default: everyone'),
  },
  async (params) => {
    try {
      const containerParams: Record<string, string> = {
        media_type: 'IMAGE',
        image_url: params.image_url,
      };
      if (params.text) containerParams.text = params.text;
      if (params.reply_control) containerParams.reply_control = params.reply_control;

      const container = await threadsApi(`/${THREADS_USER_ID}/threads`, containerParams, 'POST');

      if (!container.id) throw new Error('Failed to create thread container');

      // Wait briefly for media processing
      await new Promise(resolve => setTimeout(resolve, 3000));

      const published = await threadsApi(`/${THREADS_USER_ID}/threads_publish`, {
        creation_id: container.id as string,
      }, 'POST');

      return { content: [{ type: 'text', text: JSON.stringify({ container_id: container.id, published_id: published.id, status: 'published' }, null, 2) }] };
    } catch (e) {
      return { content: [{ type: 'text', text: `Error: ${(e as Error).message}` }], isError: true };
    }
  },
);

// ── 8. Create Video Thread ──────────────────────────────────────────────────

server.tool(
  'create_video_thread',
  'Create a Threads post with a video. Video must be a publicly accessible URL (MP4, max 5 min).',
  {
    text: z.string().optional().describe('Caption text (max 500 chars)'),
    video_url: z.string().describe('Publicly accessible video URL (MP4, max 5 min)'),
    reply_control: z.enum(['everyone', 'accounts_you_follow', 'mentioned_only']).optional().describe('Who can reply. Default: everyone'),
  },
  async (params) => {
    try {
      const containerParams: Record<string, string> = {
        media_type: 'VIDEO',
        video_url: params.video_url,
      };
      if (params.text) containerParams.text = params.text;
      if (params.reply_control) containerParams.reply_control = params.reply_control;

      const container = await threadsApi(`/${THREADS_USER_ID}/threads`, containerParams, 'POST');

      if (!container.id) throw new Error('Failed to create thread container');

      // Video processing takes longer
      await new Promise(resolve => setTimeout(resolve, 10000));

      const published = await threadsApi(`/${THREADS_USER_ID}/threads_publish`, {
        creation_id: container.id as string,
      }, 'POST');

      return { content: [{ type: 'text', text: JSON.stringify({ container_id: container.id, published_id: published.id, status: 'published' }, null, 2) }] };
    } catch (e) {
      return { content: [{ type: 'text', text: `Error: ${(e as Error).message}` }], isError: true };
    }
  },
);

// ── 9. Create Carousel Thread ───────────────────────────────────────────────

server.tool(
  'create_carousel_thread',
  'Create a Threads carousel post with multiple images/videos. Max 10 items. Each item must be a JSON object with media_type (IMAGE/VIDEO) and url.',
  {
    text: z.string().optional().describe('Caption text (max 500 chars)'),
    items: z.string().describe('JSON array of items: [{"media_type":"IMAGE","url":"https://..."}, ...]. Max 10 items.'),
    reply_control: z.enum(['everyone', 'accounts_you_follow', 'mentioned_only']).optional().describe('Who can reply. Default: everyone'),
  },
  async (params) => {
    try {
      const items = JSON.parse(params.items) as Array<{ media_type: string; url: string }>;
      if (items.length < 2 || items.length > 10) {
        throw new Error('Carousel requires 2-10 items');
      }

      // Step 1: Create individual item containers
      const childIds: string[] = [];
      for (const item of items) {
        const itemParams: Record<string, string> = {
          media_type: item.media_type,
          is_carousel_item: 'true',
        };
        if (item.media_type === 'IMAGE') {
          itemParams.image_url = item.url;
        } else {
          itemParams.video_url = item.url;
        }
        const child = await threadsApi(`/${THREADS_USER_ID}/threads`, itemParams, 'POST');
        if (child.id) childIds.push(child.id as string);
      }

      // Step 2: Create carousel container
      const carouselParams: Record<string, string> = {
        media_type: 'CAROUSEL',
        children: childIds.join(','),
      };
      if (params.text) carouselParams.text = params.text;
      if (params.reply_control) carouselParams.reply_control = params.reply_control;

      const container = await threadsApi(`/${THREADS_USER_ID}/threads`, carouselParams, 'POST');
      if (!container.id) throw new Error('Failed to create carousel container');

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Step 3: Publish
      const published = await threadsApi(`/${THREADS_USER_ID}/threads_publish`, {
        creation_id: container.id as string,
      }, 'POST');

      return { content: [{ type: 'text', text: JSON.stringify({ container_id: container.id, published_id: published.id, child_count: childIds.length, status: 'published' }, null, 2) }] };
    } catch (e) {
      return { content: [{ type: 'text', text: `Error: ${(e as Error).message}` }], isError: true };
    }
  },
);

// ── 10. Get Replies ─────────────────────────────────────────────────────────

server.tool(
  'get_replies',
  'Get replies (conversations) on a specific Threads post.',
  {
    thread_id: z.string().describe('The Threads media ID to get replies for'),
    reverse: z.boolean().optional().describe('Reverse chronological order. Default: false'),
  },
  async (params) => {
    try {
      const endpoint = params.reverse ? 'conversation' : 'replies';
      const data = await threadsApi(`/${params.thread_id}/${endpoint}`, {
        fields: 'id,text,username,permalink,timestamp,media_type,media_url,has_replies,reply_audience,is_quote_post',
      });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (e) {
      return { content: [{ type: 'text', text: `Error: ${(e as Error).message}` }], isError: true };
    }
  },
);

// ── 11. Reply to Thread ─────────────────────────────────────────────────────

server.tool(
  'reply_to_thread',
  'Reply to an existing Threads post.',
  {
    thread_id: z.string().describe('The Threads media ID to reply to'),
    text: z.string().describe('Reply text content (max 500 chars)'),
  },
  async (params) => {
    try {
      const container = await threadsApi(`/${THREADS_USER_ID}/threads`, {
        media_type: 'TEXT',
        text: params.text,
        reply_to_id: params.thread_id,
      }, 'POST');

      if (!container.id) throw new Error('Failed to create reply container');

      const published = await threadsApi(`/${THREADS_USER_ID}/threads_publish`, {
        creation_id: container.id as string,
      }, 'POST');

      return { content: [{ type: 'text', text: JSON.stringify({ container_id: container.id, published_id: published.id, status: 'published' }, null, 2) }] };
    } catch (e) {
      return { content: [{ type: 'text', text: `Error: ${(e as Error).message}` }], isError: true };
    }
  },
);

// ── 12. Get Publishing Limit ────────────────────────────────────────────────

server.tool(
  'get_publishing_limit',
  'Check Threads publishing rate limit. Returns quota_usage and config (max posts within window).',
  {},
  async () => {
    try {
      const data = await threadsApi(`/${THREADS_USER_ID}/threads_publishing_limit`, {
        fields: 'quota_usage,config',
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
