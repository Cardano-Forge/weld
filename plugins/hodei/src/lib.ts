import { initialize as defaultInitialize } from "@ada-anvil/hodei-client";
import type { WeldInstance } from "@ada-anvil/weld";
import { DefaultWalletHandler, getDefaultWalletConnector, runOnce } from "@ada-anvil/weld/core";
import type { WeldPlugin } from "@ada-anvil/weld/plugins";

export class HodeiHandler extends DefaultWalletHandler {
  async disconnect(): Promise<void> {
    if ("disconnect" in this.enabledApi && typeof this.enabledApi.disconnect === "function") {
      return this.enabledApi?.disconnect();
    }
  }
}

export type RetryConfig = {
  baseDelay: number;
  maxRetries?: number;
  maxDelay?: number;
  backoff?: boolean;
  skipImmediate?: boolean;
};

export type WalletUpdateData = {
  baseAddress: string;
  stakeAddress: string;
  network: "mainnet" | "preprod";
};

export type HodeiPluginConfig = {
  bridge: { baseUrl: string };
  anvil: Record<"mainnet" | "preprod", { baseUrl: string; apiKey: string }>;
  debug: boolean;
  waitForPairing: boolean;
  retry: RetryConfig | boolean;
  onError(data: { error?: string }, weld: WeldInstance): void;
  onClose(data: { code: number; reason: string }, weld: WeldInstance): void;
  onWalletUpdate(data: WalletUpdateData, weld: WeldInstance): void;
  initialize: typeof defaultInitialize;
};

const hodeiWalletKey = "hodei";

export function hodeiPlugin(config?: Partial<HodeiPluginConfig>): WeldPlugin {
  return {
    key: hodeiWalletKey,
    connector: getDefaultWalletConnector(HodeiHandler),
    initialize: runOnce((weld) => {
      const shouldHandleCallback = (): boolean => {
        if (weld.wallet.key === hodeiWalletKey || weld.wallet.isConnectingTo === hodeiWalletKey) {
          return true;
        }
        if (weld.config.debug) {
          console.warn(
            "[WELD] Ignoring Hodei socket error. Weld isn't connected nor connecting to Hodei",
          );
        }
        return false;
      };

      const initFn = config?.initialize ?? defaultInitialize;
      const walletApi = initFn({
        debug: weld.config.debug,
        ...config,
        onError: (state) => {
          if (!shouldHandleCallback()) {
            return;
          }
          if (weld.config.debug) {
            console.error("[WELD] Hodei socket error, disconnecting.", state);
          }
          config?.onError?.(state, weld);
          weld.wallet.disconnect();
        },
        onClose: (data) => {
          if (!shouldHandleCallback()) {
            return;
          }
          if (weld.config.debug) {
            console.error("[WELD] Hodei socket closed, disconnecting.", data);
          }
          config?.onClose?.(data, weld);
          weld.wallet.disconnect();
        },
        onWalletUpdate: (wallet) => {
          if (!shouldHandleCallback()) {
            return;
          }
          if (weld.config.debug) {
            console.log("[WELD] Hodei wallet updated, updating state.", wallet);
          }
          config?.onWalletUpdate?.(wallet, weld);
          weld.wallet.updateState();
        },
      });

      if (!walletApi) {
        return false;
      }

      weld.extensions.registerWallets([
        {
          supported: true,
          key: hodeiWalletKey,
          displayName: "Hodei",
          icon: "https://raw.githubusercontent.com/cardano-forge/weld/main/images/wallets/hodei.png",
          website: "https://github.com/cardano-forge/hodei-client",
          supportsTxChaining: false,
        },
      ]);

      return true;
    }),
  };
}
