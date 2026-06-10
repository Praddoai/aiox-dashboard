import { describe, it, expect, beforeEach } from 'vitest';
import { useI18nStore } from '../useI18n';

describe('useI18nStore', () => {
  beforeEach(() => {
    useI18nStore.setState({ locale: 'pt' });
  });

  it('should start with pt locale', () => {
    expect(useI18nStore.getState().locale).toBe('pt');
  });

  it('should set locale to en', () => {
    useI18nStore.getState().setLocale('en');
    expect(useI18nStore.getState().locale).toBe('en');
  });

  it('should toggle locale between pt and en', () => {
    useI18nStore.getState().toggleLocale();
    expect(useI18nStore.getState().locale).toBe('en');
    useI18nStore.getState().toggleLocale();
    expect(useI18nStore.getState().locale).toBe('pt');
  });
});
