export * from "./extensions";
export * from "./wallet";

import { type ConfigStore, createConfigStore } from "@/lib/main/stores/config";
import { type BtcExtensionsStore, createBtcExtensionsStore } from "./extensions";

export function createWeldBtcInstance() {
  let configStore: ConfigStore;
  let extensionsStore: BtcExtensionsStore;
  return {
    get config() {
      if (!configStore) {
        configStore = createConfigStore();
      }
      return configStore;
    },
    get extensions() {
      if (!extensionsStore) {
        extensionsStore = createBtcExtensionsStore();
      }
      return extensionsStore;
    },
    persist() {
      this.config.persist();
      this.extensions.persist();
    },
    init({ persist = true }: { persist?: boolean } = {}) {
      if (persist) {
        this.persist();
      }

      this.config.init();
      this.extensions.init();
    },
    cleanup() {
      this.config.cleanup();
      this.extensions.cleanup();
    },
  };
}

export const weldBtc = createWeldBtcInstance();

export type WeldBtcInstance = typeof weldBtc;
