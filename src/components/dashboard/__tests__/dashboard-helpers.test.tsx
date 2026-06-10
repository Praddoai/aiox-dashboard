import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Activity, Cpu, Heart, Zap } from 'lucide-react';

// Mock the UI components used by DashboardHelpers
vi.mock('../../ui', () => ({
  GlassCard: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="glass-card" className={className}>{children}</div>
  ),
  Badge: ({ children, variant, status, size }: {
    children: React.ReactNode;
    variant?: string;
    status?: string;
    size?: string;
  }) => (
    <span
      data-testid="badge"
      data-variant={variant}
      data-status={status}
      data-size={size}
    >
      {children}
    </span>
  ),
}));

vi.mock('../../../lib/icons', () => ({
  ICON_SIZES: { xs: 12, sm: 14, md: 16, lg: 18, xl: 20 },
}));

vi.mock('../../../lib/utils', () => ({
  cn: (...args: (string | undefined | false | null)[]) => args.filter(Boolean).join(' '),
}));

import {
  formatNumber,
  QuickStatCard,
  HealthCard,
  CostProviderRow,
  ServiceHealthCard,
} from '../DashboardHelpers';

// ---------------------------------------------------------------------------
// formatNumber
// ---------------------------------------------------------------------------
describe('formatNumber', () => {
  it('returns "0" for 0', () => {
    expect(formatNumber(0)).toBe('0');
  });

  it('returns plain number for values < 1000', () => {
    expect(formatNumber(999)).toBe('999');
  });

  it('returns plain number for small integers', () => {
    expect(formatNumber(42)).toBe('42');
  });

  it('formats 1000 as "1.0K"', () => {
    expect(formatNumber(1000)).toBe('1.0K');
  });

  it('formats 1500 as "1.5K"', () => {
    expect(formatNumber(1500)).toBe('1.5K');
  });

  it('formats 10000 as "10.0K"', () => {
    expect(formatNumber(10000)).toBe('10.0K');
  });

  it('formats 999999 as "1000.0K"', () => {
    expect(formatNumber(999999)).toBe('1000.0K');
  });

  it('formats 1000000 as "1.00M"', () => {
    expect(formatNumber(1_000_000)).toBe('1.00M');
  });

  it('formats 2500000 as "2.50M"', () => {
    expect(formatNumber(2_500_000)).toBe('2.50M');
  });

  it('formats 10500000 as "10.50M"', () => {
    expect(formatNumber(10_500_000)).toBe('10.50M');
  });
});

