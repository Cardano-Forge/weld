export * from "@/internal/evm/extensions";
export * from "./wallet";

import { type ConfigStore, createConfigStore } from "@/lib/main/stores/config";
import { type EthWalletStore, createEthWalletStore } from "./wallet";
import { createEvmExtensionsStore, type EvmExtensionsStore } from "@/internal/evm/extensions";
import { ETH_EXTENSIONS } from "../types";

let configStore: ConfigStore;
let walletStore: EthWalletStore;
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
      walletStore = createEthWalletStore();
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
