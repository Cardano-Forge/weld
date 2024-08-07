import { type WeldStorage, defaultStorage } from "./persistence";

export type UpdateConfig = {
  /**
   * How frequently properties should get updated
   *
   * @default 2000ms
   */
  updateInterval: number | false;
  /**
   * Updating utxos frequently can be expensive for large wallets.
   * That's why we expose a separate config option to allow disabling or slowing down
   * utxo updates without sacrificing update speed for other wallet properties
   *
   * @default 30_000ms
   */
  updateUtxosInterval: number | false;
  updateOnWindowFocus: boolean;
};

export type WalletConfig = UpdateConfig & {
  connectTimeout: number | false;
};

export type ExtensionsConfig = Omit<UpdateConfig, "updateUtxosInterval">;

export type StoreConfig = {
  wallet?: Partial<WalletConfig>;
  extensions?: Partial<ExtensionsConfig>;
};

export type WeldConfig = UpdateConfig &
  StoreConfig & {
    ignoreUnsafeUsageError: boolean;
    enablePersistence: boolean;
    storage: WeldStorage;
  };

export const defaults: WeldConfig = {
  updateInterval: 2000,
  updateUtxosInterval: 30_000,
  updateOnWindowFocus: true,
  ignoreUnsafeUsageError: false,
  enablePersistence: true,
  storage: defaultStorage,
};

export function getUpdateConfig(
  store: keyof StoreConfig,
  ...overrides: (Partial<UpdateConfig> | undefined)[]
): UpdateConfig {
  const config: UpdateConfig = {
    updateInterval: defaults.updateInterval,
    updateUtxosInterval: defaults.updateUtxosInterval,
    updateOnWindowFocus: defaults.updateOnWindowFocus,
  };
  if (defaults[store]) {
    Object.assign(config, defaults[store]);
  }
  for (const override of overrides) {
    if (override) {
      Object.assign(config, override);
    }
  }
  return config;
}
