#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

// ── Configuration ───────────────────────────────────────────────────────────

const CLICKUP_TOKEN = process.env.CLICKUP_API_TOKEN;
const N8N_TOKEN = process.env.N8N_API_TOKEN;
const CLICKUP_BASE = 'https://api.clickup.com/api/v2';
const N8N_BASE = 'https://n8n.nataliatanaka.com.br/api/v1';
const N8N_WEBHOOK_BASE = 'https://n8n.nataliatanaka.com.br/webhook';

if (!CLICKUP_TOKEN || !N8N_TOKEN) {
  console.error('Error: CLICKUP_API_TOKEN and N8N_API_TOKEN are required.');
  process.exit(1);
}

// ── Mission Control IDs ─────────────────────────────────────────────────────

const MC = {
  teamId: '9010133626',
  spaceId: '901313156043',
  inboxListId: '901325202828',
  squadFieldId: 'c4ca0674-b10b-496c-8b83-a9b44e6e7750',
};

// Squad → Target List ID routing map
const SQUAD_ROUTES: Record<string, { listId: string; listName: string; folder: string }> = {
  'content-ecosystem': { listId: '901325202831', listName: 'Content Tasks', folder: 'Content Ecosystem' },
  'youtube-lives':     { listId: '901325202832', listName: 'YouTube Lives Tasks', folder: 'Content Ecosystem' },
  'copywriting':       { listId: '901325202836', listName: 'Copy Tasks', folder: 'Copywriting' },
  'creative-studio':   { listId: '901325202839', listName: 'Creative Tasks', folder: 'Creative Studio' },
  'full-stack-dev':    { listId: '901325202841', listName: 'Dev Tasks', folder: 'Full Stack Dev' },
  'aios-core-dev':     { listId: '901325202843', listName: 'AIOS Core Dev Tasks', folder: 'Full Stack Dev' },
  'funnel-creator':    { listId: '901325202844', listName: 'Funnel Tasks', folder: 'Funnel Creator' },
  'media-buy':         { listId: '901325202845', listName: 'Campaign Tasks', folder: 'Media Buy' },
  'data-analytics':    { listId: '901325202847', listName: 'Analytics Tasks', folder: 'Data & Research' },
  'deep-scraper':      { listId: '901325202849', listName: 'Deep Scraper Tasks', folder: 'Data & Research' },
  'sales':             { listId: '901325202851', listName: 'Sales Tasks', folder: 'Sales' },
  'infoproduct-creation': { listId: '901325202854', listName: 'Product Tasks', folder: 'Infoproduct Creation' },
  'design-system':     { listId: '901325202857', listName: 'Design Tasks', folder: 'Design System' },
  'communication-nt':  { listId: '901325202860', listName: 'Communication Tasks', folder: 'Suporte e Comunidade' },
  'community-nt':      { listId: '901325202862', listName: 'Community Tasks', folder: 'Suporte e Comunidade' },
  'strategy-nt':       { listId: '901325202865', listName: 'Strategy Tasks', folder: 'Suporte e Comunidade' },
  'project-management': { listId: '901325202867', listName: 'Project Management Tasks', folder: 'Operations' },
  'devops':            { listId: '901325202868', listName: 'DevOps Tasks', folder: 'Operations' },
  'conselho':          { listId: '901325202871', listName: 'Conselho Tasks', folder: 'Advisory' },
};

// Priority → days offset for due date
const PRIORITY_DAYS: Record<string, number> = {
  '1': 1,  // urgent
  '2': 3,  // high
  '3': 7,  // normal
  '4': 14, // low
};

// ── API Helpers ─────────────────────────────────────────────────────────────

