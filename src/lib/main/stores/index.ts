export * from "./ada/extensions";
export * from "./ada/wallet";

import { type ExtensionsStore, createExtensionsStore } from "./ada/extensions";
import { type WalletStore, createWalletStore } from "./ada/wallet";
import { type ConfigStore, createConfigStore } from "./config";

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
