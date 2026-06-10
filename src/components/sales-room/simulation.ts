import { useEffect, useRef } from 'react';
import { useSalesStore } from './store';
import type { ActivityEvent, Message } from './types';

// ─── Message pools ─────────────────────────────────────

const LEAD_MESSAGES = [
  'Qual o prazo de entrega?',
  'Tem desconto pra pix?',
  'Posso parcelar em quantas vezes?',
  'Vou pensar e te falo',
  'Adorei! Como faco pra comprar?',
  'Tem outra cor disponivel?',
  'Minha amiga comprou e recomendou',
  'Vi no site que tem frete gratis, e verdade?',
  'Aceita cartao de credito?',
  'Quanto fica o frete pra minha cidade?',
  'Pode mandar mais fotos?',
  'Quero sim, pode fechar!',
  'Hmm, achei caro. Tem algo mais barato?',
  'Vocês tem garantia?',
  'Preciso receber até sexta, da tempo?',
  'Obrigada, vou falar com meu marido',
  'Fecha por R$ 300?',
  'Quero dois, tem desconto?',
];

const AGENT_REPLIES = [
  'Claro! O prazo e de 3-5 dias uteis pra sua regiao.',
  'Sim! No pix voce ganha 5% de desconto extra.',
  'Parcela em ate 12x sem juros no cartao!',
  'Sem problema! Fico a disposicao quando decidir.',
  'Otimo! Vou gerar o link de pagamento pra voce agora.',
  'Tenho nas cores preto, branco e azul. Qual prefere?',
  'Que bom! Ela deve ter adorado. Posso te ajudar com o mesmo?',
  'Sim, frete gratis pra todo o Brasil nas compras acima de R$ 150!',
  'Aceitamos todas as bandeiras de cartao e tambem pix.',
  'Deixa eu calcular rapidinho... Pra sua cidade fica R$ 15,90.',
  'Claro! Vou enviar agora pelo WhatsApp.',
  'Perfeito! Gerando o pedido agora. Voce recebe a confirmacao por email.',
  'Tenho uma opcao similar por um preco menor. Posso te mostrar?',
  'Temos 30 dias de garantia incondicional.',
  'Sim, consigo enviar por Sedex e chega ate quinta!',
  'Claro, sem problemas. Se precisar estou aqui!',
  'Consigo fazer por R$ 320 no pix. Fecha?',
  'Pra dois unidades consigo 10% de desconto!',
];

const ACTIVITY_TEMPLATES = [
  { type: 'cart-recovered' as const, desc: 'Carrinho recuperado', values: [189.90, 299.00, 457.50, 124.90, 678.00] },
  { type: 'sale-closed' as const, desc: 'Venda fechada', values: [347.90, 892.00, 1250.00, 497.00, 199.90] },
  { type: 'lead-qualified' as const, desc: 'Lead qualificado' },
  { type: 'follow-up-scheduled' as const, desc: 'Follow-up agendado' },
];

// ─── Helpers ───────────────────────────────────────────

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function uid(): string {
  return `sim-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

// ─── Simulation Hook ───────────────────────────────────

export function useSimulation() {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const enabled = useSalesStore((s) => s.simulationEnabled);

  useEffect(() => {
    if (!enabled) return;

    function scheduleNext() {
      const delay = randomBetween(3000, 7000);
      timerRef.current = setTimeout(() => {
        runSimulationTick();
        scheduleNext();
      }, delay);
    }

    scheduleNext();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [enabled]);
}

function runSimulationTick() {
  const store = useSalesStore.getState();
  const activeAgents = store.agents.filter(
    (a) => a.status === 'atendendo' || a.status === 'recuperando-carrinho' || a.status === 'follow-up'
  );

  if (activeAgents.length === 0) return;

  const agent = pick(activeAgents);
  const roll = Math.random();

  if (roll < 0.4) {
    // Lead sends message
    simulateLeadMessage(agent.id, agent.name);
  } else if (roll < 0.75) {
    // Agent replies
    simulateAgentReply(agent.id, agent.name);
  } else if (roll < 0.9) {
    // Activity event (sale, cart recovery, etc.)
    simulateActivity(agent.id, agent.name);
  } else {
    // Status change
    simulateStatusChange(agent.id);
  }
}

function simulateLeadMessage(agentId: string, agentName: string) {
  const msg: Message = {
    id: uid(),
    direction: 'lead',
    text: pick(LEAD_MESSAGES),
    timestamp: new Date(),
    source: 'mock',
  };

  useSalesStore.getState().addMessage(agentId, msg);
  useSalesStore.getState().addActivity({
    id: uid(),
    agentId,
    agentName,
    type: 'message-received',
    description: `Msg recebida · ${msg.text.slice(0, 30)}...`,
    timestamp: new Date(),
  });
}

function simulateAgentReply(agentId: string, agentName: string) {
  const msg: Message = {
    id: uid(),
    direction: 'agent',
    text: pick(AGENT_REPLIES),
    timestamp: new Date(),
    source: 'mock',
  };

  useSalesStore.getState().addMessage(agentId, msg);
  useSalesStore.getState().addActivity({
    id: uid(),
    agentId,
    agentName,
    type: 'message-sent',
    description: `Resposta enviada`,
    timestamp: new Date(),
  });
}

function simulateActivity(agentId: string, agentName: string) {
  const template = pick(ACTIVITY_TEMPLATES);
  const value = template.values ? pick(template.values) : undefined;

  const activity: ActivityEvent = {
    id: uid(),
    agentId,
    agentName,
    type: template.type,
    description: template.desc,
    timestamp: new Date(),
    value,
  };

  useSalesStore.getState().addActivity(activity);

  // Update metrics
  const store = useSalesStore.getState();
  if (template.type === 'sale-closed' && value) {
    store.incrementMetric('salesClosed');
    store.incrementMetric('totalRevenue', value);
  } else if (template.type === 'cart-recovered' && value) {
    store.incrementMetric('cartsRecovered');
    store.incrementMetric('cartRecoveryValue', value);
  } else if (template.type === 'lead-qualified') {
    store.incrementMetric('leadsToday');
  }
}

function simulateStatusChange(agentId: string) {
  const agent = useSalesStore.getState().agents.find((a) => a.id === agentId);
  if (!agent) return;

  // Cycle through natural transitions
  const transitions: Record<string, typeof agent.status> = {
    'atendendo': 'follow-up',
    'follow-up': 'ocioso',
    'recuperando-carrinho': 'atendendo',
    'ocioso': 'atendendo',
  };

  const next = transitions[agent.status];
  if (next) {
    useSalesStore.getState().updateAgentStatus(agentId, next);
  }
}
