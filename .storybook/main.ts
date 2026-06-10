import type { StorybookConfig } from '@storybook/react-vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const config: StorybookConfig = {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  addons: [
    '@chromatic-com/storybook',
    '@storybook/addon-a11y',
    '@storybook/addon-docs',
    '@storybook/addon-vitest',
    '@storybook/addon-onboarding',
  ],
  framework: '@storybook/react-vite',
  async viteFinal(config) {
    // Add alias for PWA virtual module
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...config.resolve.alias,
      'virtual:pwa-register/react': path.resolve(__dirname, '../src/test/mocks/pwa-register.ts'),
    };

    // Filter out PWA plugins
    if (config.plugins) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      config.plugins = (config.plugins as any[]).filter((plugin) => {
        if (!plugin) return false;
        if (typeof plugin === 'object' && 'name' in plugin) {
          const name = String(plugin.name || '').toLowerCase();
          return !name.includes('pwa') && !name.includes('workbox');
        }
        return true;
      });
    }

    return config;
  },
};

export default config;
