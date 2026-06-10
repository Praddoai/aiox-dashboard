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
} from 'lucide-react';
import { GlassButton, ThemeToggle, ShortcutHint } from '../ui';
import { NotificationCenter } from '../ui/NotificationCenter';
import { FocusToggle } from '../ui/FocusModeIndicator';
import { PresenceAvatars } from '../ui/PresenceAvatars';
import { LanguageToggle } from '../ui/LanguageToggle';
import { MobileMenuButton } from './Sidebar';
import { useGlobalSearch } from '../search';
import { useUIStore } from '../../stores/uiStore';
import { cn } from '../../lib/utils';
import { ICON_SIZES } from '../../lib/icons';

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

const MasterIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);


export function Header() {
  const { activityPanelOpen, toggleActivityPanel, workflowViewOpen, toggleWorkflowView, agentExplorerOpen, toggleAgentExplorer } = useUIStore();
  const globalSearch = useGlobalSearch();

  return (
    <header aria-label="Cabecalho principal" className="h-16 px-4 md:px-6 flex items-center justify-between glass border-b border-glass-border gap-4 relative z-50">
      {/* Mobile Menu Button */}
      <MobileMenuButton />

      {/* Search Button - Opens Global Search */}
      <button
        onClick={globalSearch.open}
        aria-label="Buscar agents, squads (⌘K)"
        className="flex-1 max-w-md h-10 px-3 md:px-4 flex items-center gap-2 md:gap-3 rounded-xl bg-white/5 hover:bg-white/10 border border-glass-border transition-colors text-left group"
      >
        <SearchIcon />
        <span className="text-tertiary text-sm flex-1 hidden sm:block">Buscar agents, squads...</span>
        <span className="text-tertiary text-sm flex-1 sm:hidden">Buscar...</span>
        <div className="hidden sm:flex items-center gap-1 text-[10px] text-tertiary opacity-60 group-hover:opacity-100 transition-opacity">
          <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-mono">⌘</kbd>
          <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-mono">K</kbd>
        </div>
      </button>

      {/* Right Actions */}
      <div className="flex items-center gap-2">
        {/* Presence Avatars — team members online */}
        <PresenceAvatars />

        {/* AIOS Master Button - Talk to orchestrator from anywhere */}
        <AIOSMasterButton />

        {/* Notifications — powered by toast store */}
        <NotificationCenter />

        {/* Focus Mode Toggle */}
        <ShortcutHint keys={['⌘', '⇧', 'F']}>
          <FocusToggle />
        </ShortcutHint>

        {/* Agent Explorer Toggle */}
        <ShortcutHint keys={['⌘', 'E']}>
          <GlassButton
            variant="ghost"
            size="icon"
            onClick={toggleAgentExplorer}
            className={cn('hidden sm:flex', agentExplorerOpen && 'bg-[#D1FF00]/10 text-[#D1FF00]')}
            aria-label="Explorar Agents (⌘E)"
          >
            <CompassIcon />
          </GlassButton>
        </ShortcutHint>

        {/* Workflow View Toggle - Hidden on mobile */}
        <ShortcutHint keys={['⌘', '⇧', 'W']}>
          <GlassButton
            variant="ghost"
            size="icon"
            onClick={toggleWorkflowView}
            className={cn('hidden md:flex', workflowViewOpen && 'bg-[#0099FF]/10 text-[#0099FF]')}
            aria-label="Visualizar Workflow (⌘⇧W)"
          >
            <WorkflowIcon />
          </GlassButton>
        </ShortcutHint>

        {/* Activity Panel Toggle - Hidden on mobile */}
        <ShortcutHint keys={['⌘', '\\']}>
          <GlassButton
            variant="ghost"
            size="icon"
            onClick={toggleActivityPanel}
            aria-label="Painel de Atividade (⌘\\)"
            className={cn('hidden lg:flex', activityPanelOpen && 'bg-[#0099FF]/10 text-[#0099FF]')}
          >
            <ActivityIcon />
          </GlassButton>
        </ShortcutHint>

        {/* Theme Toggle with Dropdown */}
        <ShortcutHint keys={['⌘', '.']}>
          <ThemeToggle showDropdown />
        </ShortcutHint>

        {/* Language Toggle */}
        <LanguageToggle />

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
        'bg-gradient-to-r from-[#D1FF00]/20 to-[#a8cc00]/20',
        'border border-[#D1FF00]/30',
        'text-[#D1FF00] hover:text-[#e5ff4d]',
        'hover:from-[#D1FF00]/30 hover:to-[#a8cc00]/30',
        'transition-all duration-200',
        'shadow-lg shadow-[#D1FF00]/10'
      )}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      aria-label="Falar com AIOS Master"
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
        aria-label="RC — Menu do usuário"
        className="h-10 w-10 sm:h-9 sm:w-9 rounded-full bg-gradient-to-br from-[#D1FF00] to-[#a8cc00] flex items-center justify-center text-[#0a0a0a] text-sm font-medium hover:scale-105 transition-transform touch-manipulation"
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
          : 'text-primary hover:bg-white/10'
      )}
    >
      <Icon size={ICON_SIZES.md} />
      <span>{label}</span>
    </button>
  );
}
