export * from "./ada/extensions";
export * from "./ada/wallet";

import { type ExtensionsStore, createExtensionsStore } from "./ada/extensions";
import { type WalletStore, createWalletStore } from "./ada/wallet";
import { type ConfigStore, createConfigStore } from "./config";
import { type SolStore, createSolStore } from "./sol";

let configStore: ConfigStore;
let walletStore: WalletStore;
let extensionsStore: ExtensionsStore;
let solStore: SolStore;

export const weld = {
  // Common
  get config() {
    if (!configStore) {
      configStore = createConfigStore();
    }
    return configStore;
  },
  // Cardano
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
  // Crosschain
  get sol() {
    if (!solStore) {
      solStore = createSolStore();
    }
    return solStore;
  },
};
