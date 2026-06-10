import type { Meta, StoryObj } from '@storybook/react-vite';
import { GlassInput, GlassTextarea } from './GlassInput';

const meta: Meta<typeof GlassInput> = {
  title: 'UI/GlassInput',
  component: GlassInput,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A glassmorphism input field with blur effect and validation states.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    label: {
      control: 'text',
      description: 'Input label',
    },
    error: {
      control: 'text',
      description: 'Error message',
    },
    hint: {
      control: 'text',
      description: 'Hint text',
    },
    success: {
      control: 'boolean',
      description: 'Success state',
    },
    disabled: {
      control: 'boolean',
      description: 'Disabled state',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

// Icons
const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const MailIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
  </svg>
);

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green-500">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

export const Default: Story = {
  args: {
    placeholder: 'Enter text...',
  },
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
};

export const WithLabel: Story = {
  args: {
    label: 'Email',
    placeholder: 'your@email.com',
    type: 'email',
  },
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
};

export const Required: Story = {
  args: {
    label: 'Username',
    placeholder: 'Enter username',
    required: true,
  },
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
};

export const WithHint: Story = {
  args: {
    label: 'Password',
    type: 'password',
    placeholder: 'Enter password',
    hint: 'Must be at least 8 characters',
  },
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
};

export const WithError: Story = {
  args: {
    label: 'Email',
    placeholder: 'your@email.com',
    defaultValue: 'invalid-email',
    error: 'Please enter a valid email address',
  },
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
};

export const Success: Story = {
  args: {
    label: 'Username',
    placeholder: 'Enter username',
    defaultValue: 'johndoe',
    success: true,
    rightIcon: <CheckIcon />,
  },
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
};

export const WithLeftIcon: Story = {
  args: {
    placeholder: 'Search...',
    leftIcon: <SearchIcon />,
  },
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
};

export const WithRightIcon: Story = {
  args: {
    label: 'Email',
    placeholder: 'your@email.com',
    leftIcon: <MailIcon />,
  },
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
};

export const WithCharacterCount: Story = {
  args: {
    label: 'Bio',
    placeholder: 'Tell us about yourself',
    maxLength: 100,
    showCharacterCount: true,
  },
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
};

export const Disabled: Story = {
  args: {
    label: 'Read Only',
    defaultValue: 'This field is disabled',
    disabled: true,
  },
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
};

// Textarea stories
export const Textarea: StoryObj<typeof GlassTextarea> = {
  render: () => (
    <div className="w-80">
      <GlassTextarea
        label="Description"
        placeholder="Enter a description..."
        rows={4}
      />
    </div>
  ),
};

export const TextareaWithCharCount: StoryObj<typeof GlassTextarea> = {
  render: () => (
    <div className="w-80">
      <GlassTextarea
        label="Message"
        placeholder="Type your message..."
        maxLength={500}
        showCharacterCount
        rows={4}
      />
    </div>
  ),
};

export const TextareaWithError: StoryObj<typeof GlassTextarea> = {
  render: () => (
    <div className="w-80">
      <GlassTextarea
        label="Feedback"
        placeholder="Your feedback..."
        error="Feedback is required"
        rows={3}
      />
    </div>
  ),
};
