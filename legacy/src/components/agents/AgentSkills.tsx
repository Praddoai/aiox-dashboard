'use client';

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
import type { PlatformAgent, SquadType } from '@/types';

// Icon sizes (inline since ICON_SIZES is not available in dashboard)
const ICON_SIZES = { sm: 12, md: 16, lg: 20 };

interface AgentSkillsProps {
  agent: PlatformAgent;
  compact?: boolean;
}

// Skill definitions per squad type
const skillDefinitions: Record<SquadType, { name: string; icon: LucideIcon; color: string }[]> = {
  copywriting: [
    { name: 'Persuasao', icon: Sparkles, color: 'orange' },
    { name: 'SEO', icon: Target, color: 'green' },
    { name: 'Storytelling', icon: BookOpen, color: 'purple' },
    { name: 'Criatividade', icon: Lightbulb, color: 'pink' },
    { name: 'Adaptacao', icon: RefreshCw, color: 'blue' },
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
    { name: 'Edicao', icon: Scissors, color: 'purple' },
    { name: 'Tendencias', icon: Flame, color: 'pink' },
    { name: 'Automacao', icon: Settings, color: 'cyan' },
  ],
  orchestrator: [
    { name: 'Coordenacao', icon: Target, color: 'blue' },
    { name: 'Estrategia', icon: Swords, color: 'purple' },
    { name: 'Integracao', icon: Link, color: 'cyan' },
    { name: 'Otimizacao', icon: BarChart3, color: 'green' },
    { name: 'Priorizacao', icon: Star, color: 'orange' },
  ],
  content: [
    { name: 'Roteiro', icon: Clapperboard, color: 'orange' },
    { name: 'Engajamento', icon: TrendingUp, color: 'green' },
    { name: 'Edicao', icon: Scissors, color: 'purple' },
    { name: 'Tendencias', icon: Flame, color: 'pink' },
    { name: 'Automacao', icon: Settings, color: 'cyan' },
  ],
  development: [
    { name: 'Analise', icon: Search, color: 'blue' },
    { name: 'Execucao', icon: Zap, color: 'orange' },
    { name: 'Comunicacao', icon: MessageSquare, color: 'green' },
  ],
  engineering: [
    { name: 'Analise', icon: Search, color: 'blue' },
    { name: 'Execucao', icon: Zap, color: 'orange' },
    { name: 'Comunicacao', icon: MessageSquare, color: 'green' },
  ],
  analytics: [
    { name: 'Analise', icon: Search, color: 'blue' },
    { name: 'Execucao', icon: Zap, color: 'orange' },
    { name: 'Comunicacao', icon: MessageSquare, color: 'green' },
  ],
  marketing: [
    { name: 'Analise', icon: Search, color: 'blue' },
    { name: 'Execucao', icon: Zap, color: 'orange' },
    { name: 'Comunicacao', icon: MessageSquare, color: 'green' },
  ],
  advisory: [
    { name: 'Analise', icon: Search, color: 'blue' },
    { name: 'Execucao', icon: Zap, color: 'orange' },
    { name: 'Comunicacao', icon: MessageSquare, color: 'green' },
  ],
  default: [
    { name: 'Analise', icon: Search, color: 'blue' },
    { name: 'Execucao', icon: Zap, color: 'orange' },
    { name: 'Comunicacao', icon: MessageSquare, color: 'green' },
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
function generateSkillLevels(agent: PlatformAgent): { name: string; icon: LucideIcon; color: string; level: number }[] {
  // Priority 1: Use dynamic frameworks from agent markdown
  if ((agent as any).frameworks && (agent as any).frameworks.length > 0) {
    return (agent as any).frameworks.slice(0, 5).map((framework: string, index: number) => {
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
  if ((agent as any).capabilities && (agent as any).capabilities.length > 0) {
    return (agent as any).capabilities.slice(0, 5).map((cap: { type: string; text: string }, index: number) => {
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
    // Generate pseudo-random but consistent levels based on agent name
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
          {((agent as any).commands?.length > 0 || (agent as any).commandCount > 0) && (
            <div className="stat-badge">
              <Zap size={ICON_SIZES.sm} />
              <span className="stat-badge-value">
                {(agent as any).commands?.length || (agent as any).commandCount}
              </span>
              <span className="stat-badge-label">comandos</span>
            </div>
          )}
          {/* Frameworks count */}
          {(agent as any).frameworks?.length > 0 && (
            <div className="stat-badge">
              <Landmark size={ICON_SIZES.sm} />
              <span className="stat-badge-value">{(agent as any).frameworks.length}</span>
              <span className="stat-badge-label">frameworks</span>
            </div>
          )}
          {/* Fallback stats */}
          {!((agent as any).commands?.length > 0) && !((agent as any).frameworks?.length > 0) && (
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
