/**
 * Minimal in-memory fake of the chrome.* APIs used by Fill2Fast.
 * Values are structured-cloned to mimic chrome.storage serialization.
 */
import { beforeEach } from 'vitest';

type Listener = (changes: Record<string, chrome.storage.StorageChange>, area: string) => void;

const store = new Map<string, unknown>();
const listeners = new Set<Listener>();

function emit(changes: Record<string, chrome.storage.StorageChange>) {
  for (const listener of listeners) listener(changes, 'local');
}

function toKeys(keys?: string | string[] | Record<string, unknown> | null): string[] {
  if (keys == null) return [...store.keys()];
  if (typeof keys === 'string') return [keys];
  if (Array.isArray(keys)) return keys;
  return Object.keys(keys);
}

const local = {
  async get(keys?: string | string[] | null) {
    const result: Record<string, unknown> = {};
    for (const key of toKeys(keys)) if (store.has(key)) result[key] = structuredClone(store.get(key));
    return result;
  },
  async set(items: Record<string, unknown>) {
    const changes: Record<string, chrome.storage.StorageChange> = {};
    for (const [key, value] of Object.entries(items)) {
      changes[key] = { oldValue: store.get(key), newValue: structuredClone(value) };
      store.set(key, structuredClone(value));
    }
    emit(changes);
  },
  async remove(keys: string | string[]) {
    const changes: Record<string, chrome.storage.StorageChange> = {};
    for (const key of toKeys(keys)) {
      if (store.has(key)) changes[key] = { oldValue: store.get(key) };
      store.delete(key);
    }
    emit(changes);
  },
  async clear() {
    store.clear();
  },
};

(globalThis as unknown as { chrome: unknown }).chrome = {
  storage: {
    local,
    onChanged: {
      addListener: (l: Listener) => listeners.add(l),
      removeListener: (l: Listener) => listeners.delete(l),
    },
  },
  runtime: {
    sendMessage: async () => undefined,
  },
};

beforeEach(() => {
  store.clear();
  listeners.clear();
  document.body.innerHTML = '';
});
