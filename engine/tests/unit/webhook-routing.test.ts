import { describe, test, expect } from 'bun:test';

// Test webhook routing logic in isolation

function normalizeText(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

const ROUTING_RULES = [
  { keywords: ['relatorio', 'report', 'analise', 'analysis', 'metricas', 'kpi'], squadId: 'data-analytics', agentId: 'analyst' },
  { keywords: ['copy', 'texto', 'artigo', 'blog', 'conteudo', 'content'], squadId: 'copywriting', agentId: 'copywriter' },
  { keywords: ['design', 'componente', 'layout', 'tela', 'screen', 'interface'], squadId: 'design-system', agentId: 'ux-design-expert' },
  { keywords: ['deploy', 'pipeline', 'release', 'ci/cd', 'devops'], squadId: 'engineering', agentId: 'devops' },
  { keywords: ['teste', 'test', 'bug', 'quality', 'review'], squadId: 'development', agentId: 'qa' },
  { keywords: ['arquitetura', 'architecture', 'schema', 'database', 'migration'], squadId: 'engineering', agentId: 'architect' },
  { keywords: ['story', 'historia', 'epic', 'backlog', 'sprint'], squadId: 'orchestrator', agentId: 'sm' },
  { keywords: ['validar', 'validate', 'priorizar', 'prioritize'], squadId: 'orchestrator', agentId: 'po' },
  { keywords: ['requisito', 'requirement', 'spec', 'prd'], squadId: 'orchestrator', agentId: 'pm' },
];

function matchKeyword(text: string, keyword: string): boolean {
  if (keyword.length <= 3) {
    const regex = new RegExp(`\\b${keyword}\\b`);
    return regex.test(text);
  }
  return text.includes(keyword);
}

function routeMessage(message: string): { squadId: string; agentId: string } {
  const normalized = normalizeText(message);
  for (const rule of ROUTING_RULES) {
    if (rule.keywords.some(kw => matchKeyword(normalized, kw))) {
      return { squadId: rule.squadId, agentId: rule.agentId };
    }
  }
  return { squadId: 'development', agentId: 'dev' };
}

describe('Webhook Routing', () => {
  test('routes analytics (Portuguese with accents)', () => {
    const result = routeMessage('Gerar relatório de métricas do último mês');
    expect(result.squadId).toBe('data-analytics');
    expect(result.agentId).toBe('analyst');
  });

  test('routes analytics (English)', () => {
    const result = routeMessage('Generate weekly KPI report');
    expect(result.squadId).toBe('data-analytics');
    expect(result.agentId).toBe('analyst');
  });

  test('routes design tasks', () => {
    const result = routeMessage('Criar um novo componente de UI para o dashboard');
    expect(result.squadId).toBe('design-system');
    expect(result.agentId).toBe('ux-design-expert');
  });

  test('routes deploy tasks', () => {
    const result = routeMessage('Deploy da versão 3.0 para produção');
    expect(result.squadId).toBe('engineering');
    expect(result.agentId).toBe('devops');
  });

  test('routes QA tasks', () => {
    const result = routeMessage('Tem um bug no login, precisa de teste');
    expect(result.squadId).toBe('development');
    expect(result.agentId).toBe('qa');
  });

  test('routes architecture tasks', () => {
    const result = routeMessage('Revisar a arquitetura do banco de dados');
    expect(result.squadId).toBe('engineering');
    expect(result.agentId).toBe('architect');
  });

  test('routes story creation', () => {
    const result = routeMessage('Criar nova story para o epic de autenticação');
    expect(result.squadId).toBe('orchestrator');
    expect(result.agentId).toBe('sm');
  });

  test('routes spec/PRD tasks', () => {
    const result = routeMessage('Escrever o PRD para os novos requirements');
    expect(result.squadId).toBe('orchestrator');
    expect(result.agentId).toBe('pm');
  });

  test('defaults to development/dev for unknown messages', () => {
    const result = routeMessage('Uma mensagem sem palavras-chave conhecidas');
    expect(result.squadId).toBe('development');
    expect(result.agentId).toBe('dev');
  });

  test('accent normalization works', () => {
    expect(normalizeText('relatório')).toBe('relatorio');
    expect(normalizeText('análise')).toBe('analise');
    expect(normalizeText('conteúdo')).toBe('conteudo');
    expect(normalizeText('histórias')).toBe('historias');
  });
});
