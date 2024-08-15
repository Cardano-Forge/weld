export * from "./extensions";
export * from "./wallet";

import { type ConfigStore, createConfigStore } from "./config";
import { type ExtensionsStore, createExtensionsStore } from "./extensions";
import { type WalletStore, createWalletStore } from "./wallet";

let defaultConfigStore: ConfigStore;
let defaultWalletStore: WalletStore;
let defaultExtensionsStore: ExtensionsStore;

export const weld = {
  get config() {
    if (!defaultConfigStore) {
      defaultConfigStore = createConfigStore();
    }
    return defaultConfigStore;
  },
  get wallet() {
    if (!defaultWalletStore) {
      defaultWalletStore = createWalletStore();
    }
    return defaultWalletStore;
  },
  get extensions() {
    if (!defaultExtensionsStore) {
      defaultExtensionsStore = createExtensionsStore();
    }
    return defaultExtensionsStore;
  },
};
