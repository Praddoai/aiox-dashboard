import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { ToastContainer } from './Toast';
import { useToastStore } from '../../stores/toastStore';

/**
 * Wrapper component that renders ToastContainer plus trigger buttons.
 * Uses useToastStore.getState().addToast() to fire toasts imperatively.
 */
function ToastPlayground({ type, title, message, withAction }: {
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  withAction?: boolean;
}) {
  const trigger = () => {
    useToastStore.getState().addToast({
      type,
      title,
      message,
      duration: 5000,
      action: withAction ? { label: 'Undo', onClick: fn() } : undefined,
    });
  };

  return (
    <div style={{ minHeight: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      <button
        onClick={trigger}
        style={{
          padding: '0.5rem 1.5rem',
          borderRadius: '0.5rem',
          border: '1px solid rgba(255,255,255,0.15)',
          background: 'rgba(255,255,255,0.05)',
          color: 'var(--color-text-primary, #ccc)',
          cursor: 'pointer',
        }}
      >
        Show {type} toast
      </button>
      <ToastContainer />
    </div>
  );
}

function AllToastsPlayground() {
  const types = ['success', 'error', 'warning', 'info'] as const;

  const trigger = (type: typeof types[number]) => {
    useToastStore.getState().addToast({
      type,
      title: `${type.charAt(0).toUpperCase() + type.slice(1)} toast`,
      message: `This is a ${type} message.`,
      duration: 5000,
    });
  };

  return (
    <div style={{ minHeight: 300, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
        {types.map((t) => (
          <button
            key={t}
            onClick={() => trigger(t)}
            style={{
              padding: '0.5rem 1.25rem',
              borderRadius: '0.5rem',
              border: '1px solid rgba(255,255,255,0.15)',
              background: 'rgba(255,255,255,0.05)',
              color: 'var(--color-text-primary, #ccc)',
              cursor: 'pointer',
              textTransform: 'capitalize',
            }}
          >
            {t}
          </button>
        ))}
      </div>
      <ToastContainer />
    </div>
  );
}

const meta: Meta = {
  title: 'UI/Toast',
  component: ToastContainer,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Toast notification system with success, error, warning, and info variants. Uses a Zustand store for global state management.',
      },
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Success: Story = {
  render: () => <ToastPlayground type="success" title="Operation completed" message="Your changes have been saved." />,
};

export const Error: Story = {
  render: () => <ToastPlayground type="error" title="Something went wrong" message="Please try again later." />,
};

export const Warning: Story = {
  render: () => <ToastPlayground type="warning" title="Attention" message="This action cannot be undone." />,
};

export const Info: Story = {
  render: () => <ToastPlayground type="info" title="Did you know?" message="You can press Ctrl+K for quick search." />,
};

export const WithAction: Story = {
  render: () => (
    <ToastPlayground
      type="success"
      title="Item deleted"
      message="The item has been removed."
      withAction
    />
  ),
};

export const AllTypes: Story = {
  render: () => <AllToastsPlayground />,
};
