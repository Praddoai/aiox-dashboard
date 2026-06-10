import { describe, it, expect } from 'vitest';
import { render } from '../../../test/test-utils';
import { Skeleton, SkeletonText, SkeletonAvatar, SkeletonCard } from '../Skeleton';

describe('Skeleton', () => {
  it('renders with default variant (text)', () => {
    const { container } = render(<Skeleton />);

    const el = container.firstElementChild as HTMLElement;
    expect(el).toBeInTheDocument();
    expect(el).toHaveClass('rounded');
  });

  it('applies correct variant class for text', () => {
    const { container } = render(<Skeleton variant="text" />);

    const el = container.firstElementChild as HTMLElement;
    expect(el).toHaveClass('rounded');
  });

  it('applies correct variant class for circular', () => {
    const { container } = render(<Skeleton variant="circular" />);

    const el = container.firstElementChild as HTMLElement;
    expect(el).toHaveClass('rounded-full');
  });

  it('applies correct variant class for rectangular', () => {
    const { container } = render(<Skeleton variant="rectangular" />);

    const el = container.firstElementChild as HTMLElement;
    expect(el).toHaveClass('rounded-none');
  });

  it('applies correct variant class for rounded', () => {
    const { container } = render(<Skeleton variant="rounded" />);

    const el = container.firstElementChild as HTMLElement;
    expect(el).toHaveClass('rounded-xl');
  });

  it('applies animate-pulse for pulse animation', () => {
    const { container } = render(<Skeleton animation="pulse" />);

    const el = container.firstElementChild as HTMLElement;
    expect(el).toHaveClass('animate-pulse');
  });

  it('applies shimmer class for wave animation (default)', () => {
    const { container } = render(<Skeleton />);

    const el = container.firstElementChild as HTMLElement;
    expect(el).toHaveClass('shimmer');
  });

  it('applies no animation class when animation is none', () => {
    const { container } = render(<Skeleton animation="none" />);

    const el = container.firstElementChild as HTMLElement;
    expect(el).not.toHaveClass('animate-pulse');
    expect(el).not.toHaveClass('shimmer');
  });

  it('applies custom width as number (px)', () => {
    const { container } = render(<Skeleton width={200} />);

    const el = container.firstElementChild as HTMLElement;
    expect(el.style.width).toBe('200px');
  });

  it('applies custom width as string', () => {
    const { container } = render(<Skeleton width="50%" />);

    const el = container.firstElementChild as HTMLElement;
    expect(el.style.width).toBe('50%');
  });

  it('applies custom height as number (px)', () => {
    const { container } = render(<Skeleton height={40} />);

    const el = container.firstElementChild as HTMLElement;
    expect(el.style.height).toBe('40px');
  });

  it('applies custom height as string', () => {
    const { container } = render(<Skeleton height="2rem" />);

    const el = container.firstElementChild as HTMLElement;
    expect(el.style.height).toBe('2rem');
  });

  it('accepts custom className', () => {
    const { container } = render(<Skeleton className="custom-skeleton" />);

    const el = container.firstElementChild as HTMLElement;
    expect(el).toHaveClass('custom-skeleton');
  });
});

describe('SkeletonText', () => {
  it('renders 3 lines by default', () => {
    const { container } = render(<SkeletonText />);

    const lines = container.querySelectorAll('.bg-white\\/10');
    expect(lines).toHaveLength(3);
  });

  it('renders the specified number of lines', () => {
    const { container } = render(<SkeletonText lines={5} />);

    const lines = container.querySelectorAll('.bg-white\\/10');
    expect(lines).toHaveLength(5);
  });

  it('renders 1 line when lines=1', () => {
    const { container } = render(<SkeletonText lines={1} />);

    const lines = container.querySelectorAll('.bg-white\\/10');
    expect(lines).toHaveLength(1);
  });
});

describe('SkeletonAvatar', () => {
  it('renders circular variant', () => {
    const { container } = render(<SkeletonAvatar />);

    const el = container.querySelector('.rounded-full');
    expect(el).toBeInTheDocument();
  });

  it('renders md size by default', () => {
    const { container } = render(<SkeletonAvatar />);

    const el = container.querySelector('.rounded-full');
    expect(el).toHaveClass('h-10', 'w-10');
  });

  it('renders sm size', () => {
    const { container } = render(<SkeletonAvatar size="sm" />);

    const el = container.querySelector('.rounded-full');
    expect(el).toHaveClass('h-8', 'w-8');
  });

  it('renders lg size', () => {
    const { container } = render(<SkeletonAvatar size="lg" />);

    const el = container.querySelector('.rounded-full');
    expect(el).toHaveClass('h-12', 'w-12');
  });
});

describe('SkeletonCard', () => {
  it('renders card structure with avatar and text lines', () => {
    const { container } = render(<SkeletonCard />);

    // Should have a glass-card container
    const card = container.querySelector('.glass-card');
    expect(card).toBeInTheDocument();

    // Should have an avatar (circular skeleton)
    const avatar = container.querySelector('.rounded-full');
    expect(avatar).toBeInTheDocument();

    // Should have text skeleton lines
    const skeletons = container.querySelectorAll('.bg-white\\/10');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('accepts custom className', () => {
    const { container } = render(<SkeletonCard className="custom-card" />);

    const card = container.querySelector('.glass-card');
    expect(card).toHaveClass('custom-card');
  });
});
