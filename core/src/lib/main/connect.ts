import { isBrowser, UNSAFE_LIB_USAGE_ERROR } from "@weld/utils/browser";
import { getDefaultWalletConnector } from "@/internal/connector";
import type { WalletHandler } from "@/internal/handler";
import type { WeldConfig } from "@/lib/main";

export type ConnectOpts = {
  config?: Partial<Pick<WeldConfig, "ignoreUnsafeUsageError" | "plugins">>;
};

/**
 * Connect and enable a user wallet extension
 * @param {string} key - The extension API key on the window.cardano object
 * @throws WalletConnectionError
 * @returns WalletHandler
 */
export async function connect(key: string, opts: ConnectOpts = {}): Promise<WalletHandler> {
  const config = opts.config ?? (await import("@/lib/main")).weld.config.getState();

  if (!isBrowser() && !config.ignoreUnsafeUsageError) {
    console.error(UNSAFE_LIB_USAGE_ERROR);
  }

  const plugin = config.plugins?.find((p) => p.key === key);
  if (plugin?.connector) {
    return plugin.connector(key);
  }

  return getDefaultWalletConnector()(key);
}
