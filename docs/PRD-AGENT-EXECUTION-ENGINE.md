# PRD — AIOS Agent Execution Engine

**Versao:** 1.0
**Data:** 2026-03-08
**Autor:** @architect (Aria) + @pm (Morgan)
**Status:** Draft
**Epic Ref:** EPIC-AGENT-EXECUTION-ENGINE

---

## 1. Visao Geral

### 1.1 Problema

O AIOS possui 50+ squads, 13 agentes core com personas completas (CLAUDE.md, voiceDna, authority matrix), 4 workflows formais (SDC, QA Loop, Spec Pipeline, Brownfield), um dashboard com real-time monitoring e APIs tipadas — mas **nao tem motor de execucao**. Hoje, agentes so rodam via invocacao manual `@agent` no Claude Code CLI. Nao ha:

- Execucao automatizada (cron, webhook, evento)
- Fila de jobs com prioridade e retry
- Context assembly automatico (recall Supermemory + CLAUDE.md + input)
- Process pool para execucao paralela de workers
- Persistencia de memoria pos-execucao
- Completion tracking (o que o agente fez, quanto tempo levou, o que aprendeu)

### 1.2 Objetivo

Construir o **Agent Execution Engine** — backend que transforma o AIOX de um dashboard de visualizacao em um sistema de orquestracao real, onde agentes podem ser disparados por triggers, executam com contexto completo, e o sistema coleta resultados e persiste aprendizados.

### 1.3 Principio Fundamental: Agente Define o Output

O engine **nao decide** o que o agente produz. Cada agente/squad tem seu CLAUDE.md que define capacidades, protocolo de saida e tipo de trabalho. Um dev faz deploy. Um copywriter gera copy. Um analyst produz relatorio. O engine:

1. **Prepara** (context assembly, memory recall, workspace)
2. **Executa** (spawna CLI com contexto correto)
3. **Coleta** (exit status, artefatos gerados, git diff, logs)
4. **Persiste** (memoria, metricas, historico)
5. **Notifica** (dashboard, callback se trigger externo)

### 1.4 Stack Tecnologica

