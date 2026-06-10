import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '../../../test/test-utils';
import { VoiceWaveform } from '../VoiceWaveform';

// Mock canvas 2D context since jsdom doesn't support canvas rendering
const mockCtx = {
  clearRect: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  stroke: vi.fn(),
  fill: vi.fn(),
  arc: vi.fn(),
  roundRect: vi.fn(),
  scale: vi.fn(),
  createLinearGradient: vi.fn(() => ({
    addColorStop: vi.fn(),
  })),
  set strokeStyle(_v: string) {},
  set fillStyle(_v: string) {},
  set lineWidth(_v: number) {},
};

beforeEach(() => {
  vi.clearAllMocks();
  // Mock getContext to return our mock ctx
  HTMLCanvasElement.prototype.getContext = vi.fn(() => mockCtx) as unknown as typeof HTMLCanvasElement.prototype.getContext;
});

describe('VoiceWaveform', () => {
  it('renders a canvas element', () => {
    const { container } = render(
      <VoiceWaveform timeDomainData={null} isActive={false} />,
    );
    const canvas = container.querySelector('canvas');
    expect(canvas).toBeInTheDocument();
  });

  it('sets aria-hidden on canvas', () => {
    const { container } = render(
      <VoiceWaveform timeDomainData={null} isActive={false} />,
    );
    const canvas = container.querySelector('canvas');
    expect(canvas).toHaveAttribute('aria-hidden', 'true');
  });

  it('applies correct height style', () => {
    const { container } = render(
      <VoiceWaveform timeDomainData={null} isActive={false} />,
    );
    const canvas = container.querySelector('canvas');
    expect(canvas).toHaveStyle({ height: '64px' });
  });

  it('has full width class', () => {
    const { container } = render(
      <VoiceWaveform timeDomainData={null} isActive={false} />,
    );
    const canvas = container.querySelector('canvas');
    expect(canvas).toHaveClass('w-full');
  });

  it('initializes canvas context on mount', () => {
    render(<VoiceWaveform timeDomainData={null} isActive={false} />);
    expect(HTMLCanvasElement.prototype.getContext).toHaveBeenCalled();
  });

  it('accepts custom color props', () => {
    const { container } = render(
      <VoiceWaveform
        timeDomainData={null}
        isActive={false}
        color="#FF0000"
        thinkingColor="#0000FF"
      />,
    );
    const canvas = container.querySelector('canvas');
    expect(canvas).toBeInTheDocument();
  });

  it('renders with time domain data when active', () => {
    const data = new Uint8Array(256);
    // Fill with some wave data
    for (let i = 0; i < 256; i++) {
      data[i] = 128 + Math.floor(Math.sin(i / 10) * 50);
    }

    const { container } = render(
      <VoiceWaveform timeDomainData={data} isActive={true} />,
    );
    const canvas = container.querySelector('canvas');
    expect(canvas).toBeInTheDocument();
  });

  it('renders with different states', () => {
    const { container, rerender } = render(
      <VoiceWaveform timeDomainData={null} isActive={false} state="idle" />,
    );
    expect(container.querySelector('canvas')).toBeInTheDocument();

    rerender(
      <VoiceWaveform timeDomainData={null} isActive={true} state="thinking" />,
    );
    expect(container.querySelector('canvas')).toBeInTheDocument();

    rerender(
      <VoiceWaveform timeDomainData={null} isActive={true} state="speaking" />,
    );
    expect(container.querySelector('canvas')).toBeInTheDocument();
  });
});
