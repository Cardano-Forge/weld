import {
  type ExtensionsStore,
  type WalletStore,
  createExtensionsStore,
  createWalletStore,
} from "@/lib/main/stores";

let defaultWalletStore: WalletStore;
let defaultExtensionsStore: ExtensionsStore;

export const weld = {
  get wallet() {
    if (!defaultWalletStore) {
      defaultWalletStore = createWalletStore.vanilla();
    }
    return defaultWalletStore;
  },
  get extensions() {
    if (!defaultExtensionsStore) {
      defaultExtensionsStore = createExtensionsStore.vanilla();
    }
    return defaultExtensionsStore;
  },
};
