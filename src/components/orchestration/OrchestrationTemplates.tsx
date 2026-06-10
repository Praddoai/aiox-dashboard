import { memo } from 'react';
import { motion } from 'framer-motion';
import { Workflow } from 'lucide-react';
import { getSquadInlineStyle } from '../../lib/theme';
import { aiosRegistry } from '../../data/aios-registry.generated';

interface OrchestrationTemplate {
  id: string;
  icon: string;
  title: string;
  description: string;
  demand: string;
  squads: string[];
}

const CURATED_TEMPLATES: OrchestrationTemplate[] = [
  {
    id: 'launch-campaign',
    icon: '\u{1F680}',
    title: 'Campanha de Lancamento',
    description: 'Copy + design + conteudo social para lancamento de produto',
    demand: 'Criar uma campanha completa de lancamento incluindo headlines, body copy, design visual e conteudo para redes sociais',
    squads: ['copywriting', 'design', 'creator'],
  },
  {
    id: 'tech-audit',
    icon: '\u{1F50D}',
    title: 'Auditoria Tecnica',
    description: 'Analise completa de divida tecnica e recomendacoes',
    demand: 'Realizar auditoria tecnica completa do sistema, identificar divida tecnica, vulnerabilidades de seguranca e propor plano de melhoria',
    squads: ['engineering', 'development'],
  },
  {
    id: 'content-calendar',
    icon: '\u{1F4C5}',
    title: 'Calendario de Conteudo',
    description: '30 dias de conteudo para multiplas plataformas',
    demand: 'Criar calendario editorial de 30 dias com posts para Instagram, LinkedIn e TikTok, incluindo copies e briefings visuais',
    squads: ['creator', 'copywriting'],
  },
  {
    id: 'market-research',
    icon: '\u{1F4CA}',
    title: 'Pesquisa de Mercado',
    description: 'Analise competitiva e identificacao de oportunidades',
    demand: 'Realizar pesquisa de mercado completa: analise de concorrentes, identificacao de gaps, definicao de personas e proposta de posicionamento',
    squads: ['copywriting', 'analytics'],
  },
  {
    id: 'brand-strategy',
    icon: '\u{1F3A8}',
    title: 'Estrategia de Marca',
    description: 'Posicionamento, tom de voz e identidade visual',
    demand: 'Desenvolver estrategia de marca completa: proposta de valor, manifesto, tom de voz, guidelines de comunicacao e identidade visual',
    squads: ['copywriting', 'design'],
  },
  {
    id: 'full-product',
    icon: '\u{26A1}',
    title: 'Produto Completo',
    description: 'Spec + arquitetura + implementacao + QA',
    demand: 'Especificar, arquitetar e implementar uma nova feature completa com testes automatizados e documentacao',
    squads: ['engineering', 'development'],
  },
];

const WORKFLOW_TEMPLATES: OrchestrationTemplate[] = aiosRegistry.workflows
  .filter(w => w.description && w.phases.length > 0)
  .slice(0, 6)
  .map(w => ({
    id: `wf-${w.id}`,
    icon: w.type === 'loop' ? '\u{1F504}' : w.type === 'pipeline' ? '\u{1F517}' : w.type === 'cycle' ? '\u{1F501}' : '\u{2699}\u{FE0F}',
    title: w.name,
    description: w.description.slice(0, 80) + (w.description.length > 80 ? '...' : ''),
    demand: `Execute workflow "${w.name}": ${w.description}`,
    squads: w.agents.slice(0, 3),
  }));

const TemplateCard = memo(function TemplateCard({
  template,
  onSelect,
}: {
  template: OrchestrationTemplate;
  onSelect: (demand: string) => void;
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onSelect(template.demand)}
      className="text-left p-4 rounded-xl border border-white/10 bg-white/[0.03] backdrop-blur-sm hover:bg-white/[0.06] hover:border-white/20 transition-all group"
    >
      <div className="flex items-start gap-3 mb-3">
        <span className="text-2xl flex-shrink-0" role="img" aria-hidden="true">
          {template.icon}
        </span>
        <div className="min-w-0">
          <h4 className="text-sm font-semibold text-white group-hover:text-white/95 truncate">
            {template.title}
          </h4>
          <p className="text-[11px] text-white/40 mt-0.5 line-clamp-2">
            {template.description}
          </p>
        </div>
      </div>

      {/* Squad badges */}
      <div className="flex flex-wrap gap-1.5">
        {template.squads.map((squadId) => {
          const style = getSquadInlineStyle(squadId);
          return (
            <span
              key={squadId}
              className="text-[10px] font-medium px-2 py-0.5 rounded-full"
              style={{
                background: style.bg,
                color: style.text,
                border: `1px solid ${style.border}`,
              }}
            >
              {squadId}
            </span>
          );
        })}
      </div>
    </motion.button>
  );
});

export function OrchestrationTemplates({ onSelect }: { onSelect: (demand: string) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="w-full max-w-3xl px-4"
    >
      <h3 className="text-sm font-medium text-white/50 mb-4 text-center">Templates</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {CURATED_TEMPLATES.map((template) => (
          <TemplateCard key={template.id} template={template} onSelect={onSelect} />
        ))}
      </div>

      {WORKFLOW_TEMPLATES.length > 0 && (
        <>
          <h3 className="text-sm font-medium text-white/50 mb-4 mt-8 text-center flex items-center justify-center gap-2">
            <Workflow size={14} /> AIOS Workflows
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {WORKFLOW_TEMPLATES.map((template) => (
              <TemplateCard key={template.id} template={template} onSelect={onSelect} />
            ))}
          </div>
        </>
      )}
    </motion.div>
  );
}
