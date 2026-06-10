import {
  type LucideIcon,
  Mail,
  Target,
  FileText,
  Brain,
  Flame,
  Newspaper,
  Palette,
  BarChart3,
  Clapperboard,
  Anchor,
  ClipboardList,
  Tag,
  Search,
  Zap,
  Image,
  Eye,
  Microscope,
  Library,
  PenTool,
  Lightbulb,
  Calendar,
  Puzzle,
  Package,
  BookOpen,
  Ruler,
  RefreshCw,
  GitMerge,
  Sparkles,
  Smartphone,
} from 'lucide-react';
import type { AgentCommand } from '../../types';
import type { ChatAgent } from './chat-types';

export interface AgentSuggestion {
  icon: LucideIcon;
  label: string;
  prompt: string;
}

// Agent-specific suggestions mapping
const agentSuggestions: Record<string, AgentSuggestion[]> = {
  // Copywriting Squad
  'gary-halbert': [
    { icon: Mail, label: 'Carta de vendas', prompt: 'Escreva uma carta de vendas estilo Gary Halbert para um produto digital de produtividade' },
    { icon: Target, label: 'Bullets que vendem', prompt: 'Crie 10 fascination bullets para uma página de vendas de curso online' },
    { icon: Mail, label: 'Email de vendas', prompt: 'Escreva um email de vendas direto e pessoal para reativar clientes inativos' },
  ],
  'eugene-schwartz': [
    { icon: Brain, label: 'Níveis de consciência', prompt: 'Analise o nível de consciência do meu público e sugira a melhor abordagem de copy' },
    { icon: FileText, label: 'Headline breakthrough', prompt: 'Crie 5 headlines usando a técnica de mass desire do Eugene Schwartz' },
    { icon: Flame, label: 'Lead magnético', prompt: 'Escreva um lead que capture atenção imediata para uma oferta de consultoria' },
  ],
  'david-ogilvy': [
    { icon: Newspaper, label: 'Anúncio clássico', prompt: 'Crie um anúncio no estilo Ogilvy para uma marca de luxo' },
    { icon: Palette, label: 'Brand copy', prompt: 'Desenvolva o tom de voz e messaging para uma nova marca premium' },
    { icon: BarChart3, label: 'Copy com dados', prompt: 'Escreva um texto de vendas baseado em pesquisa e dados concretos' },
  ],
  // YouTube Content Squad
  'roteirista': [
    { icon: Clapperboard, label: 'Roteiro completo', prompt: 'Crie um roteiro de 10 minutos sobre [tema] com ganchos de retenção' },
    { icon: Anchor, label: 'Ganchos de abertura', prompt: 'Sugira 5 ganchos de abertura para um vídeo sobre produtividade' },
    { icon: ClipboardList, label: 'Estrutura de vídeo', prompt: 'Monte a estrutura ideal para um vídeo educacional de YouTube' },
  ],
  'title-writer': [
    { icon: Tag, label: 'Títulos virais', prompt: 'Crie 10 títulos otimizados para CTR sobre [tema do vídeo]' },
    { icon: Search, label: 'Análise de título', prompt: 'Analise este título e sugira melhorias para aumentar CTR' },
    { icon: Zap, label: 'Títulos A/B', prompt: 'Gere variações de título para teste A/B no YouTube' },
  ],
  'thumbnail-strategist': [
    { icon: Image, label: 'Conceito visual', prompt: 'Defina o conceito visual e elementos-chave para thumbnail de vídeo sobre [tema]' },
    { icon: Target, label: 'Estratégia de thumb', prompt: 'Analise thumbnails de concorrentes e sugira estratégia diferenciada' },
    { icon: Eye, label: 'Elementos de atenção', prompt: 'Quais elementos visuais usar para destacar na home do YouTube?' },
  ],
  'deep-researcher': [
    { icon: Microscope, label: 'Pesquisa profunda', prompt: 'Faça uma pesquisa aprofundada sobre [tema] com fontes acadêmicas' },
    { icon: Library, label: 'Estado da arte', prompt: 'Qual o estado atual da pesquisa científica sobre [tema]?' },
    { icon: BarChart3, label: 'Dados e estatísticas', prompt: 'Encontre dados e estatísticas relevantes sobre [tema] para fundamentar meu conteúdo' },
  ],
  'briefing-creator': [
    { icon: ClipboardList, label: 'Briefing completo', prompt: 'Crie um briefing estruturado para produção de vídeo sobre [tema]' },
    { icon: Target, label: 'Direcionamento criativo', prompt: 'Sintetize esta pesquisa em direcionamentos claros para o roteirista' },
    { icon: Sparkles, label: 'Checklist de briefing', prompt: 'Monte um checklist de todos os elementos necessários para o briefing' },
  ],
  // Design System Squad
  'brad-frost': [
    { icon: Puzzle, label: 'Design System', prompt: 'Estruture um design system com atomic design para minha aplicação' },
    { icon: Package, label: 'Componentes', prompt: 'Defina a hierarquia de componentes (átomos, moléculas, organismos) para um dashboard' },
    { icon: BookOpen, label: 'Documentação', prompt: 'Crie a documentação de um componente de botão seguindo best practices' },
  ],
  'dan-mall': [
    { icon: Palette, label: 'Design tokens', prompt: 'Defina os design tokens essenciais para consistência visual' },
    { icon: RefreshCw, label: 'Design handoff', prompt: 'Como estruturar um handoff eficiente entre design e desenvolvimento?' },
    { icon: Ruler, label: 'Grid system', prompt: 'Sugira um grid system responsivo para uma aplicação web moderna' },
  ],
  // Orchestrator Squad
  'supervisor-sistema': [
    { icon: Target, label: 'Coordenar squads', prompt: 'Coordene uma tarefa complexa envolvendo múltiplos squads' },
    { icon: BarChart3, label: 'Análise de gaps', prompt: 'Identifique gaps de cobertura nos squads atuais' },
    { icon: RefreshCw, label: 'Otimizar workflow', prompt: 'Sugira melhorias no workflow entre os squads de conteúdo' },
  ],
  'roteador': [
    { icon: GitMerge, label: 'Rotear demanda', prompt: 'Qual o melhor squad e agente para criar uma campanha de lançamento?' },
    { icon: Target, label: 'Classificar tarefa', prompt: 'Classifique esta tarefa e indique o fluxo ideal de execução' },
    { icon: ClipboardList, label: 'Plano de ação', prompt: 'Monte um plano de ação com os agentes necessários para [objetivo]' },
  ],
};

