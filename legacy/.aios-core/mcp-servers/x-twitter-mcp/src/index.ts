#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import crypto from 'crypto';

// ── X/Twitter API Client (v2) ──────────────────────────────────────────────
//
// Docs: https://developer.x.com/en/docs/twitter-api
//
// Auth: OAuth 1.0a (User Context) for tweet creation
//       OAuth 2.0 Bearer Token for read-only endpoints
//
// Free tier: 1,500 reads + 500 posts/month
//
// Requires:
//   - X_API_KEY (Consumer Key)
//   - X_API_SECRET (Consumer Secret)
//   - X_ACCESS_TOKEN (User access token)
//   - X_ACCESS_TOKEN_SECRET (User access token secret)

const API_BASE = 'https://api.x.com/2';

const API_KEY = process.env.X_API_KEY;
const API_SECRET = process.env.X_API_SECRET;
const ACCESS_TOKEN = process.env.X_ACCESS_TOKEN;
const ACCESS_TOKEN_SECRET = process.env.X_ACCESS_TOKEN_SECRET;

if (!API_KEY || !API_SECRET || !ACCESS_TOKEN || !ACCESS_TOKEN_SECRET) {
  console.error('Error: X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, and X_ACCESS_TOKEN_SECRET are required.');
  process.exit(1);
}

// ── OAuth 1.0a Signature ────────────────────────────────────────────────────

