import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePresenceStore } from '../../stores/presenceStore';
import { useUIStore } from '../../stores/uiStore';
import { cn } from '../../lib/utils';

function timeAgo(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return 'agora';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  return `${Math.floor(diff / 3600)}h`;
}

const viewLabels: Record<string, string> = {
  chat: 'Chat',
  dashboard: 'Dashboard',
  kanban: 'Kanban',
  insights: 'Insights',
  monitor: 'Monitor',
  stories: 'Stories',
  roadmap: 'Roadmap',
  world: 'World',
  settings: 'Settings',
};

export function PresenceAvatars() {
  const { users } = usePresenceStore();
  const currentView = useUIStore((s) => s.currentView);
  const [showDropdown, setShowDropdown] = useState(false);

  // eslint-disable-next-line react-hooks/purity -- Date.now() needed to filter stale presence data
  const onlineUsers = users.filter((u) => Date.now() - u.lastSeen < 300000);
  const sameViewCount = onlineUsers.filter((u) => u.currentView === currentView).length;

  if (onlineUsers.length === 0) return null;

  return (
    <div className="relative hidden sm:flex items-center">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center -space-x-2 hover:opacity-90 transition-opacity"
        aria-label={`${onlineUsers.length} membros online`}
      >
        {onlineUsers.slice(0, 3).map((user) => (
          <motion.div
            key={user.id}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-semibold text-white border-2 border-[var(--color-bg-primary)]"
            style={{ backgroundColor: user.color }}
            title={user.name}
          >
            {user.avatar}
          </motion.div>
        ))}
        {onlineUsers.length > 3 && (
          <div className="h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-medium text-secondary bg-white/10 border-2 border-[var(--color-bg-primary)]">
            +{onlineUsers.length - 3}
          </div>
        )}
      </button>

      {sameViewCount > 0 && (
        <span className="ml-2 text-[10px] text-tertiary hidden md:inline">
          {sameViewCount} aqui
        </span>
      )}

      <AnimatePresence>
        {showDropdown && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[58]"
              onClick={() => setShowDropdown(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="absolute top-full right-0 mt-2 w-56 glass-card rounded-xl z-[59] overflow-hidden shadow-xl"
            >
              <div className="px-3 py-2 border-b border-white/10">
                <p className="text-xs font-semibold text-primary">Equipe Online</p>
              </div>
              <div className="p-2 space-y-1">
                {onlineUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/5 transition-colors"
                  >
                    <div
                      className="h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-semibold text-white flex-shrink-0"
                      style={{ backgroundColor: user.color }}
                    >
                      {user.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-primary truncate">{user.name}</p>
                      <p className="text-[10px] text-tertiary">
                        em {viewLabels[user.currentView] || user.currentView} · {timeAgo(user.lastSeen)}
                      </p>
                    </div>
                    <div
                      className={cn(
                        'h-2 w-2 rounded-full flex-shrink-0',
                        user.currentView === currentView ? 'bg-green-400' : 'bg-yellow-400'
                      )}
                    />
                  </div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
