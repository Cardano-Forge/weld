export * from "./extensions";
export * from "./wallet";

import { type ExtensionsStore, createExtensionsStore } from "./extensions";
import { type WalletStore, createWalletStore } from "./wallet";

let defaultWalletStore: WalletStore;
let defaultExtensionsStore: ExtensionsStore;

export const weld = {
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
