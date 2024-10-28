export * from "@/internal/evm/extensions";
export * from "@/internal/evm/wallet";

import { type EvmExtensionsStore, createEvmExtensionsStore } from "@/internal/evm/extensions";
import type { EvmConfig } from "@/internal/evm/types";
import { type EvmWalletStore, createEvmWalletStore } from "@/internal/evm/wallet";
import { type ConfigStore, type WeldConfig, createConfigStore } from "@/lib/main/stores/config";
import { POLY_EXTENSIONS } from "../types";

let configStore: ConfigStore<EvmConfig>;
let walletStore: EvmWalletStore;
let extensionsStore: EvmExtensionsStore;

export const weldPoly = {
  get config() {
    if (!configStore) {
      configStore = createConfigStore();
    }
    return configStore;
  },
  get wallet() {
    if (!walletStore) {
      walletStore = createEvmWalletStore({
        chain: "poly",
        extensions: this.extensions,
        config: this.config,
        storageKey: "connectedPolyWallet",
      });
    }
    return walletStore;
  },
  get extensions() {
    if (!extensionsStore) {
      extensionsStore = createEvmExtensionsStore({
        extensions: POLY_EXTENSIONS,
        config: this.config,
      });
    }
    return extensionsStore;
  },
  persist(config?: Partial<WeldConfig>) {
    this.config.persist();
    this.wallet.persist({ tryToReconnectTo: config?.wallet?.tryToReconnectTo });
    this.extensions.persist();
  },
  init({ persist = true }: { persist?: boolean | Partial<WeldConfig> } = {}) {
    if (typeof persist === "object") {
      this.persist(persist);
    } else if (persist) {
      this.persist();
    }

    this.config.init();
    this.wallet.init();
    this.extensions.init();
  },
  cleanup() {
    this.config.cleanup();
    this.wallet.cleanup();
    this.extensions.cleanup();
  },
};
