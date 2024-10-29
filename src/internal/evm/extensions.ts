import { LifeCycleManager } from "@/internal/lifecycle";
import { type Store, type StoreSetupFunctions, createStoreFactory } from "@/internal/store";

import { setupAutoUpdate } from "@/internal/auto-update";
import { get } from "@/internal/utils/get";
import type { ConfigStore } from "@/lib/main/stores/config";
import {
  type EvmApi,
  type EvmConfig,
  type EvmExtension,
  type EvmExtensionInfo,
  isEvmApi,
} from "./types";

export type EvmExtensionsProps = {
  installedArr: EvmExtension[];
  installedMap: Map<string, EvmExtension>;
};

export type EvmExtensionsApi = {
  updateExtensions(opts?: { caching?: boolean }): void;
};

export type EvmExtensionsState = EvmExtensionsProps & EvmExtensionsApi;

export type EvmExtensionsStore = Store<EvmExtensionsState> & EvmExtensionsState;

function newInitialEvmState(): EvmExtensionsProps {
  return {
    installedArr: [],
    installedMap: new Map(),
  };
}

export type EvmExtensionsStoreConfig = {
  extensions: readonly EvmExtensionInfo[];
  config: ConfigStore<EvmConfig>;
};

export const createEvmExtensionsStore = createStoreFactory<
  EvmExtensionsState,
  undefined,
  [EvmExtensionsStoreConfig] | [EvmExtensionsStoreConfig, { lifecycle?: LifeCycleManager }]
>((setState, _getState, { extensions, config }, { lifecycle = new LifeCycleManager() } = {}) => {
  const cache = new Map<EvmApi, EvmExtension>();

  const updateExtensions = ({ caching = true } = {}) => {
    if (typeof window === "undefined") {
      return;
    }
    const newState = newInitialEvmState();
    for (const info of extensions) {
      const api = get(window, info.path);
      if (!isEvmApi(api)) {
        continue;
      }
      let extension: EvmExtension;
      if (caching) {
        extension = cache.get(api) ?? { info, api };
      } else {
        extension = { info, api };
      }
      cache.set(api, extension);
      newState.installedArr.push(extension);
      newState.installedMap.set(info.key, extension);
    }
    setState(newState);
  };

  const __init = () => {
    updateExtensions();
    setupAutoUpdate(() => updateExtensions(), lifecycle, config);
  };

  const __cleanup = () => {
    lifecycle.cleanup();
  };

  const initialState: EvmExtensionsState & StoreSetupFunctions = {
    ...newInitialEvmState(),
    updateExtensions,
    __init,
    __cleanup,
  };

  return initialState as EvmExtensionsState;
});
