import { type WeldStorage, defaultStorage } from "./persistence";

export type UpdateConfig = {
  /**
   * How frequently properties should get updated
   *
   * @default 2000ms
   */
  updateInterval: number | false;
  updateOnWindowFocus: boolean;
};

export type WalletConfig = UpdateConfig & {
  connectTimeout: number | false;
  tryToReconnectTo: string;
  onUpdateError(error: unknown): void;
};

export type ExtensionsConfig = UpdateConfig & {
  onUpdateError(error: unknown): void;
};

export type StoreConfig = {
  wallet: Partial<WalletConfig>;
  extensions: Partial<ExtensionsConfig>;
};

export type WeldConfig = UpdateConfig &
  StoreConfig & {
    ignoreUnsafeUsageError: boolean;
    enablePersistence: boolean;
    storage: WeldStorage;
    onUpdateError?(context: string, error: unknown): void;
  };

export const defaults: WeldConfig = {
  updateInterval: 2000,
  updateOnWindowFocus: true,
  ignoreUnsafeUsageError: false,
  enablePersistence: true,
  storage: defaultStorage,
  wallet: {},
  extensions: {},
};
