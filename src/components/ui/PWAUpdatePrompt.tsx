import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassButton } from './GlassButton';

const RefreshIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M23 4v6h-6" />
    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
  </svg>
);

const CloseIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const DownloadIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

export function PWAUpdatePrompt() {
  const [showInstallPrompt, setShowInstallPrompt] = useState(() => {
    // Check if already dismissed on initial render
    try {
      return !sessionStorage.getItem('pwa-install-dismissed');
    } catch {
      return true;
    }
  });
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null);
  const [needRefresh, setNeedRefresh] = useState(false);

  // Handle install prompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  // Register service worker manually in production
  useEffect(() => {
    if (import.meta.env.PROD && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then((registration) => {
        console.log('Service Worker registered:', registration.scope);

        // Check for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setNeedRefresh(true);
              }
            });
          }
        });

        // Check for updates periodically
        setInterval(() => {
          registration.update();
        }, 60 * 60 * 1000); // Every hour
      }).catch((error) => {
        console.error('Service Worker registration failed:', error);
      });
    }
  }, []);

  const handleUpdate = () => {
    window.location.reload();
  };

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    // @ts-expect-error - prompt exists on beforeinstallprompt event
    deferredPrompt.prompt();
    // @ts-expect-error - userChoice exists on beforeinstallprompt event
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    }

    setDeferredPrompt(null);
    setShowInstallPrompt(false);
  };

  const handleDismissInstall = () => {
    setShowInstallPrompt(false);
    try {
      sessionStorage.setItem('pwa-install-dismissed', 'true');
    } catch {
      // Storage not available
    }
  };

  return (
    <>
      {/* Update Available Prompt */}
      <AnimatePresence>
        {needRefresh && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 z-50"
          >
            <div className="glass-card rounded-xl p-4 shadow-lg">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400 flex-shrink-0">
                  <RefreshIcon />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-primary">Nova versão disponível</h4>
                  <p className="text-xs text-secondary mt-1">
                    Uma atualização está pronta para ser instalada.
                  </p>
                  <div className="flex items-center gap-2 mt-3">
                    <GlassButton
                      variant="primary"
                      size="sm"
                      onClick={handleUpdate}
                      leftIcon={<RefreshIcon />}
                    >
                      Atualizar
                    </GlassButton>
                    <GlassButton
                      variant="ghost"
                      size="sm"
                      onClick={() => setNeedRefresh(false)}
                    >
                      Depois
                    </GlassButton>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Install App Prompt */}
      <AnimatePresence>
        {showInstallPrompt && deferredPrompt && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.95 }}
            className="fixed top-4 left-4 right-4 md:left-auto md:right-4 md:w-80 z-50"
          >
            <div className="glass-card rounded-xl p-4 shadow-lg">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white flex-shrink-0">
                  <DownloadIcon />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-primary">Instalar AIOS Core</h4>
                    <button
                      onClick={handleDismissInstall}
                      className="p-1 rounded text-tertiary hover:text-primary hover:bg-white/10 transition-colors"
                      aria-label="Fechar"
                    >
                      <CloseIcon />
                    </button>
                  </div>
                  <p className="text-xs text-secondary mt-1">
                    Instale o app para acesso rápido e experiência offline.
                  </p>
                  <div className="flex items-center gap-2 mt-3">
                    <GlassButton
                      variant="primary"
                      size="sm"
                      onClick={handleInstall}
                      leftIcon={<DownloadIcon />}
                    >
                      Instalar
                    </GlassButton>
                    <GlassButton
                      variant="ghost"
                      size="sm"
                      onClick={handleDismissInstall}
                    >
                      Agora não
                    </GlassButton>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// Hook to check if running as PWA
export function useIsPWA() {
  const [isPWA] = useState(() => {
    // Check if running in standalone mode (installed PWA)
    return window.matchMedia('(display-mode: standalone)').matches
      // @ts-expect-error - navigator.standalone exists on iOS
      || window.navigator.standalone
      || document.referrer.includes('android-app://');
  });

  return isPWA;
}
