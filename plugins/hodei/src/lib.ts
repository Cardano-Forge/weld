import { initialize } from "@ada-anvil/hodei-client";
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
};

export function hodeiPlugin(config?: Partial<HodeiPluginConfig>): WeldPlugin {
  return {
    key: "hodei",
    connector: getDefaultWalletConnector(HodeiHandler),
    initialize: runOnce((weld) => {
      const walletApi = initialize({
        debug: weld.config.debug,
        ...config,
        onError: (data) => {
          if (weld.config.debug) {
            console.error("[WELD] Hodei socket error, disconnecting.", data);
          }
          config?.onError?.(data, weld);
          weld.wallet.disconnect();
        },
        onClose: (data) => {
          if (weld.config.debug) {
            console.error("[WELD] Hodei socket closed, disconnecting.", data);
          }
          config?.onClose?.(data, weld);
          weld.wallet.disconnect();
        },
        onWalletUpdate: (wallet) => {
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
          key: "hodei",
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
