# EPIC: AIOS Dashboard Online — Real-Time Cloud Dashboard

## Contexto

O AIOS Dashboard hoje funciona **apenas localmente**: Monitor Server (Bun, porta 4001) recebe eventos dos hooks do Claude Code, armazena em SQLite, e o frontend Vite conecta via WebSocket. Sem autenticacao, sem multi-tenant, dependente do filesystem local.

**Objetivo**: Transformar em aplicacao online onde o usuario roda um CLI local (`npx aios-dash`) que conecta a um relay server na nuvem, permitindo visualizar o dashboard de qualquer lugar em tempo real.

---

## 1. Arquitetura do Sistema

```
+--------------------+          +---------------------+         +--------------------+
|   Maquina Local    |   WSS    |   Relay Server      |   WSS   |   Frontend         |
|                    |--------->|   (Railway)         |<--------|   (Vercel)         |
|  Claude Code hooks |          |                     |         |                    |
|       |            |          |  +---------------+  |         |  React SPA (Vite)  |
|       v POST       |          |  | Room Manager  |  |         |  app.aios.dev      |
|  +-----------+     |          |  +---------------+  |         |                    |
|  | aios-dash |-----+          |  +---------------+  |         +--------------------+
|  | CLI       |     |          |  | Auth (JWT)    |  |
|  | port 4001 |     |          |  +---------------+  |
|  +-----------+     |          |  +---------------+  |
+--------------------+          |  | Event Buffer  |  |
                                |  | (200/room)    |  |
                                |  +---------------+  |
                                |  +---------------+  |
                                |  | PostgreSQL    |  |
                                |  +---------------+  |
                                |  relay.aios.dev     |
                                +---------------------+
```

### Fluxo de Dados

1. Claude Code dispara hook (ex: `PostToolUse`)
2. Hook faz `POST localhost:4001/events` (mesma interface atual)
3. CLI `aios-dash` recebe e encaminha via WebSocket para `wss://relay.aios.dev/cli`
4. Relay valida JWT, identifica o room, adiciona ao buffer
5. Relay faz broadcast para todos os dashboards conectados ao room
6. Dashboard recebe evento e atualiza em tempo real

### Fluxo de Autenticacao

```
CLI:       npx aios-dash login → GitHub Device Flow → JWT salvo em ~/.aios/config.json
Frontend:  "Sign in with GitHub" → OAuth redirect → JWT em localStorage
```

### Rooms (Sessoes)

- Cada conexao CLI = um **room** (identificado por `room_{user}_{project}_{random}`)
- Room criado ao conectar CLI, inativo 5min apos desconexao, limpo apos 24h
- Somente o dono pode ver seu room no dashboard
- Um usuario pode ter multiplos rooms (projetos diferentes)

---

## 2. Relay Server

### Tecnologia: Bun

Mesmo runtime do `server/server.ts` atual. Bun tem WebSocket nativo com pub/sub (`ws.subscribe(topic)`, `ws.publish(topic, data)`) — ideal para rooms.

### Endpoints REST

```
POST   /auth/github/callback     GitHub OAuth callback
POST   /auth/device-code         Iniciar Device Flow (CLI)
POST   /auth/device-token        Poll do Device Flow
GET    /auth/me                  Info do usuario logado

GET    /rooms                    Listar rooms do usuario
POST   /rooms                    Criar room (CLI faz no connect)
GET    /rooms/:id                Detalhes do room
DELETE /rooms/:id                Deletar room
GET    /rooms/:id/events         Eventos do buffer (REST fallback)
GET    /rooms/:id/stats          Estatisticas do room

GET    /health                   Health check
```

### Endpoints WebSocket

```
WSS /cli?token=JWT&room=ROOM_ID        CLI envia eventos
WSS /dashboard?token=JWT&room=ROOM_ID  Dashboard recebe eventos
```

### Room Manager (Bun pub/sub)

```typescript
// CLI envia evento
ws.on('message', (msg) => {
  const { roomId } = ws.data;
  const parsed = JSON.parse(msg);

  // Adiciona ao buffer circular (200 eventos)
  eventBuffers.get(roomId)?.push(parsed.event);

  // Broadcast para todos no room
  ws.publish(`room:${roomId}`, msg);
});

// Dashboard conecta — recebe replay do buffer
ws.on('open', () => {
  const { roomId } = ws.data;
  ws.subscribe(`room:${roomId}`);

  const buffer = eventBuffers.get(roomId);
  ws.send(JSON.stringify({ type: 'init', events: buffer?.getAll() ?? [] }));
});
```

### Schema PostgreSQL (Railway) — Fase 2+

