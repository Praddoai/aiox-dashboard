import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { ContextMenu } from './ContextMenu';

const meta: Meta<typeof ContextMenu> = {
  title: 'UI/ContextMenu',
  component: ContextMenu,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'A context menu triggered by right-click. Supports icons, separators, danger items, and disabled states.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    items: {
      control: 'object',
      description: 'Array of menu items with label, icon, onClick, danger, disabled, and separator options',
    },
    className: {
      control: 'text',
      description: 'Additional CSS classes for the trigger wrapper',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

// Trigger area style shared across stories
const triggerStyle: React.CSSProperties = {
  padding: '2rem 3rem',
  borderRadius: '0.75rem',
  border: '1px dashed rgba(255,255,255,0.2)',
  color: 'var(--color-text-primary, #ccc)',
  userSelect: 'none',
  textAlign: 'center',
};

// Simple SVG icons for story demos
const EditIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const CopyIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

const ShareIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="18" cy="5" r="3" />
    <circle cx="6" cy="12" r="3" />
    <circle cx="18" cy="19" r="3" />
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
  </svg>
);

export const Default: Story = {
  args: {
    items: [
      { label: 'Edit', onClick: fn() },
      { label: 'Copy', onClick: fn() },
      { label: '', onClick: () => {}, separator: true },
      { label: 'Delete', onClick: fn(), danger: true },
    ],
    children: <div style={triggerStyle}>Right-click me</div>,
  },
};

export const WithIcons: Story = {
  args: {
    items: [
      { label: 'Edit', icon: <EditIcon />, onClick: fn() },
      { label: 'Copy', icon: <CopyIcon />, onClick: fn() },
      { label: 'Share', icon: <ShareIcon />, onClick: fn() },
      { label: '', onClick: () => {}, separator: true },
      { label: 'Delete', icon: <TrashIcon />, onClick: fn(), danger: true },
    ],
    children: <div style={triggerStyle}>Right-click for menu with icons</div>,
  },
};

export const WithDisabledItems: Story = {
  args: {
    items: [
      { label: 'Edit', icon: <EditIcon />, onClick: fn() },
      { label: 'Copy', icon: <CopyIcon />, onClick: fn(), disabled: true },
      { label: 'Share', icon: <ShareIcon />, onClick: fn(), disabled: true },
      { label: '', onClick: () => {}, separator: true },
      { label: 'Delete', icon: <TrashIcon />, onClick: fn(), danger: true },
    ],
    children: <div style={triggerStyle}>Right-click — some items are disabled</div>,
  },
};
