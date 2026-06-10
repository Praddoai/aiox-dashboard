import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import {
  Terminal,
  MessageSquare,
  AlertTriangle,
  Settings2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard, GlassButton, SectionLabel } from '../ui';
import { cn } from '../../lib/utils';

/**
 * EventList uses the monitorStore internally. This presentational
 * version renders the same UI with inline mock data.
 */

interface MockEvent {
  id: string;
  timestamp: string;
  type: 'tool_call' | 'message' | 'error' | 'system';
  agent: string;
  description: string;
  duration?: number;
  success?: boolean;
}

const eventTypeConfig: Record<MockEvent['type'], { icon: typeof Terminal; label: string; badgeClass: string }> = {
  tool_call: { icon: Terminal, label: 'Tool', badgeClass: 'bg-blue-500/15 text-blue-400' },
  message: { icon: MessageSquare, label: 'Message', badgeClass: 'bg-cyan-500/15 text-cyan-400' },
  error: { icon: AlertTriangle, label: 'Error', badgeClass: 'bg-red-500/15 text-red-400' },
  system: { icon: Settings2, label: 'System', badgeClass: 'bg-purple-500/15 text-purple-400' },
};

function formatTime(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function EventRow({ event }: { event: MockEvent }) {
  const config = eventTypeConfig[event.type];
  const Icon = config.icon;
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn('flex items-start gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors', event.type === 'error' && 'bg-red-500/5')}
    >
      <span className="text-[10px] text-tertiary font-mono whitespace-nowrap pt-0.5">{formatTime(event.timestamp)}</span>
      <span className={cn('inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium rounded-md whitespace-nowrap', config.badgeClass)}>
        <Icon className="h-3 w-3" />
        {config.label}
      </span>
      <span className="text-xs font-medium text-secondary whitespace-nowrap">{event.agent}</span>
      <span className="text-xs text-tertiary flex-1 min-w-0 truncate">{event.description}</span>
      {event.duration !== undefined && <span className="text-[10px] text-tertiary font-mono whitespace-nowrap">{formatDuration(event.duration)}</span>}
      {event.success !== undefined && (event.success ? <CheckCircle2 className="h-3.5 w-3.5 text-green-400 flex-shrink-0" /> : <AlertCircle className="h-3.5 w-3.5 text-red-400 flex-shrink-0" />)}
    </motion.div>
  );
}

function EventListPresentation({ events, activeFilter, onToggleFilter }: { events: MockEvent[]; activeFilter?: MockEvent['type']; onToggleFilter: (type: string) => void }) {
  const filtered = activeFilter ? events.filter((e) => e.type === activeFilter) : events;
  const filterTypes: MockEvent['type'][] = ['tool_call', 'message', 'error', 'system'];

  return (
    <>
      <SectionLabel count={filtered.length}>Activity Feed</SectionLabel>
      <div className="flex items-center gap-2 mb-3 flex-shrink-0">
        {filterTypes.map((type) => {
          const config = eventTypeConfig[type];
          const Icon = config.icon;
          const isActive = !activeFilter || activeFilter === type;
          return (
            <GlassButton key={type} size="sm" variant="ghost" className={cn('text-xs', !isActive && 'opacity-40')} leftIcon={<Icon className="h-3 w-3" />} onClick={() => onToggleFilter(type)}>
              {config.label}
            </GlassButton>
          );
        })}
      </div>
      <GlassCard padding="none" className="flex-1 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto divide-y divide-white/5">
          <AnimatePresence initial={false}>
            {filtered.map((event) => (
              <EventRow key={event.id} event={event} />
            ))}
          </AnimatePresence>
          {filtered.length === 0 && (
            <div className="flex items-center justify-center h-32 text-tertiary text-sm">No events match the selected filters</div>
          )}
        </div>
      </GlassCard>
    </>
  );
}

const now = Date.now();
const mockEvents: MockEvent[] = [
  { id: 'e1', timestamp: new Date(now - 60_000).toISOString(), type: 'tool_call', agent: '@dex', description: 'Read file src/components/App.tsx', duration: 120, success: true },
  { id: 'e2', timestamp: new Date(now - 45_000).toISOString(), type: 'message', agent: '@morgan', description: 'Created story 2.3 for epic-7', success: true },
  { id: 'e3', timestamp: new Date(now - 30_000).toISOString(), type: 'error', agent: '@dex', description: 'TypeScript compilation error in WorkflowView.tsx', success: false },
  { id: 'e4', timestamp: new Date(now - 15_000).toISOString(), type: 'system', agent: 'System', description: 'Agent pool scaled to 4 instances' },
  { id: 'e5', timestamp: new Date(now - 5_000).toISOString(), type: 'tool_call', agent: '@dex', description: 'Write file src/utils/helpers.ts', duration: 89, success: true },
];

const meta: Meta<typeof EventListPresentation> = {
  title: 'Monitor/EventList',
  component: EventListPresentation,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Real-time activity feed showing tool calls, messages, errors, and system events with timestamps, agent attribution, and duration. Supports type-based filtering.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    activeFilter: {
      control: 'select',
      options: [undefined, 'tool_call', 'message', 'error', 'system'],
      description: 'Active event type filter',
    },
    onToggleFilter: { action: 'filterToggled' },
  },
  decorators: [
    (Story) => (
      <div className="w-[700px]">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    events: mockEvents,
    onToggleFilter: fn(),
  },
};

export const FilteredByError: Story = {
  args: {
    events: mockEvents,
    activeFilter: 'error',
    onToggleFilter: fn(),
  },
};

export const Empty: Story = {
  args: {
    events: [],
    onToggleFilter: fn(),
  },
};
