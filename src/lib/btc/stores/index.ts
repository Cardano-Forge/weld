export * from "./extensions";
export * from "./wallet";

import { type ConfigStore, createConfigStore } from "@/lib/main/stores/config";

export function createWeldBtcInstance() {
  let configStore: ConfigStore;
  return {
    get config() {
      if (!configStore) {
        configStore = createConfigStore();
      }
      return configStore;
    },
    persist() {
      this.config.persist();
    },
    init({ persist = true }: { persist?: boolean } = {}) {
      if (persist) {
        this.persist();
      }

      this.config.init();
    },
    cleanup() {
      this.config.cleanup();
    },
  };
}

export const weldBtc = createWeldBtcInstance();

export type WeldBtcInstance = typeof weldBtc;