```sql
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  github_id     BIGINT UNIQUE NOT NULL,
  github_login  VARCHAR(255) NOT NULL,
  avatar_url    VARCHAR(512),
  email         VARCHAR(255),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  last_login    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE api_keys (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES users(id) ON DELETE CASCADE,
  key_hash      VARCHAR(64) NOT NULL,
  key_prefix    VARCHAR(8) NOT NULL,
  name          VARCHAR(255) DEFAULT 'default',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  last_used     TIMESTAMPTZ,
  UNIQUE(user_id, name)
);

CREATE TABLE rooms (
  id            VARCHAR(64) PRIMARY KEY,
  user_id       UUID REFERENCES users(id) ON DELETE CASCADE,
  project_name  VARCHAR(255) NOT NULL,
  project_path  VARCHAR(1024),
  status        VARCHAR(20) DEFAULT 'active',  -- active | idle | closed
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  metadata      JSONB DEFAULT '{}'
);

-- Fase 3: persistencia de eventos
CREATE TABLE events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id       VARCHAR(64) REFERENCES rooms(id) ON DELETE CASCADE,
  type          VARCHAR(50) NOT NULL,
  timestamp     BIGINT NOT NULL,
  session_id    VARCHAR(255),
  tool_name     VARCHAR(255),
  is_error      BOOLEAN DEFAULT FALSE,
  aios_agent    VARCHAR(50),
  data          JSONB,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_events_room ON events(room_id, timestamp DESC);
```

### Diferenca do Monitor Server Atual

| Aspecto | Monitor Server (local) | Relay Server (cloud) |
|---------|----------------------|---------------------|
| Storage | SQLite local | In-memory + PostgreSQL |
| Auth | Nenhuma | JWT via GitHub OAuth |
| Multi-tenant | Single user | Multi-user, multi-room |
| WebSocket | Broadcast flat | Room-based pub/sub |
| Dados locais | Le filesystem, git, transcripts | So eventos do CLI |
| Fonte de eventos | POST direto dos hooks | Forward do CLI via WSS |

---

## 3. CLI (`aios-dash`)

### Estrutura

```
packages/aios-dash/
  src/
    cli.ts            # Entry point, arg parsing
    relay.ts          # WebSocket para relay
    auth.ts           # GitHub Device Flow + API key
    local-server.ts   # HTTP server porta 4001
    config.ts         # ~/.aios/config.json
  package.json        # bin: { "aios-dash": "./dist/cli.js" }
```

### Fluxo de Startup

```bash
$ npx aios-dash --project ./meu-projeto

1. Le ~/.aios/config.json (token, relay_url)
2. Se nao tem token: roda GitHub Device Flow
3. Resolve project (le package.json → nome)
4. POST /rooms no relay para criar/obter room
5. Abre WebSocket para wss://relay.aios.dev/cli?token=JWT&room=ROOM_ID
6. Inicia HTTP server em localhost:4001
7. Imprime:

   ✓ AIOS Dashboard Online
   Room:       room_u7k3_proj_a2b4c6
   Dashboard:  https://app.aios.dev/room/room_u7k3_proj_a2b4c6
   Local:      http://localhost:4001

8. Encaminha POST /events → relay via WebSocket
9. Keepalive com ping/pong a cada 30s
```

### Zero mudancas nos hooks do Claude Code

O CLI roda um servidor HTTP na **mesma porta 4001** e aceita o **mesmo POST /events**. Os hooks do Claude Code continuam funcionando identicamente — o CLI e um proxy transparente.

### Comandos

```
npx aios-dash                      # Inicia (projeto = cwd)
npx aios-dash --project ./path     # Especifica projeto
npx aios-dash login                # GitHub Device Flow
npx aios-dash logout               # Remove token
npx aios-dash rooms                # Lista rooms ativos
npx aios-dash config set key val   # Configura
```

### Reconexao

Backoff exponencial: 1s → 2s → 5s → 10s → 30s. Durante desconexao, eventos sao bufferizados localmente (ultimos 100). No reconectar, envia `bulk_events` para backfill.

### Config (`~/.aios/config.json`)

```json
{
  "relay_url": "wss://relay.aios.dev",
  "api_key": "aios_k7x9m2p4q...",
  "user": {
    "id": "uuid",
    "github_login": "oalanicolas"
  }
}
```

---

## 4. Mudancas no Frontend

### 4.1 monitorStore.ts — Modo dual

```typescript
const MONITOR_URL = import.meta.env.VITE_MONITOR_URL || 'http://localhost:4001';
const RELAY_URL = import.meta.env.VITE_RELAY_URL;  // undefined = local mode

connectToMonitor: (options?: { roomId?: string; token?: string }) => {
  if (RELAY_URL && options?.roomId) {
    // Cloud mode: conecta ao relay
    openWebSocket(`${RELAY_URL}/dashboard?room=${options.roomId}&token=${options.token}`);
  } else {
    // Local mode: comportamento atual
    openWebSocket(`${MONITOR_URL.replace(/^http/, 'ws')}/stream`);
  }
}
```

