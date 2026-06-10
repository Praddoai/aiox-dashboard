'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  type LucideIcon,
  User,
  Settings,
  Palette,
  BarChart3,
  BookOpen,
  MessageSquare,
  LogOut,
  Menu,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GlassAvatar } from '@/components/ui/GlassAvatar';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { useGlobalSearch } from '@/components/search';
import { useUIStore } from '@/stores/uiStore';
import { cn, formatRelativeTime } from '@/lib/utils';

const ICON_SIZE_MD = 16;

// Icons
const SearchIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8" />
    <path d="M21 21l-4.35-4.35" />
  </svg>
);

const ActivityIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </svg>
);

const WorkflowIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="5" r="3" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <circle cx="6" cy="17" r="3" />
    <circle cx="18" cy="17" r="3" />
    <line x1="12" y1="12" x2="6" y2="14" />
    <line x1="12" y1="12" x2="18" y2="14" />
  </svg>
);

const CompassIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
  </svg>
);

const BellIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 01-3.46 0" />
  </svg>
);

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const CloseIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const MasterIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);

// Mobile menu button (originally exported from platform Sidebar)
export function MobileMenuButton() {
  const { setMobileMenuOpen } = useUIStore();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setMobileMenuOpen(true)}
      className="md:hidden h-10 w-10"
      aria-label="Open menu"
    >
      <Menu size={18} />
    </Button>
  );
}

// TODO: Replace with real notification system when available
type Notification = {
  id: string;
  type: 'success' | 'info' | 'warning';
  title: string;
  message: string;
  agentName: string;
  squadType: string;
  time: string;
  read: boolean;
};

export function Header() {
  const { activityPanelOpen, toggleActivityPanel, workflowViewOpen, toggleWorkflowView, agentExplorerOpen, toggleAgentExplorer } = useUIStore();
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const globalSearch = useGlobalSearch();

  const notificationRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const dismissNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <header className="h-16 px-4 md:px-6 flex items-center justify-between glass border-b border-glass-border gap-4 relative z-50">
      {/* Mobile Menu Button */}
      <MobileMenuButton />

      {/* Search Button - Opens Global Search */}
      <button
        onClick={globalSearch.open}
        className="flex-1 max-w-md h-10 px-3 md:px-4 flex items-center gap-2 md:gap-3 rounded-xl bg-glass-5 hover:bg-glass-10 border border-glass-border transition-colors text-left group"
      >
        <SearchIcon />
        <span className="text-tertiary text-sm flex-1 hidden sm:block">Buscar agents, squads...</span>
        <span className="text-tertiary text-sm flex-1 sm:hidden">Buscar...</span>
        <div className="hidden sm:flex items-center gap-1 text-[10px] text-tertiary opacity-60 group-hover:opacity-100 transition-opacity">
          <kbd className="px-1.5 py-0.5 rounded bg-glass-10 font-mono">&#8984;</kbd>
          <kbd className="px-1.5 py-0.5 rounded bg-glass-10 font-mono">K</kbd>
        </div>
      </button>

      {/* Right Actions */}
      <div className="flex items-center gap-2">
        {/* AIOS Master Button - Talk to orchestrator from anywhere */}
        <AIOSMasterButton />

        {/* Notifications */}
        <div className="relative" ref={notificationRef}>
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            style={showNotifications ? {
              backgroundColor: 'var(--sidebar-active-bg)',
              color: 'var(--sidebar-active-text)',
            } : undefined}
            onClick={() => setShowNotifications(!showNotifications)}
          >
            <BellIcon />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 h-4 w-4 bg-red-500 rounded-full text-[10px] text-foreground-primary font-medium flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </Button>

          {/* Notifications Dropdown */}
          <AnimatePresence>
            {showNotifications && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="absolute top-full right-0 mt-2 w-[calc(100vw-2rem)] sm:w-80 max-w-80 glass-lg rounded-xl overflow-hidden z-[999]"
              >
                {/* Header */}
                <div className="px-4 py-3 border-b border-glass-border flex items-center justify-between">
                  <h3 className="text-primary font-semibold">Notificações</h3>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-xs text-blue-500 hover:text-blue-400 transition-colors"
                    >
                      Marcar todas como lidas
                    </button>
                  )}
                </div>

                {/* Notifications List */}
                <div className="max-h-80 overflow-y-auto glass-scrollbar">
                  {notifications.length > 0 ? (
                    notifications.map((notification, index) => (
                      <motion.div
                        key={notification.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className={cn(
                          'px-4 py-3 border-b border-glass-border last:border-0',
                          'hover:bg-glass-5 transition-colors',
                          !notification.read && 'bg-blue-500/5'
                        )}
                        onClick={() => markAsRead(notification.id)}
                      >
                        <div className="flex items-start gap-3">
                          <GlassAvatar
                            name={notification.agentName}
                            size="sm"
                            squadType={notification.squadType as any}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-primary text-sm font-medium">
                                {notification.title}
                              </p>
                              {!notification.read && (
                                <span className="h-2 w-2 rounded-full bg-blue-500" />
                              )}
                            </div>
                            <p className="text-secondary text-xs mt-0.5">
                              {notification.message}
                            </p>
                            <p className="text-tertiary text-[10px] mt-1">
                              {formatRelativeTime(notification.time)}
                            </p>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              dismissNotification(notification.id);
                            }}
                            className="text-tertiary hover:text-primary transition-colors p-1"
                          >
                            <CloseIcon />
                          </button>
                        </div>
                      </motion.div>
                    ))
                  ) : (
                    <div className="px-4 py-8 text-center">
                      <p className="text-secondary text-sm">Nenhuma notificação</p>
                    </div>
                  )}
                </div>

                {/* Footer */}
                {notifications.length > 0 && (
                  <div className="px-4 py-2 border-t border-glass-border">
                    <button className="w-full text-center text-xs text-blue-500 hover:text-blue-400 transition-colors py-1">
                      Ver todas as notificações
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Agent Explorer Toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleAgentExplorer}
          className={cn('hidden sm:flex', agentExplorerOpen && 'bg-emerald-500/10 text-emerald-500')}
          title="Explorar Agents"
        >
          <CompassIcon />
        </Button>

        {/* Workflow View Toggle - Hidden on mobile */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleWorkflowView}
          className={cn('hidden md:flex', workflowViewOpen && 'bg-purple-500/10 text-purple-500')}
          title="Visualizar Workflow"
        >
          <WorkflowIcon />
        </Button>

        {/* Activity Panel Toggle - Hidden on mobile */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleActivityPanel}
          className={cn('hidden lg:flex', activityPanelOpen && 'bg-blue-500/10 text-blue-500')}
        >
          <ActivityIcon />
        </Button>

        {/* Theme Toggle with Dropdown */}
        <ThemeToggle showDropdown />

        {/* User Avatar with Dropdown */}
        <UserMenu />
      </div>
    </header>
  );
}

