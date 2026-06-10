import { motion } from 'framer-motion';
import {
  type LucideIcon,
  Sparkles,
  Target,
  BookOpen,
  Lightbulb,
  RefreshCw,
  Palette,
  Search,
  Zap,
  Gem,
  Puzzle,
  Clapperboard,
  TrendingUp,
  Scissors,
  Flame,
  Settings,
  Swords,
  Link,
  BarChart3,
  Star,
  MessageSquare,
  Ruler,
  Landmark,
} from 'lucide-react';
import type { Agent, AgentCommand, SquadType } from '../../types';
import { ICON_SIZES } from '../../lib/icons';

// Extended agent type that includes UI-enriched fields from useAgentById
interface AgentWithExtras extends Omit<Agent, 'capabilities'> {
  commands?: AgentCommand[];
  frameworks?: string[];
  capabilities?: Array<{ type: string; text: string }> | string[];
  commandCount?: number;
}

interface AgentSkillsProps {
  agent: Agent;
  compact?: boolean;
}

// Skill definitions per squad type
const skillDefinitions: Record<SquadType, { name: string; icon: LucideIcon; color: string }[]> = {
  copywriting: [
    { name: 'Persuasão', icon: Sparkles, color: 'orange' },
    { name: 'SEO', icon: Target, color: 'green' },
    { name: 'Storytelling', icon: BookOpen, color: 'purple' },
    { name: 'Criatividade', icon: Lightbulb, color: 'pink' },
    { name: 'Adaptação', icon: RefreshCw, color: 'blue' },
  ],
  design: [
    { name: 'UI Design', icon: Palette, color: 'purple' },
    { name: 'UX Research', icon: Search, color: 'blue' },
    { name: 'Prototipagem', icon: Zap, color: 'orange' },
    { name: 'Branding', icon: Gem, color: 'pink' },
    { name: 'Sistemas', icon: Puzzle, color: 'cyan' },
  ],
  creator: [
    { name: 'Roteiro', icon: Clapperboard, color: 'orange' },
    { name: 'Engajamento', icon: TrendingUp, color: 'green' },
    { name: 'Edição', icon: Scissors, color: 'purple' },
    { name: 'Tendências', icon: Flame, color: 'pink' },
    { name: 'Automação', icon: Settings, color: 'cyan' },
  ],
  orchestrator: [
    { name: 'Coordenação', icon: Target, color: 'blue' },
    { name: 'Estratégia', icon: Swords, color: 'purple' },
    { name: 'Integração', icon: Link, color: 'cyan' },
    { name: 'Otimização', icon: BarChart3, color: 'green' },
    { name: 'Priorização', icon: Star, color: 'orange' },
  ],
  content: [
    { name: 'Roteiro', icon: Clapperboard, color: 'orange' },
    { name: 'Engajamento', icon: TrendingUp, color: 'green' },
    { name: 'Storytelling', icon: BookOpen, color: 'purple' },
    { name: 'Edição', icon: Scissors, color: 'pink' },
    { name: 'Tendências', icon: Flame, color: 'cyan' },
  ],
  development: [
    { name: 'Arquitetura', icon: Puzzle, color: 'blue' },
    { name: 'Código', icon: Zap, color: 'orange' },
    { name: 'Integração', icon: Link, color: 'cyan' },
    { name: 'Testes', icon: Target, color: 'green' },
    { name: 'Deploy', icon: Settings, color: 'purple' },
  ],
  engineering: [
    { name: 'Arquitetura', icon: Puzzle, color: 'blue' },
    { name: 'Código', icon: Zap, color: 'orange' },
    { name: 'Performance', icon: TrendingUp, color: 'green' },
    { name: 'Infraestrutura', icon: Settings, color: 'cyan' },
    { name: 'Qualidade', icon: Target, color: 'purple' },
  ],
  analytics: [
    { name: 'Análise', icon: Search, color: 'blue' },
    { name: 'Métricas', icon: BarChart3, color: 'green' },
    { name: 'Insights', icon: Lightbulb, color: 'orange' },
    { name: 'Modelagem', icon: Puzzle, color: 'purple' },
    { name: 'Visualização', icon: TrendingUp, color: 'cyan' },
  ],
  marketing: [
    { name: 'Campanhas', icon: Target, color: 'pink' },
    { name: 'Automação', icon: Settings, color: 'blue' },
    { name: 'Outreach', icon: MessageSquare, color: 'green' },
    { name: 'Análise', icon: BarChart3, color: 'orange' },
    { name: 'Tendências', icon: TrendingUp, color: 'purple' },
  ],
  advisory: [
    { name: 'Estratégia', icon: Swords, color: 'purple' },
    { name: 'Consultoria', icon: Lightbulb, color: 'yellow' },
    { name: 'Planejamento', icon: Target, color: 'blue' },
    { name: 'Análise', icon: BarChart3, color: 'green' },
    { name: 'Mentoria', icon: Star, color: 'orange' },
  ],
  default: [
    { name: 'Análise', icon: Search, color: 'blue' },
    { name: 'Execução', icon: Zap, color: 'orange' },
    { name: 'Comunicação', icon: MessageSquare, color: 'green' },
  ],
};

// Color palette for dynamic skills
const dynamicColors = ['orange', 'purple', 'blue', 'green', 'pink', 'cyan'];

