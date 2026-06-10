import { useEffect } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import RoadmapView from './RoadmapView';
import { useRoadmapStore, type RoadmapFeature } from '../../stores/roadmapStore';

const sampleFeatures: RoadmapFeature[] = [
  {
    id: '1',
    title: 'Multi-agent orchestration',
    description: 'Enable parallel execution of agent workflows with dependency resolution.',
    priority: 'must',
    impact: 'high',
    effort: 'high',
    tags: ['core', 'architecture'],
    status: 'in_progress',
  },
  {
    id: '2',
    title: 'Knowledge base search',
    description: 'Full-text search across agent knowledge folders with highlighting.',
    priority: 'must',
    impact: 'high',
    effort: 'medium',
    tags: ['search', 'ux'],
    status: 'planned',
  },
  {
    id: '3',
    title: 'Dark mode refinements',
    description: 'Fine-tune contrast ratios and hover states for dark theme.',
    priority: 'should',
    impact: 'medium',
    effort: 'low',
    tags: ['ui', 'theme'],
    status: 'done',
  },
  {
    id: '4',
    title: 'Export execution history',
    description: 'Allow users to export execution logs as CSV or JSON.',
    priority: 'could',
    impact: 'low',
    effort: 'low',
    tags: ['export', 'data'],
    status: 'planned',
  },
  {
    id: '5',
    title: 'Legacy API v1 support',
    description: 'Maintain backward compatibility with deprecated v1 endpoints.',
    priority: 'wont',
    impact: 'low',
    effort: 'high',
    tags: ['api', 'legacy'],
    status: 'planned',
  },
];

/**
 * Wrapper that seeds the roadmap store with sample features before rendering.
 */
function RoadmapStoryWrapper() {
  const addFeature = useRoadmapStore((s) => s.addFeature);
  const features = useRoadmapStore((s) => s.features);

  useEffect(() => {
    if (features.length === 0) {
      sampleFeatures.forEach((f) => addFeature(f));
    }
  }, [addFeature, features.length]);

  return (
    <div style={{ height: '100vh', background: '#0f0f14' }}>
      <RoadmapView />
    </div>
  );
}

function EmptyRoadmapWrapper() {
  useEffect(() => {
    useRoadmapStore.setState({ features: [], filter: 'all' });
  }, []);

  return (
    <div style={{ height: '100vh', background: '#0f0f14' }}>
      <RoadmapView />
    </div>
  );
}

const meta: Meta<typeof RoadmapView> = {
  title: 'Views/RoadmapView',
  component: RoadmapView,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Product roadmap view organized by MoSCoW priority (Must / Should / Could / Won\'t). Supports filtering, adding new features via an inline form, and displays impact/effort/status badges with color-coded priority columns.',
      },
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const WithFeatures: Story = {
  render: () => <RoadmapStoryWrapper />,
};

export const Empty: Story = {
  render: () => <EmptyRoadmapWrapper />,
};

export const NarrowViewport: Story = {
  render: () => <RoadmapStoryWrapper />,
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 480 }}>
        <Story />
      </div>
    ),
  ],
};
