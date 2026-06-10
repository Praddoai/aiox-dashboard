# AIOS Dashboard: Observability Extension

[![Synkra AIOS](https://img.shields.io/badge/Synkra-AIOS-blue.svg)](https://github.com/SynkraAI/aios-core)
[![Licença: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Status](https://img.shields.io/badge/status-early%20development-orange.svg)]()
[![Contributions Welcome](https://img.shields.io/badge/contributions-welcome-brightgreen.svg)](https://github.com/SynkraAI/aios-dashboard/issues)

**Interface visual para observar seu projeto AIOS em tempo real.**

> 🚧 **FASE INICIAL DE DESENVOLVIMENTO**
>
> Este projeto está em construção ativa. Funcionalidades podem mudar, quebrar ou estar incompletas.
> **Colaborações são muito bem-vindas!** Veja as [issues abertas](https://github.com/SynkraAI/aios-dashboard/issues) ou abra uma nova para sugerir melhorias.

> ⚠️ **Este projeto é uma extensão OPCIONAL.** O [Synkra AIOS](https://github.com/SynkraAI/aios-core) funciona 100% sem ele. O Dashboard existe apenas para **observar** o que acontece na CLI — ele nunca controla.

---

## O que é o AIOS Dashboard?

O AIOS Dashboard é uma **interface web** que permite visualizar em tempo real tudo que acontece no seu projeto AIOS:

- 📋 **Stories** no formato Kanban (arrastar e soltar)
- 🤖 **Agentes** ativos e inativos
- 📡 **Eventos em tempo real** do Claude Code (qual tool está executando, prompts, etc)
- 🔧 **Squads** instalados com seus agentes, tasks e workflows
- 📊 **Insights** e estatísticas do projeto

### Screenshot das Funcionalidades

```
┌─────────────────────────────────────────────────────────────────┐
│  AIOS Dashboard                                    [Settings]   │
├─────────┬───────────────────────────────────────────────────────┤
│         │                                                       │
│ Kanban  │   ┌─────────┐  ┌─────────┐  ┌─────────┐              │
│ Monitor │   │ Backlog │  │ Doing   │  │  Done   │              │
│ Agents  │   ├─────────┤  ├─────────┤  ├─────────┤              │
│ Squads  │   │ Story 1 │  │ Story 3 │  │ Story 5 │              │
│ Bob     │   │ Story 2 │  │ Story 4 │  │ Story 6 │              │
│ ...     │   └─────────┘  └─────────┘  └─────────┘              │
│         │                                                       │
└─────────┴───────────────────────────────────────────────────────┘
```

---

## Funcionalidades

| View | O que faz |
|------|-----------|
| **Kanban** | Board de stories com drag-and-drop entre colunas (Backlog, Doing, Done) |
| **Monitor** | Feed em tempo real de eventos do Claude Code (tools, prompts, erros) |
| **Agents** | Lista de agentes AIOS (@dev, @qa, @architect, etc) — ativos e em standby |
| **Squads** | Organograma visual dos squads instalados com drill-down para agentes e tasks |
| **Bob** | Acompanha execução do Bob Orchestrator (pipeline de desenvolvimento autônomo) |
| **Roadmap** | Visualização de features planejadas |
| **GitHub** | Integração com GitHub (PRs, issues) |
| **Insights** | Estatísticas e métricas do projeto |
| **Terminals** | Grid de múltiplos terminais |
| **Settings** | Configurações do dashboard |

---

## Requisito: Projeto com AIOS Instalado

O Dashboard **precisa estar dentro de um projeto com AIOS instalado** porque ele lê os documentos do framework.

```
meu-projeto/                      # ← Você executa comandos daqui
├── .aios-core/                   # Core do framework (OBRIGATÓRIO)
│   └── development/
│       ├── agents/               # Agentes que aparecem na view "Agents"
│       ├── tasks/                # Tasks dos squads
│       └── templates/
├── docs/
│   └── stories/                  # Stories que aparecem no "Kanban"
│       ├── active/
│       └── completed/
├── squads/                       # Squads que aparecem na view "Squads"
│   ├── meu-squad/
│   └── outro-squad/
├── apps/
│   └── dashboard/                # ← Dashboard instalado aqui
└── package.json
```

**Sem o AIOS instalado, o dashboard mostrará telas vazias.**

---

## Instalação Passo a Passo

> **IMPORTANTE:** Todos os comandos são executados a partir da **raiz do seu projeto** (`meu-projeto/`).

### Pré-requisitos

Antes de começar, você precisa ter:

- ✅ [Node.js](https://nodejs.org/) versão 18 ou superior
- ✅ [Bun](https://bun.sh/) (para o servidor de eventos)
- ✅ [Synkra AIOS](https://github.com/SynkraAI/aios-core) instalado no projeto

### Passo 1: Instale o AIOS (se ainda não tiver)

```bash
# Opção A: Criar novo projeto com AIOS
npx aios-core init meu-projeto
cd meu-projeto

# Opção B: Instalar em projeto existente
cd meu-projeto
npx aios-core install
```

### Passo 2: Clone o Dashboard

```bash
# Cria a pasta apps/ e clona o dashboard
mkdir -p apps
git clone https://github.com/SynkraAI/aios-dashboard.git apps/dashboard
```

### Passo 3: Instale as dependências

```bash
# Dependências do Dashboard (Next.js)
npm install --prefix apps/dashboard

# Dependências do Server (Bun)
cd apps/dashboard/server
bun install
cd ../../..
```

### Passo 4: Inicie o Server de Eventos

O server captura eventos em tempo real do Claude Code.

```bash
cd apps/dashboard/server
bun run dev
```

Você verá:
```
🚀 Monitor Server running on http://localhost:4001
```

> **Deixe este terminal aberto** e abra um novo para o próximo passo.

### Passo 5: Inicie o Dashboard

Em um **novo terminal**:

```bash
npm run dev --prefix apps/dashboard
```

Você verá:
```
▲ Next.js 14.x.x
- Local: http://localhost:3000
```

### Passo 6: Acesse o Dashboard

Abra no navegador: **http://localhost:3000**

🎉 **Pronto!** Você verá o dashboard com suas stories, squads e agentes.

---

## Passo Extra: Eventos em Tempo Real

Para ver eventos do Claude Code em tempo real (qual ferramenta está executando, prompts, etc), instale os hooks:

```bash
apps/dashboard/scripts/install-hooks.sh
```

Isso instala hooks em `~/.claude/hooks/` que enviam eventos para o dashboard.

**Eventos capturados:**
- `PreToolUse` — Antes de executar uma ferramenta
- `PostToolUse` — Após executar (com resultado)
- `UserPromptSubmit` — Quando você envia um prompt
- `Stop` — Quando Claude para
- `SubagentStop` — Quando um subagent (Task) termina

---

## Comandos Rápidos

Cole estes comandos no terminal (execute da raiz do projeto):

```bash
# ===== INSTALAÇÃO =====
mkdir -p apps
git clone https://github.com/SynkraAI/aios-dashboard.git apps/dashboard
npm install --prefix apps/dashboard
cd apps/dashboard/server && bun install && cd ../../..

# ===== INICIAR (2 terminais) =====

# Terminal 1: Server de eventos
cd apps/dashboard/server && bun run dev

# Terminal 2: Dashboard
npm run dev --prefix apps/dashboard

# ===== EXTRAS =====

# Instalar hooks para eventos em tempo real
apps/dashboard/scripts/install-hooks.sh

# Verificar se server está rodando
curl http://localhost:4001/health
```

---

## Estrutura do Projeto

```
apps/dashboard/
├── src/
│   ├── app/                # Páginas Next.js
│   ├── components/
│   │   ├── kanban/         # Board de stories
│   │   ├── monitor/        # Feed de eventos em tempo real
│   │   ├── agents/         # Visualização de agentes
│   │   ├── squads/         # Organograma de squads
│   │   ├── bob/            # Orquestração Bob
│   │   └── ui/             # Componentes de UI
│   ├── hooks/              # React hooks customizados
│   ├── stores/             # Estado global (Zustand)
│   └── lib/                # Utilitários
├── server/                 # Servidor de eventos (Bun)
│   ├── server.ts           # Servidor principal
│   ├── db.ts               # Banco SQLite
│   └── types.ts            # Tipos TypeScript
└── scripts/
    └── install-hooks.sh    # Instalador de hooks
```

---

## Posição na Arquitetura AIOS

O Synkra AIOS segue uma hierarquia clara:

```
CLI First → Observability Second → UI Third
```

| Camada            | Prioridade | O que faz                                           |
| ----------------- | ---------- | --------------------------------------------------- |
| **CLI**           | Máxima     | Onde a inteligência vive. Toda execução e decisões. |
| **Observability** | Secundária | Observar o que acontece no CLI em tempo real.       |
| **UI**            | Terciária  | Visualizações e gestão pontual.                     |

**Este Dashboard opera na camada de Observability.** Ele observa, mas nunca controla.

---

## API do Server

O server expõe endpoints para o dashboard consumir:

| Endpoint                   | Método    | Descrição                       |
| -------------------------- | --------- | ------------------------------- |
| `POST /events`             | POST      | Recebe eventos dos hooks        |
| `GET /events/recent`       | GET       | Últimos eventos                 |
| `GET /sessions`            | GET       | Lista sessões do Claude Code    |
| `GET /stats`               | GET       | Estatísticas agregadas          |
| `WS /stream`               | WebSocket | Stream de eventos em tempo real |
| `GET /health`              | GET       | Verifica se server está ok      |

---

## Configuração

Crie o arquivo `apps/dashboard/.env.local`:

```bash
# Porta do server de eventos
MONITOR_PORT=4001

# Onde salvar o banco SQLite
MONITOR_DB=~/.aios/monitor/events.db

# URL do WebSocket (usado pelo dashboard)
NEXT_PUBLIC_MONITOR_WS_URL=ws://localhost:4001/stream
```

---

## Troubleshooting

### "Dashboard mostra telas vazias"

O AIOS não está instalado. Verifique:

```bash
ls -la .aios-core/     # Deve existir
ls -la docs/stories/   # Deve ter arquivos
ls -la squads/         # Deve ter squads
```

Se não existir, instale o AIOS: `npx aios-core install`

### "Monitor não mostra eventos"

1. Server está rodando?
   ```bash
   curl http://localhost:4001/health
   # Deve retornar: {"status":"ok"}
   ```

2. Hooks estão instalados?
   ```bash
   ls ~/.claude/hooks/
   # Deve ter arquivos .py
   ```

3. Reinstale os hooks:
   ```bash
   apps/dashboard/scripts/install-hooks.sh
   ```

### "Erro ao iniciar o server"

Bun não está instalado. Instale em: https://bun.sh

```bash
curl -fsSL https://bun.sh/install | bash
```

### "Porta 3000/4001 em uso"

Encerre o processo que está usando a porta:

```bash
# Descobrir qual processo
lsof -i :3000
lsof -i :4001

# Matar o processo (substitua PID)
kill -9 <PID>
```

---

## QA: Verificando se Tudo Funciona

Após a instalação, execute este checklist para garantir que tudo está funcionando:

### ✅ Checklist de Verificação

```bash
# 1. AIOS está instalado?
ls .aios-core/development/agents/
# ✓ Deve listar arquivos .md (dev.md, qa.md, architect.md, etc)

# 2. Server está rodando?
curl http://localhost:4001/health
# ✓ Deve retornar: {"status":"ok"}

# 3. Dashboard está acessível?
curl -s http://localhost:3000 | head -5
# ✓ Deve retornar HTML

# 4. Hooks estão instalados? (opcional)
ls ~/.claude/hooks/*.py 2>/dev/null | wc -l
# ✓ Deve retornar número > 0
```

### 🧪 Teste Manual

1. **Kanban**: Acesse http://localhost:3000 → deve mostrar board com stories
2. **Agents**: Clique em "Agents" → deve listar agentes em standby
3. **Squads**: Clique em "Squads" → deve mostrar organograma de squads
4. **Monitor**: Clique em "Monitor" → deve mostrar status de conexão

### ❌ Se algo não funcionar

| Problema | Solução |
|----------|---------|
| Kanban vazio | Verifique se existe `docs/stories/` com arquivos `.md` |
| Agents vazio | Verifique se existe `.aios-core/development/agents/` |
| Squads vazio | Verifique se existe `squads/` com subpastas |
| Monitor desconectado | Verifique se o server está rodando na porta 4001 |

---

## Contribuindo

Contribuições são muito bem-vindas! Este é um projeto em fase inicial e há muito espaço para melhorias.

### Tipos de Contribuição

| Tipo | Descrição | Dificuldade |
|------|-----------|-------------|
| **Bug fixes** | Corrigir problemas reportados | Fácil |
| **Documentação** | Melhorar README, adicionar guias | Fácil |
| **UI/UX** | Melhorar interface, adicionar temas | Médio |
| **Novos componentes** | Adicionar visualizações | Médio |
| **Novas views** | Criar páginas novas no dashboard | Avançado |
| **Server features** | Adicionar endpoints, melhorar performance | Avançado |

### Contribuindo com AIOS (Recomendado)

Se você tem o AIOS instalado, use os agentes para ajudar no desenvolvimento:

#### 🏗️ Para novas features — Use @architect + @dev

```bash
# 1. Peça ao Architect para planejar
@architect Quero adicionar um gráfico de métricas na view Monitor.
           Analise a estrutura atual e sugira a melhor abordagem.

# 2. Depois peça ao Dev para implementar
@dev Implemente o gráfico de métricas seguindo o plano do Architect.
     Use Recharts e siga os padrões existentes em src/components/monitor/
```

#### 🎨 Para melhorias de UI — Use @ux-design-expert + @dev

```bash
# 1. Peça ao UX Designer para analisar
@ux-design-expert Analise a view Kanban e sugira melhorias de usabilidade.
                  Considere acessibilidade e mobile.

# 2. Depois implemente com o Dev
@dev Aplique as melhorias de UX sugeridas no Kanban.
```

#### 🐛 Para bugs — Use @qa + @dev

```bash
# 1. Peça ao QA para investigar
@qa O WebSocket do Monitor desconecta após 5 minutos.
    Investigue a causa raiz.

# 2. Depois corrija com o Dev
@dev Corrija o problema de desconexão do WebSocket identificado pelo QA.
```

#### 🚀 Para deploy/PR — Use @devops

```bash
# Quando terminar, peça ao DevOps para criar o PR
@devops Crie um PR para a branch atual com as mudanças do Monitor.
        Inclua descrição detalhada e screenshots.
```

#### ✅ Para validação final — Use @qa

```bash
# Antes de submeter, peça ao QA para revisar
@qa Faça uma revisão completa das mudanças.
    Verifique lint, types, testes e funcionamento visual.
```

---

### Contribuindo sem AIOS (Manual)

Se preferir contribuir sem usar os agentes:

#### 1. Fork e Clone

```bash
# Fork pelo GitHub, depois clone seu fork
git clone https://github.com/SEU_USUARIO/aios-dashboard.git
cd aios-dashboard

# Adicione o repositório original como upstream
git remote add upstream https://github.com/SynkraAI/aios-dashboard.git
```

#### 2. Crie uma Branch

```bash
git checkout -b feature/minha-nova-feature
```

**Convenção de nomes:**

| Prefixo | Uso |
|---------|-----|
| `feature/` | Nova funcionalidade |
| `fix/` | Correção de bug |
| `docs/` | Documentação |
| `refactor/` | Refatoração de código |
| `ui/` | Melhorias visuais |

#### 3. Faça suas alterações

Desenvolva sua feature seguindo os padrões do projeto:

- **React**: Componentes funcionais com hooks
- **TypeScript**: Tipagem obrigatória
- **Tailwind CSS**: Para estilos
- **Zustand**: Para estado global

#### 4. Teste localmente

```bash
# Lint
npm run lint --prefix apps/dashboard

# Type check
npm run typecheck --prefix apps/dashboard

# Testes
npm test --prefix apps/dashboard

# Rode o dashboard e verifique visualmente
npm run dev --prefix apps/dashboard
```

#### 5. Commit com mensagem clara

Usamos [Conventional Commits](https://www.conventionalcommits.org/):

```bash
# Formato
<tipo>: <descrição curta>

# Exemplos
git commit -m "feat: add dark mode toggle"
git commit -m "fix: resolve websocket reconnection issue"
git commit -m "docs: improve installation instructions"
git commit -m "ui: improve kanban card hover state"
```

**Tipos de commit:**
- `feat` - Nova funcionalidade
- `fix` - Correção de bug
- `docs` - Documentação
- `ui` - Mudanças visuais
- `refactor` - Refatoração
- `test` - Testes
- `chore` - Manutenção

#### 6. Push e crie o Pull Request

```bash
# Push para seu fork
git push origin feature/minha-nova-feature
```

Depois, abra um Pull Request no GitHub:

1. Vá para https://github.com/SynkraAI/aios-dashboard
2. Clique em "Pull Requests" → "New Pull Request"
3. Selecione "compare across forks"
4. Selecione seu fork e branch
5. Preencha o template do PR

### Template de Pull Request

```markdown
## Descrição

O que este PR faz? Por que é necessário?

## Tipo de mudança

- [ ] Bug fix
- [ ] Nova feature
- [ ] Melhoria de UI
- [ ] Documentação
- [ ] Refatoração

## Como testar

1. Passo 1
2. Passo 2
3. Resultado esperado

## Screenshots (se aplicável)

[Adicione screenshots aqui]

## Checklist

- [ ] Meu código segue o estilo do projeto
- [ ] Testei localmente
- [ ] Lint passa sem erros
- [ ] TypeScript compila sem erros
```

### Estrutura do Código

```
src/
├── app/                    # Páginas (App Router)
├── components/
│   ├── ui/                 # Componentes base (Button, Card, etc)
│   ├── kanban/             # Componentes do Kanban
│   ├── monitor/            # Componentes do Monitor
│   ├── squads/             # Componentes de Squads
│   └── ...
├── hooks/                  # React hooks customizados
├── stores/                 # Estado global (Zustand)
├── lib/                    # Utilitários
└── types/                  # Tipos TypeScript
```

### Adicionando um Novo Componente

```tsx
// src/components/meu-componente/MeuComponente.tsx

'use client';

import { memo } from 'react';
import { cn } from '@/lib/utils';

interface MeuComponenteProps {
  className?: string;
  // ... outras props
}

export const MeuComponente = memo(function MeuComponente({
  className,
  ...props
}: MeuComponenteProps) {
  return (
    <div className={cn('base-classes', className)}>
      {/* conteúdo */}
    </div>
  );
});
```

### Adicionando uma Nova View

1. Crie o componente em `src/components/minha-view/`
2. Adicione o case em `src/app/page.tsx` no `ViewContent`
3. Adicione o item na sidebar em `src/components/layout/Sidebar.tsx`
4. Adicione o tipo em `src/types/index.ts`

### Dicas Importantes

- **Não quebre o que funciona** — Teste suas mudanças
- **Mantenha PRs pequenos** — Mais fácil de revisar
- **Documente código complexo** — Ajuda outros contribuidores
- **Pergunte antes de grandes mudanças** — Abra uma issue primeiro

### Obtendo Ajuda

- **Issues**: [Abrir issue](https://github.com/SynkraAI/aios-dashboard/issues)
- **Discussões**: [Iniciar discussão](https://github.com/SynkraAI/aios-dashboard/discussions)
- **AIOS Core**: [Comunidade AIOS](https://github.com/SynkraAI/aios-core/discussions)

---

## Licença

MIT

---

<sub>Parte do ecossistema [Synkra AIOS](https://github.com/SynkraAI/aios-core) — CLI First, Observability Second, UI Third</sub>
