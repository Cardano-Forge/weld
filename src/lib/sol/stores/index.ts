export * from "./extensions";
export * from "./wallet";

import { type ConfigStore, type WeldConfig, createConfigStore } from "@/lib/main/stores/config";
import type { SolConfig } from "../types";
import { type SolExtensionsStore, createSolExtensionsStore } from "./extensions";
import { type SolWalletStore, createSolWalletStore } from "./wallet";

export function createWeldSolInstance() {
  let configStore: ConfigStore<SolConfig>;
  let walletStore: SolWalletStore;
  let extensionsStore: SolExtensionsStore;
  return {
    get config() {
      if (!configStore) {
        configStore = createConfigStore<SolConfig>();
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
}

export const weldSol = createWeldSolInstance();

export type WeldSolInstance = typeof weldSol;
