/**
 * Chat Demo Seed — Injects a rich demo conversation to showcase MarkdownRenderer capabilities.
 *
 * Usage: import and call `seedDemoChat()` from browser console or a temp component.
 * Or run: `seedDemoChatToLocalStorage()` to write directly to localStorage.
 *
 * To remove: call `clearDemoChat()` or delete the session from the UI.
 */

const DEMO_SESSION_ID = 'demo-gage-showcase';
const DEMO_AGENT_ID = 'devops';
const DEMO_AGENT_NAME = 'GAGE';
const DEMO_SQUAD_ID = 'aios-core';
const DEMO_SQUAD_TYPE = 'engineering';

function ts(minutesAgo: number): string {
  return new Date(Date.now() - minutesAgo * 60_000).toISOString();
}

function msgId(index: number): string {
  return `demo-msg-${index.toString().padStart(3, '0')}`;
}

const demoMessages = [
  // 1. User asks about commands
  {
    id: msgId(1),
    role: 'user',
    content: 'Me mostre seus comandos',
    timestamp: ts(30),
  },

  // 2. Agent responds with a rich numbered command list
  {
    id: msgId(2),
    role: 'assistant',
    agentId: DEMO_AGENT_ID,
    agentName: DEMO_AGENT_NAME,
    squadType: DEMO_SQUAD_TYPE,
    content: `Aqui estao os comandos que posso executar para voce:

## Repositorio & Git

1. **git_status**: Verificar o estado atual do repositorio, arquivos modificados e branch ativa.
2. **git_commit**: Criar um commit com mensagem convencional seguindo o padrao do projeto.
3. **git_push**: Enviar commits locais para o repositorio remoto (exclusivo @devops).
4. **git_branch_create**: Criar uma nova branch a partir de main com nomenclatura padrao.
5. **git_merge**: Fazer merge de uma branch na branch atual com resolucao de conflitos.

## CI/CD & Deploy

6. **pipeline_status**: Verificar o status dos pipelines de CI/CD no GitHub Actions.
7. **pipeline_trigger**: Disparar um workflow de CI/CD manualmente.
8. **deploy_staging**: Fazer deploy da branch atual para o ambiente de staging.
9. **deploy_production**: Fazer deploy para producao (requer aprovacao).

## MCP & Infraestrutura

10. **mcp_list**: Listar todos os servidores MCP configurados e seus status.
11. **mcp_add**: Adicionar um novo servidor MCP ao projeto.
12. **mcp_remove**: Remover um servidor MCP existente.
13. **docker_health**: Verificar a saude dos containers Docker.

> **Nota:** Comandos de deploy para producao requerem aprovacao de pelo menos 2 reviewers no PR.`,
    timestamp: ts(29),
  },

  // 3. User asks for code example
  {
    id: msgId(3),
    role: 'user',
    content: 'Mostre um exemplo de como usar o git_commit com conventional commits',
    timestamp: ts(25),
  },

  // 4. Agent responds with code block
  {
    id: msgId(4),
    role: 'assistant',
    agentId: DEMO_AGENT_ID,
    agentName: DEMO_AGENT_NAME,
    squadType: DEMO_SQUAD_TYPE,
    content: `Claro! Aqui esta um exemplo completo de como usar o comando **git_commit**:

\`\`\`bash
# Verificar arquivos modificados
git status

# Adicionar arquivos especificos
git add src/components/chat/MarkdownRenderer.tsx
git add src/components/chat/MessageBubble.tsx

# Commit com conventional commit
git commit -m "feat(chat): enhance markdown rendering with media embeds

- Add YouTube/Loom video embed support
- Add audio player for .mp3/.wav links
- Improve ordered list styling with numbered badges
- Add command name detection with neon highlight
- Pre-process content to normalize broken lists

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
\`\`\`

### Padrao de Prefixos

| Prefixo | Quando Usar | Exemplo |
|---------|-------------|---------|
| \`feat:\` | Nova funcionalidade | \`feat(auth): add SSO login\` |
| \`fix:\` | Correcao de bug | \`fix(chat): resolve message ordering\` |
| \`docs:\` | Documentacao | \`docs: update API reference\` |
| \`refactor:\` | Refatoracao sem mudar comportamento | \`refactor(store): simplify state management\` |
| \`chore:\` | Tarefas de manutencao | \`chore: update dependencies\` |
| \`test:\` | Adicionar ou corrigir testes | \`test(auth): add SSO integration tests\` |

O **scope** entre parenteses e opcional mas recomendado para commits que afetam um modulo especifico.`,
    timestamp: ts(24),
  },

  // 5. User asks something that triggers a task list
  {
    id: msgId(5),
    role: 'user',
    content: 'Qual o checklist para fazer um deploy para producao?',
    timestamp: ts(20),
  },

  // 6. Agent responds with task list and blockquotes
  {
    id: msgId(6),
    role: 'assistant',
    agentId: DEMO_AGENT_ID,
    agentName: DEMO_AGENT_NAME,
    squadType: DEMO_SQUAD_TYPE,
    content: `### Checklist de Deploy para Producao

Antes de executar **deploy_production**, verifique todos os itens:

- [x] Todos os testes passando no CI
- [x] Code review aprovado por 2+ reviewers
- [x] Branch atualizada com main (rebase/merge)
- [ ] QA Gate aprovado pelo @qa
- [ ] Changelog atualizado
- [ ] Migration scripts testados em staging
- [ ] Rollback plan documentado
- [ ] Monitoring alerts configurados

> **Importante:** O deploy para producao e bloqueado automaticamente se algum check do CI falhar. Isso e intencional e nao deve ser contornado com \`--no-verify\`.

> Em caso de rollback, use o comando \`deploy_rollback\` que reverte para a ultima versao estavel em menos de 2 minutos.

---

### Exemplo de Fluxo Completo

\`\`\`typescript
// 1. Verificar status do pipeline
const status = await gage.pipeline_status('main');

// 2. Verificar se todos os checks passaram
if (status.allChecksPassed) {
  // 3. Deploy para staging primeiro
  await gage.deploy_staging();

  // 4. Rodar smoke tests
  const smokeResult = await quinn.run_smoke_tests('staging');

  // 5. Se ok, deploy para producao
  if (smokeResult.passed) {
    await gage.deploy_production({
      version: '2.1.0',
      changelog: 'feat: enhanced markdown rendering',
      rollbackVersion: '2.0.9'
    });
  }
}
\`\`\`

Quer que eu execute o **pipeline_status** agora para verificar o estado atual?`,
    timestamp: ts(19),
  },

  // 7. User asks about a video tutorial
  {
    id: msgId(7),
    role: 'user',
    content: 'Tem algum video explicando a arquitetura do CI/CD?',
    timestamp: ts(15),
  },

  // 8. Agent responds with embedded video links and inline code
  {
    id: msgId(8),
    role: 'assistant',
    agentId: DEMO_AGENT_ID,
    agentName: DEMO_AGENT_NAME,
    squadType: DEMO_SQUAD_TYPE,
    content: `Sim! Aqui estao os recursos disponiveis:

### Video: Arquitetura CI/CD do AIOS

Assista a explicacao completa da pipeline:

[CI/CD Pipeline Deep Dive](https://www.youtube.com/watch?v=dQw4w9WgXcQ)

### Podcast: DevOps na Pratica

Ouvi essa discussao sobre as melhores praticas que seguimos:

[DevOps Best Practices - Episode 42](https://example.com/podcast/ep42.mp3)

### Diagrama da Pipeline

A pipeline segue este fluxo:

\`\`\`
PR Created
  |
  v
[Lint + TypeCheck] --> [Unit Tests] --> [Integration Tests]
  |                       |                    |
  v                       v                    v
[CodeRabbit Review] --> [Build] --> [Deploy Staging]
                                         |
                                         v
                                   [Smoke Tests]
                                         |
                                         v
                                 [Deploy Production]
\`\`\`

Para mais detalhes, consulte \`docs/architecture/ci-cd-pipeline.md\` no repositorio.`,
    timestamp: ts(14),
  },

  // 9. User asks with an image/attachment context
  {
    id: msgId(9),
    role: 'user',
    content: 'Me mostre o status atual dos containers',
    timestamp: ts(10),
  },

  // 10. Agent responds with status table and mixed content
  {
    id: msgId(10),
    role: 'assistant',
    agentId: DEMO_AGENT_ID,
    agentName: DEMO_AGENT_NAME,
    squadType: DEMO_SQUAD_TYPE,
    content: `### Docker Container Status

| Container | Status | CPU | Memory | Uptime |
|-----------|--------|-----|--------|--------|
| \`aios-api\` | Running | 12% | 256MB | 3d 14h |
| \`aios-worker\` | Running | 45% | 512MB | 3d 14h |
| \`postgres\` | Running | 8% | 1.2GB | 7d 2h |
| \`redis\` | Running | 2% | 64MB | 7d 2h |
| \`mcp-gateway\` | Running | 5% | 128MB | 1d 8h |
| \`n8n\` | **Degraded** | 89% | 1.8GB | 12h |

> **Alerta:** O container \`n8n\` esta com uso de CPU em 89% e memoria proxima do limite. Recomendo investigar os workflows ativos.

### Acoes Recomendadas

1. **docker_logs**: Verificar os logs do container \`n8n\` para identificar workflows pesados.
2. **docker_restart**: Reiniciar o container se necessario (isso pausara workflows em execucao).
3. **docker_scale**: Aumentar os recursos alocados de 2GB para 4GB de RAM.

Quer que eu execute o \`docker_logs n8n --tail 100\` para investigar?`,
    timestamp: ts(9),
  },

  // 11. User asks for architecture diagram
  {
    id: msgId(11),
    role: 'user',
    content: 'Mostre a arquitetura do sistema em um diagrama',
    timestamp: ts(8),
  },

  // 12. Agent responds with mermaid diagram
  {
    id: msgId(12),
    role: 'assistant',
    agentId: DEMO_AGENT_ID,
    agentName: DEMO_AGENT_NAME,
    squadType: DEMO_SQUAD_TYPE,
    content: `### Arquitetura do AIOS Platform

Aqui esta o diagrama de alto nivel da arquitetura:

\`\`\`mermaid
flowchart LR
    UI[Dashboard UI] --> GW[API Gateway]
    GW --> ORCH[Orchestrator]
    ORCH --> DEV[Dev Agent]
    ORCH --> QA[QA Agent]
    ORCH --> OPS[DevOps Agent]
    GW --> MCP[MCP Gateway]
    MCP --> EXA[EXA Search]
    MCP --> C7[Context7]
    GW --> DB[(PostgreSQL)]
    GW --> CACHE[(Redis)]
\`\`\`

O @architect definiu essa arquitetura pensando em escalabilidade horizontal. Cada agente roda como um worker independente.`,
    timestamp: ts(7),
  },

  // 13. User asks about last PR changes
  {
    id: msgId(13),
    role: 'user',
    content: 'Quais mudancas foram feitas no ultimo PR?',
    timestamp: ts(6),
  },

  // 14. Agent responds with diff block and @mentions
  {
    id: msgId(14),
    role: 'assistant',
    agentId: DEMO_AGENT_ID,
    agentName: DEMO_AGENT_NAME,
    squadType: DEMO_SQUAD_TYPE,
    content: `### PR #247: feat(chat): enhanced markdown rendering

O @dev implementou as mudancas e o @qa aprovou apos 2 rounds de review. Aqui esta o diff principal do arquivo src/components/chat/MarkdownRenderer.tsx:

\`\`\`diff
--- a/src/components/chat/MarkdownRenderer.tsx
+++ b/src/components/chat/MarkdownRenderer.tsx
@@ -1,5 +1,8 @@
 import { useState, useCallback, memo, useMemo } from 'react';
+import { lazy, Suspense } from 'react';
 import ReactMarkdown from 'react-markdown';
 import remarkGfm from 'remark-gfm';
+import rehypeRaw from 'rehype-raw';
+import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';

@@ -45,6 +48,24 @@
+// Mermaid diagram support
+const MermaidDiagram = lazy(() => import('./MermaidDiagram'));
+
+// Diff block renderer with colored lines
+function DiffBlock({ value }) {
+  const lines = value.split('\\n');
+  return lines.map(line => {
+    if (line.startsWith('+')) return <span className="text-green-400">{line}</span>;
+    if (line.startsWith('-')) return <span className="text-red-400">{line}</span>;
+    return <span>{line}</span>;
+  });
+}
\`\`\`

Arquivos modificados:
- src/components/chat/MarkdownRenderer.tsx (principal)
- src/components/chat/MessageBubble.tsx (attachments)
- src/components/chat/MermaidDiagram.tsx (novo)

O @devops fez o merge e deploy para staging com sucesso.`,
    timestamp: ts(5),
  },

  // 15. User asks about responsibilities
  {
    id: msgId(15),
    role: 'user',
    content: 'Tem mais detalhes tecnicos sobre a pipeline?',
    timestamp: ts(4),
  },

  // 16. Agent responds with collapsible sections and file paths
  {
    id: msgId(16),
    role: 'assistant',
    agentId: DEMO_AGENT_ID,
    agentName: DEMO_AGENT_NAME,
    squadType: DEMO_SQUAD_TYPE,
    content: `### Detalhes Tecnicos da Pipeline

Abaixo estao os detalhes de cada etapa. Clique para expandir:

<details>
<summary>Etapa 1: Lint & TypeCheck</summary>

Executado pelo GitHub Actions no arquivo \`.github/workflows/ci.yml\`.

Verifica:
- ESLint com config em src/eslint.config.js
- TypeScript strict mode
- Imports nao utilizados

Tempo medio: **45s**

</details>

<details>
<summary>Etapa 2: Testes Unitarios</summary>

Usa Vitest com config em src/vitest.config.ts.

Coverage minimo: **80%** em branches criticas.

Arquivos de teste seguem o padrao:
- src/components/**/*.test.tsx
- src/hooks/**/*.test.ts
- src/stores/**/*.test.ts

</details>

<details>
<summary>Etapa 3: Build & Deploy</summary>

O build e feito com Vite e o deploy usa Cloudflare Pages.

Configuracao principal em:
- packages/vite-config/base.ts
- scripts/deploy-staging.sh

O @devops gerencia todo o pipeline de deploy.

</details>

Para duvidas sobre a pipeline, consulte docs/architecture/ci-cd-pipeline.md ou pergunte ao @architect.`,
    timestamp: ts(3),
  },

  // 17. User asks for music/links
  {
    id: msgId(17),
    role: 'user',
    content: 'Tem algum recurso externo util?',
    timestamp: ts(2),
  },

  // 18. Agent responds with Spotify and Gist embeds
  {
    id: msgId(18),
    role: 'assistant',
    agentId: DEMO_AGENT_ID,
    agentName: DEMO_AGENT_NAME,
    squadType: DEMO_SQUAD_TYPE,
    content: `### Recursos Externos

#### Playlist para Codar

A playlist oficial do time de engenharia:

[Coding Focus Mix](https://open.spotify.com/playlist/37i9dQZF1DX5trt9i14X7j)

#### Gist: Deploy Script

O script de deploy automatizado esta neste gist:

[Deploy automation script](https://gist.github.com/oalanicolas/abc123def456)

#### Video: Onboarding

Para novos membros do time:

[AIOS Platform Onboarding](https://www.youtube.com/watch?v=dQw4w9WgXcQ)

> **Dica:** Salve esses recursos nos seus favoritos. O @sm pode te ajudar com o onboarding completo.`,
    timestamp: ts(1),
  },
];

