import { describe, it, expect, beforeEach } from 'vitest';
import { useSearchStore } from '../searchStore';

describe('searchStore', () => {
  beforeEach(() => {
    useSearchStore.setState({ isOpen: false });
  });

  it('should have isOpen false by default', () => {
    expect(useSearchStore.getState().isOpen).toBe(false);
  });

  it('should set isOpen to true when open is called', () => {
    useSearchStore.getState().open();
    expect(useSearchStore.getState().isOpen).toBe(true);
  });

  it('should set isOpen to false when close is called', () => {
    useSearchStore.setState({ isOpen: true });
    useSearchStore.getState().close();
    expect(useSearchStore.getState().isOpen).toBe(false);
  });

  it('should toggle isOpen from false to true', () => {
    useSearchStore.getState().toggle();
    expect(useSearchStore.getState().isOpen).toBe(true);
  });

  it('should toggle isOpen from true to false', () => {
    useSearchStore.setState({ isOpen: true });
    useSearchStore.getState().toggle();
    expect(useSearchStore.getState().isOpen).toBe(false);
  });
});
