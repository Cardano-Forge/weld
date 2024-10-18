import type { ConfigStore, StoreConfig, UpdateConfig } from "@/lib/main/stores/config";
import type { LifeCycleManager } from "./lifecycle";

function mergeConfigs<TKey extends keyof UpdateConfig>(
  key: TKey,
  base: UpdateConfig,
  ...configs: (Partial<UpdateConfig> | undefined | false)[]
): UpdateConfig[TKey] {
  for (let i = configs.length - 1; i >= 0; i--) {
    const config = configs[i];
    const value = typeof config === "boolean" ? undefined : config?.[key];
    if (typeof value !== "undefined") {
      return value;
    }
  }
  return base[key];
}

export function setupAutoUpdate(
  fn: (stop: () => void) => unknown,
  lifecycle: LifeCycleManager,
  configStore: ConfigStore,
  store?: keyof StoreConfig,
  ...overrides: (Partial<UpdateConfig> | undefined)[]
) {
  let unsubInterval: (() => void) | undefined = undefined;
  let unsubWindowFocus: (() => void) | undefined = undefined;

  const stop = () => {
    if (unsubInterval) {
      unsubInterval();
      unsubInterval = undefined;
    }
    if (unsubWindowFocus) {
      unsubWindowFocus();
      unsubWindowFocus = undefined;
    }
  };

  const update = () => {
    if (!document.hidden) {
      fn(stop);
    }
  };

  lifecycle.subscriptions.add(
    configStore.subscribeWithSelector(
      (config) => mergeConfigs("updateInterval", config, store && config[store], ...overrides),
      (updateInterval) => {
        if (unsubInterval) {
          unsubInterval();
          unsubInterval = undefined;
        }
        if (updateInterval) {
          const pollInterval = setInterval(update, updateInterval);
          unsubInterval = lifecycle.subscriptions.add(() => {
            clearInterval(pollInterval);
          });
        }
      },
      { fireImmediately: true },
    ),
  );

  lifecycle.subscriptions.add(
    configStore.subscribeWithSelector(
      (config) => mergeConfigs("updateOnWindowFocus", config, store && config[store], ...overrides),
      (updateOnWindowFocus) => {
        if (unsubWindowFocus) {
          unsubWindowFocus();
          unsubWindowFocus = undefined;
        }
        if (updateOnWindowFocus) {
          window.addEventListener("focus", update);
          window.addEventListener("visibilityChange", update);
          unsubWindowFocus = lifecycle.subscriptions.add(() => {
            window.removeEventListener("focus", update);
            window.removeEventListener("visibilityChange", update);
          });
        }
      },
      { fireImmediately: true },
    ),
  );
}
