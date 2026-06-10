import type { SquadType } from '../types';

export interface DomainInfo {
  label: string;
  icon: string;
  color: string;
  bgColor: string;
  description: string;
}

export const domainTaxonomy: Record<SquadType, DomainInfo> = {
  copywriting: {
    label: 'Copywriting',
    icon: 'PenTool',
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/15',
    description: 'Redação publicitária e persuasiva',
  },
  design: {
    label: 'Design',
    icon: 'Palette',
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/15',
    description: 'Design visual, UI/UX e assets criativos',
  },
  creator: {
    label: 'Creator',
    icon: 'Clapperboard',
    color: 'text-green-500',
    bgColor: 'bg-green-500/15',
    description: 'Criação de conteúdo e vendas',
  },
  orchestrator: {
    label: 'Orchestrator',
    icon: 'RefreshCw',
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-500/15',
    description: 'Orquestração e gerenciamento de sistema',
  },
  content: {
    label: 'Content',
    icon: 'Tv',
    color: 'text-red-500',
    bgColor: 'bg-red-500/15',
    description: 'Conteúdo e ecossistema de mídia',
  },
  development: {
    label: 'Development',
    icon: 'Wrench',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/15',
    description: 'Desenvolvimento de software e ferramentas',
  },
  engineering: {
    label: 'Engineering',
    icon: 'Cog',
    color: 'text-indigo-500',
    bgColor: 'bg-indigo-500/15',
    description: 'Engenharia de software e infraestrutura',
  },
  analytics: {
    label: 'Analytics',
    icon: 'BarChart3',
    color: 'text-teal-500',
    bgColor: 'bg-teal-500/15',
    description: 'Dados, análise e pesquisa',
  },
  marketing: {
    label: 'Marketing',
    icon: 'Megaphone',
    color: 'text-pink-500',
    bgColor: 'bg-pink-500/15',
    description: 'Marketing, scraping e outreach',
  },
  advisory: {
    label: 'Advisory',
    icon: 'BookOpen',
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/15',
    description: 'Consultoria e estratégia',
  },
  default: {
    label: 'Default',
    icon: 'Package',
    color: 'text-gray-500',
    bgColor: 'bg-gray-500/15',
    description: 'Squad padrão',
  },
};

export function getDomainInfo(squadType: SquadType): DomainInfo {
  return domainTaxonomy[squadType] || domainTaxonomy.default;
}

