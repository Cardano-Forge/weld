import { type WeldStorage, defaultStorage } from "./persistence";

export type WalletConfig = {
  pollInterval: number | false;
  updateOnWindowFocus: boolean;
};

export type PersistenceConfig = {
  enabled: boolean;
  storage: WeldStorage;
};

export type WeldConfig = {
  ignoreUnsafeUsageError: boolean;
  wallet: WalletConfig;
  persistence: PersistenceConfig;
};

export const defaults: WeldConfig = {
  ignoreUnsafeUsageError: false,
  wallet: {
    pollInterval: 2000,
    updateOnWindowFocus: true,
  },
  persistence: {
    enabled: true,
    storage: defaultStorage,
  },
};