| Camada | Tecnologia | Justificativa |
|--------|-----------|---------------|
| Runtime | Bun | Mesmo runtime do relay server (EPIC-DASHBOARD-ONLINE), WebSocket nativo, rapido |
| Framework | Hono | Leve, tipado, compativel com Bun, sem overhead de Express |
| Job Queue | SQLite (via bun:sqlite) | Zero deps, local-first, persistente, queries SQL nativas |
| Process Mgmt | `Bun.spawn()` | Spawn nativo de processos, controle de stdin/stdout/stderr |
| Memory | Supermemory MCP + Qdrant MCP | Ja conectados no ecossistema, recall semantico |
| Real-time | WebSocket (Bun nativo) | Pub/sub para dashboard, mesma infra do relay |
| Config | YAML (agents/*.md + squad configs) | Ja existente no .aios-core/ |

---

## 2. Questionamentos Criticos (Pre-Decisoes)

Antes de definir a arquitetura, questionamos cada decisao:

### Q1: Backend separado ou monolito com o dashboard?

**Decisao: Separado.**
- O dashboard e um SPA React (Vite). Misturar backend de execucao nele acopla concerns distintos.
- O relay server (EPIC-DASHBOARD-ONLINE) ja e separado.
- Permite escalar engine independente do frontend.
- Permite rodar engine sem dashboard (headless, apenas CLI + triggers).

### Q2: Bun vs Node.js para o engine?

**Decisao: Bun.**
- O relay server ja usa Bun (consistencia de runtime).
- `bun:sqlite` nativo, sem instalar pacotes.
- `Bun.spawn()` mais performante que `child_process.spawn()`.
- O `aios-core-meta-gpt` (backend atual referenciado no package.json) usa Node — este engine o substitui.

### Q3: Hono vs Fastify vs Express?

**Decisao: Hono.**
- Express e legacy, Fastify e Node-first (Bun support e experimental).
- Hono e Bun-first, tipado nativamente, 0 deps, middleware simples.
- Para um engine que prioriza throughput de jobs sobre complexidade HTTP, o minimalismo e vantagem.

### Q4: SQLite vs Redis vs BullMQ para job queue?

**Decisao: SQLite.**
- Engine roda local na maquina do usuario (nao e cloud-first).
- SQLite nao precisa de daemon externo (Redis requer servidor rodando).
- BullMQ depende de Redis.
- SQLite persiste no filesystem, sobrevive a reinicio sem config.
- Se escalar para cloud, migra para PostgreSQL com mesma interface SQL.

### Q5: Spawn `claude` CLI vs usar Anthropic API diretamente?

**Decisao: Spawn `claude` CLI.**
- O usuario tem Claude Max — CLI usa a cota inclusa sem custo extra de API.
- CLI ja tem acesso a ferramentas (Read, Write, Bash, MCP servers).
- CLI ja respeita CLAUDE.md, hooks, regras do projeto.
- API direta exigiria reimplementar todo o tooling do Claude Code.
- Tradeoff: menos controle programatico, mais funcionalidade inclusa.

### Q6: Process pool com limite fixo vs dinamico?

**Decisao: Dinamico baseado em team bundle.**
- Limite fixo (`max: 5`) e arbitrario e nao considera o tipo de trabalho.
- Team bundles (`team-all.yaml`, `team-fullstack.yaml`, `team-qa-focused.yaml`) ja definem composicao de agentes.
- O pool adapta limites por bundle: `team-qa-focused` pode ter max 3 (qa e sequencial), `team-all` pode ter max 5.
- Config padrao: `max_concurrent = min(CPU_CORES, 5)` com override por bundle.

### Q7: Supermemory como unico store vs dual memory?

**Decisao: Dual (Supermemory + Qdrant).**
- Supermemory: recall semantico de insights, decisoes, padroes (texto livre).
- Qdrant: embeddings de codigo, docs, schemas (vetorial estruturado).
- Cada scope define qual backend usar.
- Se Supermemory indisponivel, engine executa sem recall (graceful degradation).

### Q8: Workspace por job vs git worktree?

**Decisao: Git worktree para jobs de codigo, diretorio simples para jobs de analise.**
- Jobs de dev/qa que modificam codigo precisam de isolamento git (evita conflitos).
- `git worktree add` cria copia isolada do repo sem duplicar .git.
- Jobs de analise/copywriting que so produzem artefatos usam diretorio temporario.
- O tipo de workspace e definido pelo squad type: `engineering`/`development` = worktree, outros = diretorio.

### Q9: Authority enforcer no engine vs confianca no CLAUDE.md?

**Decisao: Enforcer no engine.**
- Confiar apenas no CLAUDE.md e confiar no LLM para se auto-restringir — fragil.
- O engine valida ANTES de spawnar: "este agente tem permissao para esta operacao?"
- Regras derivadas de `agent-authority.md`: devops=push, sm=story, po=validate.
- Se o agente tenta git push sem ser devops, o engine bloqueia no spawn, nao na execucao.

### Q10: Como o agente comunica resultado para o engine?

**Decisao: Filesystem + exit code + git diff.**
- O agente ja trabalha no filesystem (CLAUDE.md define protocolo de saida).
- Exit code 0 = sucesso, != 0 = falha.
- Para jobs de codigo: `git diff --stat` captura o que mudou.
- Para jobs de artefato: engine lista arquivos novos/modificados no workspace.
- **NAO** usar `delegate.json` ou protocolo customizado — complexidade desnecessaria.
- O agente faz seu trabalho nativo, o engine observa o resultado.

---

## 3. Arquitetura

```
┌─────────────────────────────────────────────────────────────────────┐
│                          TRIGGER LAYER                              │
│                                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────────────┐  │
│  │ n8n MCP  │  │ Cron     │  │ Webhook  │  │ Dashboard GUI     │  │
│  │ (search/ │  │ (built-  │  │ (POST /  │  │ (POST /execute/   │  │
│  │  execute)│  │  in)     │  │  webhook)│  │  agent)           │  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────────┬──────────┘  │
└───────┼──────────────┼─────────────┼─────────────────┼─────────────┘
        │              │             │                 │
        └──────────────┴─────────────┴─────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────────┐
│                    AGENT EXECUTION ENGINE (Bun + Hono)              │
│                                                                     │
│  ┌───────────────┐  ┌────────────────┐  ┌───────────────────────┐  │
│  │ Job Router    │  │ Authority      │  │ Context Builder       │  │
│  │               │  │ Enforcer       │  │                       │  │
│  │ - validates   │  │                │  │ - reads CLAUDE.md     │  │
│  │   input       │  │ - checks agent │  │ - recall Supermemory  │  │
│  │ - creates job │  │   permissions  │  │ - recall Qdrant       │  │
│  │ - routes to   │  │ - blocks if    │  │ - injects input       │  │
│  │   queue       │  │   unauthorized │  │ - builds prompt       │  │
│  └───────┬───────┘  └────────┬───────┘  └───────────┬───────────┘  │
│          │                   │                      │              │
│  ┌───────▼───────────────────▼──────────────────────▼───────────┐  │
│  │                      JOB QUEUE (SQLite)                      │  │
│  │                                                              │  │
│  │  id | squad | agent | status | priority | input | output     │  │
│  │  ---|-------|-------|--------|----------|-------|--------     │  │
│  │  ... pending → running → done/failed/timeout                │  │
│  └──────────────────────────┬───────────────────────────────────┘  │
│                             │                                      │
│  ┌──────────────────────────▼───────────────────────────────────┐  │
│  │                    PROCESS POOL                              │  │
│  │                                                              │  │
│  │  Slot 1: claude -p "..." --allowedTools "..."  [RUNNING]    │  │
│  │  Slot 2: claude -p "..." --allowedTools "..."  [RUNNING]    │  │
│  │  Slot 3: (idle)                                             │  │
│  │  Slot N: (idle)                       max = f(team_bundle)  │  │
│  └──────────────────────────┬───────────────────────────────────┘  │
│                             │                                      │
│  ┌──────────────────────────▼───────────────────────────────────┐  │
│  │                  COMPLETION HANDLER                          │  │
│  │                                                              │  │
│  │  1. Captura exit code + stdout/stderr                       │  │
│  │  2. Detecta artefatos (git diff, novos arquivos)            │  │
│  │  3. Extrai memoria (se protocolo definido no CLAUDE.md)     │  │
│  │  4. Persiste em Supermemory/Qdrant com scopes              │  │
│  │  5. Atualiza job status + metricas                          │  │
│  │  6. Notifica via WebSocket (MonitorStore do dashboard)      │  │
│  │  7. Se trigger externo → responde callback                  │  │
│  │  8. Se workflow → enfileira proximo step                    │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 4. Modelo de Dados (SQLite)

### 4.1 Jobs

```sql
CREATE TABLE jobs (
  id            TEXT PRIMARY KEY,        -- ulid
  squad_id      TEXT NOT NULL,
  agent_id      TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending',
  priority      INTEGER NOT NULL DEFAULT 2,
  input_payload TEXT NOT NULL,           -- JSON
  output_result TEXT,                    -- JSON (preenchido na conclusao)
  context_hash  TEXT,                    -- hash do contexto montado
  parent_job_id TEXT,                    -- se e sub-job de um workflow
  workflow_id   TEXT,                    -- se faz parte de um workflow
  trigger_type  TEXT NOT NULL,           -- 'gui' | 'webhook' | 'cron' | 'workflow' | 'n8n'
  callback_url  TEXT,                    -- URL para notificar quando concluir
  workspace_dir TEXT,                    -- caminho do workspace/worktree
  pid           INTEGER,                -- PID do processo claude
  attempts      INTEGER DEFAULT 0,
  max_attempts  INTEGER DEFAULT 3,
  timeout_ms    INTEGER DEFAULT 300000,  -- 5 min default
  started_at    TEXT,
  completed_at  TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  error_message TEXT,
  metadata      TEXT                     -- JSON livre
);

CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_squad ON jobs(squad_id);
CREATE INDEX idx_jobs_parent ON jobs(parent_job_id);
CREATE INDEX idx_jobs_workflow ON jobs(workflow_id);
```

### 4.2 Memory Log

```sql
CREATE TABLE memory_log (
  id         TEXT PRIMARY KEY,
  job_id     TEXT NOT NULL REFERENCES jobs(id),
  scope      TEXT NOT NULL,              -- 'global' | 'squad:{id}' | 'agent:{id}'
  content    TEXT NOT NULL,
  type       TEXT,                       -- 'TENDENCIA' | 'PADRAO' | 'DECISAO' | 'APRENDIZADO'
  tags       TEXT,                       -- JSON array
  backend    TEXT NOT NULL,              -- 'supermemory' | 'qdrant'
  stored_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### 4.3 Executions (Metricas)

```sql
CREATE TABLE executions (
  id            TEXT PRIMARY KEY,
  job_id        TEXT NOT NULL REFERENCES jobs(id),
  squad_id      TEXT NOT NULL,
  agent_id      TEXT NOT NULL,
  duration_ms   INTEGER,
  exit_code     INTEGER,
  tokens_used   INTEGER,                -- se disponivel
  files_changed INTEGER DEFAULT 0,
  memory_stored INTEGER DEFAULT 0,
  success       BOOLEAN,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
```

---

## 5. Endpoints da API

### 5.1 Execucao (alinhados com execute.ts do frontend)

```
POST   /execute/agent              Executa agente (sync, retorna quando concluir)
POST   /execute/agent/stream       Executa com SSE streaming de progresso
POST   /execute/orchestrate        Multi-agente com workflow
GET    /execute/status/:id         Status de uma execucao
DELETE /execute/status/:id         Cancela execucao
GET    /execute/history            Historico de execucoes
GET    /execute/stats              Estatisticas agregadas
```

### 5.2 Jobs

```
GET    /jobs                       Lista jobs (filtros: status, squad, agent)
GET    /jobs/:id                   Detalhes do job (input, output, metricas)
POST   /jobs/:id/retry             Re-enfileira job falhado
DELETE /jobs/:id                   Remove job da fila (se pending)
GET    /jobs/queue                 Estado atual da fila (pending count, running)
```

### 5.3 Triggers

```
POST   /webhook/:squadId           Trigger externo para squad
POST   /webhook/orchestrator       Trigger para orquestrador decidir rota
POST   /cron                       Registra/atualiza job recorrente
GET    /cron                       Lista crons ativos
DELETE /cron/:id                   Remove cron
```

### 5.4 Memory

```
GET    /memory/:scope              Consulta memorias por escopo
POST   /memory/recall              Recall semantico (query + scope + limit)
POST   /memory/store               Store manual de memoria
DELETE /memory/:id                 Remove memoria especifica
```

### 5.5 System

```
GET    /health                     Health check do engine
GET    /pool                       Estado do process pool (slots, running)
WS     /live                       WebSocket para dashboard (eventos real-time)
```

---

## 6. Fluxo de Execucao Detalhado

### 6.1 Fluxo Basico (Single Agent)

```
1. TRIGGER
   POST /execute/agent { squadId: "full-stack-dev", agentId: "dev", input: { message: "..." } }

2. JOB ROUTER
   - Valida payload (squadId existe? agentId pertence ao squad?)
   - Gera job ID (ulid)
   - Define prioridade (default P2, override via payload)
   - Insere na fila: status = 'pending'

3. AUTHORITY CHECK
   - Le agent-authority.md rules
   - Verifica se operacao e permitida para este agente
   - Se bloqueado: job → 'rejected', retorna erro 403

4. CONTEXT ASSEMBLY
   - Le .aios-core/development/agents/{agentId}.md (CLAUDE.md do agente)
   - Recall Supermemory: query(input.message, scope=[global, squad:{squadId}])
   - Recall Qdrant: se squad.type in [engineering, development]
   - Monta prompt final: persona + memorias + input

5. WORKSPACE SETUP
   - Se squad.type in [engineering, development]:
     git worktree add .workspace/{jobId} -b job/{jobId}
   - Senao:
     mkdir -p .workspace/{jobId}
   - Salva input em .workspace/{jobId}/input.md

6. PROCESS SPAWN
   - Verifica slot livre no pool
   - Se lotado: job permanece 'pending' na fila com TTL
   - Se livre:
     Bun.spawn(["claude", "--dangerously-skip-permissions",
       "-p", contextPrompt,
       "--allowedTools", toolsForAgent],
       { cwd: workspaceDir })
   - Job status → 'running', PID registrado

7. MONITORING
   - Stream stdout/stderr para log
   - Envia eventos via WebSocket: job:started, job:progress
   - Monitora timeout (kill se exceder timeout_ms)

8. COMPLETION
   - Processo termina → captura exit code
   - Se exit 0:
     - git diff --stat no worktree (se aplicavel)
     - Lista arquivos novos/modificados
     - Job status → 'done'
   - Se exit != 0:
     - Captura stderr como error_message
     - Se attempts < max_attempts: reenfileira como 'pending'
     - Senao: status → 'failed'

9. POST-PROCESSING
   - Se CLAUDE.md define protocolo de memoria:
     Parseia output para extrair insights por scope
     Store em Supermemory/Qdrant com metadados
   - Atualiza tabela executions com metricas
   - Envia WebSocket: job:completed ou job:failed
   - Se callback_url: POST resultado para URL

10. CLEANUP
    - Se worktree e job bem-sucedido:
      git worktree remove .workspace/{jobId}
      (commits ja estao no branch job/{jobId})
    - Se diretorio simples:
      Arquiva ou remove conforme policy
    - Libera slot no pool
```

### 6.2 Fluxo Workflow (Multi-Agent)

```
1. POST /execute/orchestrate {
     workflow: "story-development-cycle",
     input: { storyId: "3.1" }
   }

2. ENGINE carrega .aios-core/development/workflows/story-development-cycle.yaml

3. WORKFLOW STATE MACHINE:
   Phase 1 (Create): enfileira job(@sm, task=create-story)
     → aguarda conclusao
     → extrai output (story file path)

   Phase 2 (Validate): enfileira job(@po, task=validate-story, input=story_path)
     → aguarda conclusao
     → se verdict=NO-GO: retorna a Phase 1 com fixes
     → se verdict=GO: continua

   Phase 3 (Implement): enfileira job(@dev, task=develop-story, input=story_path)
     → aguarda conclusao
     → QA self-healing loop (max 2 iteracoes internas)

   Phase 4 (QA Gate): enfileira job(@qa, task=qa-gate, input=story_path)
     → se PASS: workflow → 'completed'
     → se FAIL: retorna Phase 3 com feedback
     → se CONCERNS: workflow → 'completed' com warnings

4. Cada fase atualiza workflow status + emite WebSocket events
5. Workflow completo → notifica dashboard com resultado agregado
```

---

## 7. Fases de Desenvolvimento

### Fase 1 — Engine Core
**Escopo:** Server + Job Queue + Process Spawn basico + Health API
**Entrega:** Engine roda, recebe POST, enfileira, executa 1 agente, retorna resultado
**Stories:** 1.1 a 1.5

### Fase 2 — Context & Memory
**Escopo:** Context Builder + Supermemory recall/store + Workspace manager
**Entrega:** Agentes executam com contexto completo (persona + memorias + input)
**Stories:** 2.1 a 2.4

### Fase 3 — Pool & Orchestration
**Escopo:** Process Pool (N concurrent) + Workflow Engine + Authority Enforcer
**Entrega:** Workflows multi-agente executam com paralelismo e gates
**Stories:** 3.1 a 3.5

### Fase 4 — Triggers & Integration
**Escopo:** Webhooks + Cron + n8n bridge + Dashboard WebSocket
**Entrega:** Sistema completo com triggers automatizados e monitoramento real-time
**Stories:** 4.1 a 4.4

---

## 8. Riscos e Mitigacoes

| Risco | Impacto | Probabilidade | Mitigacao |
|-------|---------|---------------|-----------|
| Claude CLI muda flags/API | Alto | Media | Wrapper abstrai invocacao, facilita adaptacao |
| Supermemory indisponivel | Medio | Baixa | Graceful degradation: executa sem recall |
| Process pool esgota memoria | Alto | Media | Limite dinamico por CPU, kill por timeout |
| Worktree conflita com trabalho manual | Medio | Media | Branch isolado `job/`, merge explicito |
| SQLite lock contention em paralelo | Baixo | Baixa | WAL mode, writes serializados |

---

## 9. Metricas de Sucesso

| Metrica | Target |
|---------|--------|
| Tempo medio de spawn (trigger → CLI running) | < 3s |
| Jobs concorrentes sem degradacao | >= 3 |
| Uptime do engine (self-recovery) | > 99% |
| Recall accuracy (memorias relevantes) | > 70% |
| Taxa de retry com sucesso | > 50% |
| Workflows SDC completos sem intervencao | > 80% |

---

## 10. Fora de Escopo (v1)

- Cloud deployment do engine (v1 e local-first)
- UI para configurar crons/workflows (usa arquivos YAML)
- Custo tracking de tokens (depende de API do Claude Code)
- Multi-tenant / multi-usuario
- Marketplace de squads/agentes
