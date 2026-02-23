import { weld } from "@/lib/main";

import { getDefaultWalletConnector } from "@/internal/connector";
import type { WalletHandler } from "@/internal/handler";
import { UNSAFE_LIB_USAGE_ERROR, isBrowser } from "@/internal/utils/browser";

/**
 * Connect and enable a user wallet extension
 * @param {string} key - The extension API key on the window.cardano object
 * @throws WalletConnectionError
 * @returns WalletHandler
 */
export async function connect(key: string): Promise<WalletHandler> {
  if (!isBrowser() && !weld.config.ignoreUnsafeUsageError) {
    console.error(UNSAFE_LIB_USAGE_ERROR);
  }

  const plugin = weld.config.getState().plugins?.find((p) => p.key === key);
  if (plugin?.connector) {
    return plugin.connector(key);
  }

  return getDefaultWalletConnector()(key);
}