// Squad-level fallback suggestions
const squadSuggestions: Record<string, AgentSuggestion[]> = {
  copywriting: [
    { icon: PenTool, label: 'Copy de vendas', prompt: 'Escreva um texto de vendas persuasivo para [produto/serviço]' },
    { icon: Mail, label: 'Sequência de emails', prompt: 'Crie uma sequência de 5 emails para lançamento de produto' },
    { icon: Target, label: 'Headlines', prompt: 'Gere 10 headlines impactantes para [tema]' },
  ],
  design: [
    { icon: Palette, label: 'Sistema visual', prompt: 'Defina um sistema visual completo para minha aplicação' },
    { icon: Smartphone, label: 'UI patterns', prompt: 'Quais UI patterns usar para uma experiência mobile-first?' },
    { icon: Puzzle, label: 'Componentes', prompt: 'Estruture uma biblioteca de componentes reutilizáveis' },
  ],
  creator: [
    { icon: Clapperboard, label: 'Conteúdo', prompt: 'Crie um plano de conteúdo para [plataforma] sobre [tema]' },
    { icon: Calendar, label: 'Calendário', prompt: 'Monte um calendário editorial para o próximo mês' },
    { icon: Lightbulb, label: 'Ideias', prompt: 'Sugira 20 ideias de conteúdo para engajar minha audiência' },
  ],
  orchestrator: [
    { icon: Target, label: 'Orquestrar', prompt: 'Coordene uma entrega complexa entre múltiplos especialistas' },
    { icon: BarChart3, label: 'Analisar', prompt: 'Analise o fluxo atual e identifique oportunidades de melhoria' },
    { icon: RefreshCw, label: 'Workflow', prompt: 'Desenhe um workflow otimizado para [processo]' },
  ],
};

// Map command names to appropriate icons
function getCommandIcon(command: string): LucideIcon {
  const cmd = command.toLowerCase();
  if (cmd.includes('letter') || cmd.includes('carta')) return Mail;
  if (cmd.includes('email')) return Mail;
  if (cmd.includes('headline') || cmd.includes('titulo')) return Tag;
  if (cmd.includes('bullet')) return Target;
  if (cmd.includes('roteiro') || cmd.includes('script')) return Clapperboard;
  if (cmd.includes('research') || cmd.includes('pesquisa')) return Microscope;
  if (cmd.includes('briefing')) return ClipboardList;
  if (cmd.includes('thumbnail') || cmd.includes('thumb')) return Image;
  if (cmd.includes('hook') || cmd.includes('gancho')) return Anchor;
  if (cmd.includes('copy')) return PenTool;
  if (cmd.includes('análise') || cmd.includes('analise') || cmd.includes('analysis')) return BarChart3;
  if (cmd.includes('sequence') || cmd.includes('sequência')) return RefreshCw;
  if (cmd.includes('lead')) return Flame;
  if (cmd.includes('design')) return Palette;
  if (cmd.includes('component')) return Puzzle;
  return Zap;
}

export function getSuggestionsForAgent(agent: ChatAgent): AgentSuggestion[] {
  // Priority 1: Dynamic commands from agent markdown files (from backend)
  if (agent.commands && agent.commands.length > 0) {
    const dynamicSuggestions = agent.commands.slice(0, 4).map((cmd: AgentCommand) => ({
      icon: getCommandIcon(cmd.command),
      label: cmd.command.replace(/^\*/, ''),
      prompt: cmd.description || cmd.command,
    }));
    return dynamicSuggestions;
  }

  // Priority 2: Sample tasks extracted from markdown
  if (agent.sampleTasks && agent.sampleTasks.length > 0) {
    const taskIcons: LucideIcon[] = [Lightbulb, Target, FileText, Zap];
    const taskSuggestions = agent.sampleTasks.slice(0, 4).map((task: string, i: number) => ({
      icon: taskIcons[i % 4],
      label: task.slice(0, 30) + (task.length > 30 ? '...' : ''),
      prompt: task,
    }));
    return taskSuggestions;
  }

  // Priority 3: Agent-specific hardcoded suggestions
  if (agentSuggestions[agent.id]) {
    return agentSuggestions[agent.id];
  }

  // Priority 4: Fallback to squad suggestions
  return squadSuggestions[agent.squadType] || squadSuggestions.copywriting;
}
