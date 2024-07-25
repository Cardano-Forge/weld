import type { WalletKey } from "@/lib/utils";

import { getDefaultWalletConnector } from "@/internal/connector";
import { type WalletHandlerByKey, customWallets, hasCustomImplementation } from "@/internal/custom";
import type { WalletHandler } from "@/internal/handler";
import { UNSAFE_LIB_USAGE_ERROR, isBrowser } from "@/internal/utils/browser";
import { type WalletConfig, defaults } from "./config";

/**
 * Connect and enable a user wallet extension
 * @param {string} key - The extension API key on the window.cardano object
 * @throws WalletConnectionError
 * @returns WalletHandler
 */
export async function connect<T extends WalletKey>(
  key: T,
  config?: Partial<WalletConfig>,
): Promise<WalletHandlerByKey[T]>;
export async function connect(key: string, config?: Partial<WalletConfig>): Promise<WalletHandler>;
export async function connect(
  key: string,
  configOverrides?: Partial<WalletConfig>,
): Promise<WalletHandler> {
  if (!isBrowser() && !defaults.ignoreUnsafeUsageError) {
    console.error(UNSAFE_LIB_USAGE_ERROR);
  }

  const config: WalletConfig = {
    ...defaults.wallet,
    ...configOverrides,
  };

  if (hasCustomImplementation(key)) {
    return customWallets[key].connector(key, config);
  }

  return getDefaultWalletConnector()(key, config);
}
