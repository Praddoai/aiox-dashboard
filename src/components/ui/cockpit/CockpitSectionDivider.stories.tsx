import type { Meta, StoryObj } from '@storybook/react-vite';
import { CockpitSectionDivider } from './CockpitSectionDivider';

const meta: Meta<typeof CockpitSectionDivider> = {
  title: 'UI/Cockpit/CockpitSectionDivider',
  component: CockpitSectionDivider,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'AIOX Cockpit section divider with label, numbering, and optional concept tag. Best viewed with AIOX theme.',
      },
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { label: 'System Overview' },
};

export const WithNumber: Story = {
  args: { label: 'Agent Performance', num: '01' },
};

export const WithConcept: Story = {
  args: { label: 'Cost Analysis', num: '02', concept: 'Financial' },
};

export const Stacked: Story = {
  render: () => (
    <div>
      <CockpitSectionDivider label="Overview" num="01" />
      <div style={{ height: 80 }} />
      <CockpitSectionDivider label="Agents" num="02" concept="Active" />
      <div style={{ height: 80 }} />
      <CockpitSectionDivider label="Infrastructure" num="03" concept="MCP" />
    </div>
  ),
};
