export * from "./extensions";
export * from "./wallet";

import { type SolExtensionsStore, createSolExtensionsStore } from "./extensions";
import { type SolWalletStore, createSolWalletStore } from "./wallet";

let walletStore: SolWalletStore;
let extensionsStore: SolExtensionsStore;

export const weld = {
  get wallet() {
    if (!walletStore) {
      walletStore = createSolWalletStore();
    }
    return walletStore;
  },
  get extensions() {
    if (!extensionsStore) {
      extensionsStore = createSolExtensionsStore();
    }
    return extensionsStore;
  },
};
