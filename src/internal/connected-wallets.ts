import { defaults } from "@/lib/main/config";

import { STORAGE_KEYS } from "@/lib/main/persistence";
import type { ExtendedWalletHandler } from "./extended";
import type { WalletHandler } from "./handler";

const connectedWallets = new Map<string, ExtendedWalletHandler>();

function cleanupHandler(handler?: WalletHandler): void {
  if (handler && "_cleanup" in handler && typeof handler._cleanup === "function") {
    handler._cleanup();
  }
}

export function setConnectedWallet(key: string, handler: ExtendedWalletHandler): void {
  const existing = connectedWallets.get(key);
  cleanupHandler(existing);
  connectedWallets.set(key, handler);
  if (defaults.persistence.enabled) {
    defaults.persistence.storage.set(STORAGE_KEYS.connectedWallet, key);
  }
}

export function deleteConnectedWallet(key: string): void {
  const existing = connectedWallets.get(key);
  cleanupHandler(existing);
  connectedWallets.delete(key);
  if (defaults.persistence.enabled) {
    defaults.persistence.storage.remove(STORAGE_KEYS.connectedWallet);
  }
}

export function clearConnectedWallets(): void {
  for (const handler of connectedWallets.values()) {
    cleanupHandler(handler);
  }
  connectedWallets.clear();
  if (defaults.persistence.enabled) {
    defaults.persistence.storage.remove(STORAGE_KEYS.connectedWallet);
  }
}

export function getConnectedWallet(key: string): ExtendedWalletHandler | undefined {
  return connectedWallets.get(key);
}
