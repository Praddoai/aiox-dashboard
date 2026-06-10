# EPIC: Agent Execution Engine — Motor de Execucao de Agentes AIOX

**PRD Ref:** PRD-AGENT-EXECUTION-ENGINE
**Status:** Draft
**Criado por:** @pm (Morgan)

---

## Contexto

O AIOX tem 50+ squads e 13 agentes core definidos em `.aios-core/development/agents/`, 4 workflows formais, APIs tipadas no frontend (`src/services/api/execute.ts`), e WebSocket infrastructure — mas nenhum backend que realmente execute agentes. O dashboard e frontend-only. O `aios-core-meta-gpt` referenciado em `package.json` e o prototipo anterior, nao-funcional para este modelo.

Este epic constroi o **Agent Execution Engine**: um servidor Bun + Hono que recebe requisicoes de execucao, monta contexto, spawna Claude Code CLI com a persona correta, coleta resultados, persiste memorias, e notifica o dashboard.

---

## Estrutura do Engine

```
engine/                             # Novo diretorio na raiz do aios-platform
├── src/
│   ├── index.ts                    # Entry point Bun + Hono
│   ├── routes/
│   │   ├── execute.ts              # /execute/* (alinhado com frontend execute.ts)
│   │   ├── jobs.ts                 # /jobs/*
│   │   ├── webhooks.ts             # /webhook/*
│   │   ├── memory.ts               # /memory/*
│   │   ├── cron.ts                 # /cron/*
│   │   └── system.ts               # /health, /pool
│   ├── core/
│   │   ├── job-queue.ts            # Fila SQLite (CRUD, estado, prioridade)
│   │   ├── process-pool.ts         # Gerencia slots de CLI
│   │   ├── context-builder.ts      # Monta contexto do agente
│   │   ├── authority-enforcer.ts   # Valida permissoes
│   │   ├── workspace-manager.ts    # Cria/limpa workspaces e worktrees
│   │   ├── completion-handler.ts   # Coleta resultado, metricas, memoria
│   │   ├── memory-client.ts        # Abstrai Supermemory + Qdrant
│   │   └── workflow-engine.ts      # State machine para workflows
│   ├── lib/
│   │   ├── db.ts                   # SQLite connection + migrations
│   │   ├── logger.ts               # Structured logging
│   │   ├── config.ts               # Engine config (YAML)
│   │   └── ws.ts                   # WebSocket broadcaster
│   └── types.ts                    # Tipos do engine
├── migrations/
│   └── 001_initial.sql             # Schema (jobs, memory_log, executions)
├── engine.config.yaml              # Config do engine (pool limits, timeouts)
├── package.json                    # Deps: hono, @anthropic-ai/claude-code
└── tsconfig.json
```

---

## Fases e Stories

---

# FASE 1 — ENGINE CORE

**Objetivo:** Server roda, recebe requests, enfileira, executa 1 agente, retorna resultado.
**Agente executor:** @dev (Dex)
**Sprint:** 1-2

---

## Story 1.1 — Server Bootstrap + Health Check

**Status:** Draft

**As a** operador do AIOX,
**I want** iniciar o engine com `bun run engine/src/index.ts`,
**so that** ele sirva a API e eu possa verificar que esta rodando.

### Acceptance Criteria

- [ ] AC 1.1.1: Servidor Hono inicia na porta configuravel (default 4002, nao conflitar com relay 4001)
- [ ] AC 1.1.2: `GET /health` retorna `{ status: "ok", uptime, version, pid }`
- [ ] AC 1.1.3: CORS configurado para permitir requests do dashboard (localhost:5173)
- [ ] AC 1.1.4: Logger estruturado com timestamp, level, context (JSON para stdout)
- [ ] AC 1.1.5: Graceful shutdown em SIGINT/SIGTERM (fecha DB, mata processos filhos)

### Tasks

- [ ] Criar `engine/` com package.json, tsconfig.json
- [ ] Implementar `src/index.ts` com Hono + Bun.serve
- [ ] Implementar `src/routes/system.ts` com /health
- [ ] Implementar `src/lib/logger.ts`
- [ ] Implementar `src/lib/config.ts` (le `engine.config.yaml`)
- [ ] Criar `engine.config.yaml` com defaults
- [ ] Adicionar script `engine` no package.json raiz

### Dev Notes

- Porta 4002 porque 4001 e o monitor server / relay server
- Config YAML permite override sem recompilar
- Nao usar Express — Hono e Bun-native, tipado, zero deps

---

## Story 1.2 — SQLite Database + Migrations

**Status:** Draft

**As a** engine,
**I want** um banco SQLite para persistir jobs e metricas,
**so that** jobs sobrevivam a reinicios e eu tenha historico de execucoes.

### Acceptance Criteria

