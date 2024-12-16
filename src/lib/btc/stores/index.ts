export * from "./extensions";
export * from "./wallet";

import { type ConfigStore, type WeldConfig, createConfigStore } from "@/lib/main/stores/config";
import { type BtcExtensionsStore, createBtcExtensionsStore } from "./extensions";
import { type BtcWalletStore, createBtcWalletStore } from "./wallet";

export function createWeldBtcInstance() {
  let configStore: ConfigStore;
  let walletStore: BtcWalletStore;
  let extensionsStore: BtcExtensionsStore;
  return {
    get config() {
      if (!configStore) {
        configStore = createConfigStore();
      }
      return configStore;
    },
    get wallet() {
      if (!walletStore) {
        walletStore = createBtcWalletStore();
      }
      return walletStore;
    },
    get extensions() {
      if (!extensionsStore) {
        extensionsStore = createBtcExtensionsStore();
      }
      return extensionsStore;
    },
    persist(config?: Partial<WeldConfig>) {
      this.config.persist();
      this.wallet.persist({ tryToReconnectTo: config?.wallet?.tryToReconnectTo });
      this.extensions.persist();
    },
    init({ persist = true }: { persist?: boolean | Partial<WeldConfig> } = {}) {
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

export const weldBtc = createWeldBtcInstance();

export type WeldBtcInstance = typeof weldBtc;
