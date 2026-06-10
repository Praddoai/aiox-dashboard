# AIOS Agent Execution Engine — Operation Guide

## Overview

The AIOS Agent Execution Engine is a standalone Bun/Hono server that orchestrates AI agent execution via CLI subprocesses. It manages job queues, process pools, workflow state machines, cron scheduling, and real-time WebSocket events.

- **Runtime**: Bun 1.2+
- **Framework**: Hono (HTTP + WebSocket)
- **Database**: SQLite (bun:sqlite)
- **Default Port**: 4002

## Quick Start

```bash
cd engine
bun install
bun run src/index.ts
```

The engine listens on `http://0.0.0.0:4002` with WebSocket at `ws://localhost:4002/live`.

## Configuration

`engine/engine.config.yaml`:

```yaml
server:
  port: 4002
  host: "0.0.0.0"
  cors_origins:
    - "http://localhost:5173"  # Dashboard

pool:
  max_concurrent: 5       # Total CLI process slots
  max_per_squad: 3         # Max processes per squad
  spawn_timeout_ms: 30000  # 30s to spawn
  execution_timeout_ms: 300000  # 5min per job

queue:
  check_interval_ms: 1000  # Timeout checker interval
  max_attempts: 3          # Auto-retry on failure

memory:
  context_budget_tokens: 8000
  recall_top_k: 10

workspace:
  base_dir: ".workspace"
  max_concurrent: 10
  cleanup_on_success: true

claude:
  skip_permissions: false
  max_turns: -1
  output_format: "stream-json"

auth:
  webhook_token: ""  # Set for webhook auth (Bearer token)

logging:
  level: "info"  # debug | info | warn | error
```

## API Reference

### System

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check (version, uptime, WS clients) |
| `/pool` | GET | Pool status (slots, occupied, queue depth) |

### Jobs

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/jobs` | GET | List jobs (`?status=pending&limit=20`) |
| `/jobs/:id` | GET | Get single job |
| `/jobs/:id` | DELETE | Cancel a job |

### Execute

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/execute/agent` | POST | Submit agent execution job |
| `/execute/orchestrate` | POST | Start workflow orchestration |
| `/execute/orchestrate/:id` | GET | Get workflow state |
| `/execute/workflows` | GET | List available workflow definitions |

### Stream (SSE)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/stream/agent` | POST | Execute agent with SSE streaming |

SSE events: `start`, `text`, `tools`, `done`, `error`, `[DONE]`

### Webhooks

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/webhook/orchestrator` | POST | Intelligent routing by keywords |
| `/webhook/:squadId` | POST | Direct squad trigger |

Rate limit: 10 req/min per IP. Returns 429 when exceeded.

Auth: `Authorization: Bearer <webhook_token>` (if configured).

### Cron

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/cron` | GET | List scheduled crons |
| `/cron` | POST | Create cron job |
| `/cron/:id/toggle` | PATCH | Enable/disable cron |
| `/cron/:id` | DELETE | Remove cron |

### Memory

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/memory/:scope` | POST | Store memory |
| `/memory/:scope` | GET | Get memories for scope |
| `/memory/recall` | GET | Semantic recall (`?scope=...&query=...&limit=10`) |

### Authority

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/authority/check` | POST | Check if agent can execute operation |
| `/authority/audit` | GET | View audit log (`?limit=50`) |
| `/authority/reload` | POST | Reload rules from disk |

### Bundles

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/bundles` | GET | List team bundles + active |
| `/bundles/activate` | POST | Set active bundle |
| `/bundles/validate` | POST | Check agent membership |

## WebSocket

Connect to `ws://localhost:4002/live`.

### Protocol

**On connect**: Server sends `{ type: "init", events: [...] }` with replay buffer (last 100 events).

**Events**: Server sends `{ type: "event", event: { id, timestamp, type, agent, description, ... } }`.

**Heartbeat**: Server pings every 30s. Client can send `{ type: "ping" }` and receives `{ type: "pong" }`.

**Event types**: `system`, `message`, `error`, `tool_call` (MonitorStore-compatible).

### Engine event types mapped:

| Engine Event | MonitorStore Type |
|-------------|-------------------|
| `job:created` | system |
| `job:started` | system |
| `job:completed` | message |
| `job:failed` | error |
| `job:progress` | tool_call |
| `pool:updated` | system |
| `workflow:phase_started` | system |
| `workflow:phase_completed` | message |
| `workflow:completed` | message |
| `workflow:failed` | error |