- [ ] AC 1.2.1: Database criado automaticamente em `engine/data/engine.db` no primeiro boot
- [ ] AC 1.2.2: Migration system aplica scripts de `engine/migrations/` em ordem
- [ ] AC 1.2.3: Schema contem tabelas: jobs, memory_log, executions (conforme PRD secao 4)
- [ ] AC 1.2.4: WAL mode ativado para suportar reads concorrentes
- [ ] AC 1.2.5: Indices criados para queries frequentes (status, squad_id, parent_job_id)

### Tasks

- [ ] Implementar `src/lib/db.ts` com `bun:sqlite`
- [ ] Criar `migrations/001_initial.sql` com DDL completo
- [ ] Implementar migration runner (ordena por filename, aplica sequencial, registra em `_migrations`)
- [ ] Adicionar auto-migrate no boot do server
- [ ] Testar: restart do server nao perde dados, nao re-aplica migrations

### Dev Notes

- `bun:sqlite` e nativo, nao precisa de pacote externo
- WAL mode: `PRAGMA journal_mode=WAL; PRAGMA synchronous=NORMAL;`
- ULIDs para IDs (ordenacao temporal + unicidade)

---

## Story 1.3 — Job Queue (Enqueue + Dequeue + Status)

**Status:** Draft

**As a** engine,
**I want** uma fila de jobs com estados e prioridades,
**so that** execucoes sejam ordenadas, rastreadas e recuparaveis.

### Acceptance Criteria

- [ ] AC 1.3.1: `enqueue(job)` insere job com status 'pending' e retorna job ID
- [ ] AC 1.3.2: `dequeue()` retorna o job pendente de maior prioridade (P0 > P1 > P2 > P3), FIFO dentro da mesma prioridade
- [ ] AC 1.3.3: `updateStatus(jobId, status)` transiciona estado com validacao (pending→running, running→done|failed|timeout)
- [ ] AC 1.3.4: Jobs com status 'running' por mais que `timeout_ms` sao marcados como 'timeout' por um health check periodico
- [ ] AC 1.3.5: `getJob(id)` retorna job completo, `listJobs(filters)` suporta filtro por status, squad, agent
- [ ] AC 1.3.6: Rotas REST: `GET /jobs`, `GET /jobs/:id`, `POST /jobs/:id/retry`, `DELETE /jobs/:id`

### Tasks

- [ ] Implementar `src/core/job-queue.ts` com metodos CRUD
- [ ] Implementar state machine de status (validar transicoes)
- [ ] Implementar priority dequeue (ORDER BY priority ASC, created_at ASC)
- [ ] Implementar timeout checker (roda a cada 30s, marca jobs expirados)
- [ ] Implementar `src/routes/jobs.ts` com endpoints REST
- [ ] Testes unitarios para enqueue, dequeue, retry, timeout

### Dev Notes

- Priority numerica: 0=urgente, 1=alta, 2=normal (default), 3=baixa
- Retry: incrementa `attempts`, reenfileira se `attempts < max_attempts`
- Transicoes invalidas retornam erro 409 Conflict

---

## Story 1.4 — Process Spawn Basico (Single Slot)

**Status:** Draft

**As a** engine,
**I want** spawnar um processo `claude` CLI para executar um job,
**so that** o agente rode com o prompt correto e eu capture o resultado.

### Acceptance Criteria

- [ ] AC 1.4.1: `spawnAgent(job)` executa `claude -p "prompt" --output-format stream-json` via `Bun.spawn()`
- [ ] AC 1.4.2: Working directory do processo e o workspace do job
- [ ] AC 1.4.3: stdout e stderr sao capturados em buffer e salvos no job
- [ ] AC 1.4.4: Exit code 0 → job status 'done', exit != 0 → job status 'failed'
- [ ] AC 1.4.5: PID registrado no job para possibilitar kill manual
- [ ] AC 1.4.6: Timeout enforced: se processo excede `timeout_ms`, mata com SIGTERM, depois SIGKILL
- [ ] AC 1.4.7: Um unico slot (sem pool ainda): proximo job espera o atual terminar

### Tasks

- [ ] Implementar `src/core/process-pool.ts` (v1: single slot)
- [ ] Implementar spawn com `Bun.spawn()`, captura de stdout/stderr
- [ ] Implementar timeout watcher com `setTimeout` + process.kill
- [ ] Implementar job loop: dequeue → spawn → wait → update status → repeat
- [ ] Testar: job executa, resultado capturado, timeout funciona

### Dev Notes

- Flags do claude CLI: `-p` (prompt), `--output-format stream-json` (output estruturado)
- `--dangerously-skip-permissions` so se configurado em engine.config.yaml
- O prompt neste momento e simples: apenas o input.message (context builder vem na Fase 2)
- Usar `--max-turns 1` para jobs simples, configuravel por agente

---

