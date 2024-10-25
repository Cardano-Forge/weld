import type { CustomWalletKey } from "@/internal/custom";
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
    customWallets: boolean | { whitelist: CustomWalletKey[] } | { blacklist: CustomWalletKey[] };
  };

const initialConfigState: WeldConfig = {
  debug: false,
  updateInterval: 30_000,
  updateOnWindowFocus: true,
  ignoreUnsafeUsageError: false,
  enablePersistence: true,
  storage: defaultStorage,
  customWallets: true,
  wallet: {},
  extensions: {},
};

export type ConfigApi<TConfig extends Omit<WeldConfig, "customWallets"> = WeldConfig> = {
  update(values: Partial<TConfig>): void;
  getPersistedValue(key: StorageKeysType): string | undefined;
};

export type ConfigStoreState<TConfig extends Omit<WeldConfig, "customWallets"> = WeldConfig> =
  TConfig & ConfigApi<TConfig>;

export type ConfigStore<TConfig extends Omit<WeldConfig, "customWallets"> = WeldConfig> = Store<
  ConfigStoreState<TConfig>
>;

export const createConfigStore = <
  TConfig extends Omit<WeldConfig, "customWallets"> = WeldConfig,
>() =>
  createStoreFactory<ConfigStoreState<TConfig>>((setState, getState) => {
    const update: ConfigApi<TConfig>["update"] = (values) => {
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

    const getPersistedValue: ConfigApi<TConfig>["getPersistedValue"] = (
      key,
    ): string | undefined => {
      return getState().storage.get(key) ?? undefined;
    };

    return {
      ...initialConfigState,
      update,
      getPersistedValue,
    } as unknown as ConfigStoreState<TConfig>;
  })();
