export * from "./extensions";
export * from "./wallet";

import { type ConfigStore, createConfigStore } from "@/lib/main/stores/config";
import { type SolExtensionsStore, createSolExtensionsStore } from "./extensions";
import { type SolWalletStore, createSolWalletStore } from "./wallet";

let configStore: ConfigStore;
let walletStore: SolWalletStore;
let extensionsStore: SolExtensionsStore;

export const weldSol = {
  get config() {
    if (!configStore) {
      configStore = createConfigStore();
    }
    return configStore;
  },
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
