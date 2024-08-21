import { type WalletKey, weld } from "@/lib/main";

import { getDefaultWalletConnector } from "@/internal/connector";
import { type WalletHandlerByKey, customWallets, hasCustomImplementation } from "@/internal/custom";
import type { WalletHandler } from "@/internal/handler";
import { UNSAFE_LIB_USAGE_ERROR, isBrowser } from "@/internal/utils/browser";

/**
 * Connect and enable a user wallet extension
 * @param {string} key - The extension API key on the window.cardano object
 * @throws WalletConnectionError
 * @returns WalletHandler
 */
export async function connect<T extends WalletKey>(key: T): Promise<WalletHandlerByKey[T]>;
export async function connect(key: string): Promise<WalletHandler>;
export async function connect(key: string): Promise<WalletHandler> {
  if (!isBrowser() && !weld.config.getState().ignoreUnsafeUsageError) {
    console.error(UNSAFE_LIB_USAGE_ERROR);
  }

  if (hasCustomImplementation(key)) {
    return customWallets[key].connector(key);
  }

  return getDefaultWalletConnector()(key);
}
