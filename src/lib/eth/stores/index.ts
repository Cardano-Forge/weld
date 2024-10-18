export * from "@/internal/evm/extensions";
export * from "@/internal/evm/wallet";

import { type EvmExtensionsStore, createEvmExtensionsStore } from "@/internal/evm/extensions";
import { EvmChainId } from "@/internal/evm/types";
import { type EvmWalletStore, createEvmWalletStore } from "@/internal/evm/wallet";
import { type ConfigStore, createConfigStore } from "@/lib/main/stores/config";
import { STORAGE_KEYS } from "@/lib/server";
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
        storageKey: STORAGE_KEYS.connectedEthWallet,
      })();
    }
    return walletStore;
  },
  get extensions() {
    if (!extensionsStore) {
      extensionsStore = createEvmExtensionsStore(ETH_EXTENSIONS)();
    }
    return extensionsStore;
  },
};