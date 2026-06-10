// Mock for virtual:pwa-register/react
import { vi } from 'vitest';

export const useRegisterSW = () => ({
  needRefresh: [false, vi.fn()] as [boolean, (value: boolean) => void],
  offlineReady: [false, vi.fn()] as [boolean, (value: boolean) => void],
  updateServiceWorker: vi.fn(),
});
