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
