export * from "./extensions";
export * from "./wallet";

import { initCustomWallets } from "@/internal/custom/init";
import { type ConfigStore, type WeldConfig, createConfigStore } from "./config";
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
  init(config?: Partial<WeldConfig>) {
    initCustomWallets();
    this.config.init();
    this.wallet.init({ tryToReconnectTo: config?.wallet?.tryToReconnectTo });
    this.extensions.init();
  },
  cleanup() {
    this.config.cleanup();
    this.wallet.cleanup();
    this.extensions.cleanup();
  },
};