// AIOS Master Button - Global orchestrator access
function AIOSMasterButton() {
  const { setSelectedAgentId, setCurrentView } = useUIStore();

  const handleClick = () => {
    // Set the orchestrator agent (roteador) and switch to chat view
    // roteador is the central routing agent that directs requests to appropriate squads
    setSelectedAgentId('roteador');
    setCurrentView('chat');
  };

  return (
    <motion.button
      onClick={handleClick}
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-xl',
        'bg-gradient-to-r from-cyan-500/20 to-blue-500/20',
        'border border-cyan-500/30',
        'text-cyan-400 hover:text-cyan-300',
        'hover:from-cyan-500/30 hover:to-blue-500/30',
        'transition-all duration-200',
        'shadow-lg shadow-cyan-500/10'
      )}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      title="Falar com AIOS Master"
    >
      <MasterIcon />
      <span className="hidden sm:inline text-sm font-medium">AIOS Master</span>
    </motion.button>
  );
}

function UserMenu() {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { setCurrentView } = useUIStore();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative ml-2" ref={menuRef}>
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="h-10 w-10 sm:h-9 sm:w-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-foreground-primary text-sm font-medium hover:scale-105 transition-transform touch-manipulation"
      >
        RC
      </button>

      <AnimatePresence>
        {showMenu && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full right-0 mt-2 w-[calc(100vw-2rem)] sm:w-56 max-w-56 glass-lg rounded-xl overflow-hidden z-[999]"
          >
            {/* User Info */}
            <div className="px-4 py-3 border-b border-glass-border">
              <p className="text-primary font-medium">Rafael Costa</p>
              <p className="text-tertiary text-xs">rafael@example.com</p>
            </div>

            {/* Menu Items */}
            <div className="p-2">
              <MenuItem icon={User} label="Meu Perfil" onClick={() => { setCurrentView('settings'); setShowMenu(false); }} />
              <MenuItem icon={Settings} label="Configurações" onClick={() => { setCurrentView('settings'); setShowMenu(false); }} />
              <MenuItem icon={Palette} label="Aparência" onClick={() => { setCurrentView('settings'); setShowMenu(false); }} />
              <MenuItem icon={BarChart3} label="Uso e Limites" onClick={() => { setCurrentView('dashboard'); setShowMenu(false); }} />
              <div className="h-px bg-glass-border my-2" />
              <MenuItem icon={BookOpen} label="Documentação" />
              <MenuItem icon={MessageSquare} label="Suporte" />
              <div className="h-px bg-glass-border my-2" />
              <MenuItem icon={LogOut} label="Sair" danger />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface MenuItemProps {
  icon: LucideIcon;
  label: string;
  danger?: boolean;
  onClick?: () => void;
}

function MenuItem({ icon: Icon, label, danger, onClick }: MenuItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors text-left',
        danger
          ? 'text-red-500 hover:bg-red-500/10'
          : 'text-primary hover:bg-glass-10'
      )}
    >
      <Icon size={ICON_SIZE_MD} />
      <span>{label}</span>
    </button>
  );
}
