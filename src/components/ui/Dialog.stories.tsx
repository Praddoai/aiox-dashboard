import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Dialog } from './Dialog';
import { GlassButton } from './GlassButton';

const meta: Meta<typeof Dialog> = {
  title: 'UI/Dialog',
  component: Dialog,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'A glassmorphism modal dialog with backdrop blur, keyboard support, and configurable footer.',
      },
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ minHeight: '100vh', position: 'relative' }}>
        <Story />
      </div>
    ),
  ],
  argTypes: {
    isOpen: {
      control: 'boolean',
      description: 'Controls dialog visibility',
    },
    title: {
      control: 'text',
      description: 'Dialog header title',
    },
    description: {
      control: 'text',
      description: 'Optional description below the title',
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg', 'xl'],
      description: 'Dialog width',
    },
    showClose: {
      control: 'boolean',
      description: 'Shows close button in header',
    },
    footer: {
      control: false,
      description: 'Optional footer content (e.g. action buttons)',
    },
    onClose: {
      action: 'closed',
      description: 'Called when dialog is dismissed',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: function DefaultDialog() {
    const [isOpen, setIsOpen] = useState(false);
    return (
      <>
        <GlassButton variant="primary" onClick={() => setIsOpen(true)}>
          Open Dialog
        </GlassButton>
        <Dialog
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          title="Dialog Title"
        >
          <p className="text-secondary">This is the dialog content. You can put any content here.</p>
        </Dialog>
      </>
    );
  },
};

export const WithFooter: Story = {
  render: function FooterDialog() {
    const [isOpen, setIsOpen] = useState(false);
    return (
      <>
        <GlassButton variant="primary" onClick={() => setIsOpen(true)}>
          Open Dialog with Footer
        </GlassButton>
        <Dialog
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          title="Confirm Action"
          description="Are you sure you want to proceed?"
          footer={
            <>
              <GlassButton variant="ghost" onClick={() => setIsOpen(false)}>
                Cancel
              </GlassButton>
              <GlassButton variant="primary" onClick={() => setIsOpen(false)}>
                Confirm
              </GlassButton>
            </>
          }
        >
          <p className="text-secondary">This action cannot be undone. Please review before confirming.</p>
        </Dialog>
      </>
    );
  },
};

export const Sizes: Story = {
  render: function SizesDialog() {
    const [openSize, setOpenSize] = useState<string | null>(null);
    return (
      <div className="flex gap-3">
        {(['sm', 'md', 'lg'] as const).map((size) => (
          <GlassButton key={size} onClick={() => setOpenSize(size)}>
            {size.toUpperCase()}
          </GlassButton>
        ))}
        {(['sm', 'md', 'lg'] as const).map((size) => (
          <Dialog
            key={size}
            isOpen={openSize === size}
            onClose={() => setOpenSize(null)}
            title={`${size.toUpperCase()} Dialog`}
            size={size}
          >
            <p className="text-secondary">
              This is a {size} size dialog. Notice how the max-width changes.
            </p>
          </Dialog>
        ))}
      </div>
    );
  },
};

export const WithDescription: Story = {
  render: function DescriptionDialog() {
    const [isOpen, setIsOpen] = useState(false);
    return (
      <>
        <GlassButton variant="primary" onClick={() => setIsOpen(true)}>
          Open with Description
        </GlassButton>
        <Dialog
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          title="Settings"
          description="Manage your account preferences and configuration."
        >
          <div className="space-y-3">
            <p className="text-secondary">Settings content would go here.</p>
          </div>
        </Dialog>
      </>
    );
  },
};

export const NoCloseButton: Story = {
  render: function NoCloseDialog() {
    const [isOpen, setIsOpen] = useState(false);
    return (
      <>
        <GlassButton variant="primary" onClick={() => setIsOpen(true)}>
          Open (No Close Button)
        </GlassButton>
        <Dialog
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          title="Important Notice"
          showClose={false}
          footer={
            <GlassButton variant="primary" onClick={() => setIsOpen(false)}>
              Acknowledge
            </GlassButton>
          }
        >
          <p className="text-secondary">
            This dialog has no close button. Use the footer action or press Escape to dismiss.
          </p>
        </Dialog>
      </>
    );
  },
};
