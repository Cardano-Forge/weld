export * from "./extensions";
export * from "./wallet";

import {
  type ConfigStore,
  type ConfigStoreState,
  type WeldConfig,
  createConfigStore,
} from "@/lib/main/stores/config";
import { type SolExtensionsStore, createSolExtensionsStore } from "./extensions";
import { type SolWalletStore, createSolWalletStore } from "./wallet";

type SolConfigStoreState = ConfigStoreState & { connectionUrl?: string };
let configStore: ConfigStore<SolConfigStoreState>;
let walletStore: SolWalletStore;
let extensionsStore: SolExtensionsStore;

export const weldSol = {
  get config() {
    if (!configStore) {
      configStore = createConfigStore<SolConfigStoreState>();
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
