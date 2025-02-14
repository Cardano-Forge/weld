export * from "./config";
export * from "./extensions";
export * from "./wallet";

import { initCustomWallets } from "@/internal/custom/init";
import { type ConfigStore, type WeldConfig, createConfigStore } from "./config";
import { type ExtensionsStore, createExtensionsStore } from "./extensions";
import { type WalletStore, createWalletStore } from "./wallet";

export function createWeldInstance() {
  let configStore: ConfigStore;
  let walletStore: WalletStore;
  let extensionsStore: ExtensionsStore;
  return {
    get config() {
      if (!configStore) {
        configStore = createConfigStore();
      }
      return configStore;
    },
    get wallet() {
      if (!walletStore) {
        walletStore = createWalletStore({ config: this.config });
      }
      return walletStore;
    },
    get extensions() {
      if (!extensionsStore) {
        extensionsStore = createExtensionsStore({ config: this.config });
      }
      return extensionsStore;
    },
    persist(config?: Partial<WeldConfig>) {
      this.config.persist();
      this.wallet.persist({ tryToReconnectTo: config?.wallet?.tryToReconnectTo });
      this.extensions.persist();
    },
    init({ persist = true }: { persist?: boolean | Partial<WeldConfig> } = {}) {
      initCustomWallets(this.config.getState());

      if (typeof persist === "object") {
        this.persist(persist);
      } else if (persist) {
        this.persist();
      }

      this.config.init();
      this.wallet.init();
      this.extensions.init();
    },
    cleanup() {
      this.config.cleanup();
      this.wallet.cleanup();
      this.extensions.cleanup();
    },
  };
}

export const weld = createWeldInstance();

export type WeldInstance = typeof weld;
