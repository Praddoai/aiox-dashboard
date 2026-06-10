#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { readFileSync, existsSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';

// ── Config ───────────────────────────────────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = process.env.BLOTATO_MCP_PROJECT_ROOT || join(__dirname, '../../..');

const BLOTATO_KEY = process.env.BLOTATO_API_KEY;
const BLOTATO_BASE = 'https://backend.blotato.com/v2';

const VAULT_SERVICES = join(PROJECT_ROOT, '.aios-core/vault/services.yaml');
const CAMPAIGNS_DIR = join(PROJECT_ROOT, '.aios-core/data/campaigns');
const STATE_DIR = join(PROJECT_ROOT, '.aios-core/scripts/state');

if (!BLOTATO_KEY) {
  console.error('Error: BLOTATO_API_KEY is required.');
  process.exit(1);
}

// ── Rate Limiter ─────────────────────────────────────────────────────────────

let lastScheduleCall = 0;
const SCHEDULE_COOLDOWN_MS = 16_000; // 16s between schedule calls
const STATUS_COOLDOWN_MS = 1_050;    // ~60 req/min for status checks
let lastStatusCall = 0;

async function waitForScheduleSlot(): Promise<void> {
  const elapsed = Date.now() - lastScheduleCall;
  if (elapsed < SCHEDULE_COOLDOWN_MS) {
    await new Promise(r => setTimeout(r, SCHEDULE_COOLDOWN_MS - elapsed));
  }
  lastScheduleCall = Date.now();
}

async function waitForStatusSlot(): Promise<void> {
  const elapsed = Date.now() - lastStatusCall;
  if (elapsed < STATUS_COOLDOWN_MS) {
    await new Promise(r => setTimeout(r, STATUS_COOLDOWN_MS - elapsed));
  }
  lastStatusCall = Date.now();
}

// ── Blotato API Client ───────────────────────────────────────────────────────

