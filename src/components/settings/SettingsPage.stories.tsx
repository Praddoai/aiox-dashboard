import type { Meta, StoryObj } from '@storybook/react-vite';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SettingsPage } from './SettingsPage';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, staleTime: Infinity } },
});

function Wrapper() {
  return (
    <QueryClientProvider client={queryClient}>
      <div style={{ height: '100vh', padding: 24, background: '#0f0f14' }}>
        <SettingsPage />
      </div>
    </QueryClientProvider>
  );
}

const meta: Meta<typeof SettingsPage> = {
  title: 'Settings/SettingsPage',
  component: SettingsPage,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Main settings page with sidebar navigation and content area. Sections include Dashboard, Categories & Squads, Memory, Workflows, Profile, API Keys, Appearance (theme picker), Notifications, Privacy, and About.',
      },
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <Wrapper />,
};

export const InCompactContainer: Story = {
  render: () => (
    <QueryClientProvider client={queryClient}>
      <div style={{ height: 600, width: 800, padding: 16, background: '#0f0f14', overflow: 'hidden' }}>
        <SettingsPage />
      </div>
    </QueryClientProvider>
  ),
};
