# @aios/cli

CLI to start, initialize, and manage AIOS-powered projects.

## Quick Start

```bash
# Initialize a new project
bunx aios init

# Start the engine for current directory
bunx aios start

# Start for a specific project
bunx aios start --project /path/to/project --port 8080

# Check engine status
bunx aios status
```

## Commands

### `aios start`

Start the AIOS engine (+ dashboard if available) for a project.

```
Options:
  --project <path>    Project root (default: current directory)
  --port <number>     Engine port (default: 4002)
  --dashboard <path>  Path to built dashboard dist/
  --no-dashboard      API-only mode
```

The CLI auto-detects the engine location by checking:
1. `../../engine` (monorepo layout)
2. `./engine` (project subdirectory)
3. `node_modules/@aios/engine` (npm dependency)

### `aios init`

Scaffold the AIOS directory structure in a project.

Creates:
```
.aios-core/
├── constitution.md
├── SQUAD-REGISTRY.yaml
└── development/
    ├── agents/
    ├── tasks/
    ├── workflows/
    ├── templates/
    └── checklists/
squads/
.claude/rules/
engine.config.yaml
```

### `aios status`

Check if the engine is running and display health info.

```
Options:
  --port <number>   Engine port (default: 4002)
  --host <address>  Engine host (default: localhost)
```

## Requirements

- [Bun](https://bun.sh) >= 1.0.0
- `@aios/engine` (auto-detected or installed as dependency)
