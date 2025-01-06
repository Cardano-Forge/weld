import { LifeCycleManager } from "@/internal/lifecycle";
import { type Store, type StoreSetupFunctions, createStoreFactory } from "@/internal/store";

import { setupAutoUpdate } from "@/internal/auto-update";
import { get } from "@/internal/utils/get";
import { weldBtc } from ".";
import { SUPPORTED_BTC_WALLETS } from "../handlers";
import { type BtcApi, type BtcExtension, type BtcWalletDef, isBtcApi } from "../types";

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
        supportedExtensions?: BtcWalletDef[];
        lifecycle?: LifeCycleManager;
        config?: typeof weldBtc.config;
      },
    ]
>(
  (
    setState,
    _getState,
    {
      supportedExtensions = Object.values(SUPPORTED_BTC_WALLETS),
      lifecycle = new LifeCycleManager(),
      config = weldBtc.config,
    } = {},
  ) => {
    const cache = new Map<BtcApi, BtcExtension>();

    const updateExtensions = async ({ caching = true } = {}) => {
      if (typeof window === "undefined") {
        return;
      }
      const newState = newInitialBtcState();
      for (const wallet of supportedExtensions) {
        const api = get(window, wallet.info.id);
        if (!isBtcApi(api)) {
          continue;
        }
        let extension: BtcExtension;
        const cached = cache.get(api);
        if (caching && cached) {
          extension = cached;
        } else {
          extension = { ...wallet, api };
        }

        cache.set(api, extension);
        newState.installedArr.push(extension);
        newState.installedMap.set(wallet.key, extension);
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
  },
);