## Story 1.5 — Execute API (Alinhada com Frontend)

**Status:** Draft

**As a** dashboard frontend,
**I want** chamar `POST /execute/agent` e receber o resultado,
**so that** o fluxo existente em `src/services/api/execute.ts` funcione sem mudancas.

### Acceptance Criteria

- [ ] AC 1.5.1: `POST /execute/agent` aceita `ExecuteRequest` (mesmo schema do frontend types)
- [ ] AC 1.5.2: Retorna `ExecuteResponse` com `executionId, status, result`
- [ ] AC 1.5.3: `GET /execute/status/:id` retorna status da execucao
- [ ] AC 1.5.4: `DELETE /execute/status/:id` cancela execucao (kill PID se running)
- [ ] AC 1.5.5: `GET /execute/history` retorna ultimas N execucoes com filtros
- [ ] AC 1.5.6: `GET /execute/stats` retorna metricas agregadas (total, success rate, avg duration)
- [ ] AC 1.5.7: Response bodies sao compativeis com os tipos em `src/types/index.ts`

### Tasks

- [ ] Implementar `src/routes/execute.ts` com todos os endpoints
- [ ] Mapear ExecuteRequest → Job creation
- [ ] Mapear Job completion → ExecuteResponse
- [ ] Implementar history query com paginacao e filtros
- [ ] Implementar stats aggregation (SQL GROUP BY)
- [ ] Validar compatibilidade com tipos do frontend

### Dev Notes

