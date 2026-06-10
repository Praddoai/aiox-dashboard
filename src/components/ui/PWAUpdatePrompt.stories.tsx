import type { Meta, StoryObj } from '@storybook/react-vite';
import { PWAUpdatePrompt } from './PWAUpdatePrompt';

const meta: Meta<typeof PWAUpdatePrompt> = {
  title: 'UI/PWAUpdatePrompt',
  component: PWAUpdatePrompt,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'PWA install and update prompt. Shows an install banner when the beforeinstallprompt event fires, and an update banner when a new service worker is detected. Both prompts are positioned as fixed floating cards.',
      },
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

// The real component relies on browser events (beforeinstallprompt, service worker updates)
// that don't fire in Storybook. We show static mockups of each state.

export const Default: Story = {
  name: 'Live Component',
  render: () => (
    <div className="min-h-[400px] relative">
      <p className="p-8 text-sm text-tertiary">
        The PWAUpdatePrompt relies on browser PWA events. In Storybook, the prompts will not appear
        unless the browser fires a beforeinstallprompt event or a service worker update is detected.
      </p>
      <PWAUpdatePrompt />
    </div>
  ),
};

export const UpdateAvailableMockup: Story = {
  render: () => (
    <div className="min-h-[400px] relative flex items-end justify-end p-4">
      <div className="w-80">
        <div className="glass-card rounded-xl p-4 shadow-lg border border-white/10">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400 flex-shrink-0">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M23 4v6h-6" />
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-primary">Nova versao disponivel</h4>
              <p className="text-xs text-secondary mt-1">
                Uma atualizacao esta pronta para ser instalada.
              </p>
              <div className="flex items-center gap-2 mt-3">
                <button className="px-3 py-1.5 text-xs rounded-lg bg-blue-500 text-white">
                  Atualizar
                </button>
                <button className="px-3 py-1.5 text-xs rounded-lg text-tertiary hover:text-primary">
                  Depois
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  ),
};

export const InstallPromptMockup: Story = {
  render: () => (
    <div className="min-h-[400px] relative flex items-start justify-end p-4">
      <div className="w-80">
        <div className="glass-card rounded-xl p-4 shadow-lg border border-white/10">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white flex-shrink-0">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-primary">Instalar AIOS Core</h4>
                <button className="p-1 rounded text-tertiary hover:text-primary" aria-label="Fechar">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
              <p className="text-xs text-secondary mt-1">
                Instale o app para acesso rapido e experiencia offline.
              </p>
              <div className="flex items-center gap-2 mt-3">
                <button className="px-3 py-1.5 text-xs rounded-lg bg-blue-500 text-white">
                  Instalar
                </button>
                <button className="px-3 py-1.5 text-xs rounded-lg text-tertiary hover:text-primary">
                  Agora nao
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  ),
};