function percentEncode(str: string): string {
  return encodeURIComponent(str).replace(/[!'()*]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase());
}

function generateOAuthSignature(
  method: string,
  url: string,
  oauthParams: Record<string, string>,
  queryParams?: Record<string, string>,
): string {
  const allParams: Record<string, string> = { ...oauthParams };
  if (queryParams) {
    for (const [k, v] of Object.entries(queryParams)) {
      if (v) allParams[k] = v;
    }
  }

  const sortedKeys = Object.keys(allParams).sort();
  const paramString = sortedKeys.map(k => `${percentEncode(k)}=${percentEncode(allParams[k])}`).join('&');

  const baseString = `${method.toUpperCase()}&${percentEncode(url)}&${percentEncode(paramString)}`;
  const signingKey = `${percentEncode(API_SECRET!)}&${percentEncode(ACCESS_TOKEN_SECRET!)}`;

  return crypto.createHmac('sha1', signingKey).update(baseString).digest('base64');
}

function getOAuthHeader(method: string, url: string, queryParams?: Record<string, string>): string {
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: API_KEY!,
    oauth_nonce: crypto.randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: ACCESS_TOKEN!,
    oauth_version: '1.0',
  };

  oauthParams.oauth_signature = generateOAuthSignature(method, url, oauthParams, queryParams);

  const headerParts = Object.entries(oauthParams)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${percentEncode(k)}="${percentEncode(v)}"`)
    .join(', ');

  return `OAuth ${headerParts}`;
}

interface TwitterApiResponse {
  data?: unknown;
  includes?: unknown;
  meta?: { result_count?: number; next_token?: string };
  errors?: Array<{ message: string }>;
  [key: string]: unknown;
}

async function twitterApi(
  path: string,
  params?: Record<string, string>,
  method: string = 'GET',
  body?: Record<string, unknown>,
): Promise<TwitterApiResponse> {
  const baseUrl = `${API_BASE}${path}`;
  const url = new URL(baseUrl);

  if (method === 'GET' && params) {
    for (const [k, v] of Object.entries(params)) {
      if (v) url.searchParams.set(k, v);
    }
  }

  const authHeader = getOAuthHeader(method, baseUrl, method === 'GET' ? params : undefined);

  const headers: Record<string, string> = {
    'Authorization': authHeader,
    'Content-Type': 'application/json',
  };

  const fetchOptions: RequestInit = { method, headers };
  if (method !== 'GET' && body) {
    fetchOptions.body = JSON.stringify(body);
  }

  const res = await fetch(url.toString(), fetchOptions);

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`X API error (${res.status}): ${text}`);
  }

  return res.json() as Promise<TwitterApiResponse>;
}

// ── MCP Server ──────────────────────────────────────────────────────────────

const server = new McpServer(
  { name: 'x-twitter-mcp', version: '1.0.0' },
  { capabilities: { tools: {} } },
);

// ── 1. Get Authenticated User ───────────────────────────────────────────────

server.tool(
  'get_me',
  'Get the authenticated X/Twitter user profile: name, username, bio, followers, following, tweet count, verified status.',
  {},
  async () => {
    try {
      const data = await twitterApi('/users/me', {
        'user.fields': 'id,name,username,description,profile_image_url,public_metrics,verified,verified_type,created_at,location,url',
      });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (e) {
      return { content: [{ type: 'text', text: `Error: ${(e as Error).message}` }], isError: true };
    }
  },
);

// ── 2. Get User by Username ─────────────────────────────────────────────────

server.tool(
  'get_user',
  'Look up an X/Twitter user by username.',
  {
    username: z.string().describe('Username without @ prefix'),
  },
  async (params) => {
    try {
      const data = await twitterApi(`/users/by/username/${params.username}`, {
        'user.fields': 'id,name,username,description,profile_image_url,public_metrics,verified,verified_type,created_at,location,url',
      });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (e) {
      return { content: [{ type: 'text', text: `Error: ${(e as Error).message}` }], isError: true };
    }
  },
);

// ── 3. Get User Tweets ──────────────────────────────────────────────────────

server.tool(
  'get_user_tweets',
  'Get recent tweets by a user ID. Includes engagement metrics.',
  {
    user_id: z.string().describe('User ID (numeric)'),
    max_results: z.string().optional().describe('Number of tweets (5-100, default 10)'),
    pagination_token: z.string().optional().describe('Token for next page'),
  },
  async (params) => {
    try {
      const data = await twitterApi(`/users/${params.user_id}/tweets`, {
        'tweet.fields': 'id,text,created_at,public_metrics,source,entities,referenced_tweets,conversation_id',
        'expansions': 'referenced_tweets.id',
        max_results: params.max_results || '10',
        pagination_token: params.pagination_token || '',
      });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (e) {
      return { content: [{ type: 'text', text: `Error: ${(e as Error).message}` }], isError: true };
    }
  },
);

// ── 4. Get Tweet by ID ──────────────────────────────────────────────────────

server.tool(
  'get_tweet',
  'Get a single tweet by ID with full details and metrics.',
  {
    tweet_id: z.string().describe('Tweet ID'),
  },
  async (params) => {
    try {
      const data = await twitterApi(`/tweets/${params.tweet_id}`, {
        'tweet.fields': 'id,text,created_at,public_metrics,source,entities,referenced_tweets,conversation_id,author_id',
        'user.fields': 'id,name,username,profile_image_url,public_metrics',
        'expansions': 'author_id,referenced_tweets.id',
      });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (e) {
      return { content: [{ type: 'text', text: `Error: ${(e as Error).message}` }], isError: true };
    }
  },
);

// ── 5. Search Tweets ────────────────────────────────────────────────────────

server.tool(
  'search_tweets',
  'Search recent tweets (last 7 days) using X/Twitter search query syntax. Free tier: 1,500 reads/month.',
  {
    query: z.string().describe('Search query. Supports operators: from:, to:, is:, has:, #hashtag, @mention, lang:, -exclude'),
    max_results: z.string().optional().describe('Results per page (10-100, default 10)'),
    next_token: z.string().optional().describe('Pagination token for next page'),
    sort_order: z.enum(['recency', 'relevancy']).optional().describe('Sort order. Default: recency'),
  },
  async (params) => {
    try {
      const data = await twitterApi('/tweets/search/recent', {
        query: params.query,
        'tweet.fields': 'id,text,created_at,public_metrics,source,entities,author_id,conversation_id',
        'user.fields': 'id,name,username,public_metrics',
        'expansions': 'author_id',
        max_results: params.max_results || '10',
        next_token: params.next_token || '',
        sort_order: params.sort_order || 'recency',
      });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (e) {
      return { content: [{ type: 'text', text: `Error: ${(e as Error).message}` }], isError: true };
    }
  },
);

// ── 6. Create Tweet ─────────────────────────────────────────────────────────

server.tool(
  'create_tweet',
  'Post a new tweet. Free tier: 500 posts/month. Max 280 characters.',
  {
    text: z.string().describe('Tweet text (max 280 characters)'),
    reply_to: z.string().optional().describe('Tweet ID to reply to'),
    quote_tweet_id: z.string().optional().describe('Tweet ID to quote'),
  },
  async (params) => {
    try {
      const tweetBody: Record<string, unknown> = { text: params.text };
      if (params.reply_to) {
        tweetBody.reply = { in_reply_to_tweet_id: params.reply_to };
      }
      if (params.quote_tweet_id) {
        tweetBody.quote_tweet_id = params.quote_tweet_id;
      }
      const data = await twitterApi('/tweets', undefined, 'POST', tweetBody);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (e) {
      return { content: [{ type: 'text', text: `Error: ${(e as Error).message}` }], isError: true };
    }
  },
);

// ── 7. Delete Tweet ─────────────────────────────────────────────────────────

server.tool(
  'delete_tweet',
  'Delete a tweet by ID. Only works for tweets authored by the authenticated user.',
  {
    tweet_id: z.string().describe('Tweet ID to delete'),
  },
  async (params) => {
    try {
      const data = await twitterApi(`/tweets/${params.tweet_id}`, undefined, 'DELETE');
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (e) {
      return { content: [{ type: 'text', text: `Error: ${(e as Error).message}` }], isError: true };
    }
  },
);

// ── 8. Get User Followers ───────────────────────────────────────────────────

server.tool(
  'get_followers',
  'Get followers of a user by user ID.',
  {
    user_id: z.string().describe('User ID (numeric)'),
    max_results: z.string().optional().describe('Results per page (1-1000, default 100)'),
    pagination_token: z.string().optional().describe('Token for next page'),
  },
  async (params) => {
    try {
      const data = await twitterApi(`/users/${params.user_id}/followers`, {
        'user.fields': 'id,name,username,description,public_metrics,verified',
        max_results: params.max_results || '100',
        pagination_token: params.pagination_token || '',
      });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (e) {
      return { content: [{ type: 'text', text: `Error: ${(e as Error).message}` }], isError: true };
    }
  },
);

// ── 9. Get User Following ───────────────────────────────────────────────────

server.tool(
  'get_following',
  'Get accounts a user is following by user ID.',
  {
    user_id: z.string().describe('User ID (numeric)'),
    max_results: z.string().optional().describe('Results per page (1-1000, default 100)'),
    pagination_token: z.string().optional().describe('Token for next page'),
  },
  async (params) => {
    try {
      const data = await twitterApi(`/users/${params.user_id}/following`, {
        'user.fields': 'id,name,username,description,public_metrics,verified',
        max_results: params.max_results || '100',
        pagination_token: params.pagination_token || '',
      });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (e) {
      return { content: [{ type: 'text', text: `Error: ${(e as Error).message}` }], isError: true };
    }
  },
);

// ── 10. Get Tweet Liking Users ──────────────────────────────────────────────

server.tool(
  'get_liking_users',
  'Get users who liked a specific tweet.',
  {
    tweet_id: z.string().describe('Tweet ID'),
    max_results: z.string().optional().describe('Results per page (1-100, default 100)'),
  },
  async (params) => {
    try {
      const data = await twitterApi(`/tweets/${params.tweet_id}/liking_users`, {
        'user.fields': 'id,name,username,public_metrics',
        max_results: params.max_results || '100',
      });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (e) {
      return { content: [{ type: 'text', text: `Error: ${(e as Error).message}` }], isError: true };
    }
  },
);

// ── 11. Get Tweet Retweeters ────────────────────────────────────────────────

server.tool(
  'get_retweeters',
  'Get users who retweeted a specific tweet.',
  {
    tweet_id: z.string().describe('Tweet ID'),
    max_results: z.string().optional().describe('Results per page (1-100, default 100)'),
  },
  async (params) => {
    try {
      const data = await twitterApi(`/tweets/${params.tweet_id}/retweeted_by`, {
        'user.fields': 'id,name,username,public_metrics',
        max_results: params.max_results || '100',
      });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (e) {
      return { content: [{ type: 'text', text: `Error: ${(e as Error).message}` }], isError: true };
    }
  },
);

// ── 12. Get Trending Topics ─────────────────────────────────────────────────

server.tool(
  'get_trends',
  'Search recent tweets for trending analysis on a topic. Use search_tweets with count aggregation to approximate trending.',
  {
    query: z.string().describe('Topic or hashtag to analyze'),
  },
  async (params) => {
    try {
      const data = await twitterApi('/tweets/counts/recent', {
        query: params.query,
        granularity: 'day',
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
