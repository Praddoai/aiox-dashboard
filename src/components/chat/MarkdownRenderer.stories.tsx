import type { Meta, StoryObj } from '@storybook/react-vite';
import { MarkdownRenderer } from './MarkdownRenderer';

const meta: Meta<typeof MarkdownRenderer> = {
  title: 'Chat/MarkdownRenderer',
  component: MarkdownRenderer,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Renders Markdown content with GFM support, syntax-highlighted code blocks, tables, images with lightbox, and custom typography styles.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    content: {
      control: 'text',
      description: 'Markdown string to render',
    },
    className: {
      control: 'text',
      description: 'Additional CSS classes',
    },
  },
  decorators: [
    (Story) => (
      <div className="max-w-2xl mx-auto">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Simple: Story = {
  args: {
    content: 'Hello **world**! This is a simple paragraph with *italic* and `inline code`.',
  },
};

export const Headers: Story = {
  args: {
    content: `# Heading 1
## Heading 2
### Heading 3
#### Heading 4

Regular paragraph text below the headings.`,
  },
};

export const CodeBlock: Story = {
  args: {
    content: `Here is a TypeScript example:

\`\`\`typescript
interface Agent {
  id: string;
  name: string;
  role: string;
  squad: SquadType;
}

function greetAgent(agent: Agent): string {
  return \`Hello, \${agent.name}! Welcome to \${agent.squad}.\`;
}
\`\`\`

And some inline code: \`const x = 42;\``,
  },
};

export const Table: Story = {
  args: {
    content: `| Feature | Status | Priority |
|---------|--------|----------|
| Chat | Done | High |
| Export | Done | Medium |
| Search | In Progress | High |
| Analytics | Planned | Low |`,
  },
};

export const Lists: Story = {
  args: {
    content: `### Unordered List
- First item
- Second item
  - Nested item A
  - Nested item B
- Third item

### Ordered List
1. Step one
2. Step two
3. Step three`,
  },
};

export const Blockquote: Story = {
  args: {
    content: `> "The best way to predict the future is to invent it."
>
> -- Alan Kay

Regular paragraph after the quote.`,
  },
};

export const Links: Story = {
  args: {
    content: `Check out [React documentation](https://react.dev) and [TypeScript](https://typescriptlang.org) for more info.`,
  },
};

export const FullMessage: Story = {
  args: {
    content: `## Product Analysis Report

Here are my findings on the **EcoFlow Water Bottle**:

### Key Metrics

| Metric | Value | Change |
|--------|-------|--------|
| Sales | 12,450 | +23% |
| Rating | 4.8/5 | +0.2 |
| Returns | 1.2% | -0.5% |

### Recommendations

1. **Expand colors** - Add 3 new seasonal colors
2. **Bundle deals** - Create a family pack option
3. **Social proof** - Highlight the 4.8 rating prominently

> The data shows strong growth potential in the eco-conscious market segment.

### Implementation

\`\`\`javascript
const campaign = {
  name: 'EcoFlow Summer Push',
  budget: 15000,
  channels: ['instagram', 'tiktok', 'email'],
  startDate: '2026-03-01',
};
\`\`\`

Let me know if you need more details on any of these points!`,
  },
};
