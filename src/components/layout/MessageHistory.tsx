import { motion } from 'framer-motion';
import { formatRelativeTime } from '../../lib/utils';
import type { Message } from '../../types';
import { UserIcon, BotIcon } from './activity-panel-icons';

export function MessageHistory({ messages }: { messages: Message[] }) {
  // Show last 10 messages in reverse order (newest first)
  const recentMessages = [...messages].reverse().slice(0, 10);

  return (
    <div className="space-y-2">
      <p className="text-xs text-tertiary px-1">Últimas {Math.min(messages.length, 10)} mensagens</p>
      {recentMessages.map((message, index) => (
        <motion.div
          key={message.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.03 }}
          className="p-3 rounded-xl glass-subtle"
        >
          <div className="flex items-center gap-2 mb-1">
            <div className={`h-5 w-5 rounded-full flex items-center justify-center ${
              message.role === 'user'
                ? 'bg-blue-500/20 text-blue-400'
                : 'bg-purple-500/20 text-purple-400'
            }`}>
              {message.role === 'user' ? <UserIcon /> : <BotIcon />}
            </div>
            <span className="text-xs font-medium text-primary">
              {message.role === 'user' ? 'Você' : message.agentName || 'Agent'}
            </span>
            <span className="text-[10px] text-tertiary ml-auto">
              {formatRelativeTime(message.timestamp)}
            </span>
          </div>
          <p className="text-xs text-secondary line-clamp-2 pl-7">
            {message.content}
          </p>
        </motion.div>
      ))}
    </div>
  );
}
