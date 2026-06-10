import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { GlassButton } from './GlassButton';
import { cn } from '../../lib/utils';

// Icons for common empty states
const InboxIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
    <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
  </svg>
);

const SearchIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="11" cy="11" r="8" />
    <path d="M21 21l-4.35-4.35" />
  </svg>
);

const MessageIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const FolderIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
  </svg>
);

const UsersIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const ActivityIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </svg>
);

const ErrorIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

const WifiOffIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <line x1="1" y1="1" x2="23" y2="23" />
    <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
    <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
    <path d="M10.71 5.05A16 16 0 0 1 22.58 9" />
    <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
    <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
    <line x1="12" y1="20" x2="12.01" y2="20" />
  </svg>
);

export type EmptyStateType =
  | 'inbox'
  | 'search'
  | 'messages'
  | 'files'
  | 'users'
  | 'activity'
  | 'error'
  | 'offline'
  | 'custom';

const iconMap: Record<Exclude<EmptyStateType, 'custom'>, React.FC> = {
  inbox: InboxIcon,
  search: SearchIcon,
  messages: MessageIcon,
  files: FolderIcon,
  users: UsersIcon,
  activity: ActivityIcon,
  error: ErrorIcon,
  offline: WifiOffIcon,
};

interface EmptyStateProps {
  type?: EmptyStateType;
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'ghost';
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  compact?: boolean;
}

export function EmptyState({
  type = 'inbox',
  icon,
  title,
  description,
  action,
  secondaryAction,
  className,
  compact = false,
}: EmptyStateProps) {
  const IconComponent = type !== 'custom' ? iconMap[type] : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'flex flex-col items-center justify-center text-center',
        compact ? 'py-6 px-4' : 'py-12 px-6',
        className
      )}
    >
      {/* Icon */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className={cn(
          'rounded-full flex items-center justify-center mb-4',
          'bg-white/10 text-tertiary',
          compact ? 'w-14 h-14' : 'w-20 h-20'
        )}
      >
        {icon || (IconComponent && <IconComponent />)}
      </motion.div>

      {/* Title */}
      <motion.h3
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className={cn(
          'font-semibold text-primary',
          compact ? 'text-sm' : 'text-lg'
        )}
      >
        {title}
      </motion.h3>

      {/* Description */}
      {description && (
        <motion.p
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={cn(
            'text-secondary mt-2 max-w-sm',
            compact ? 'text-xs' : 'text-sm'
          )}
        >
          {description}
        </motion.p>
      )}

      {/* Actions */}
      {(action || secondaryAction) && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className={cn(
            'flex items-center gap-3',
            compact ? 'mt-4' : 'mt-6'
          )}
        >
          {action && (
            <GlassButton
              variant={action.variant || 'primary'}
              size={compact ? 'sm' : 'md'}
              onClick={action.onClick}
            >
              {action.label}
            </GlassButton>
          )}
          {secondaryAction && (
            <GlassButton
              variant="ghost"
              size={compact ? 'sm' : 'md'}
              onClick={secondaryAction.onClick}
            >
              {secondaryAction.label}
            </GlassButton>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}

// Preset empty states for common use cases
export function NoSearchResults({ query, onClear }: { query: string; onClear?: () => void }) {
  return (
    <EmptyState
      type="search"
      title="Nenhum resultado encontrado"
      description={`Não encontramos resultados para "${query}". Tente termos diferentes.`}
      action={onClear ? { label: 'Limpar busca', onClick: onClear, variant: 'ghost' } : undefined}
    />
  );
}

export function NoMessages({ onStartChat }: { onStartChat?: () => void }) {
  return (
    <EmptyState
      type="messages"
      title="Nenhuma conversa"
      description="Comece uma nova conversa selecionando um agent."
      action={onStartChat ? { label: 'Iniciar conversa', onClick: onStartChat } : undefined}
    />
  );
}

export function NoActivity() {
  return (
    <EmptyState
      type="activity"
      title="Sem atividade recente"
      description="As atividades dos agents aparecerão aqui."
      compact
    />
  );
}

export function NoAgents({ onExplore }: { onExplore?: () => void }) {
  return (
    <EmptyState
      type="users"
      title="Nenhum agent disponível"
      description="Não há agents configurados neste squad."
      action={onExplore ? { label: 'Explorar agents', onClick: onExplore } : undefined}
    />
  );
}

export function OfflineState({ onRetry }: { onRetry?: () => void }) {
  return (
    <EmptyState
      type="offline"
      title="Sem conexão"
      description="Verifique sua conexão com a internet e tente novamente."
      action={onRetry ? { label: 'Tentar novamente', onClick: onRetry } : undefined}
    />
  );
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <EmptyState
      type="error"
      title="Algo deu errado"
      description={message || 'Ocorreu um erro inesperado. Por favor, tente novamente.'}
      action={onRetry ? { label: 'Tentar novamente', onClick: onRetry } : undefined}
    />
  );
}
