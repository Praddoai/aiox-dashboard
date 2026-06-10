import type { SalesAgent, ConversationInsight, Sentiment } from './types';

// ─── Sentiment Detection ───────────────────────────────

const POSITIVE_WORDS = [
  'quero', 'adorei', 'perfeito', 'otimo', 'fecha', 'comprar',
  'fechar', 'recomendou', 'manda', 'gostei', 'sim', 'pode',
  'claro', 'show', 'top', 'maravilh', 'amei', 'lindo',
];

const RESISTANT_WORDS = [
  'caro', 'pensar', 'barato', 'nao sei', 'depois', 'talvez',
  'marido', 'esposa', 'vou ver', 'desconto', 'mais barato',
  'dificil', 'complicado', 'nao tenho', 'sem dinheiro',
];

function detectSentiment(text: string): Sentiment {
  const lower = text.toLowerCase();
  const positiveHits = POSITIVE_WORDS.filter((w) => lower.includes(w)).length;
  const resistantHits = RESISTANT_WORDS.filter((w) => lower.includes(w)).length;

  if (positiveHits > resistantHits) return 'positive';
  if (resistantHits > positiveHits) return 'resistant';
  return 'neutral';
}

// ─── Suggested Responses ───────────────────────────────

function suggestResponse(agent: SalesAgent): string | null {
  if (!agent.currentLead || agent.messages.length === 0) return null;

  const lastMsg = agent.messages[agent.messages.length - 1];
  if (lastMsg.direction !== 'lead') return null;

  const lower = lastMsg.text.toLowerCase();

  if (lower.includes('caro') || lower.includes('barato') || lower.includes('desconto')) {
    return 'Oferecer cupom de desconto ou condicao especial de pagamento';
  }
  if (lower.includes('frete') || lower.includes('entrega') || lower.includes('prazo')) {
    return 'Informar prazo de entrega e opcoes de frete';
  }
  if (lower.includes('pensar') || lower.includes('depois') || lower.includes('marido')) {
    return 'Criar urgencia: estoque limitado ou oferta por tempo limitado';
  }
  if (lower.includes('quero') || lower.includes('fecha') || lower.includes('comprar') || lower.includes('manda')) {
    return 'Fechar agora! Enviar link de pagamento';
  }
  if (lower.includes('parcela') || lower.includes('cartao') || lower.includes('pix')) {
    return 'Detalhar condicoes de pagamento e vantagens do pix';
  }

  return null;
}

// ─── Close Probability ─────────────────────────────────

function computeCloseProbability(agent: SalesAgent): number {
  if (!agent.currentLead) return 0;

  let score = 0;

  // Temperature base
  const tempScores = { hot: 55, warm: 30, cold: 10 };
  score += tempScores[agent.currentLead.temperature];

  // Message count bonus (more conversation = more engaged)
  const leadMessages = agent.messages.filter((m) => m.direction === 'lead').length;
  score += Math.min(leadMessages * 5, 20);

  // Cart value bonus (invested in browsing)
  if (agent.currentLead.cartValue) score += 10;

  // Last message sentiment
  const lastLeadMsg = [...agent.messages].reverse().find((m) => m.direction === 'lead');
  if (lastLeadMsg) {
    const sentiment = detectSentiment(lastLeadMsg.text);
    if (sentiment === 'positive') score += 15;
    if (sentiment === 'resistant') score -= 10;
  }

  return Math.max(0, Math.min(100, score));
}

// ─── Stale Detection ───────────────────────────────────

function computeStaleMinutes(agent: SalesAgent): number {
  if (agent.messages.length === 0) return 0;
  const lastMsg = agent.messages[agent.messages.length - 1];
  return Math.floor((Date.now() - lastMsg.timestamp.getTime()) / 60000);
}

// ─── Main Function ─────────────────────────────────────

export function getConversationInsight(agent: SalesAgent): ConversationInsight {
  const lastLeadMsg = [...agent.messages].reverse().find((m) => m.direction === 'lead');
  const sentiment = lastLeadMsg ? detectSentiment(lastLeadMsg.text) : 'neutral';
  const staleMinutes = computeStaleMinutes(agent);

  return {
    closeProbability: computeCloseProbability(agent),
    sentiment,
    suggestedResponse: suggestResponse(agent),
    staleMinutes,
    isStale: staleMinutes > 5,
  };
}

export function getSentimentForMessage(text: string): Sentiment {
  return detectSentiment(text);
}
