/* eslint-disable react-refresh/only-export-components */
import { useEffect } from 'react';
import type { Preview } from '@storybook/react-vite';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { installApiMocks } from './api-mocks';
import '../src/index.css';
import '../src/styles/liquid-glass.css';
import '../src/styles/light-mode-compat.css';

// Intercept /api/* fetch calls with mock data
installApiMocks();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

// Override liquid-glass.css body overflow:hidden so Storybook docs pages can scroll
const styleOverride = document.createElement('style');
styleOverride.textContent = `
  body { overflow: auto !important; }
  .sb-show-main { overflow: auto !important; }
  .docs-story > div { overflow: visible !important; }
`;
document.head.appendChild(styleOverride);

/**
 * Theme activation map:
 *   light  → no .dark, no data-theme
 *   dark   → .dark on <html>, no data-theme
 *   glass  → .dark on <html>, data-theme="glass" on <html>
 *   matrix → .dark on <html>, data-theme="matrix" on <html>
 *   aiox   → .dark on <html>, data-theme="aiox" on <html>
 */
function ThemeWrapper({ theme, children }: { theme: string; children: React.ReactNode }) {
  useEffect(() => {
    const html = document.documentElement;

    // Dark class: all themes except light need it
    const needsDark = theme !== 'light';
    html.classList.toggle('dark', needsDark);

    // data-theme attribute: only glass and matrix
    if (theme === 'glass' || theme === 'matrix' || theme === 'aiox') {
      html.setAttribute('data-theme', theme);
    } else {
      html.removeAttribute('data-theme');
    }

    return () => {
      html.classList.remove('dark');
      html.removeAttribute('data-theme');
    };
  }, [theme]);

  return (
    <div
      className={theme !== 'light' ? 'dark' : ''}
      style={{ position: 'relative', minHeight: 200 }}
    >
      {/* Real app-background from liquid-glass.css — provides gradient + blobs + noise */}
      <div className="app-background" style={{ position: 'absolute', inset: 0, zIndex: 0 }} />
      {/* Content above background */}
      <div style={{ position: 'relative', zIndex: 1, padding: 24 }}>
        {children}
      </div>
    </div>
  );
}

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: { disable: true },
    a11y: {
      test: 'error',
      config: {
        rules: [
          // color-contrast disabled in CI — requires design system-level token audit
          // (glass morphism theme uses low-opacity overlays that axe cannot compute)
          // TODO: run `*contrast-matrix` to fix token palette and re-enable
          { id: 'color-contrast', enabled: false },
          // scrollable-region-focusable on <body> is a Storybook iframe issue, not our components
          { id: 'scrollable-region-focusable', selector: ':not(body)' },
        ],
      },
    },
  },
  globalTypes: {
    theme: {
      name: 'Theme',
      description: 'Global theme for components',
      defaultValue: 'dark',
      toolbar: {
        icon: 'circlehollow',
        items: [
          { value: 'light', icon: 'sun', title: 'Light' },
          { value: 'dark', icon: 'moon', title: 'Dark' },
          { value: 'glass', icon: 'mirror', title: 'Glass' },
          { value: 'matrix', icon: 'cpu', title: 'Matrix' },
          { value: 'aiox', icon: 'lightning', title: 'AIOX Cockpit' },
        ],
        showName: true,
        dynamicTitle: true,
      },
    },
  },
  decorators: [
    (Story, context) => {
      const theme = context.globals.theme ?? 'dark';
      return (
        <QueryClientProvider client={queryClient}>
          <ThemeWrapper theme={theme}>
            <Story />
          </ThemeWrapper>
        </QueryClientProvider>
      );
    },
  ],
};

export default preview;