### 4.2 Novos arquivos

```
aios-platform/src/stores/authStore.ts              # Auth state (user, token)
aios-platform/src/components/auth/LoginPage.tsx     # Login com GitHub
aios-platform/src/components/auth/AuthProvider.tsx  # Context provider
aios-platform/src/components/rooms/RoomList.tsx     # Lista de rooms
aios-platform/src/components/rooms/RoomCard.tsx     # Card do room
aios-platform/src/lib/connection.ts                 # Detecta local vs cloud
```

### 4.3 Novas env vars

```env
# .env.production (Vercel)
VITE_RELAY_URL=wss://relay.aios.dev
VITE_RELAY_HTTP_URL=https://relay.aios.dev
VITE_AUTH_GITHUB_CLIENT_ID=Iv1.xxxxxxxxxxxx

# .env.development (local — sem RELAY_URL = local mode)
VITE_MONITOR_URL=http://localhost:4001
```

### 4.4 Rotas

```
https://app.aios.dev/                    # Login ou Room List
https://app.aios.dev/login               # Login com GitHub
https://app.aios.dev/rooms               # Lista de rooms
https://app.aios.dev/room/:roomId        # Dashboard do room
```

### 4.5 Compatibilidade local

Sem `VITE_RELAY_URL`, o app funciona **exatamente como hoje**: conecta a `localhost:4001`. Zero breaking changes.

---

## 5. Autenticacao e Seguranca

### Metodo: JWT via GitHub OAuth

- **Frontend**: OAuth web flow → redirect → JWT
- **CLI**: GitHub Device Flow → poll → JWT
- **Alternativa CLI**: API key gerada no dashboard
- **JWT**: HS256, expira em 7 dias, payload: `{ sub, github_id, github_login, iat, exp }`

### Seguranca de Rooms

- Apenas o dono (`user_id`) pode ver/acessar um room
- Validacao JWT em toda conexao WebSocket e request REST
- Sem compartilhamento na Fase 1 (Fase 3: links read-only com token temporario)

### Rate Limiting

```
eventos/minuto/room:     300
rooms/usuario:           10
API calls/minuto:        60
WS mensagens/segundo:    50
```

---

## 6. Infraestrutura

### Comparacao de Hosting

| | Railway | Fly.io | Render |
|-|---------|--------|--------|
| **WebSocket** | Nativo, persistente | Nativo, persistente | Nativo, persistente |
| **Cold start** | Nenhum (Hobby $5) | Nenhum ($5) | 30s+ no free |
| **Preco** | $5/mo (8GB RAM) | $5/mo (256MB RAM) | $7/mo (512MB RAM) |
| **PostgreSQL** | Built-in ($5/mo, 1GB) | Fly Postgres | $7/mo, 256MB |
| **Deploy** | `railway up` ou GitHub | `fly deploy` | Git push |
| **Bun** | Via Dockerfile | Via Dockerfile | Via Dockerfile |

### Decisao: Railway para Relay + Vercel para Frontend

**Railway ganha porque:**
1. **Sem cold starts** no Hobby — critico para WebSocket, usuario nao espera
2. **PostgreSQL built-in** — $5/mo, 1GB, backups automaticos, mesmo projeto
3. **Deploy simples** — push GitHub ou `railway up`, sem config complexa
4. **8GB RAM** no Hobby — muito mais que Fly (256MB) para o mesmo preco
5. **Volumes** disponivel se precisar cache SQLite local

**Vercel para frontend:**
- SPA estatico (Vite build → `dist/`)
- Free tier: 100GB bandwidth, deploys ilimitados
- Rewrite `/(.*) → /index.html` para SPA routing
- Zero SSR necessario

### Dominios

```
app.aios.dev     → CNAME → Vercel
relay.aios.dev   → CNAME → Railway
```

---

## 7. Fases de Implementacao

### Fase 1 — MVP (2-3 semanas)

**Objetivo**: Prova de conceito funcional. CLI envia eventos, dashboard mostra.

| # | Entrega | Esforco |
|---|---------|---------|
| 1.1 | Relay server: Bun + WebSocket rooms + buffer in-memory | 3 dias |
| 1.2 | CLI `aios-dash`: HTTP server + forward WS + auth por API key | 2 dias |
| 1.3 | Frontend: `VITE_RELAY_URL` no monitorStore, room via URL param | 1 dia |
| 1.4 | Deploy: Railway (relay) + Vercel (frontend) | 0.5 dia |
| 1.5 | Teste end-to-end: hook → CLI → relay → dashboard | 0.5 dia |

