import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useExport } from '../useExport';

// Mock the toastStore
const mockAddToast = vi.fn();
vi.mock('../../stores/toastStore', () => ({
  useToastStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({ addToast: mockAddToast }),
}));

describe('useExport', () => {
  let clickSpy: ReturnType<typeof vi.fn>;
  let createElementSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    mockAddToast.mockClear();

    // Mock URL.createObjectURL / revokeObjectURL
    global.URL.createObjectURL = vi.fn(() => 'blob:test-url');
    global.URL.revokeObjectURL = vi.fn();

    // Mock document.createElement to capture anchor clicks
    clickSpy = vi.fn();
    createElementSpy = vi.spyOn(document, 'createElement');
    createElementSpy.mockImplementation((tagName: string, options?: ElementCreationOptions) => {
      // Call the real implementation first
      const el = Document.prototype.createElement.call(document, tagName, options);
      if (tagName === 'a') {
        el.click = clickSpy;
      }
      return el;
    });
  });

  afterEach(() => {
    createElementSpy?.mockRestore();
  });

  describe('exportData', () => {
    it('should export JSON as a downloadable file', async () => {
      const { result } = renderHook(() => useExport());

      const data = [{ name: 'Agent A', status: 'active' }];
      await result.current.exportData(data, 'agents', 'json');

      expect(clickSpy).toHaveBeenCalled();
      expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('blob:test-url');
      expect(mockAddToast).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'success', title: 'Exportado!' })
      );
    });

    it('should export CSV as a downloadable file', async () => {
      const { result } = renderHook(() => useExport());

      const data = [
        { name: 'Agent A', status: 'active' },
        { name: 'Agent B', status: 'offline' },
      ];
      await result.current.exportData(data, 'agents', 'csv');

      expect(clickSpy).toHaveBeenCalled();
      expect(mockAddToast).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'success' })
      );
    });

    it('should copy to clipboard when format is clipboard', async () => {
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: writeTextMock },
        configurable: true,
        writable: true,
      });

      const { result } = renderHook(() => useExport());

      const data = { key: 'value' };
      await result.current.exportData(data, 'test', 'clipboard');

      expect(writeTextMock).toHaveBeenCalledWith(JSON.stringify(data, null, 2));
      expect(mockAddToast).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'success', title: 'Copiado!' })
      );
    });

    it('should wrap a single object in an array for CSV export', async () => {
      const { result } = renderHook(() => useExport());

      const data = { name: 'Single', value: 42 };
      await result.current.exportData(data, 'single', 'csv');

      // Should not throw and should produce a valid download
      expect(clickSpy).toHaveBeenCalled();
    });

    it('should handle CSV values containing commas by quoting them', async () => {
      const { result } = renderHook(() => useExport());

      const data = [{ description: 'hello, world', count: '5' }];
      await result.current.exportData(data, 'test', 'csv');

      expect(clickSpy).toHaveBeenCalled();
    });

    it('should show error toast on clipboard failure', async () => {
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
        configurable: true,
        writable: true,
      });

      const { result } = renderHook(() => useExport());

      await result.current.exportData({}, 'test', 'clipboard');

      expect(mockAddToast).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'error', title: 'Erro ao exportar' })
      );
    });

    it('should default to json format when not specified', async () => {
      const { result } = renderHook(() => useExport());

      await result.current.exportData([{ a: 1 }], 'data');

      expect(clickSpy).toHaveBeenCalled();
      expect(mockAddToast).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'success' })
      );
    });
  });

  describe('shareUrl', () => {
    it('should copy URL to clipboard when navigator.share is unavailable', async () => {
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: writeTextMock },
        configurable: true,
        writable: true,
      });
      Object.defineProperty(navigator, 'share', {
        value: undefined,
        configurable: true,
        writable: true,
      });

      const { result } = renderHook(() => useExport());

      await result.current.shareUrl('Test');

      expect(writeTextMock).toHaveBeenCalled();
      expect(mockAddToast).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'success', title: 'Link copiado!' })
      );
    });
  });
});
