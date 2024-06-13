import { defaults } from "./config";

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
  return defaults.persistence.storage.getItem(STORAGE_KEYS[key]) ?? undefined;
}
