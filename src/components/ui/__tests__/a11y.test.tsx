/**
 * Accessibility Tests using vitest-axe
 * These tests validate WCAG 2.1 AA compliance for UI components
 */

import type {} from '../../../test/vitest-axe.d.ts';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { axe } from 'vitest-axe';
import * as matchers from 'vitest-axe/matchers';

// Add custom matcher
expect.extend(matchers);

// Components
import { GlassButton } from '../GlassButton';
import { GlassInput, GlassTextarea } from '../GlassInput';
import { GlassCard } from '../GlassCard';
import { Badge } from '../Badge';
import { Avatar } from '../Avatar';
import { ToastContainer } from '../Toast';

describe('Accessibility Tests', () => {
  describe('GlassButton', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(<GlassButton>Click me</GlassButton>);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no violations with loading state', async () => {
      const { container } = render(<GlassButton loading>Loading</GlassButton>);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no violations with left icon', async () => {
      const { container } = render(
        <GlassButton leftIcon={<span aria-hidden="true">+</span>}>
          Add Item
        </GlassButton>
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no violations when disabled', async () => {
      const { container } = render(
        <GlassButton disabled>Disabled Button</GlassButton>
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('GlassInput', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(
        <GlassInput label="Email" placeholder="Enter your email" />
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no violations with error state', async () => {
      const { container } = render(
        <GlassInput label="Email" error="Invalid email address" />
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no violations with hint text', async () => {
      const { container } = render(
        <GlassInput label="Password" hint="Must be at least 8 characters" type="password" />
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no violations with required field', async () => {
      const { container } = render(
        <GlassInput label="Username" required />
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('GlassTextarea', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(
        <GlassTextarea label="Description" placeholder="Enter description" />
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no violations with character count', async () => {
      const { container } = render(
        <GlassTextarea label="Bio" showCharacterCount maxLength={200} />
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('GlassCard', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(
        <GlassCard animate={false}>
          <h2>Card Title</h2>
          <p>Card content goes here</p>
        </GlassCard>
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no violations with aria-label', async () => {
      const { container } = render(
        <GlassCard animate={false} aria-label="Feature card">
          <p>Content</p>
        </GlassCard>
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Badge', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(<Badge>Active</Badge>);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no violations with status variant', async () => {
      const { container } = render(
        <Badge variant="status" status="success">Success</Badge>
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Avatar', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(<Avatar name="John Doe" />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no violations with image', async () => {
      const { container } = render(
        <Avatar name="Jane Smith" src="https://example.com/avatar.jpg" />
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('ToastContainer', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(<ToastContainer />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });
});

describe('Color Contrast', () => {
  it('GlassButton text should have sufficient contrast', async () => {
    const { container } = render(
      <div style={{ backgroundColor: '#ddd6cc' }}>
        <GlassButton>Primary Button</GlassButton>
      </div>
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('GlassInput label should have sufficient contrast', async () => {
    const { container } = render(
      <div style={{ backgroundColor: '#ddd6cc' }}>
        <GlassInput label="Form Field" />
      </div>
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe('Keyboard Navigation', () => {
  it('GlassButton should be focusable', () => {
    const { getByRole } = render(<GlassButton>Click me</GlassButton>);
    const button = getByRole('button');
    button.focus();
    expect(document.activeElement).toBe(button);
  });

  it('GlassInput should be focusable', () => {
    const { getByRole } = render(<GlassInput label="Test" />);
    const input = getByRole('textbox');
    input.focus();
    expect(document.activeElement).toBe(input);
  });

  it('disabled GlassButton should not be focusable via click', () => {
    const { getByRole } = render(<GlassButton disabled>Disabled</GlassButton>);
    const button = getByRole('button');
    expect(button).toHaveAttribute('disabled');
  });
});

describe('ARIA Attributes', () => {
  it('GlassInput with error should have aria-invalid', () => {
    const { getByRole } = render(
      <GlassInput label="Email" error="Invalid email" />
    );
    const input = getByRole('textbox');
    expect(input).toHaveAttribute('aria-invalid', 'true');
  });

  it('GlassInput with error should have aria-describedby', () => {
    const { getByRole } = render(
      <GlassInput label="Email" error="Invalid email" />
    );
    const input = getByRole('textbox');
    expect(input).toHaveAttribute('aria-describedby');
  });

  it('required GlassInput should have required attribute', () => {
    const { getByRole } = render(<GlassInput label="Name" required />);
    const input = getByRole('textbox');
    expect(input).toHaveAttribute('required');
  });
});
