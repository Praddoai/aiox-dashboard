# @aios/engine

AIOS Agent Execution Engine — orchestrates AI agent squads via REST API + WebSocket.

Built with [Bun](https://bun.sh) + [Hono](https://hono.dev). Zero build step required.

## Quick Start

```bash
# Install
bun add @aios/engine

# Start for a project
bunx aios-engine --project-root /path/to/project

# Or use environment variable
AIOS_PROJECT_ROOT=/path/to/project bun node_modules/@aios/engine/src/index.ts
```

## CLI Options

```
aios-engine [options]

  --project-root <path>   Project root (contains .aios-core/ and squads/)
  --port <number>         Server port (default: 4002)
  --dashboard <path>      Path to built dashboard dist/ to serve
  --host <address>        Bind address (default: 0.0.0.0)
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `AIOS_PROJECT_ROOT` | Project root path | auto-detect |
| `ENGINE_PORT` | Server port | `4002` |
| `ENGINE_HOST` | Bind address | `0.0.0.0` |
| `AIOS_DASHBOARD_DIR` | Dashboard dist path | `../dist` |

## API Endpoints

### Registry (project data)
- `GET /registry/project` — Project paths and status
- `GET /registry/squads` — All squads with agent counts
- `GET /registry/agents` — All agents (filter by `?squad=`)
- `GET /registry/agents/:squadId/:agentId` — Agent detail with content
- `GET /registry/workflows` — Workflow definitions
- `GET /registry/tasks` — Task definitions

### Execution
- `POST /execute/agent` — Execute an agent
- `POST /execute/orchestrate` — Start a workflow
- `GET /execute/workflows` — Active workflow definitions

### System
- `GET /health` — Health check
- `GET /pool` — Process pool status
- `POST /authority/check` — Authority matrix check
- `GET /bundles` — Team bundles

### Jobs
- `GET /jobs` — List jobs (filter by `?status=&limit=`)
- `GET /jobs/:id` — Job detail
- `GET /jobs/:id/logs` — Job logs
- `DELETE /jobs/:id` — Cancel job

### Realtime
- `WS /live` — WebSocket for live events
- `GET /stream/agent` — SSE streaming

### Other
- `POST /webhook/:squadId` — Webhook trigger
- `POST /webhook/orchestrator` — Orchestrator webhook
- `CRUD /cron` — Cron job management
- `POST /memory/:scope` — Store memory
- `POST /memory/recall` — Recall memories

## Project Structure

The engine expects a project with this structure:

```
project/
├── .aios-core/
│   ├── constitution.md
│   ├── SQUAD-REGISTRY.yaml
│   └── development/
│       ├── agents/*.md
│       ├── tasks/*.md
│       └── workflows/*.yaml
├── squads/
│   └── {squad-id}/
│       ├── squad.yaml
│       └── agents/*.md
└── .claude/rules/*.md        (optional)
```

Run `bunx aios init` to scaffold this structure.

## Configuration

Create `engine.config.yaml` in the engine directory:

```yaml
project:
  root: ""                    # auto-detect
  aios_core: ".aios-core"
  squads: "squads"
  rules: ".claude/rules"

server:
  port: 4002
  host: "0.0.0.0"
  cors_origins:
    - "http://localhost:5173"

pool:
  max_concurrent: 5
  execution_timeout_ms: 300000
```

## Programmatic Usage

```typescript
import { initProjectResolver, getProjectPaths } from '@aios/engine/project-resolver';

// Point at any project
initProjectResolver({ projectRoot: '/path/to/project' });

const paths = getProjectPaths();
console.log(paths.aiosCore);  // /path/to/project/.aios-core
console.log(paths.squads);    // /path/to/project/squads
```

## Requirements

- [Bun](https://bun.sh) >= 1.0.0
