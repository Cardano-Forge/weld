export * from "./extensions";
export * from "./wallet";

import { type ConfigStore, createConfigStore } from "./config";
import { type ExtensionsStore, createExtensionsStore } from "./extensions";
import { type WalletStore, createWalletStore } from "./wallet";

let configStore: ConfigStore;
let walletStore: WalletStore;
let extensionsStore: ExtensionsStore;

export const weld = {
  get config() {
    if (!configStore) {
      configStore = createConfigStore();
    }
    return configStore;
  },
  get wallet() {
    if (!walletStore) {
      walletStore = createWalletStore();
    }
    return walletStore;
  },
  get extensions() {
    if (!extensionsStore) {
      extensionsStore = createExtensionsStore();
    }
    return extensionsStore;
  },
};