async function clickupApi(path: string, options?: { method?: string; body?: unknown }): Promise<unknown> {
  const res = await fetch(`${CLICKUP_BASE}${path}`, {
    method: options?.method || 'GET',
    headers: {
      'Authorization': CLICKUP_TOKEN!,
      'Content-Type': 'application/json',
    },
    body: options?.body ? JSON.stringify(options.body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ClickUp API error (${res.status} ${path}): ${text}`);
  }
  // DELETE responses may have empty body
  const text = await res.text();
  return text ? JSON.parse(text) : {};
}

async function n8nApi(path: string, options?: { method?: string; body?: unknown }): Promise<unknown> {
  const res = await fetch(`${N8N_BASE}${path}`, {
    method: options?.method || 'GET',
    headers: {
      'X-N8N-API-KEY': N8N_TOKEN!,
      'Content-Type': 'application/json',
    },
    body: options?.body ? JSON.stringify(options.body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`n8n API error (${res.status} ${path}): ${text}`);
  }
  return res.json();
}

// ── n8n Workflow Builders ───────────────────────────────────────────────────
// Note: ClickUp webhooks do NOT include space_id in payload.
// Webhooks are scoped to the MC space at creation time, so no space validation needed.

function buildAutoTriageRouteWorkflow(): object {
  return {
    name: 'MC Auto-Triage + Route',
    nodes: [
      {
        parameters: {
          httpMethod: 'POST',
          path: 'mc-auto/status-changed',
          responseMode: 'onReceived',
          responseCode: 200,
        },
        id: 'a1',
        name: 'Webhook',
        type: 'n8n-nodes-base.webhook',
        typeVersion: 2,
        position: [0, 300],
        webhookId: 'mc-auto-status',
      },
      {
        parameters: {
          jsCode: `
// ClickUp webhook payload: {event, history_items, task_id, team_id, webhook_id}
// Webhook is already scoped to MC space - no need to check space_id
const body = $input.first().json.body || $input.first().json;
const taskId = body.task_id;
if (!taskId) return [{ json: { action: 'skip', reason: 'no task_id' } }];

const historyItems = body.history_items || [];
const statusItem = historyItems.find(h => h.field === 'status');
const newStatus = (statusItem?.after?.status || '').toLowerCase();

if (newStatus !== 'inbox' && newStatus !== 'backlog') {
  return [{ json: { action: 'skip', reason: 'status not inbox/backlog: ' + newStatus } }];
}
return [{ json: { taskId, newStatus } }];
`,
        },
        id: 'a2',
        name: 'Validate & Extract',
        type: 'n8n-nodes-base.code',
        typeVersion: 2,
        position: [240, 300],
      },
      {
        parameters: {
          conditions: {
            options: {},
            combinator: 'and',
            conditions: [{
              leftValue: '={{ $json.taskId }}',
              rightValue: '',
              operator: { type: 'string', operation: 'notEmpty' },
            }],
          },
        },
        id: 'a3',
        name: 'Should Process?',
        type: 'n8n-nodes-base.if',
        typeVersion: 2.2,
        position: [480, 300],
      },
      {
        parameters: {
          method: 'GET',
          url: `=${CLICKUP_BASE}/task/{{ $json.taskId }}`,
          sendHeaders: true,
          headerParameters: {
            parameters: [{ name: 'Authorization', value: CLICKUP_TOKEN! }],
          },
          options: {},
        },
        id: 'a4',
        name: 'Fetch Task',
        type: 'n8n-nodes-base.httpRequest',
        typeVersion: 4.2,
        position: [720, 240],
      },
      {
        parameters: {
          jsCode: `
const task = $input.first().json;
const prevData = $('Validate & Extract').first().json;
const newStatus = prevData.newStatus;
const taskId = task.id;
const listId = task.list?.id || '';

let squadValue = '';
if (task.custom_fields) {
  const squadField = task.custom_fields.find(f => f.id === '${MC.squadFieldId}');
  if (squadField && squadField.type_config?.options) {
    const selectedIdx = squadField.value;
    if (selectedIdx !== null && selectedIdx !== undefined) {
      const selectedOption = squadField.type_config.options.find(o => o.orderindex === selectedIdx);
      if (selectedOption) {
        squadValue = selectedOption.name.toLowerCase().replace(/\\s+/g, '-');
      }
    }
  }
}

const routes = ${JSON.stringify(SQUAD_ROUTES)};
let action = 'none', targetListId = '', targetListName = '';

if (newStatus === 'inbox' && squadValue) {
  action = 'triage';
} else if (newStatus === 'backlog' && squadValue && routes[squadValue]) {
  action = 'route';
  targetListId = routes[squadValue].listId;
  targetListName = routes[squadValue].listName;
}

return [{ json: { action, taskId, taskName: task.name, currentListId: listId, newStatus, squadValue, targetListId, targetListName } }];
`,
        },
        id: 'a5',
        name: 'Process Logic',
        type: 'n8n-nodes-base.code',
        typeVersion: 2,
        position: [960, 240],
      },
      {
        parameters: {
          conditions: {
            options: {},
            combinator: 'and',
            conditions: [{
              leftValue: '={{ $json.action }}',
              rightValue: 'triage',
              operator: { type: 'string', operation: 'equals' },
            }],
          },
        },
        id: 'a6',
        name: 'Is Triage?',
        type: 'n8n-nodes-base.if',
        typeVersion: 2.2,
        position: [1200, 240],
      },
      {
        parameters: {
          method: 'PUT',
          url: `=${CLICKUP_BASE}/task/{{ $json.taskId }}`,
          sendHeaders: true,
          headerParameters: {
            parameters: [{ name: 'Authorization', value: CLICKUP_TOKEN! }],
          },
          sendBody: true,
          specifyBody: 'json',
          jsonBody: '={ "status": "awaiting approval" }',
          options: {},
        },
        id: 'a7',
        name: 'Set Awaiting Approval',
        type: 'n8n-nodes-base.httpRequest',
        typeVersion: 4.2,
        position: [1440, 120],
      },
      {
        parameters: {
          conditions: {
            options: {},
            combinator: 'and',
            conditions: [{
              leftValue: '={{ $json.action }}',
              rightValue: 'route',
              operator: { type: 'string', operation: 'equals' },
            }],
          },
        },
        id: 'a8',
        name: 'Is Route?',
        type: 'n8n-nodes-base.if',
        typeVersion: 2.2,
        position: [1440, 360],
      },
      {
        parameters: {
          method: 'POST',
          url: `=${CLICKUP_BASE}/list/{{ $json.targetListId }}/task/{{ $json.taskId }}`,
          sendHeaders: true,
          headerParameters: {
            parameters: [{ name: 'Authorization', value: CLICKUP_TOKEN! }],
          },
          options: {},
        },
        id: 'a9',
        name: 'Add to Target List',
        type: 'n8n-nodes-base.httpRequest',
        typeVersion: 4.2,
        position: [1680, 300],
      },
      {
        parameters: {
          method: 'DELETE',
          url: `=${CLICKUP_BASE}/list/{{ $("Process Logic").first().json.currentListId }}/task/{{ $("Process Logic").first().json.taskId }}`,
          sendHeaders: true,
          headerParameters: {
            parameters: [{ name: 'Authorization', value: CLICKUP_TOKEN! }],
          },
          options: {},
        },
        id: 'a10',
        name: 'Remove from Old List',
        type: 'n8n-nodes-base.httpRequest',
        typeVersion: 4.2,
        position: [1920, 300],
      },
    ],
    connections: {
      'Webhook': { main: [[{ node: 'Validate & Extract', type: 'main', index: 0 }]] },
      'Validate & Extract': { main: [[{ node: 'Should Process?', type: 'main', index: 0 }]] },
      'Should Process?': { main: [[{ node: 'Fetch Task', type: 'main', index: 0 }], []] },
      'Fetch Task': { main: [[{ node: 'Process Logic', type: 'main', index: 0 }]] },
      'Process Logic': { main: [[{ node: 'Is Triage?', type: 'main', index: 0 }]] },
      'Is Triage?': { main: [[{ node: 'Set Awaiting Approval', type: 'main', index: 0 }], [{ node: 'Is Route?', type: 'main', index: 0 }]] },
      'Is Route?': { main: [[{ node: 'Add to Target List', type: 'main', index: 0 }], []] },
      'Add to Target List': { main: [[{ node: 'Remove from Old List', type: 'main', index: 0 }]] },
    },
    settings: { executionOrder: 'v1' },
  };
}

function buildPriorityDueDateWorkflow(): object {
  return {
    name: 'MC Priority Due Date',
    nodes: [
      {
        parameters: {
          httpMethod: 'POST',
          path: 'mc-auto/priority-changed',
          responseMode: 'onReceived',
          responseCode: 200,
        },
        id: 'b1',
        name: 'Webhook',
        type: 'n8n-nodes-base.webhook',
        typeVersion: 2,
        position: [0, 300],
        webhookId: 'mc-auto-priority',
      },
      {
        parameters: {
          jsCode: `
// ClickUp webhook payload: {event, history_items, task_id, team_id, webhook_id}
// Webhook is already scoped to MC space - no need to check space_id
const body = $input.first().json.body || $input.first().json;
const taskId = body.task_id;

if (!taskId) {
  return [{ json: { action: 'skip', reason: 'no task_id' } }];
}

const historyItems = body.history_items || [];
const priorityItem = historyItems.find(h => h.field === 'priority');
const priorityId = priorityItem?.after?.id || '';

const priorityDays = { '1': 1, '2': 3, '3': 7, '4': 14 };
const daysOffset = priorityDays[priorityId];

if (!daysOffset) {
  return [{ json: { action: 'skip', reason: 'unknown priority: ' + priorityId } }];
}

const due = new Date();
due.setDate(due.getDate() + daysOffset);
due.setHours(18, 0, 0, 0);
const dueDate = due.getTime();

const priorityNames = { '1': 'urgent', '2': 'high', '3': 'normal', '4': 'low' };

return [{ json: { action: 'set_due', taskId, priorityId, priorityName: priorityNames[priorityId], daysOffset, dueDate } }];
`,
        },
        id: 'b2',
        name: 'Calculate Due Date',
        type: 'n8n-nodes-base.code',
        typeVersion: 2,
        position: [280, 300],
      },
      {
        parameters: {
          conditions: {
            options: {},
            combinator: 'and',
            conditions: [
              {
                leftValue: '={{ $json.action }}',
                rightValue: 'set_due',
                operator: { type: 'string', operation: 'equals' },
              },
            ],
          },
        },
        id: 'b3',
        name: 'Should Set?',
        type: 'n8n-nodes-base.if',
        typeVersion: 2.2,
        position: [540, 300],
      },
      {
        parameters: {
          method: 'PUT',
          url: `=${CLICKUP_BASE}/task/{{ $json.taskId }}`,
          sendHeaders: true,
          headerParameters: {
            parameters: [{ name: 'Authorization', value: CLICKUP_TOKEN! }],
          },
          sendBody: true,
          specifyBody: 'json',
          jsonBody: '={{ JSON.stringify({ due_date: $json.dueDate, due_date_time: true }) }}',
          options: {},
        },
        id: 'b4',
        name: 'Set Due Date',
        type: 'n8n-nodes-base.httpRequest',
        typeVersion: 4.2,
        position: [780, 200],
      },
    ],
    connections: {
      'Webhook': { main: [[{ node: 'Calculate Due Date', type: 'main', index: 0 }]] },
      'Calculate Due Date': { main: [[{ node: 'Should Set?', type: 'main', index: 0 }]] },
      'Should Set?': { main: [[{ node: 'Set Due Date', type: 'main', index: 0 }], []] },
    },
    settings: {
      executionOrder: 'v1',
    },
  };
}

// ── MCP Server ──────────────────────────────────────────────────────────────

const server = new McpServer(
  { name: 'mission-control-mcp', version: '1.0.0' },
  { capabilities: { tools: {} } },
);

// ── Tool 1: setup_automations ───────────────────────────────────────────────

server.tool(
  'setup_automations',
  'Create ClickUp webhooks and n8n workflows for all 19 Mission Control automations. Idempotent — safe to run multiple times.',
  {
    force: z.boolean().optional().describe('Force recreate even if webhooks/workflows already exist'),
  },
  async (params) => {
    try {
      const results: string[] = [];

      // Step 1: Check existing webhooks
      const webhooksRes = await clickupApi(`/team/${MC.teamId}/webhook`) as { webhooks: Array<{ id: string; endpoint: string; events: string[]; space_id?: number }> };
      const existingWebhooks = webhooksRes.webhooks || [];

      const statusWebhookUrl = `${N8N_WEBHOOK_BASE}/mc-auto/status-changed`;
      const priorityWebhookUrl = `${N8N_WEBHOOK_BASE}/mc-auto/priority-changed`;

      let statusWebhook = existingWebhooks.find(w => w.endpoint === statusWebhookUrl);
      let priorityWebhook = existingWebhooks.find(w => w.endpoint === priorityWebhookUrl);

      // Step 2: Create status webhook if not exists
      if (!statusWebhook || params.force) {
        if (statusWebhook && params.force) {
          await clickupApi(`/webhook/${statusWebhook.id}`, { method: 'DELETE' });
          results.push(`Deleted existing status webhook ${statusWebhook.id}`);
        }
        const created = await clickupApi(`/team/${MC.teamId}/webhook`, {
          method: 'POST',
          body: {
            endpoint: statusWebhookUrl,
            events: ['taskStatusUpdated'],
            space_id: parseInt(MC.spaceId),
          },
        }) as { webhook: { id: string } };
        statusWebhook = { id: created.webhook.id, endpoint: statusWebhookUrl, events: ['taskStatusUpdated'] };
        results.push(`Created status webhook: ${created.webhook.id}`);
      } else {
        results.push(`Status webhook already exists: ${statusWebhook.id}`);
      }

      // Step 3: Create priority webhook if not exists
      if (!priorityWebhook || params.force) {
        if (priorityWebhook && params.force) {
          await clickupApi(`/webhook/${priorityWebhook.id}`, { method: 'DELETE' });
          results.push(`Deleted existing priority webhook ${priorityWebhook.id}`);
        }
        const created = await clickupApi(`/team/${MC.teamId}/webhook`, {
          method: 'POST',
          body: {
            endpoint: priorityWebhookUrl,
            events: ['taskPriorityUpdated'],
            space_id: parseInt(MC.spaceId),
          },
        }) as { webhook: { id: string } };
        priorityWebhook = { id: created.webhook.id, endpoint: priorityWebhookUrl, events: ['taskPriorityUpdated'] };
        results.push(`Created priority webhook: ${created.webhook.id}`);
      } else {
        results.push(`Priority webhook already exists: ${priorityWebhook.id}`);
      }

      // Step 4: Check existing n8n workflows
      const n8nWorkflows = await n8nApi('/workflows') as { data: Array<{ id: string; name: string; active: boolean }> };
      const workflows = n8nWorkflows.data || [];

      let triageWorkflow = workflows.find(w => w.name === 'MC Auto-Triage + Route');
      let priorityWorkflow = workflows.find(w => w.name === 'MC Priority Due Date');

      // Step 5: Create Auto-Triage+Route workflow
      if (!triageWorkflow || params.force) {
        if (triageWorkflow && params.force) {
          await n8nApi(`/workflows/${triageWorkflow.id}`, { method: 'DELETE' });
          results.push(`Deleted existing triage workflow ${triageWorkflow.id}`);
        }
        const workflowDef = buildAutoTriageRouteWorkflow();
        const created = await n8nApi('/workflows', {
          method: 'POST',
          body: workflowDef,
        }) as { id: string; name: string };
        // Activate it
        await n8nApi(`/workflows/${created.id}/activate`, { method: 'POST' });
        triageWorkflow = { id: created.id, name: created.name, active: true };
        results.push(`Created and activated triage workflow: ${created.id}`);
      } else {
        results.push(`Triage workflow already exists: ${triageWorkflow.id} (active: ${triageWorkflow.active})`);
      }

      // Step 6: Create Priority Due Date workflow
      if (!priorityWorkflow || params.force) {
        if (priorityWorkflow && params.force) {
          await n8nApi(`/workflows/${priorityWorkflow.id}`, { method: 'DELETE' });
          results.push(`Deleted existing priority workflow ${priorityWorkflow.id}`);
        }
        const workflowDef = buildPriorityDueDateWorkflow();
        const created = await n8nApi('/workflows', {
          method: 'POST',
          body: workflowDef,
        }) as { id: string; name: string };
        await n8nApi(`/workflows/${created.id}/activate`, { method: 'POST' });
        priorityWorkflow = { id: created.id, name: created.name, active: true };
        results.push(`Created and activated priority workflow: ${created.id}`);
      } else {
        results.push(`Priority workflow already exists: ${priorityWorkflow.id} (active: ${priorityWorkflow.active})`);
      }

      const summary = [
        '=== Mission Control Automations Setup ===',
        '',
        'Webhooks:',
        `  Status (taskStatusUpdated): ${statusWebhook.id}`,
        `  Priority (taskPriorityUpdated): ${priorityWebhook.id}`,
        '',
        'n8n Workflows:',
        `  Auto-Triage + Route: ${triageWorkflow.id} (active: ${triageWorkflow.active})`,
        `  Priority Due Date: ${priorityWorkflow.id} (active: ${priorityWorkflow.active})`,
        '',
        'Automations:',
        `  1x Auto-Triage (inbox + squad set → awaiting approval)`,
        `  ${Object.keys(SQUAD_ROUTES).length}x Auto-Route (backlog + squad → target list)`,
        `  4x Priority Due Date (urgent=1d, high=3d, normal=7d, low=14d)`,
        '',
        'Steps:',
        ...results.map(r => `  - ${r}`),
      ].join('\n');

      return { content: [{ type: 'text', text: summary }] };
    } catch (e) {
      return { content: [{ type: 'text', text: `Error: ${(e as Error).message}` }], isError: true };
    }
  },
);

// ── Tool 2: list_automations ────────────────────────────────────────────────

server.tool(
  'list_automations',
  'Show status of all Mission Control automations: webhooks, n8n workflows, and routing rules.',
  {},
  async () => {
    try {
      // Get webhooks
      const webhooksRes = await clickupApi(`/team/${MC.teamId}/webhook`) as { webhooks: Array<{ id: string; endpoint: string; events: string[]; health?: { status: string } }> };
      const allWebhooks = webhooksRes.webhooks || [];
      const mcWebhooks = allWebhooks.filter(w =>
        w.endpoint.includes('mc-auto/') ||
        w.endpoint.includes('mission-control/')
      );

      // Get n8n workflows
      const n8nWorkflows = await n8nApi('/workflows') as { data: Array<{ id: string; name: string; active: boolean }> };
      const mcWorkflows = (n8nWorkflows.data || []).filter(w =>
        w.name.startsWith('MC ') || w.name.startsWith('Mission Control')
      );

      const lines = [
        '=== Mission Control Automations Status ===',
        '',
        '── ClickUp Webhooks ──',
        ...mcWebhooks.map(w =>
          `  [${w.id}] ${w.events.join(',')} → ${w.endpoint} (health: ${w.health?.status || 'unknown'})`
        ),
        mcWebhooks.length === 0 ? '  (none found)' : '',
        '',
        '── n8n Workflows ──',
        ...mcWorkflows.map(w =>
          `  [${w.id}] ${w.name} — ${w.active ? 'ACTIVE' : 'INACTIVE'}`
        ),
        mcWorkflows.length === 0 ? '  (none found)' : '',
        '',
        '── Squad Routing Rules (19) ──',
        ...Object.entries(SQUAD_ROUTES).map(([squad, route]) =>
          `  ${squad.padEnd(22)} → ${route.listName} (${route.listId})`
        ),
        '',
        '── Priority Due Date Rules (4) ──',
        ...Object.entries(PRIORITY_DAYS).map(([id, days]) => {
          const name = { '1': 'urgent', '2': 'high', '3': 'normal', '4': 'low' }[id] || id;
          return `  ${name.padEnd(10)} → +${days} day(s)`;
        }),
      ];

      return { content: [{ type: 'text', text: lines.join('\n') }] };
    } catch (e) {
      return { content: [{ type: 'text', text: `Error: ${(e as Error).message}` }], isError: true };
    }
  },
);

// ── Tool 3: toggle_automation ───────────────────────────────────────────────

server.tool(
  'toggle_automation',
  'Enable or disable a Mission Control automation by activating/deactivating its n8n workflow.',
  {
    workflow_name: z.enum(['triage-route', 'priority-due-date']).describe('Which automation to toggle'),
    enable: z.boolean().describe('true to activate, false to deactivate'),
  },
  async (params) => {
    try {
      const nameMap: Record<string, string> = {
        'triage-route': 'MC Auto-Triage + Route',
        'priority-due-date': 'MC Priority Due Date',
      };
      const targetName = nameMap[params.workflow_name];

      const n8nWorkflows = await n8nApi('/workflows') as { data: Array<{ id: string; name: string; active: boolean }> };
      const workflow = (n8nWorkflows.data || []).find(w => w.name === targetName);

      if (!workflow) {
        return { content: [{ type: 'text', text: `Workflow "${targetName}" not found. Run setup_automations first.` }], isError: true };
      }

      const action = params.enable ? 'activate' : 'deactivate';
      await n8nApi(`/workflows/${workflow.id}/${action}`, { method: 'POST' });

      return {
        content: [{ type: 'text', text: `Workflow "${targetName}" (${workflow.id}) ${params.enable ? 'activated' : 'deactivated'} successfully.` }],
      };
    } catch (e) {
      return { content: [{ type: 'text', text: `Error: ${(e as Error).message}` }], isError: true };
    }
  },
);

// ── Tool 4: test_automation ─────────────────────────────────────────────────

server.tool(
  'test_automation',
  'Create a test task in Inbox to verify automations are working. Optionally set squad and priority to trigger routing.',
  {
    squad: z.string().optional().describe('Squad value to set (e.g. "copywriting"). If set, triggers auto-triage.'),
    priority: z.enum(['1', '2', '3', '4']).optional().describe('Priority: 1=urgent, 2=high, 3=normal, 4=low. Triggers priority due date.'),
  },
  async (params) => {
    try {
      const taskName = `[TEST] Automation Test - ${new Date().toISOString().slice(0, 19)}`;

      // Build task body
      const taskBody: Record<string, unknown> = {
        name: taskName,
        description: 'Automated test task created by mission-control-mcp. Safe to delete.',
        status: 'inbox',
      };

      if (params.priority) {
        taskBody.priority = parseInt(params.priority);
      }

      // Create task in Inbox
      const task = await clickupApi(`/list/${MC.inboxListId}/task`, {
        method: 'POST',
        body: taskBody,
      }) as { id: string; name: string; url: string };

      const results = [`Created test task: ${task.id} (${task.name})`];
      results.push(`URL: ${task.url}`);

      // Set squad custom field if specified
      if (params.squad) {
        // First, get the field options to find the orderindex for the squad value
        const taskDetails = await clickupApi(`/task/${task.id}`) as {
          custom_fields: Array<{
            id: string;
            type_config?: { options?: Array<{ name: string; orderindex: number }> };
          }>;
        };

        const squadField = taskDetails.custom_fields?.find(f => f.id === MC.squadFieldId);
        const option = squadField?.type_config?.options?.find(
          o => o.name.toLowerCase().replace(/\s+/g, '-') === params.squad?.toLowerCase()
        );

        if (option) {
          await clickupApi(`/task/${task.id}/field/${MC.squadFieldId}`, {
            method: 'POST',
            body: { value: option.orderindex },
          });
          results.push(`Set Squad field to "${params.squad}" (orderindex: ${option.orderindex})`);
          results.push('→ This should trigger Auto-Triage (inbox → awaiting approval)');
        } else {
          results.push(`Warning: Squad "${params.squad}" not found in custom field options`);
        }
      }

      if (params.priority) {
        const days = PRIORITY_DAYS[params.priority] || 0;
        const pName = { '1': 'urgent', '2': 'high', '3': 'normal', '4': 'low' }[params.priority];
        results.push(`Set priority to ${pName} (+${days} days)`);
        results.push('→ This should trigger Priority Due Date automation');
      }

      results.push('');
      results.push('Note: Webhooks fire asynchronously. Check task in ~5-10 seconds to verify automation ran.');

      return { content: [{ type: 'text', text: results.join('\n') }] };
    } catch (e) {
      return { content: [{ type: 'text', text: `Error: ${(e as Error).message}` }], isError: true };
    }
  },
);

// ── Tool 5: add_route ───────────────────────────────────────────────────────

server.tool(
  'add_route',
  'Add a new squad routing rule. This updates the n8n workflow to include the new route.',
  {
    squad_value: z.string().describe('Squad dropdown value (e.g. "new-squad")'),
    target_list_id: z.string().describe('Target ClickUp list ID to route tasks to'),
    list_name: z.string().describe('Human-readable list name'),
    folder_name: z.string().describe('Folder name the list belongs to'),
  },
  async (params) => {
    try {
      // Check if route already exists in our static map
      if (SQUAD_ROUTES[params.squad_value]) {
        return {
          content: [{ type: 'text', text: `Route for "${params.squad_value}" already exists: → ${SQUAD_ROUTES[params.squad_value].listName} (${SQUAD_ROUTES[params.squad_value].listId}).\n\nTo update, modify the SQUAD_ROUTES in the MCP source code and rebuild.` }],
        };
      }

      // Add to runtime map
      SQUAD_ROUTES[params.squad_value] = {
        listId: params.target_list_id,
        listName: params.list_name,
        folder: params.folder_name,
      };

      // Recreate the triage workflow with updated routes
      const n8nWorkflows = await n8nApi('/workflows') as { data: Array<{ id: string; name: string; active: boolean }> };
      const triageWorkflow = (n8nWorkflows.data || []).find(w => w.name === 'MC Auto-Triage + Route');

      if (triageWorkflow) {
        // Delete old workflow and recreate with new routes
        await n8nApi(`/workflows/${triageWorkflow.id}`, { method: 'DELETE' });
        const workflowDef = buildAutoTriageRouteWorkflow();
        const created = await n8nApi('/workflows', {
          method: 'POST',
          body: workflowDef,
        }) as { id: string };
        await n8nApi(`/workflows/${created.id}/activate`, { method: 'POST' });

        return {
          content: [{ type: 'text', text: `Added route: ${params.squad_value} → ${params.list_name} (${params.target_list_id})\nRecreated workflow: ${created.id}\n\nNote: This is a runtime-only change. To persist, update SQUAD_ROUTES in src/index.ts and rebuild.` }],
        };
      }

      return {
        content: [{ type: 'text', text: `Added route to runtime map but triage workflow not found. Run setup_automations to create it.` }],
      };
    } catch (e) {
      return { content: [{ type: 'text', text: `Error: ${(e as Error).message}` }], isError: true };
    }
  },
);

// ── Tool 6: get_automation_logs ─────────────────────────────────────────────

server.tool(
  'get_automation_logs',
  'Get recent n8n execution logs for Mission Control automation workflows.',
  {
    workflow_name: z.enum(['triage-route', 'priority-due-date', 'all']).optional().describe('Which workflow logs to fetch (default: all)'),
    limit: z.number().optional().describe('Max executions to return (default: 10)'),
  },
  async (params) => {
    try {
      const limit = params.limit || 10;
      const nameMap: Record<string, string> = {
        'triage-route': 'MC Auto-Triage + Route',
        'priority-due-date': 'MC Priority Due Date',
      };

      // Get all MC workflows
      const n8nWorkflows = await n8nApi('/workflows') as { data: Array<{ id: string; name: string; active: boolean }> };
      const mcWorkflows = (n8nWorkflows.data || []).filter(w =>
        w.name.startsWith('MC ') || w.name.startsWith('Mission Control')
      );

      // Filter by name if specified
      const targetWorkflows = params.workflow_name && params.workflow_name !== 'all'
        ? mcWorkflows.filter(w => w.name === nameMap[params.workflow_name!])
        : mcWorkflows;

      if (targetWorkflows.length === 0) {
        return { content: [{ type: 'text', text: 'No Mission Control workflows found. Run setup_automations first.' }], isError: true };
      }

      const allLogs: string[] = ['=== Mission Control Execution Logs ===', ''];

      for (const wf of targetWorkflows) {
        const executions = await n8nApi(`/executions?workflowId=${wf.id}&limit=${limit}`) as {
          data: Array<{
            id: string;
            finished: boolean;
            mode: string;
            startedAt: string;
            stoppedAt: string;
            status: string;
          }>;
        };

        allLogs.push(`── ${wf.name} (${wf.id}) ──`);

        if (!executions.data || executions.data.length === 0) {
          allLogs.push('  No executions yet.');
        } else {
          for (const exec of executions.data) {
            const duration = exec.stoppedAt && exec.startedAt
              ? `${((new Date(exec.stoppedAt).getTime() - new Date(exec.startedAt).getTime()) / 1000).toFixed(1)}s`
              : '?';
            allLogs.push(
              `  [${exec.id}] ${exec.status} | ${exec.startedAt} | ${duration} | mode: ${exec.mode}`
            );
          }
        }
        allLogs.push('');
      }

      return { content: [{ type: 'text', text: allLogs.join('\n') }] };
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
