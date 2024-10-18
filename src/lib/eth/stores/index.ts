export * from "@/internal/evm/extensions";
export * from "@/internal/evm/wallet";

import { type EvmExtensionsStore, createEvmExtensionsStore } from "@/internal/evm/extensions";
import { EvmChainId } from "@/internal/evm/types";
import { type EvmWalletStore, createEvmWalletStore } from "@/internal/evm/wallet";
import { type ConfigStore, type WeldConfig, createConfigStore } from "@/lib/main/stores/config";
import { ETH_EXTENSIONS } from "../types";

let configStore: ConfigStore;
let walletStore: EvmWalletStore;
let extensionsStore: EvmExtensionsStore;

export const weldEth = {
  get config() {
    if (!configStore) {
      configStore = createConfigStore();
    }
    return configStore;
  },
  get wallet() {
    if (!walletStore) {
      walletStore = createEvmWalletStore({
        chainId: EvmChainId.ETH,
        extensions: this.extensions,
        config: this.config,
        storageKey: "connectedEthWallet",
      });
    }
    return walletStore;
  },
  get extensions() {
    if (!extensionsStore) {
      extensionsStore = createEvmExtensionsStore(ETH_EXTENSIONS);
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