**Sem OAuth, sem DB.** Auth por API key hardcoded. Room ID manual via URL.

### Fase 2 — Auth e Multi-Tenant (2-3 semanas)

| # | Entrega | Esforco |
|---|---------|---------|
| 2.1 | GitHub OAuth: web flow (frontend) + device flow (CLI) | 3 dias |
| 2.2 | PostgreSQL: users, rooms, api_keys tables | 1 dia |
| 2.3 | JWT middleware no relay | 1 dia |
| 2.4 | Frontend: LoginPage, AuthProvider, RoomList | 3 dias |
| 2.5 | CLI: `aios-dash login`, `aios-dash rooms` | 1 dia |
| 2.6 | Onboarding: instrucoes para instalar CLI | 1 dia |

### Fase 3 — Persistencia e Scale (3-4 semanas)

| # | Entrega | Esforco |
|---|---------|---------|
| 3.1 | Persistir eventos no PostgreSQL (batch insert async) | 2 dias |
| 3.2 | Analytics: eventos/tempo, tool usage, error rates | 3 dias |
| 3.3 | Links compartilhaveis read-only | 2 dias |
| 3.4 | Redis para rate limiting (se necessario) | 1 dia |
| 3.5 | Cleanup automatico de rooms inativos | 1 dia |
| 3.6 | Webhooks (Slack/Discord) | 2 dias |

---

## 8. Analise de Custos

### Custo Mensal por Escala

| Componente | 10 usuarios | 100 usuarios | 1000 usuarios |
|------------|-------------|--------------|---------------|
| Railway Relay (Hobby) | $5 | $5 | $20 (Pro) |
| Railway PostgreSQL | $5 | $5 | $15 |
| Vercel Frontend | $0 | $0 | $20 (Pro) |
| Dominio (aios.dev) | ~$1 | ~$1 | ~$1 |
| GitHub OAuth | $0 | $0 | $0 |
| **Total** | **$11/mo** | **$11/mo** | **$56/mo** |

### Fase 1 (MVP) sem PostgreSQL

- Railway Hobby: **$5/mo**
- Vercel: **$0**
- **Total MVP: $5/mo**

---

## 9. Arquivos Criticos

### Novos (a criar)

| Arquivo | Descricao |
|---------|-----------|
| `packages/relay/server.ts` | Relay server principal |
| `packages/relay/auth.ts` | GitHub OAuth + JWT |
| `packages/relay/rooms.ts` | Room manager + event buffer |
| `packages/relay/db.ts` | PostgreSQL (Fase 2) |
| `packages/relay/Dockerfile` | Docker para Railway |
| `packages/aios-dash/cli.ts` | CLI entry point |
| `packages/aios-dash/relay.ts` | WS connection ao relay |
| `packages/aios-dash/auth.ts` | Device flow + API key |
| `packages/aios-dash/local-server.ts` | HTTP server porta 4001 |
| `aios-platform/src/stores/authStore.ts` | Auth state |
| `aios-platform/src/components/auth/LoginPage.tsx` | Login UI |
| `aios-platform/src/components/rooms/RoomList.tsx` | Room list UI |
| `aios-platform/src/lib/connection.ts` | Deteccao local/cloud |

### Existentes (a modificar)

| Arquivo | Mudanca |
|---------|---------|
| `aios-platform/src/stores/monitorStore.ts` | Modo dual local/cloud + room |
| `aios-platform/src/services/websocket/WebSocketManager.ts` | Suporte a relay URL + auth |
| `aios-platform/src/components/monitor/LiveMonitor.tsx` | Indicador de CLI conectado |
| `aios-platform/vite.config.ts` | Novas env vars |

### Referencia (pattern source)

| Arquivo | Para que |
|---------|---------|
| `server/server.ts` | Base do relay (Bun WS, rotas, event format) |
| `server/db.ts` | Pattern para PostgreSQL adapter |
| `server/types.ts` | Event/Session types compartilhados |
| `aios-platform/src/services/api/client.ts` | Auth interceptors reutilizaveis |

---

## 10. Verificacao

1. **Fase 1 E2E**: `npx aios-dash` local → relay Railway → dashboard Vercel mostra eventos
2. **Latencia**: evento hook → dashboard < 500ms
3. **Reconexao**: desconectar CLI, reconectar, buffer replay funciona
4. **Modo local**: sem `VITE_RELAY_URL`, dashboard funciona identicamente ao atual
5. **Seguranca**: room de um usuario nao visivel por outro (Fase 2)
6. **Build**: `tsc --noEmit` + `npm run build` passam em todos os packages
