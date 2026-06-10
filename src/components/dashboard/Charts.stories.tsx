import type { Meta, StoryObj } from '@storybook/react-vite';
import { LineChart, BarChart, DonutChart, Sparkline, ProgressRing } from './Charts';

// ── LineChart ────────────────────────────────────────────────

const lineChartMeta: Meta<typeof LineChart> = {
  title: 'Dashboard/LineChart',
  component: LineChart,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'SVG-based line chart with animated area fill, grid lines, and optional labels. Uses pixel coordinates calculated from container dimensions.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    data: { control: 'object', description: 'Array of numeric data points' },
    labels: { control: 'object', description: 'X-axis labels' },
    height: { control: { type: 'number', min: 60, max: 400 }, description: 'Chart height in pixels' },
    color: { control: 'color', description: 'Line stroke color' },
    fillColor: { control: 'color', description: 'Area fill color' },
    showGrid: { control: 'boolean', description: 'Show horizontal grid lines' },
    showLabels: { control: 'boolean', description: 'Show x-axis labels' },
  },
  decorators: [
    (Story) => (
      <div style={{ width: 480 }}>
        <Story />
      </div>
    ),
  ],
};

export default lineChartMeta;
type LineChartStory = StoryObj<typeof lineChartMeta>;

export const Default: LineChartStory = {
  args: {
    data: [10, 25, 18, 30, 22, 35, 28],
    height: 160,
    color: '#8B5CF6',
    fillColor: 'rgba(139, 92, 246, 0.1)',
    showGrid: true,
    showLabels: false,
  },
};

export const WithLabels: LineChartStory = {
  args: {
    data: [5, 12, 8, 20, 15, 25, 18],
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    height: 180,
    color: '#22C55E',
    fillColor: 'rgba(34, 197, 94, 0.1)',
    showGrid: true,
    showLabels: true,
  },
};

export const FlatData: LineChartStory = {
  args: {
    data: [10, 10, 10, 10, 10],
    height: 120,
    showGrid: true,
  },
};

export const SinglePoint: LineChartStory = {
  args: {
    data: [42],
    height: 120,
  },
};

// ── BarChart ─────────────────────────────────────────────────

export const VerticalBarChart: StoryObj = {
  render: () => (
    <div style={{ width: 400 }}>
      <BarChart
        data={[
          { label: 'Jan', value: 120 },
          { label: 'Feb', value: 95 },
          { label: 'Mar', value: 150 },
          { label: 'Apr', value: 80 },
          { label: 'May', value: 200 },
        ]}
        height={160}
        showValues
      />
    </div>
  ),
};

export const HorizontalBarChart: StoryObj = {
  render: () => (
    <div style={{ width: 400 }}>
      <BarChart
        data={[
          { label: 'React', value: 45 },
          { label: 'Vue', value: 30 },
          { label: 'Svelte', value: 20 },
          { label: 'Angular', value: 15 },
        ]}
        horizontal
        height={160}
        showValues
      />
    </div>
  ),
};

export const CustomColorBars: StoryObj = {
  render: () => (
    <div style={{ width: 400 }}>
      <BarChart
        data={[
          { label: 'Success', value: 85, color: '#22C55E' },
          { label: 'Warning', value: 12, color: '#F59E0B' },
          { label: 'Error', value: 3, color: '#EF4444' },
        ]}
        horizontal
        height={120}
        showValues
      />
    </div>
  ),
};

// ── DonutChart ───────────────────────────────────────────────

export const DonutDefault: StoryObj = {
  render: () => (
    <DonutChart
      data={[
        { label: 'Success', value: 85, color: '#22C55E' },
        { label: 'Failure', value: 15, color: '#EF4444' },
      ]}
      size={140}
      thickness={18}
      centerText="85%"
      centerSubtext="pass rate"
    />
  ),
};

export const DonutMultiSegment: StoryObj = {
  render: () => (
    <DonutChart
      data={[
        { label: 'Claude', value: 450 },
        { label: 'GPT-4', value: 300 },
        { label: 'Gemini', value: 150 },
        { label: 'Other', value: 100 },
      ]}
      size={160}
      thickness={20}
      centerSubtext="tokens"
    />
  ),
};

// ── Sparkline ────────────────────────────────────────────────

export const SparklineDefault: StoryObj = {
  render: () => (
    <div className="flex items-center gap-6">
      <Sparkline data={[2, 5, 3, 8, 6, 10, 7]} color="#22C55E" />
      <Sparkline data={[10, 8, 9, 6, 4, 3, 2]} color="#EF4444" />
      <Sparkline data={[5, 5, 7, 4, 8, 5, 6]} color="#3B82F6" />
    </div>
  ),
};

// ── ProgressRing ─────────────────────────────────────────────

export const ProgressRingDefault: StoryObj = {
  render: () => (
    <div className="flex items-center gap-6">
      <ProgressRing value={75} color="#22C55E" />
      <ProgressRing value={45} color="#F59E0B" />
      <ProgressRing value={15} color="#EF4444" />
      <ProgressRing value={100} color="#3B82F6" />
    </div>
  ),
};

export const ProgressRingSizes: StoryObj = {
  render: () => (
    <div className="flex items-center gap-6">
      <ProgressRing value={80} size={32} thickness={3} />
      <ProgressRing value={80} size={48} thickness={4} />
      <ProgressRing value={80} size={64} thickness={5} />
      <ProgressRing value={80} size={96} thickness={8} />
    </div>
  ),
};