// ---------------------------------------------------------------------------
// QuickStatCard
// ---------------------------------------------------------------------------
describe('QuickStatCard', () => {
  it('renders the label text', () => {
    render(<QuickStatCard label="Agents" value={12} icon={Activity} color="blue" />);
    expect(screen.getByText('Agents')).toBeInTheDocument();
  });

  it('renders the numeric value', () => {
    render(<QuickStatCard label="Squads" value={5} icon={Cpu} color="green" />);
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('renders a string value', () => {
    render(<QuickStatCard label="Status" value="Online" icon={Heart} color="purple" />);
    expect(screen.getByText('Online')).toBeInTheDocument();
  });

  it('renders the icon component', () => {
    const { container } = render(
      <QuickStatCard label="Test" value={1} icon={Zap} color="orange" />
    );
    // Lucide icons render as SVG
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('applies color-specific class', () => {
    const { container } = render(
      <QuickStatCard label="Metric" value={42} icon={Activity} color="green" />
    );
    expect(container.firstChild).toHaveClass('from-green-500/20');
  });

  it('falls back to blue class for unknown color', () => {
    const { container } = render(
      <QuickStatCard label="Metric" value={42} icon={Activity} color="magenta" />
    );
    expect(container.firstChild).toHaveClass('from-blue-500/20');
  });
});

// ---------------------------------------------------------------------------
// HealthCard
// ---------------------------------------------------------------------------
describe('HealthCard', () => {
  it('renders the title', () => {
    render(
      <HealthCard
        title="API Health"
        status="healthy"
        details={[{ label: 'Latency', value: '45ms' }]}
      />
    );
    expect(screen.getByText('API Health')).toBeInTheDocument();
  });

  it('renders "OK" badge text for healthy status', () => {
    render(
      <HealthCard
        title="DB"
        status="healthy"
        details={[{ label: 'Connections', value: 10 }]}
      />
    );
    expect(screen.getByText('OK')).toBeInTheDocument();
  });

  it('renders "Parcial" badge text for partial status', () => {
    render(
      <HealthCard
        title="Cache"
        status="partial"
        details={[{ label: 'Hit Rate', value: '60%' }]}
      />
    );
    expect(screen.getByText('Parcial')).toBeInTheDocument();
  });

  it('renders "Erro" badge text for error status', () => {
    render(
      <HealthCard
        title="Queue"
        status="error"
        details={[{ label: 'Status', ok: false }]}
      />
    );
    expect(screen.getByText('Erro')).toBeInTheDocument();
  });

  it('renders detail labels', () => {
    render(
      <HealthCard
        title="Service"
        status="healthy"
        details={[
          { label: 'Uptime', value: '99.9%' },
          { label: 'Memory', value: '512MB' },
        ]}
      />
    );
    expect(screen.getByText('Uptime')).toBeInTheDocument();
    expect(screen.getByText('Memory')).toBeInTheDocument();
  });

  it('renders checkmark for ok=true detail', () => {
    render(
      <HealthCard
        title="Checks"
        status="healthy"
        details={[{ label: 'SSL', ok: true }]}
      />
    );
    expect(screen.getByText('\u2713')).toBeInTheDocument();
  });

  it('renders X mark for ok=false detail', () => {
    render(
      <HealthCard
        title="Checks"
        status="error"
        details={[{ label: 'SSL', ok: false }]}
      />
    );
    expect(screen.getByText('\u2717')).toBeInTheDocument();
  });

  it('renders detail value when ok is not provided', () => {
    render(
      <HealthCard
        title="Metrics"
        status="healthy"
        details={[{ label: 'Latency', value: '12ms' }]}
      />
    );
    expect(screen.getByText('12ms')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// ServiceHealthCard
// ---------------------------------------------------------------------------
describe('ServiceHealthCard', () => {
  it('renders the service name', () => {
    render(<ServiceHealthCard name="Claude API" healthy={true} />);
    expect(screen.getByText('Claude API')).toBeInTheDocument();
  });

  it('shows green indicator when healthy', () => {
    const { container } = render(
      <ServiceHealthCard name="OpenAI" healthy={true} latency={45} />
    );
    const dot = container.querySelector('.bg-green-500');
    expect(dot).toBeInTheDocument();
  });

  it('shows red indicator when unhealthy', () => {
    const { container } = render(
      <ServiceHealthCard name="OpenAI" healthy={false} error="Connection failed" />
    );
    const dot = container.querySelector('.bg-red-500');
    expect(dot).toBeInTheDocument();
  });

  it('shows latency when healthy and latency is provided', () => {
    render(<ServiceHealthCard name="API" healthy={true} latency={123.456} />);
    expect(screen.getByText('123ms')).toBeInTheDocument();
  });

  it('does not show latency when unhealthy', () => {
    render(<ServiceHealthCard name="API" healthy={false} latency={100} error="down" />);
    expect(screen.queryByText('100ms')).not.toBeInTheDocument();
  });

  it('shows truncated error text when error is long', () => {
    const longError = 'This is a very long error message that exceeds 20 characters';
    render(<ServiceHealthCard name="Svc" healthy={false} error={longError} />);
    expect(screen.getByText('This is a very lo...')).toBeInTheDocument();
  });

  it('shows "API key inválida" for 401 errors', () => {
    render(<ServiceHealthCard name="Svc" healthy={false} error="HTTP 401 Unauthorized" />);
    expect(screen.getByText('API key inválida')).toBeInTheDocument();
  });

  it('shows "Rate limit" for 429 errors', () => {
    render(<ServiceHealthCard name="Svc" healthy={false} error="HTTP 429 Too Many Requests" />);
    expect(screen.getByText('Rate limit')).toBeInTheDocument();
  });

  it('shows short error text as-is when under 20 chars', () => {
    render(<ServiceHealthCard name="Svc" healthy={false} error="Timeout" />);
    expect(screen.getByText('Timeout')).toBeInTheDocument();
  });

  it('does not show error text when healthy', () => {
    render(<ServiceHealthCard name="Svc" healthy={true} />);
    expect(screen.queryByText('Indisponível')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// CostProviderRow
// ---------------------------------------------------------------------------
describe('CostProviderRow', () => {
  it('renders the provider name', () => {
    render(<CostProviderRow name="Claude" cost={24.80} tokens={800000} color="purple" />);
    expect(screen.getByText('Claude')).toBeInTheDocument();
  });

  it('renders formatted cost with dollar sign', () => {
    render(<CostProviderRow name="OpenAI" cost={7.60} tokens={200000} color="green" />);
    expect(screen.getByText('$7.60')).toBeInTheDocument();
  });

  it('renders formatted token count using formatNumber', () => {
    render(<CostProviderRow name="Claude" cost={10} tokens={1500000} color="purple" />);
    expect(screen.getByText('1.50M tokens')).toBeInTheDocument();
  });

  it('renders token count in K format', () => {
    render(<CostProviderRow name="GPT" cost={5} tokens={50000} color="green" />);
    expect(screen.getByText('50.0K tokens')).toBeInTheDocument();
  });

  it('applies the correct color dot class', () => {
    const { container } = render(
      <CostProviderRow name="Claude" cost={10} tokens={1000} color="purple" />
    );
    expect(container.querySelector('.bg-purple-500')).toBeInTheDocument();
  });

  it('formats cost to two decimal places', () => {
    render(<CostProviderRow name="Test" cost={0.1} tokens={100} color="green" />);
    expect(screen.getByText('$0.10')).toBeInTheDocument();
  });
});
