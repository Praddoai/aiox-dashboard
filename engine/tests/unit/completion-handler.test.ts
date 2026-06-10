import { describe, test, expect } from 'bun:test';

// Test the memory protocol parser directly
// We need to extract the function for testing

describe('Completion Handler — Memory Protocol Parser', () => {
  // Replicate the parser logic for isolated testing
  function parseMemoryProtocol(output: string) {
    const memories: Array<{ scope: string; content: string; type?: string }> = [];

    const scopeRegex = /###\s*Scope:\s*(.+)\n([\s\S]*?)(?=###\s*Scope:|$)/g;
    let match: RegExpExecArray | null;

    while ((match = scopeRegex.exec(output)) !== null) {
      const scope = match[1].trim();
      const block = match[2];
      const itemRegex = /-\s*\[(\w+)\]\s*(.+)/g;
      let item: RegExpExecArray | null;

      while ((item = itemRegex.exec(block)) !== null) {
        memories.push({ scope, type: item[1], content: item[2].trim() });
      }
    }

    const simpleMatch = output.match(/##\s*Para Salvar em Mem[oó]ria\n([\s\S]*?)(?=\n##|$)/i);
    if (simpleMatch && memories.length === 0) {
      const lines = simpleMatch[1].split('\n').filter(l => l.trim().startsWith('-'));
      for (const line of lines) {
        const cleaned = line.replace(/^-\s*/, '').trim();
        if (cleaned) memories.push({ scope: 'global', content: cleaned });
      }
    }

    return memories;
  }

  test('parses structured scope protocol', () => {
    const output = `
Some output text.

### Scope: squad:financeiro
- [TENDENCIA] Receita crescente no Q4
- [PADRAO] Clientes preferem plano anual

### Scope: global
- [DECISAO] Usar PostgreSQL para analytics
    `;

    const memories = parseMemoryProtocol(output);
    expect(memories.length).toBe(3);
    expect(memories[0].scope).toBe('squad:financeiro');
    expect(memories[0].type).toBe('TENDENCIA');
    expect(memories[0].content).toBe('Receita crescente no Q4');
    expect(memories[2].scope).toBe('global');
  });

  test('parses "Para Salvar em Memoria" section', () => {
    const output = `
## Resultado
Tudo feito.

## Para Salvar em Memória
- Projeto usa Bun + Hono
- Deploy via Cloudflare Workers
- Banco de dados é SQLite

## Próximos passos
Nada mais.
    `;

    const memories = parseMemoryProtocol(output);
    expect(memories.length).toBe(3);
    expect(memories[0].scope).toBe('global');
    expect(memories[0].content).toBe('Projeto usa Bun + Hono');
  });

  test('returns empty for output without memories', () => {
    const output = 'Just a normal response.';
    const memories = parseMemoryProtocol(output);
    expect(memories.length).toBe(0);
  });

  test('handles multiple scopes correctly', () => {
    const output = `
### Scope: project:aios
- [ARCH] Microservices pattern
- [TECH] TypeScript + Bun runtime

### Scope: agent:dev
- [PREF] Prefers functional style
    `;

    const memories = parseMemoryProtocol(output);
    expect(memories.length).toBe(3);

    const projectMems = memories.filter(m => m.scope === 'project:aios');
    expect(projectMems.length).toBe(2);

    const agentMems = memories.filter(m => m.scope === 'agent:dev');
    expect(agentMems.length).toBe(1);
  });
});
