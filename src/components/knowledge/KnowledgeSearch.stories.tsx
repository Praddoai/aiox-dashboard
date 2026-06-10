import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { KnowledgeSearch } from './KnowledgeSearch';

function KnowledgeSearchWrapper({
  initialQuery = '',
  initialFilterType = null as string | null,
  availableTypes = [] as string[],
}: {
  initialQuery?: string;
  initialFilterType?: string | null;
  availableTypes?: string[];
}) {
  const [query, setQuery] = useState(initialQuery);
  const [filterType, setFilterType] = useState<string | null>(initialFilterType);

  return (
    <KnowledgeSearch
      query={query}
      onQueryChange={setQuery}
      filterType={filterType}
      onFilterTypeChange={setFilterType}
      availableTypes={availableTypes}
      onClear={() => {
        setQuery('');
        setFilterType(null);
      }}
    />
  );
}

const meta: Meta<typeof KnowledgeSearch> = {
  title: 'Knowledge/KnowledgeSearch',
  component: KnowledgeSearch,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Search input with debounced text query and file-type filter chips for the knowledge base.',
      },
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ width: 480, padding: 24, background: '#0a0a0f' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <KnowledgeSearchWrapper />,
};

export const WithFilterTypes: Story = {
  render: () => (
    <KnowledgeSearchWrapper
      availableTypes={['ts', 'tsx', 'md', 'json', 'yaml', 'css']}
    />
  ),
};
