import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { OnboardingTour, useOnboardingStore } from './OnboardingTour';
import { GlassButton } from '../ui';

/**
 * Wrapper that resets the onboarding store so the tour is always visible in Storybook.
 */
function TourStoryWrapper({ onComplete }: { onComplete?: () => void }) {
  const [key, setKey] = useState(0);

  // Force the store to "not completed" so the tour renders
  const resetTour = useOnboardingStore((s) => s.resetTour);

  const handleRestart = () => {
    resetTour();
    setKey((k) => k + 1);
  };

  // Reset on first render so the tour shows
  useState(() => {
    resetTour();
  });

  return (
    <div style={{ height: '100vh', background: '#0f0f14', position: 'relative' }}>
      <div style={{ padding: 24 }}>
        <GlassButton variant="ghost" onClick={handleRestart}>
          Restart Tour
        </GlassButton>
      </div>
      <OnboardingTour key={key} onComplete={onComplete} />
    </div>
  );
}

const meta: Meta<typeof OnboardingTour> = {
  title: 'Onboarding/OnboardingTour',
  component: OnboardingTour,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Multi-step onboarding tour overlay that introduces users to the AIOS Core platform. Shows animated cards with progress indicators, step dots, and navigation controls. Persists completion state in localStorage via Zustand.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    onComplete: { action: 'completed', description: 'Callback fired when the tour completes' },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <TourStoryWrapper onComplete={fn()} />,
};

export const WithCustomCallback: Story = {
  render: () => <TourStoryWrapper onComplete={fn()} />,
};
