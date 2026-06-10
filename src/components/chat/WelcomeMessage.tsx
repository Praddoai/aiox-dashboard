import { motion } from 'framer-motion';
import { Lightbulb } from 'lucide-react';
import { Avatar } from '../ui';
import { AgentSkills } from '../agents/AgentSkills';
import { useChat } from '../../hooks/useChat';
import { ICON_SIZES } from '../../lib/icons';
import { cn } from '../../lib/utils';
import type { Agent } from '../../types';
import type { ChatAgent } from './chat-types';
import { getSuggestionsForAgent } from './chatSuggestions';

interface WelcomeMessageProps {
  agent: ChatAgent;
}

export function WelcomeMessage({ agent }: WelcomeMessageProps) {
  // Helper to check if text is a placeholder
  const isPlaceholder = (text?: string) =>
    !text || text.startsWith('[') || text.includes('{{') || text.length < 10;

  const displayDescription = agent.whenToUse || (!isPlaceholder(agent.description) ? agent.description : null);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center h-full text-center py-8"
    >
      <Avatar
        name={agent.name}
        size="xl"
        squadType={agent.squadType}
        className="mb-4"
      />

      <h2 className="text-primary text-xl font-semibold mb-1">
        {agent.name}
      </h2>

      <p className="text-tertiary text-sm mb-3">
        {agent.title || agent.role}
      </p>

      {/* When to use - Key capability */}
      {displayDescription && (
        <div className="max-w-md mb-6 px-4 py-3 rounded-xl bg-white/5 border border-white/10">
          <p className="text-secondary text-sm leading-relaxed">
            {displayDescription}
          </p>
        </div>
      )}

      {/* Skills Card */}
      <div className="w-full max-w-sm mb-6">
        <AgentSkills agent={agent as unknown as Agent} />
      </div>

      {/* Suggestion Prompts */}
      <div className="max-w-lg w-full">
        <div className="flex items-center gap-2 justify-center mb-4">
          <Lightbulb size={ICON_SIZES.lg} className="text-secondary" />
          <p className="text-tertiary text-xs uppercase tracking-wider font-medium">
            O que posso fazer por você
          </p>
        </div>
        <SuggestionPrompts agent={agent} />
      </div>
    </motion.div>
  );
}

function SuggestionPrompts({ agent }: { agent: ChatAgent }) {
  const { sendMessage } = useChat();

  const suggestions = getSuggestionsForAgent(agent);

  return (
    <div className="grid gap-2">
      {suggestions.map((suggestion, index) => (
        <motion.button
          key={index}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          onClick={() => sendMessage(suggestion.prompt)}
          className={cn(
            'glass-subtle rounded-xl p-3 text-left',
            'hover:bg-white/30 dark:hover:bg-white/10',
            'transition-all duration-200 group',
            'border border-transparent hover:border-white/10'
          )}
        >
          <div className="flex items-start gap-3">
            <suggestion.icon size={ICON_SIZES.lg} className="text-secondary flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-primary font-medium">{suggestion.label}</p>
              <p className="text-xs text-tertiary mt-0.5 line-clamp-1 group-hover:text-secondary transition-colors">
                {suggestion.prompt}
              </p>
            </div>
          </div>
        </motion.button>
      ))}
    </div>
  );
}
