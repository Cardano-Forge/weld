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
}

export function deleteConnectedWallet(key: string): void {
  const existing = connectedWallets.get(key);
  cleanupHandler(existing);
  connectedWallets.delete(key);
}

export function clearConnectedWallets(): void {
  for (const handler of connectedWallets.values()) {
    cleanupHandler(handler);
  }
  connectedWallets.clear();
}

export function getConnectedWallet(key: string): ExtendedWalletHandler | undefined {
  return connectedWallets.get(key);
}