## Architecture

```
engine/
├── src/
│   ├── core/
│   │   ├── process-pool.ts       # Event-driven pool (slots, zombie detection)
│   │   ├── job-queue.ts          # SQLite-backed priority queue
│   │   ├── workflow-engine.ts    # YAML workflow state machine
│   │   ├── authority-enforcer.ts # Permission rules from markdown
│   │   ├── delegation-protocol.ts # Sub-task delegation
│   │   ├── team-bundle.ts       # Agent group management
│   │   ├── cron-scheduler.ts    # Croner-based scheduling
│   │   ├── context-builder.ts   # Agent persona + memory assembly
│   │   ├── memory-client.ts     # SQLite + Supermemory
│   │   ├── workspace-manager.ts # Isolated workspaces per job
│   │   └── completion-handler.ts # Post-execution processing
│   ├── lib/
│   │   ├── config.ts, db.ts, logger.ts, ws.ts
│   ├── routes/
│   │   ├── system.ts, jobs.ts, execute.ts, stream.ts
│   │   ├── webhooks.ts, cron.ts, memory.ts
│   └── index.ts (v0.4.0)
├── tests/
│   ├── integration.test.ts (39 tests)
│   └── unit/ (54 tests across 7 files)
├── migrations/
│   ├── 001_initial.sql
│   ├── 002_relax_memory_fk.sql
│   ├── 003_workflow_state.sql
│   └── 004_cron_jobs.sql
└── engine.config.yaml
```

## Process Pool

- **Event-driven**: `emitSlotFree()` triggers queue processing immediately
- **Fallback polling**: Every 2s for edge cases
- **Zombie detection**: Every 30s checks `kill(pid, 0)` for dead processes
- **Authority check**: Before spawn, verifies agent permissions
- **P0 preemption**: Configurable (default off) — urgent jobs can preempt lower priority

## Workflow Engine

Loads YAML definitions from `.aios-core/development/workflows/`. Supports:

- **SDC** (Story Development Cycle): create → validate → implement → QA
- **QA Loop**: iterative review/fix cycle (max 5 iterations)
- **Spec Pipeline**: gather → assess → research → write → critique
- **Brownfield Discovery**: 10-phase technical debt assessment
- **12 total workflow definitions**

State persisted in SQLite `workflow_state` table.

## Troubleshooting

### Port already in use
```bash
lsof -ti:4002 | xargs kill -9
```

### Jobs stuck in "running"
Check for zombie processes:
```bash
curl http://localhost:4002/pool | jq '.slots[] | select(.status == "running")'
```

### Authority blocking everything
The `matchOperation` function uses word-boundary matching (space separator). If agents are being blocked unexpectedly, check authority rules:
```bash
curl -X POST http://localhost:4002/authority/check \
  -H 'Content-Type: application/json' \
  -d '{"agentId":"dev","operation":"code","squadId":"development"}'
```

Reload rules after editing `agent-authority.md`:
```bash
curl -X POST http://localhost:4002/authority/reload
```

### View recent events
```bash
curl http://localhost:4002/authority/audit?limit=20 | jq '.entries[-5:]'
```

## Dashboard Integration

The dashboard connects to the engine via:

1. **WebSocket** at `ws://localhost:4002/live` (MonitorStore)
2. **HTTP API** at `http://localhost:4002` (engineApi client)

Set in `.env.development`:
```
VITE_ENGINE_URL=http://localhost:4002
```

The MonitorStore automatically detects the engine and falls back to the monitor server (port 4001) if unavailable.

## Testing

```bash
# Unit tests (59 tests, ~90ms)
bun test tests/unit/

# Integration tests (39 tests, requires engine to NOT be running)
bun test tests/integration.test.ts
```

## Known Issues & Fixes

### Nested Claude sessions (fixed)
The engine removes the `CLAUDECODE` environment variable before spawning `claude -p`, allowing it to run from within a Claude Code session.

### `--verbose` flag required (fixed)
`claude -p --output-format stream-json` requires `--verbose`. The engine adds this flag automatically.

### Authority false positives (fixed)
The `matchOperation` function previously used `string.includes()` which caused `"execute"` to match `"*execute-epic"`. Now uses word-boundary matching (space separator only).
