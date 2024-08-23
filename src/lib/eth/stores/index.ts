export * from "./extensions";
export * from "./wallet";

import { type ConfigStore, createConfigStore } from "@/lib/main/stores/config";
import { type EthExtensionsStore, createEthExtensionsStore } from "./extensions";
import { type EthWalletStore, createEthWalletStore } from "./wallet";

let configStore: ConfigStore;
let walletStore: EthWalletStore;
let extensionsStore: EthExtensionsStore;

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
      extensionsStore = createEthExtensionsStore();
    }
    return extensionsStore;
  },
};
