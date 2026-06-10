import type { Meta, StoryObj } from '@storybook/react-vite';
import { GlassCard } from './GlassCard';
import { GlassButton } from './GlassButton';

const meta: Meta<typeof GlassCard> = {
  title: 'UI/GlassCard',
  component: GlassCard,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A glassmorphism card with blur effect and customizable variants.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'subtle', 'strong'],
      description: 'Glass intensity variant',
    },
    padding: {
      control: 'select',
      options: ['none', 'sm', 'md', 'lg'],
      description: 'Internal padding',
    },
    radius: {
      control: 'select',
      options: ['sm', 'md', 'lg', 'xl'],
      description: 'Border radius',
    },
    interactive: {
      control: 'boolean',
      description: 'Adds hover effects',
    },
    animate: {
      control: 'boolean',
      description: 'Enables entrance animation',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: (
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Glass Card</h3>
        <p className="text-secondary">This is a glassmorphism card component.</p>
      </div>
    ),
    animate: false,
  },
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
};

export const Subtle: Story = {
  args: {
    variant: 'subtle',
    children: (
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Subtle Card</h3>
        <p className="text-secondary">Less prominent glass effect.</p>
      </div>
    ),
    animate: false,
  },
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
};

export const Strong: Story = {
  args: {
    variant: 'strong',
    children: (
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Strong Card</h3>
        <p className="text-secondary">More intense glass effect.</p>
      </div>
    ),
    animate: false,
  },
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
};

export const Interactive: Story = {
  args: {
    interactive: true,
    children: (
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Interactive Card</h3>
        <p className="text-secondary">Hover to see the effect!</p>
      </div>
    ),
    animate: false,
  },
  decorators: [
    (Story) => (
      <div className="w-80 cursor-pointer">
        <Story />
      </div>
    ),
  ],
};

export const WithContent: Story = {
  args: {
    animate: false,
    children: (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-bold">
            AI
          </div>
          <div>
            <h3 className="font-semibold">AI Assistant</h3>
            <p className="text-sm text-secondary">Copywriting Squad</p>
          </div>
        </div>
        <p className="text-secondary">
          A specialized agent for creating compelling marketing copy and content.
        </p>
        <div className="flex gap-2">
          <GlassButton variant="primary" size="sm">Chat</GlassButton>
          <GlassButton variant="ghost" size="sm">View Profile</GlassButton>
        </div>
      </div>
    ),
  },
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
};

export const PaddingSizes: Story = {
  render: () => (
    <div className="flex flex-col gap-4 w-80">
      <GlassCard padding="none" animate={false}>
        <div className="p-2 text-center text-sm">padding="none"</div>
      </GlassCard>
      <GlassCard padding="sm" animate={false}>
        <div className="text-center text-sm">padding="sm"</div>
      </GlassCard>
      <GlassCard padding="md" animate={false}>
        <div className="text-center text-sm">padding="md"</div>
      </GlassCard>
      <GlassCard padding="lg" animate={false}>
        <div className="text-center text-sm">padding="lg"</div>
      </GlassCard>
    </div>
  ),
};

export const RadiusSizes: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      <GlassCard radius="sm" animate={false}>
        <div className="text-center text-sm w-24">sm</div>
      </GlassCard>
      <GlassCard radius="md" animate={false}>
        <div className="text-center text-sm w-24">md</div>
      </GlassCard>
      <GlassCard radius="lg" animate={false}>
        <div className="text-center text-sm w-24">lg</div>
      </GlassCard>
      <GlassCard radius="xl" animate={false}>
        <div className="text-center text-sm w-24">xl</div>
      </GlassCard>
    </div>
  ),
};

export const CardGrid: Story = {
  render: () => (
    <div className="grid grid-cols-2 gap-4 w-[500px]">
      {['Copywriting', 'Design', 'Creator', 'Orchestrator'].map((squad) => (
        <GlassCard key={squad} interactive animate={false}>
          <div className="text-center">
            <h4 className="font-semibold mb-1">{squad}</h4>
            <p className="text-xs text-secondary">3 agents</p>
          </div>
        </GlassCard>
      ))}
    </div>
  ),
};
