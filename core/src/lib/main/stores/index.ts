export * from "./config";
export * from "./extensions";
export * from "./wallet";

import { initPlugins } from "@/internal/plugins/init";
import { type ConfigStore, createConfigStore, type WeldConfig } from "./config";
import { createExtensionsStore, type ExtensionsStore } from "./extensions";
import { createWalletStore, type WalletStore } from "./wallet";

export function createWeldInstance(initConfig?: Partial<WeldConfig>) {
  let configStore: ConfigStore;
  let walletStore: WalletStore;
  let extensionsStore: ExtensionsStore;
  const instance = {
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
      initPlugins(this);

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
  if (initConfig) {
    instance.config.update(initConfig);
  }
  return instance;
}

export const weld = createWeldInstance();

export type WeldInstance = typeof weld;