const demoSession = {
  id: DEMO_SESSION_ID,
  agentId: DEMO_AGENT_ID,
  agentName: DEMO_AGENT_NAME,
  squadId: DEMO_SQUAD_ID,
  squadType: DEMO_SQUAD_TYPE,
  messages: demoMessages,
  createdAt: ts(31),
  updatedAt: ts(9),
};

/**
 * Seed demo chat directly into localStorage (works without React).
 * Reload the page after calling this.
 */
export function seedDemoChatToLocalStorage(): void {
  const storageKey = 'aios-chat-store';
  const existing = localStorage.getItem(storageKey);
  let state: { state: { sessions: unknown[]; activeSessionId: string | null }; version: number };

  if (existing) {
    try {
      state = JSON.parse(existing);
    } catch {
      state = { state: { sessions: [], activeSessionId: null }, version: 0 };
    }
  } else {
    state = { state: { sessions: [], activeSessionId: null }, version: 0 };
  }

  // Remove existing demo session if any
  state.state.sessions = (state.state.sessions as Array<{ id: string }>).filter(
    (s) => s.id !== DEMO_SESSION_ID,
  );

  // Add demo session at the top
  state.state.sessions.unshift(demoSession);
  state.state.activeSessionId = DEMO_SESSION_ID;

  localStorage.setItem(storageKey, JSON.stringify(state));
  console.log('[Demo Seed] Chat demo injected. Reload the page to see it.');
}

