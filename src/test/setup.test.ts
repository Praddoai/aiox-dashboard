import { describe, it, expect } from 'vitest';

describe('Test Setup', () => {
  it('should have vitest configured correctly', () => {
    expect(true).toBe(true);
  });

  it('should have window.matchMedia mocked', () => {
    const mediaQuery = window.matchMedia('(min-width: 768px)');
    expect(mediaQuery.matches).toBe(false);
  });

  it('should have localStorage mocked', () => {
    localStorage.setItem('test', 'value');
    expect(localStorage.setItem).toHaveBeenCalledWith('test', 'value');
  });

  it('should have fetch mocked', () => {
    expect(typeof global.fetch).toBe('function');
  });
});