- O frontend ja tem `executeApi.executeAgent()` em `src/services/api/execute.ts`
- Mudar `VITE_API_URL` para apontar ao engine (http://localhost:4002)
- Manter mesmos nomes de campos para zero refactor no frontend
- SSE streaming (story 4.3) vem na Fase 4

---

# FASE 2 — CONTEXT & MEMORY

**Objetivo:** Agentes executam com contexto completo (persona + memorias + input).
**Agente executor:** @dev (Dex)
**Sprint:** 3-4

---

## Story 2.1 — Context Builder

**Status:** Draft

**As a** engine,
**I want** montar o contexto completo do agente antes de spawnar,
**so that** o agente execute com sua persona, memorias relevantes e o input da tarefa.

### Acceptance Criteria

- [ ] AC 2.1.1: Le CLAUDE.md do agente de `.aios-core/development/agents/{agentId}.md`
- [ ] AC 2.1.2: Le config do squad (se existir) de `squads/{squadId}/config.yaml`
- [ ] AC 2.1.3: Monta prompt final na ordem: `[PERSONA] + [MEMORIAS] + [CONTEXTO_SQUAD] + [INPUT]`
- [ ] AC 2.1.4: Respeita budget de tokens (configurable, default 8000 tokens para contexto)
- [ ] AC 2.1.5: Se CLAUDE.md nao encontrado, usa prompt generico com squad type como guia
- [ ] AC 2.1.6: Hash do contexto montado salvo no job (para debug e cache)

### Tasks

- [ ] Implementar `src/core/context-builder.ts`
- [ ] Implementar leitor de CLAUDE.md com parser de secoes (Identidade, Capacidades, etc.)
- [ ] Implementar template de prompt com slots claros
- [ ] Implementar token counter estimado (chars/4 como proxy)
- [ ] Implementar truncation de memorias quando excede budget
- [ ] Testes: agente com CLAUDE.md, agente sem CLAUDE.md, agente com memorias

### Dev Notes

- Nao usar tokenizer real (peso desnecessario) — chars/4 e suficiente para estimativa
- Ordem do prompt importa: persona primeiro (define comportamento), memorias depois (contexto), input por ultimo (tarefa)
- O CLAUDE.md ja e rico (voiceDna, antiPatterns, integration) — enviar completo, nao resumir

---

## Story 2.2 — Memory Client (Supermemory + Qdrant)

**Status:** Draft

**As a** engine,
**I want** abstrair recall e store de memorias nos dois backends,
**so that** agentes tenham contexto historico e aprendam entre execucoes.

### Acceptance Criteria

- [ ] AC 2.2.1: `recall(query, scopes, limit)` consulta Supermemory MCP e retorna memorias rankeadas
- [ ] AC 2.2.2: `store(content, scope, metadata)` salva memoria no backend correto com metadados
- [ ] AC 2.2.3: Scopes suportados: 'global', 'squad:{id}', 'agent:{id}'
- [ ] AC 2.2.4: Se Supermemory indisponivel, recall retorna array vazio (graceful degradation)
- [ ] AC 2.2.5: Se Qdrant disponivel, recall de codigo e feito via Qdrant para squads engineering/development
- [ ] AC 2.2.6: Memorias duplicadas (mesma semantica) sao detectadas e nao armazenadas
- [ ] AC 2.2.7: Cada memoria salva e logada na tabela `memory_log`

### Tasks

- [ ] Implementar `src/core/memory-client.ts`
- [ ] Implementar Supermemory adapter (via MCP tools: recall, memory, memory-graph)
- [ ] Implementar Qdrant adapter (via MCP tools: qdrant-find, qdrant-store)
- [ ] Implementar scope routing (qual backend usar por scope + squad type)
- [ ] Implementar dedup semantico basico (hash do conteudo normalizado)
- [ ] Implementar graceful degradation com logging
- [ ] Implementar `src/routes/memory.ts` com endpoints REST

### Dev Notes

- MCP tools disponiveis: `mcp__mcp-supermemory-ai__recall`, `mcp__mcp-supermemory-ai__memory`, `mcp__qdrant__qdrant-find`, `mcp__qdrant__qdrant-store`
- A invocacao de MCP tools pelo engine pode ser via CLI (`claude -p "use tool X"`) ou via SDK direto se disponivel
- Investigar: Claude Agent SDK (`@anthropic-ai/claude-code`) permite invocar MCP tools programaticamente?

---

## Story 2.3 — Workspace Manager

**Status:** Draft

**As a** engine,
**I want** preparar o workspace correto para cada job,
**so that** agentes de codigo trabalhem em branches isolados e agentes de analise tenham diretorio limpo.

### Acceptance Criteria

- [ ] AC 2.3.1: Para squads `engineering`/`development`: cria git worktree em `.workspace/{jobId}` com branch `job/{jobId}`
- [ ] AC 2.3.2: Para outros squads: cria diretorio `.workspace/{jobId}` com `input.md` contendo o payload
- [ ] AC 2.3.3: Cleanup apos conclusao: worktree removido (branch preservado), diretorio removido
- [ ] AC 2.3.4: Se worktree falha (repo sem git), fallback para diretorio simples
- [ ] AC 2.3.5: Workspace path registrado no job para referencia
- [ ] AC 2.3.6: Maximo de workspaces simultaneos configuravel (previne exaustao de disco)

### Tasks

- [ ] Implementar `src/core/workspace-manager.ts`
- [ ] Implementar git worktree create/remove via `Bun.spawn(["git", ...])`
- [ ] Implementar diretorio simples create/remove
- [ ] Implementar squad type detection (usa `getSquadType()` do frontend ou mapa proprio)
- [ ] Implementar limite de workspaces (conta .workspace/* existentes)
- [ ] Testes: worktree cria branch, cleanup remove worktree, fallback funciona

### Dev Notes

- `git worktree add .workspace/{jobId} -b job/{jobId}` cria worktree
- `git worktree remove .workspace/{jobId}` limpa
- Branch fica preservado apos remove — permite merge posterior
- Mapear squad types: `src/types/index.ts` tem `getSquadType()`

---

## Story 2.4 — Completion Handler

**Status:** Draft

**As a** engine,
**I want** processar o resultado de cada job apos conclusao,
**so that** metricas sejam registradas, memorias persistidas e dashboard notificado.

### Acceptance Criteria

- [ ] AC 2.4.1: Apos exit code 0: detecta artefatos no workspace (novos/modificados via `git diff --stat` ou `ls`)
- [ ] AC 2.4.2: Extrai memoria do output se agente segue protocolo de memoria (secao "Para Salvar em Memoria" no stdout)
- [ ] AC 2.4.3: Persiste memorias extraidas via Memory Client (story 2.2)
- [ ] AC 2.4.4: Insere registro na tabela `executions` com metricas (duracao, files changed, memories stored)
- [ ] AC 2.4.5: Emite evento WebSocket `job:completed` ou `job:failed` para o dashboard
- [ ] AC 2.4.6: Se job tem `callback_url`, faz POST com resultado
- [ ] AC 2.4.7: Se job faz parte de workflow (`workflow_id`), sinaliza workflow engine para proximo step

### Tasks

- [ ] Implementar `src/core/completion-handler.ts`
- [ ] Implementar detector de artefatos (git diff + file listing)
- [ ] Implementar parser de protocolo de memoria (regex para secoes `### Scope:`)
- [ ] Implementar callback HTTP (com retry 3x)
- [ ] Implementar emissao de WebSocket events
- [ ] Implementar integracao com workflow engine (sinal de step concluido)
- [ ] Testes: job com memoria, job sem memoria, job com callback

### Dev Notes

- O parser de memoria e opcional — so agentes com protocolo definido no CLAUDE.md geram memoria
- WebSocket events devem ser compativeis com MonitorStore do dashboard (`src/stores/monitorStore.ts`)
- Callback URL e seguro: o engine so faz POST, nunca expoe dados internos

---

# FASE 3 — POOL & ORCHESTRATION

**Objetivo:** Multiplos agentes executam em paralelo, workflows rodam como state machines.
**Agente executor:** @dev (Dex) + @architect (Aria) para design
**Sprint:** 5-7

---

## Story 3.1 — Process Pool (N Concurrent Slots)

**Status:** Draft

**As a** engine,
**I want** executar N agentes simultaneamente com controle de recursos,
**so that** jobs nao esperem desnecessariamente e o sistema nao sobrecarregue.

### Acceptance Criteria

- [ ] AC 3.1.1: Pool suporta N slots concorrentes (default: `min(CPU_CORES, 5)`, configuravel)
- [ ] AC 3.1.2: `GET /pool` retorna estado atual: total slots, occupied, idle, queue depth
- [ ] AC 3.1.3: Jobs pendentes sao processados automaticamente quando slot libera (event-driven, nao polling)
- [ ] AC 3.1.4: Limite por squad: `max_per_squad` (default 3) evita monopolizacao
- [ ] AC 3.1.5: Jobs de prioridade P0 podem preempt jobs P3 (kill P3, enfileira como pending, roda P0)
- [ ] AC 3.1.6: Pool health check: detecta processos zombies (PID existe mas nao responde), limpa slots

### Tasks

- [ ] Refatorar `src/core/process-pool.ts` de single slot para N slots
- [ ] Implementar slot allocation com event emitter (slot freed → dequeue next)
- [ ] Implementar per-squad limit tracking
- [ ] Implementar preemption para P0 (configurable, default off)
- [ ] Implementar zombie detection (check PID exists periodicamente)
- [ ] Implementar `GET /pool` endpoint em `src/routes/system.ts`
- [ ] Stress test: 10 jobs simultaneos, verificar estabilidade

### Dev Notes

- Event-driven e melhor que polling: quando processo termina, emit 'slot:free', listener faz dequeue
- Preemption e agressivo — default off, ativar apenas se usuario configurar
- Zombie detection: `kill(pid, 0)` retorna true se processo existe

---

## Story 3.2 — Authority Enforcer

**Status:** Draft

**As a** engine,
**I want** validar que o agente tem permissao para a operacao solicitada,
**so that** regras de autoridade (devops=push, sm=story, po=validate) sejam respeitadas automaticamente.

### Acceptance Criteria

- [ ] AC 3.2.1: Le regras de `.claude/rules/agent-authority.md` e parseia em mapa de permissoes
- [ ] AC 3.2.2: Antes de spawnar, verifica se `agentId` pode executar `taskType` no `squadId`
- [ ] AC 3.2.3: Operacoes exclusivas bloqueadas: git push (so devops), story create (so sm), validate (so po)
- [ ] AC 3.2.4: Se bloqueado: job status → 'rejected', retorna erro com mensagem explicativa e sugestao de agente correto
- [ ] AC 3.2.5: Log de auditoria: registra todas as verificacoes (permitido e bloqueado) para rastreabilidade
- [ ] AC 3.2.6: Override configuravel em `engine.config.yaml` para ambientes de teste

### Tasks

- [ ] Implementar `src/core/authority-enforcer.ts`
- [ ] Implementar parser de agent-authority.md (extrai tabelas de permissao)
- [ ] Implementar mapa de regras: `{ agentId: { allowed: [...], blocked: [...] } }`
- [ ] Implementar check function: `canExecute(agentId, operation, squadId): boolean | { blocked, reason, suggest }`
- [ ] Implementar audit log (tabela ou arquivo)
- [ ] Implementar override flag para testes
- [ ] Testes: dev tenta push (bloqueado), devops faz push (permitido), override funciona

### Dev Notes

- `agent-authority.md` tem tabelas Markdown — parsear como structured data
- Sugestao de agente correto: se dev tenta push, sugerir devops
- Override so via config, nunca via API (seguranca)

---

## Story 3.3 — Workflow Engine (State Machine)

**Status:** Draft

**As a** engine,
**I want** executar workflows multi-fase como state machines,
**so that** o Story Development Cycle, QA Loop e Spec Pipeline rodem automaticamente.

### Acceptance Criteria

- [ ] AC 3.3.1: Le definicao de workflow de `.aios-core/development/workflows/*.yaml`
- [ ] AC 3.3.2: Implementa state machine: cada fase e um estado, transicoes definidas por resultado
- [ ] AC 3.3.3: Story Development Cycle (SDC): Create(@sm) → Validate(@po) → Implement(@dev) → QA(@qa)
- [ ] AC 3.3.4: QA Loop: Review(@qa) → Fix(@dev) → Re-review(@qa) — max 5 iteracoes
- [ ] AC 3.3.5: Spec Pipeline: Gather(@pm) → Assess(@architect) → Research(@analyst) → Write(@pm) → Critique(@qa) → Plan(@architect)
- [ ] AC 3.3.6: Resultado de cada fase determina transicao (GO→next, NO-GO→retry, BLOCKED→escalate)
- [ ] AC 3.3.7: Estado do workflow persistido no SQLite (sobrevive restart)
- [ ] AC 3.3.8: `POST /execute/orchestrate` inicia workflow, retorna workflow_id para tracking
- [ ] AC 3.3.9: WebSocket emite eventos por fase: `workflow:phase_started`, `workflow:phase_completed`, `workflow:completed`

### Tasks

- [ ] Implementar `src/core/workflow-engine.ts`
- [ ] Implementar parser de workflow YAML (extrai fases, transicoes, agentes)
- [ ] Implementar state machine generica (current_phase, transition_on_result)
- [ ] Implementar SDC como workflow concreto
- [ ] Implementar QA Loop com max_iterations
- [ ] Implementar Spec Pipeline com skip logic (complexity class)
- [ ] Implementar persistencia de estado (tabela `workflow_state` ou campo no job)
- [ ] Implementar `POST /execute/orchestrate` endpoint
- [ ] Testes: SDC completo (mock agents), QA Loop com retry, Spec Pipeline skip

### Dev Notes

- Workflows ja definidos em YAML: `story-development-cycle.yaml`, `qa-loop.yaml`
- Cada fase cria um job filho (parent_job_id = workflow job)
- Gate evaluation: parsear stdout do agente para detectar veredicto (GO/NO-GO/PASS/FAIL)
- Complexidade: SIMPLE, STANDARD, COMPLEX define quais fases rodam no Spec Pipeline

---

## Story 3.4 — Delegation Protocol (Squad Lead → Workers)

**Status:** Draft

**As a** engine,
**I want** suportar que um squad lead delegue sub-tarefas para workers,
**so that** trabalho possa ser paralelizado dentro de um squad.

### Acceptance Criteria

- [ ] AC 3.4.1: Squad lead pode retornar no output indicacao de sub-tarefas (formato definido no CLAUDE.md do lead)
- [ ] AC 3.4.2: Engine detecta indicacao de delegacao no output e cria sub-jobs automaticamente
- [ ] AC 3.4.3: Sub-jobs sem dependencia executam em paralelo (respeitando pool limits)
- [ ] AC 3.4.4: Sub-jobs com dependencia executam sequencialmente (barrier sync)
- [ ] AC 3.4.5: Quando todos sub-jobs concluem, squad lead recebe output agregado para finalizacao
- [ ] AC 3.4.6: Se sub-job falha, squad lead e notificado e decide: retry, skip ou abort

### Tasks

- [ ] Definir formato de delegacao no output (JSON block com `<!-- DELEGATE: {...} -->`)
- [ ] Implementar parser de delegacao no completion handler
- [ ] Implementar sub-job creation com parent_job_id
- [ ] Implementar barrier sync (conta sub-jobs concluidos, libera proximo quando todos done)
- [ ] Implementar agregacao de resultados para squad lead
- [ ] Implementar falha de sub-job → notificacao ao lead
- [ ] Testes: 2 workers paralelos + 1 sequencial, falha de worker

### Dev Notes

- Formato mais simples que delegate.json: usar bloco marcado no output
- Se nenhum squad lead usa delegacao inicialmente, esta story pode ser adiada
- Barrier sync: query `SELECT COUNT(*) FROM jobs WHERE parent_job_id=? AND status='done'`

---

## Story 3.5 — Team Bundle Integration

**Status:** Draft

**As a** engine,
**I want** respeitar team bundles ao configurar o pool,
**so that** o tipo de trabalho determine a composicao de agentes e limites do pool.

### Acceptance Criteria

- [ ] AC 3.5.1: Le team bundles de `.aios-core/development/agent-teams/*.yaml`
- [ ] AC 3.5.2: Cada bundle define: agentes permitidos, max concurrent, workflow default
- [ ] AC 3.5.3: `POST /execute/orchestrate` aceita `bundle` parameter opcional
- [ ] AC 3.5.4: Se bundle especificado, pool limita a agentes do bundle
- [ ] AC 3.5.5: Se agente requisitado nao pertence ao bundle ativo, retorna erro 400
- [ ] AC 3.5.6: Bundle default: `team-all` (sem restricao)

### Tasks

- [ ] Implementar leitor de team bundles YAML
- [ ] Implementar filtro de pool por bundle
- [ ] Implementar validacao de agente vs bundle
- [ ] Adicionar bundle parameter ao orchestrate endpoint
- [ ] Testes: bundle restringe pool, agente fora do bundle bloqueado

### Dev Notes

- Bundles existentes: team-all, team-fullstack, team-ide-minimal, team-no-ui, team-qa-focused
- Para v1, bundle e informacional — pool usa config global
- Para v2, bundle define limites reais do pool

---

# FASE 4 — TRIGGERS & INTEGRATION

**Objetivo:** Sistema completo com triggers automatizados e monitoramento real-time.
**Agente executor:** @dev (Dex)
**Sprint:** 8-9

---

## Story 4.1 — Webhook Triggers

**Status:** Draft

**As a** sistema externo (n8n, Zapier, custom),
**I want** disparar execucao de agentes via webhook HTTP,
**so that** eventos externos acionem agentes automaticamente.

### Acceptance Criteria

- [ ] AC 4.1.1: `POST /webhook/:squadId` aceita payload livre e enfileira job
- [ ] AC 4.1.2: `POST /webhook/orchestrator` envia para orquestrador decidir rota
- [ ] AC 4.1.3: Autenticacao via Bearer token (configuravel em engine.config.yaml)
- [ ] AC 4.1.4: Payload inclui `callback_url` opcional para notificacao na conclusao
- [ ] AC 4.1.5: Rate limiting: max 10 req/min por IP (configuravel)
- [ ] AC 4.1.6: Resposta imediata com `{ job_id, status: "queued" }` (nao espera execucao)

### Tasks

- [ ] Implementar `src/routes/webhooks.ts`
- [ ] Implementar auth middleware (Bearer token check)
- [ ] Implementar rate limiter (in-memory com window sliding)
- [ ] Implementar mapeamento squadId → agente default do squad
- [ ] Implementar rota orchestrator (analisa payload, decide squad)
- [ ] Testes: webhook dispara job, callback funciona, auth bloqueia sem token

### Dev Notes

- Orquestrador: para v1, mapeamento simples por keywords no payload. Para v2, usar LLM para routing.
- Callback POST envia: `{ job_id, status, agent, duration_ms, artefatos[] }`

---

## Story 4.2 — Cron Jobs (Tarefas Recorrentes)

**Status:** Draft

**As a** operador do AIOX,
**I want** configurar tarefas que executam automaticamente em intervalos,
**so that** relatorios, analises e rotinas rodem sem intervencao manual.

### Acceptance Criteria

- [ ] AC 4.2.1: `POST /cron` registra job recorrente: `{ squadId, agentId, schedule, input }`
- [ ] AC 4.2.2: Schedule suporta sintaxe cron padrao (ex: `0 8 * * 1` = toda segunda 8h)
- [ ] AC 4.2.3: `GET /cron` lista crons ativos com proxima execucao
- [ ] AC 4.2.4: `DELETE /cron/:id` remove cron
- [ ] AC 4.2.5: Cron jobs sao persistidos em SQLite (sobrevivem restart)
- [ ] AC 4.2.6: Se execucao anterior ainda running quando cron dispara, pula (nao acumula)

### Tasks

- [ ] Implementar `src/routes/cron.ts`
- [ ] Implementar cron scheduler (parser de expressao + timer)
- [ ] Implementar persistencia de cron definitions (tabela `cron_jobs`)
- [ ] Implementar overlap detection (nao enfileira se job anterior running)
- [ ] Implementar restore de crons no boot do server
- [ ] Testes: cron dispara no horario, overlap prevenido, persist sobrevive restart

### Dev Notes

- Lib de cron: `croner` (0 deps, funciona com Bun)
- Crons sao restaurados do SQLite no boot — nao dependem de config file
- Maxima resolucao: 1 minuto (nao suportar segundos)

---

## Story 4.3 — Dashboard WebSocket Bridge

**Status:** Draft

**As a** dashboard frontend,
**I want** receber eventos do engine em tempo real via WebSocket,
**so that** MonitorStore, BobStore e AgentActivityStore atualizem a UI automaticamente.

### Acceptance Criteria

- [ ] AC 4.3.1: `WS /live` aceita conexao WebSocket do dashboard
- [ ] AC 4.3.2: Eventos emitidos: `job:created`, `job:started`, `job:completed`, `job:failed`, `workflow:phase_changed`, `memory:stored`
- [ ] AC 4.3.3: Formato de evento compativel com MonitorStore (`src/stores/monitorStore.ts`)
- [ ] AC 4.3.4: Suporta multiplos dashboards conectados simultaneamente (broadcast)
- [ ] AC 4.3.5: Heartbeat ping/pong a cada 30s (compativel com WebSocketManager do frontend)
- [ ] AC 4.3.6: Reconexao automatica: se dashboard desconecta e reconecta, recebe eventos perdidos (buffer de 100 eventos)

### Tasks

- [ ] Implementar `src/lib/ws.ts` com WebSocket server (Bun nativo)
- [ ] Implementar event broadcaster (pub/sub pattern)
- [ ] Implementar event buffer circular (100 eventos)
- [ ] Implementar heartbeat ping/pong handler
- [ ] Mapear eventos internos → formato MonitorStore
- [ ] Implementar replay on reconnect (envia buffer ao conectar)
- [ ] Testes: dashboard conecta, recebe eventos, reconecta e recebe replay

### Dev Notes

- MonitorStore espera eventos com formato: `{ type, data, timestamp }`
- WebSocketManager do frontend ja tem auto-reconnect e heartbeat — so precisa compatibilizar
- Buffer circular: array fixo de 100, sobrescreve mais antigo

---

## Story 4.4 — SSE Streaming de Execucao

**Status:** Draft

**As a** dashboard frontend,
**I want** acompanhar a execucao de um agente em tempo real via SSE,
**so that** o chat mostre output parcial enquanto o agente trabalha.

### Acceptance Criteria

- [ ] AC 4.4.1: `POST /execute/agent/stream` abre conexao SSE
- [ ] AC 4.4.2: Eventos SSE: `start` (execucao iniciou), `text` (output parcial), `tools` (ferramenta usada), `done` (resultado final), `error`
- [ ] AC 4.4.3: Formato compativel com StreamCallbacks do frontend (`src/services/api/client.ts`)
- [ ] AC 4.4.4: Stream do stdout do `claude` CLI em tempo real (nao buffer tudo)
- [ ] AC 4.4.5: Se conexao SSE fecha antes de completar, job continua (nao cancela)
- [ ] AC 4.4.6: `--output-format stream-json` do claude CLI parseado em eventos SSE

### Tasks

- [ ] Implementar SSE endpoint em `src/routes/execute.ts`
- [ ] Implementar pipe de stdout do Bun.spawn → SSE stream
- [ ] Implementar parser de `stream-json` → eventos SSE tipados
- [ ] Implementar detach: SSE close nao mata job
- [ ] Mapear para StreamCallbacks: onStart, onText, onTools, onDone, onError
- [ ] Testes: stream mostra output parcial, desconexao nao cancela job

### Dev Notes

- `claude --output-format stream-json` emite JSON lines com tipos: `text`, `tool_use`, `result`
- Hono suporta SSE nativamente: `return streamSSE(c, async (stream) => { ... })`
- O frontend ja tem `apiClient.stream()` que consome SSE — so precisa compatibilizar formato

---

# Resumo das Stories

| ID | Story | Fase | Pontos | Prioridade |
|----|-------|------|--------|------------|
| 1.1 | Server Bootstrap + Health | 1 | 3 | Critical |
| 1.2 | SQLite Database + Migrations | 1 | 3 | Critical |
| 1.3 | Job Queue | 1 | 5 | Critical |
| 1.4 | Process Spawn Basico | 1 | 8 | Critical |
| 1.5 | Execute API | 1 | 5 | Critical |
| 2.1 | Context Builder | 2 | 8 | High |
| 2.2 | Memory Client | 2 | 8 | High |
| 2.3 | Workspace Manager | 2 | 5 | High |
| 2.4 | Completion Handler | 2 | 8 | High |
| 3.1 | Process Pool (N Slots) | 3 | 8 | High |
| 3.2 | Authority Enforcer | 3 | 5 | High |
| 3.3 | Workflow Engine | 3 | 13 | High |
| 3.4 | Delegation Protocol | 3 | 8 | Medium |
| 3.5 | Team Bundle Integration | 3 | 3 | Medium |
| 4.1 | Webhook Triggers | 4 | 5 | Medium |
| 4.2 | Cron Jobs | 4 | 5 | Medium |
| 4.3 | Dashboard WebSocket Bridge | 4 | 5 | Medium |
| 4.4 | SSE Streaming | 4 | 8 | Medium |

**Total: 18 stories, 113 pontos**

---

## Dependencias entre Stories

```
1.1 ─→ 1.2 ─→ 1.3 ─→ 1.4 ─→ 1.5
                │              │
                ▼              ▼
              2.1 ──────→ 2.4
              2.2 ──────→ 2.4
              2.3 ──────→ 2.4
                           │
                           ▼
                    3.1 (refatora 1.4)
                    3.2
                    3.3 (depende de 3.1 + 2.4)
                    3.4 (depende de 3.1 + 3.3)
                    3.5 (depende de 3.1)
                           │
                           ▼
                    4.1 (depende de 1.3)
                    4.2 (depende de 1.3)
                    4.3 (depende de 2.4)
                    4.4 (depende de 1.4)
```

---

## Criterios de Done do Epic

- [ ] Engine roda standalone com `bun run engine`
- [ ] Dashboard conecta e exibe jobs em tempo real
- [ ] Pelo menos 1 workflow completo (SDC) executando end-to-end
- [ ] Memory recall e store funcionando com Supermemory
- [ ] Webhooks disparam jobs com callback
- [ ] 3+ agentes executando em paralelo sem degradacao
- [ ] Testes unitarios para cada modulo core (>80% coverage)
- [ ] Documentacao de operacao (como configurar, monitorar, troubleshoot)
