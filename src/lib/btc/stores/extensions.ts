import { LifeCycleManager } from "@/internal/lifecycle";
import { type Store, type StoreSetupFunctions, createStoreFactory } from "@/internal/store";

import { setupAutoUpdate } from "@/internal/auto-update";
import { get } from "@/internal/utils/get";
import { weldBtc } from ".";
import { type BtcApi, type BtcExtension, isBtcApi } from "../types";

export type BtcExtensionsProps = {
  installedArr: BtcExtension[];
  installedMap: Map<string, BtcExtension>;
};

export type BtcExtensionsApi = {
  updateExtensions(opts?: { caching?: boolean }): Promise<void>;
};

export type BtcExtensionsState = BtcExtensionsProps & BtcExtensionsApi;

export type BtcExtensionsStore = Store<BtcExtensionsState> & BtcExtensionsState;

function newInitialBtcState(): BtcExtensionsProps {
  return {
    installedArr: [],
    installedMap: new Map(),
  };
}

export const createBtcExtensionsStore = createStoreFactory<
  BtcExtensionsState,
  undefined,
  | []
  | [
      {
        lifecycle?: LifeCycleManager;
        config?: typeof weldBtc.config;
      },
    ]
>((setState, _getState, { lifecycle = new LifeCycleManager(), config = weldBtc.config } = {}) => {
  const cache = new Map<BtcApi, BtcExtension>();

  const updateExtensions = async ({ caching = true } = {}) => {
    if (typeof window === "undefined") {
      return;
    }
    const newState = newInitialBtcState();
    const infos = window.btc_providers ?? [];
    for (const info of infos) {
      const api = get(window, info.id);
      if (!isBtcApi(api)) {
        continue;
      }

      let extension: BtcExtension;
      let reusedFromCache = false;
      const cached = cache.get(api);
      if (caching && cached) {
        reusedFromCache = true;
        extension = cached;
      } else {
        extension = { info, api };
      }

      if (!reusedFromCache && info.methods?.includes("getInfo")) {
        const res = await api.request("getInfo");
        if (res.result?.methods) {
          info.methods = res.result.methods;
        }
      }

      cache.set(api, extension);
      newState.installedArr.push(extension);
      newState.installedMap.set(info.id, extension);
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

  const initialState: BtcExtensionsState & StoreSetupFunctions = {
    ...newInitialBtcState(),
    updateExtensions,
    __init,
    __cleanup,
  };

  return initialState as BtcExtensionsState;
});