async function blotatoPost(path: string, body: unknown): Promise<unknown> {
  const res = await fetch(`${BLOTATO_BASE}${path}`, {
    method: 'POST',
    headers: {
      'blotato-api-key': BLOTATO_KEY!,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Blotato ${res.status}: ${JSON.stringify(data)}`);
  return data;
}

async function blotatoGet(path: string): Promise<unknown> {
  const res = await fetch(`${BLOTATO_BASE}${path}`, {
    headers: { 'blotato-api-key': BLOTATO_KEY! },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Blotato ${res.status}: ${JSON.stringify(data)}`);
  return data;
}

// ── Vault & Campaign Helpers ─────────────────────────────────────────────────

interface VaultServices {
  blotato?: {
    accounts?: Record<string, {
      id: string;
      pageId?: string;
      boards?: Record<string, { id: string; name: string }>;
    }>;
  };
}

function loadVault(): VaultServices {
  if (!existsSync(VAULT_SERVICES)) {
    throw new Error(`Vault not found: ${VAULT_SERVICES}`);
  }
  return yaml.load(readFileSync(VAULT_SERVICES, 'utf8')) as VaultServices;
}

interface CampaignConfig {
  slug: string;
  name: string;
  process_tag: string;
  media_base_url: string;
  clickup_list_id: string;
  total_posts: number | null;
  platforms: Record<string, { enabled?: boolean; [key: string]: unknown }>;
  scheduling?: Record<string, unknown>;
}

function loadCampaign(slug: string): CampaignConfig {
  const file = join(CAMPAIGNS_DIR, `${slug}.yaml`);
  if (!existsSync(file)) {
    throw new Error(`Campaign not found: ${file}`);
  }
  return yaml.load(readFileSync(file, 'utf8')) as CampaignConfig;
}

function listCampaignSlugs(): string[] {
  if (!existsSync(CAMPAIGNS_DIR)) return [];
  return readdirSync(CAMPAIGNS_DIR)
    .filter(f => f.endsWith('.yaml') && f !== '_template.yaml')
    .map(f => f.replace('.yaml', ''));
}

interface ScheduleState {
  scheduled: Record<string, {
    postSubmissionId: string;
    scheduledAt: string;
    scheduledTimeUTC: string;
  }>;
  media: Record<string, string>;
  lastRun: string | null;
}

function loadScheduleState(slug: string): ScheduleState | null {
  const file = join(STATE_DIR, `blotato-${slug}-state.json`);
  if (!existsSync(file)) return null;
  return JSON.parse(readFileSync(file, 'utf8'));
}

interface SyncState {
  synced: Record<string, { syncedAt: string; urls: Record<string, string | null> }>;
  failed: Record<string, unknown>;
  lastRun: string | null;
  runCount: number;
}

function loadSyncState(slug: string): SyncState | null {
  const file = join(STATE_DIR, `blotato-${slug}-sync-state.json`);
  if (!existsSync(file)) return null;
  return JSON.parse(readFileSync(file, 'utf8'));
}

// ── Platform Defaults ────────────────────────────────────────────────────────

const PLATFORM_DEFAULTS: Record<string, Record<string, unknown>> = {
  instagram: { targetType: 'feed' },
  facebook: { targetType: 'page' },
  tiktok: { targetType: 'post', privacyLevel: 'PUBLIC_TO_EVERYONE' },
  twitter: { targetType: 'tweet' },
  youtube: { targetType: 'regular', privacyStatus: 'public' },
  threads: { targetType: 'post' },
  pinterest: { targetType: 'pin' },
};

// ── MCP Server ───────────────────────────────────────────────────────────────

const server = new McpServer(
  { name: 'blotato-mcp', version: '1.0.0' },
  { capabilities: { tools: {} } },
);

// ── Tool: schedule_post ──────────────────────────────────────────────────────

server.tool(
  'schedule_post',
  'Schedule a social media post via Blotato API. Supports Instagram, Facebook, TikTok, X/Twitter, YouTube, Threads, Pinterest. Rate limited to 1 post per 16 seconds.',
  {
    account_id: z.string().describe('Blotato account ID for the platform (from vault)'),
    platform: z.enum(['instagram', 'facebook', 'tiktok', 'twitter', 'youtube', 'threads', 'pinterest']).describe('Target platform'),
    text: z.string().describe('Post caption/text content'),
    media_urls: z.array(z.string()).optional().describe('Array of public media URLs (images/videos)'),
    scheduled_time: z.string().describe('ISO 8601 UTC datetime for publishing (e.g. 2026-03-05T15:00:00.000Z)'),
    target_overrides: z.record(z.string(), z.unknown()).optional().describe('Override target config (targetType, pageId, boardId, privacyLevel, title, etc.)'),
  },
  async (params) => {
    try {
      await waitForScheduleSlot();

      const target: Record<string, unknown> = {
        targetType: params.platform,
        ...PLATFORM_DEFAULTS[params.platform],
        ...params.target_overrides,
      };

      const body = {
        post: {
          accountId: params.account_id,
          content: {
            text: params.text,
            platform: params.platform,
            mediaUrls: params.media_urls || [],
          },
          target,
        },
        scheduledTime: params.scheduled_time,
      };

      const result = await blotatoPost('/posts', body);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    } catch (e) {
      return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
    }
  },
);

// ── Tool: get_post_status ────────────────────────────────────────────────────

server.tool(
  'get_post_status',
  'Check the status of a scheduled/published post on Blotato. Returns status (in-progress, scheduled, published, failed), publicUrl, errorMessage.',
  {
    post_submission_id: z.string().describe('Blotato post submission ID (UUID from schedule_post response)'),
  },
  async (params) => {
    try {
      await waitForStatusSlot();
      const result = await blotatoGet(`/posts/${params.post_submission_id}`);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    } catch (e) {
      return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
    }
  },
);

// ── Tool: list_accounts ──────────────────────────────────────────────────────

server.tool(
  'list_accounts',
  'List all configured Blotato social media accounts from the vault. Returns account IDs, platform defaults, and Pinterest board mappings.',
  {
    platform: z.enum(['instagram', 'facebook', 'tiktok', 'twitter', 'youtube', 'threads', 'pinterest', 'all']).optional().describe('Filter by platform, or "all" (default)'),
  },
  async (params) => {
    try {
      const vault = loadVault();
      const accounts = vault?.blotato?.accounts;
      if (!accounts) {
        return { content: [{ type: 'text' as const, text: 'No Blotato accounts found in vault.' }] };
      }

      const filterPlatform = params.platform && params.platform !== 'all' ? params.platform : null;
      const result: Record<string, unknown> = {};

      for (const [platform, config] of Object.entries(accounts)) {
        if (filterPlatform && platform !== filterPlatform) continue;
        result[platform] = {
          id: config.id,
          defaults: PLATFORM_DEFAULTS[platform] || {},
          ...(config.pageId ? { pageId: config.pageId } : {}),
          ...(config.boards ? { boards: config.boards } : {}),
        };
      }

      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    } catch (e) {
      return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
    }
  },
);

// ── Tool: list_scheduled_posts ───────────────────────────────────────────────

server.tool(
  'list_scheduled_posts',
  'List all scheduled posts for a campaign from its state file. Shows submission IDs, platforms, and scheduled times.',
  {
    campaign: z.string().describe('Campaign slug (e.g. "viver-de-massagem-mar26", "feed-recorrente")'),
  },
  async (params) => {
    try {
      const state = loadScheduleState(params.campaign);
      if (!state) {
        return { content: [{ type: 'text' as const, text: `No schedule state found for campaign "${params.campaign}".` }] };
      }

      const entries = Object.entries(state.scheduled);
      if (entries.length === 0) {
        return { content: [{ type: 'text' as const, text: `Campaign "${params.campaign}" has no scheduled posts.` }] };
      }

      // Group by task ID
      const groups: Record<string, { platform: string; postSubmissionId: string; scheduledTimeUTC: string }[]> = {};
      for (const [key, value] of entries) {
        const lastUnderscore = key.lastIndexOf('_');
        const taskId = key.slice(0, lastUnderscore);
        const platform = key.slice(lastUnderscore + 1);
        if (!groups[taskId]) groups[taskId] = [];
        groups[taskId].push({
          platform,
          postSubmissionId: value.postSubmissionId,
          scheduledTimeUTC: value.scheduledTimeUTC,
        });
      }

      const summary = {
        campaign: params.campaign,
        totalEntries: entries.length,
        totalTasks: Object.keys(groups).length,
        lastRun: state.lastRun,
        tasks: groups,
      };

      return { content: [{ type: 'text' as const, text: JSON.stringify(summary, null, 2) }] };
    } catch (e) {
      return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
    }
  },
);

// ── Tool: get_campaign_config ────────────────────────────────────────────────

server.tool(
  'get_campaign_config',
  'Load a campaign configuration by slug. Returns platforms, scheduling config, ClickUp list ID, media URL, and more.',
  {
    campaign: z.string().optional().describe('Campaign slug. Omit to list all available campaigns.'),
  },
  async (params) => {
    try {
      if (!params.campaign) {
        const slugs = listCampaignSlugs();
        return { content: [{ type: 'text' as const, text: `Available campaigns:\n${slugs.map(s => `  - ${s}`).join('\n')}` }] };
      }

      const config = loadCampaign(params.campaign);
      const enabledPlatforms = Object.entries(config.platforms || {})
        .filter(([, c]) => c?.enabled)
        .map(([p]) => p);

      return { content: [{ type: 'text' as const, text: JSON.stringify({ ...config, enabledPlatforms }, null, 2) }] };
    } catch (e) {
      return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
    }
  },
);

// ── Tool: get_sync_status ────────────────────────────────────────────────────

server.tool(
  'get_sync_status',
  'Check the ClickUp sync status for a campaign. Shows which posts have been synced (published URLs confirmed), which failed, and overall progress.',
  {
    campaign: z.string().describe('Campaign slug'),
  },
  async (params) => {
    try {
      const syncState = loadSyncState(params.campaign);
      if (!syncState) {
        return { content: [{ type: 'text' as const, text: `No sync state found for "${params.campaign}". Run blotato-sync-pipeline.mjs first.` }] };
      }

      const scheduleState = loadScheduleState(params.campaign);
      const totalScheduled = scheduleState
        ? new Set(Object.keys(scheduleState.scheduled).map(k => k.slice(0, k.lastIndexOf('_')))).size
        : 0;

      const summary = {
        campaign: params.campaign,
        totalScheduledTasks: totalScheduled,
        syncedTasks: Object.keys(syncState.synced).length,
        failedTasks: Object.keys(syncState.failed).length,
        lastRun: syncState.lastRun,
        runCount: syncState.runCount,
        syncedDetails: syncState.synced,
        failedDetails: syncState.failed,
      };

      return { content: [{ type: 'text' as const, text: JSON.stringify(summary, null, 2) }] };
    } catch (e) {
      return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
    }
  },
);

// ── Tool: batch_check_status ─────────────────────────────────────────────────

server.tool(
  'batch_check_status',
  'Check the status of multiple Blotato post submissions at once. Rate limited to ~60 req/min. Returns status for each submission ID.',
  {
    post_submission_ids: z.array(z.string()).describe('Array of Blotato post submission IDs to check'),
  },
  async (params) => {
    try {
      const results: Record<string, unknown> = {};

      for (const id of params.post_submission_ids) {
        await waitForStatusSlot();
        try {
          results[id] = await blotatoGet(`/posts/${id}`);
        } catch (e) {
          results[id] = { error: (e as Error).message };
        }
      }

      return { content: [{ type: 'text' as const, text: JSON.stringify(results, null, 2) }] };
    } catch (e) {
      return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
    }
  },
);

// ── Tool: delete_post ────────────────────────────────────────────────────────

server.tool(
  'delete_post',
  'Delete/cancel a scheduled post on Blotato. Only works for posts that have not been published yet (status: in-progress or scheduled).',
  {
    post_submission_id: z.string().describe('Blotato post submission ID to delete'),
  },
  async (params) => {
    try {
      const res = await fetch(`${BLOTATO_BASE}/posts/${params.post_submission_id}`, {
        method: 'DELETE',
        headers: { 'blotato-api-key': BLOTATO_KEY! },
      });
      const data = await res.json().catch(() => ({ status: res.status }));
      if (!res.ok) throw new Error(`Blotato ${res.status}: ${JSON.stringify(data)}`);
      return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
    } catch (e) {
      return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
    }
  },
);

// ── Start Server ─────────────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
