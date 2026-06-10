import { createJSONStorage } from 'zustand/middleware';

/**
 * In-memory fallback when localStorage/sessionStorage is unavailable
 * (e.g., Storybook iframes, sandboxed contexts, privacy browsers).
 */
function createMemoryStorage(): Storage {
  const store = new Map<string, string>();
  return {
    get length() { return store.size; },
    clear() { store.clear(); },
    getItem(key) { return store.get(key) ?? null; },
    key(index) { return [...store.keys()][index] ?? null; },
    removeItem(key) { store.delete(key); },
    setItem(key, value) { store.set(key, value); },
  };
}

function isStorageAvailable(storage: Storage): boolean {
  const key = '__storage_test__';
  try {
    storage.setItem(key, '1');
    storage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

/** Safe localStorage — falls back to in-memory if unavailable */
export const safeLocalStorage: Storage =
  typeof window !== 'undefined' && isStorageAvailable(window.localStorage)
    ? window.localStorage
    : createMemoryStorage();

/** Safe sessionStorage — falls back to in-memory if unavailable */
export const safeSessionStorage: Storage =
  typeof window !== 'undefined' && isStorageAvailable(window.sessionStorage)
    ? window.sessionStorage
    : createMemoryStorage();

/** Zustand-compatible safe JSON storage for persist middleware */
export const safePersistStorage = createJSONStorage(() => safeLocalStorage);