/**
 * Clear demo chat from localStorage.
 */
export function clearDemoChat(): void {
  const storageKey = 'aios-chat-store';
  const existing = localStorage.getItem(storageKey);
  if (!existing) return;

  try {
    const state = JSON.parse(existing);
    state.state.sessions = (state.state.sessions as Array<{ id: string }>).filter(
      (s) => s.id !== DEMO_SESSION_ID,
    );
    if (state.state.activeSessionId === DEMO_SESSION_ID) {
      state.state.activeSessionId = (state.state.sessions as Array<{ id: string }>)[0]?.id || null;
    }
    localStorage.setItem(storageKey, JSON.stringify(state));
    console.log('[Demo Seed] Demo chat removed. Reload the page.');
  } catch {
    console.error('[Demo Seed] Failed to parse store.');
  }
}

/**
 * Seed using Zustand store directly (call from a React component or hook).
 */
export function seedDemoChat(): void {
  // Dynamic import to avoid circular deps
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { useChatStore } = require('../stores/chatStore');
  const store = useChatStore.getState();

  // Remove existing demo if any
  const existing = store.sessions.find((s: { id: string }) => s.id === DEMO_SESSION_ID);
  if (existing) {
    store.deleteSession(DEMO_SESSION_ID);
  }

  // Inject directly into state
  useChatStore.setState({
    sessions: [demoSession, ...store.sessions],
    activeSessionId: DEMO_SESSION_ID,
  });

  // Also set UI store
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { useUIStore } = require('../stores/uiStore');
  useUIStore.setState({
    selectedAgentId: DEMO_AGENT_ID,
    selectedSquadId: DEMO_SQUAD_ID,
  });

  console.log('[Demo Seed] Chat demo loaded in current session.');
}

// Auto-export for console usage
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__seedDemoChat = seedDemoChatToLocalStorage;
  (window as unknown as Record<string, unknown>).__clearDemoChat = clearDemoChat;
}
