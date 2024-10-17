import { type Store, createStoreFactory } from "@/internal/store";
import type { StorageKeysType } from "@/lib/server";
import { type WeldStorage, defaultStorage } from "../persistence";

export type UpdateConfig = {
  debug: boolean;
  /**
   * How frequently properties should get updated
   *
   * @default 30_000ms
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

const initialConfigState: WeldConfig = {
  debug: false,
  updateInterval: 30_000,
  updateOnWindowFocus: true,
  ignoreUnsafeUsageError: false,
  enablePersistence: true,
  storage: defaultStorage,
  wallet: {},
  extensions: {},
};

export type ConfigApi = {
  update(values: Partial<WeldConfig>): void;
  getPersistedValue(key: StorageKeysType): string | undefined;
};

export type ConfigStoreState = WeldConfig & ConfigApi;
export type ConfigStore = Store<ConfigStoreState>;

export const createConfigStore = createStoreFactory<ConfigStoreState>((setState, getState) => {
  const update: ConfigApi["update"] = (values) => {
    setState({
      ...getState(),
      ...values,
      wallet: {
        ...getState().wallet,
        ...values.wallet,
      },
      extensions: {
        ...getState().extensions,
        ...values.extensions,
      },
    });
  };

  const getPersistedValue: ConfigApi["getPersistedValue"] = (key): string | undefined => {
    return getState().storage.get(key) ?? undefined;
  };

  return {
    ...initialConfigState,
    update,
    getPersistedValue,
  };
});