// Icon mapping for capability types
const capabilityIcons: Record<string, LucideIcon> = {
  principle: Ruler,
  skill: Zap,
  expertise: Target,
  framework: Landmark,
};

// Generate skill levels based on agent capabilities
function generateSkillLevels(agent: Agent): { name: string; icon: LucideIcon; color: string; level: number }[] {
  const extAgent = agent as AgentWithExtras;

  // Priority 1: Use dynamic frameworks from agent markdown
  const frameworks = extAgent.frameworks;
  if (frameworks && frameworks.length > 0) {
    return frameworks.slice(0, 5).map((framework: string, index: number) => {
      const seed = framework.charCodeAt(0) + index * 13;
      const level = 75 + (seed % 20); // 75-95 range for frameworks
      return {
        name: framework.length > 20 ? framework.slice(0, 18) + '...' : framework,
        icon: Landmark,
        color: dynamicColors[index % dynamicColors.length],
        level,
      };
    });
  }

  // Priority 2: Use dynamic capabilities from agent config
  const capabilities = extAgent.capabilities;
  if (capabilities && capabilities.length > 0) {
    return (capabilities as Array<{ type: string; text: string }>).slice(0, 5).map((cap: { type: string; text: string }, index: number) => {
      const text = cap.text.length > 25 ? cap.text.slice(0, 23) + '...' : cap.text;
      const seed = cap.text.charCodeAt(0) + index * 11;
      const level = 70 + (seed % 25);
      return {
        name: text,
        icon: capabilityIcons[cap.type] || Sparkles,
        color: dynamicColors[index % dynamicColors.length],
        level,
      };
    });
  }

  // Fallback: Use static skills based on squad type
  const skills = skillDefinitions[agent.squadType || 'default'] || skillDefinitions.default;

  return skills.map((skill: { name: string; icon: LucideIcon; color: string }, index: number) => {
    // Generate pseudo-random but consistent levels based on agent name and skill
    const seed = agent.name.charCodeAt(0) + index * 17;
    const baseLevel = 60 + (seed % 35); // 60-95 range
    const variance = ((agent.executionCount || 100) / 100) % 10;
    const level = Math.min(98, Math.max(50, baseLevel + variance));

    return {
      ...skill,
      level: Math.round(level),
    };
  });
}

export function AgentSkills({ agent, compact = false }: AgentSkillsProps) {
  const extAgent = agent as AgentWithExtras;
  const skills = generateSkillLevels(agent);

  if (compact) {
    return (
      <div className="flex flex-wrap gap-1.5 mt-2">
        {skills.slice(0, 3).map((skill, index) => (
          <motion.div
            key={skill.name}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
            className="stat-badge"
          >
            <skill.icon size={ICON_SIZES.sm} />
            <span className="stat-badge-value">{skill.level}</span>
          </motion.div>
        ))}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="agent-skills-card"
    >
      <div className="agent-skills-header">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-tertiary">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
        <span className="agent-skills-title">Habilidades</span>
      </div>

      <div className="skill-bar-container">
        {skills.map((skill, index) => (
          <motion.div
            key={skill.name}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.08, duration: 0.3 }}
            className="skill-item"
          >
            <div className="skill-icon"><skill.icon size={ICON_SIZES.md} /></div>
            <div className="skill-info">
              <div className="skill-header">
                <span className="skill-name">{skill.name}</span>
                <span className="skill-level">{skill.level}%</span>
              </div>
              <div className="skill-bar">
                <motion.div
                  className={`skill-bar-fill ${skill.color}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${skill.level}%` }}
                  transition={{ delay: index * 0.08 + 0.2, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Stats summary */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-glass-border-subtle">
        <div className="flex gap-3">
          {/* Commands count - dynamic from agent */}
          {(extAgent.commands?.length ?? 0) > 0 || (extAgent.commandCount ?? 0) > 0 ? (
            <div className="stat-badge">
              <Zap size={ICON_SIZES.sm} />
              <span className="stat-badge-value">
                {extAgent.commands?.length || extAgent.commandCount}
              </span>
              <span className="stat-badge-label">comandos</span>
            </div>
          ) : null}
          {/* Frameworks count */}
          {(extAgent.frameworks?.length ?? 0) > 0 && (
            <div className="stat-badge">
              <Landmark size={ICON_SIZES.sm} />
              <span className="stat-badge-value">{extAgent.frameworks?.length}</span>
              <span className="stat-badge-label">frameworks</span>
            </div>
          )}
          {/* Fallback stats */}
          {!((extAgent.commands?.length ?? 0) > 0) && !((extAgent.frameworks?.length ?? 0) > 0) && (
            <>
              <div className="stat-badge">
                <Star size={ICON_SIZES.sm} />
                <span className="stat-badge-value">{agent.executionCount?.toLocaleString() || '0'}</span>
                <span className="stat-badge-label">tasks</span>
              </div>
              <div className="stat-badge">
                <Zap size={ICON_SIZES.sm} />
                <span className="stat-badge-value">98%</span>
                <span className="stat-badge-label">taxa</span>
              </div>
            </>
          )}
        </div>
        <div className="text-[10px] text-tertiary uppercase tracking-wider">
          {agent.model || 'claude-3'}
        </div>
      </div>
    </motion.div>
  );
}
