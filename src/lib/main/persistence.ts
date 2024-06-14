import { defaults } from "./config";

export type WeldStorage = {
  get(key: string): string | undefined;
  set(key: string, value: string): void;
  remove(key: string): void;
};

export const STORAGE_KEYS = {
  connectedWallet: "weld_connected-wallet",
};

/**
 * Retrieves a value from storage.
 * Always returns `undefined` when persistence is disabled
 */
export function getPersistedValue(key: keyof typeof STORAGE_KEYS): string | undefined {
  if (!defaults.persistence.enabled) {
    return undefined;
  }
  return defaults.persistence.storage.get(STORAGE_KEYS[key]) ?? undefined;
}

export const weldLocalStorage: WeldStorage = {
  get(key) {
    if (typeof window !== "undefined") {
      return window.localStorage.getItem(key) ?? undefined;
    }
  },
  set(key, value) {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(key, value);
    }
  },
  remove(key) {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(key);
    }
  },
};
