import type { Meta, StoryObj } from '@storybook/react-vite';
import { ConversationHistory } from './ConversationHistory';

const meta: Meta<typeof ConversationHistory> = {
  title: 'Chat/ConversationHistory',
  component: ConversationHistory,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Collapsible sidebar section that lists chat sessions grouped by date (today, yesterday, older). Includes search, new conversation button, and per-session delete with hover reveal.',
      },
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ width: 360, height: 600, position: 'relative' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

// ConversationHistory reads from useChatStore and useUIStore directly.
// In Storybook without store seeding, it will render the empty/collapsed state.

export const Default: Story = {};

export const EmptyStateMockup: Story = {
  name: 'Empty State (mockup)',
  render: () => (
    <div className="space-y-1">
      <div className="flex items-center justify-between px-1 mb-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-secondary uppercase tracking-wider">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <span>Conversas</span>
          <span className="text-tertiary font-normal">(0)</span>
        </div>
      </div>
      <div className="px-3 py-4 text-center text-xs text-tertiary">
        <p className="mt-2">Nenhuma conversa ainda</p>
        <p className="text-[10px] mt-1">Selecione um agent para comecar</p>
      </div>
    </div>
  ),
};

export const WithSessionsMockup: Story = {
  name: 'With Sessions (mockup)',
  render: () => (
    <div className="space-y-1">
      <div className="flex items-center justify-between px-1 mb-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-secondary uppercase tracking-wider">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <span>Conversas</span>
          <span className="text-tertiary font-normal">(3)</span>
        </div>
      </div>

      <div className="space-y-3">
        {/* Today */}
        <div>
          <div className="text-[10px] text-tertiary uppercase tracking-wider px-3 mb-1">Hoje</div>
          <div className="space-y-0.5">
            <div className="px-3 py-2 rounded-lg bg-white/15 flex items-start gap-2">
              <div className="w-1 min-h-[36px] rounded-full bg-blue-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-medium text-primary">Copy Assistant</span>
                  <span className="text-[10px] text-tertiary">2min</span>
                </div>
                <p className="text-[11px] text-secondary truncate">Help me write a tagline...</p>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/20 text-primary">4</span>
            </div>
            <div className="px-3 py-2 rounded-lg hover:bg-white/5 flex items-start gap-2">
              <div className="w-1 min-h-[36px] rounded-full bg-purple-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-medium text-secondary">Designer</span>
                  <span className="text-[10px] text-tertiary">1h</span>
                </div>
                <p className="text-[11px] text-tertiary truncate">Create a mockup for the...</p>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/5 text-tertiary">2</span>
            </div>
          </div>
        </div>

        {/* Yesterday */}
        <div>
          <div className="text-[10px] text-tertiary uppercase tracking-wider px-3 mb-1">Ontem</div>
          <div className="space-y-0.5">
            <div className="px-3 py-2 rounded-lg hover:bg-white/5 flex items-start gap-2">
              <div className="w-1 min-h-[36px] rounded-full bg-green-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-medium text-secondary">Orchestrator</span>
                  <span className="text-[10px] text-tertiary">1d</span>
                </div>
                <p className="text-[11px] text-tertiary truncate">Plan the marketing campai...</p>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/5 text-tertiary">8</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  ),
};
