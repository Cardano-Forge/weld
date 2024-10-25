import { LifeCycleManager } from "@/internal/lifecycle";
import { type Store, type StoreSetupFunctions, createStoreFactory } from "@/internal/store";

import { setupAutoUpdate } from "@/internal/auto-update";
import { get } from "@/internal/utils/get";
import { weldSol } from ".";
import {
  SOL_EXTENSIONS,
  type SolApi,
  type SolExtension,
  type SolExtensionInfo,
  isSolApi,
} from "../types";

export type SolExtensionsProps = {
  installedArr: SolExtension[];
  installedMap: Map<string, SolExtension>;
};

export type SolExtensionsApi = {
  updateExtensions(opts?: { caching?: boolean }): void;
};

export type SolExtensionsState = SolExtensionsProps & SolExtensionsApi;

export type SolExtensionsStore = Store<SolExtensionsState>;

function newInitialSolState(): SolExtensionsProps {
  return {
    installedArr: [],
    installedMap: new Map(),
  };
}

export const createSolExtensionsStore = createStoreFactory<
  SolExtensionsState,
  undefined,
  | []
  | [
      {
        supportedExtensionInfos?: SolExtensionInfo[];
        lifecycle?: LifeCycleManager;
        config?: typeof weldSol.config;
      },
    ]
>(
  (
    setState,
    _getState,
    {
      supportedExtensionInfos = SOL_EXTENSIONS,
      lifecycle = new LifeCycleManager(),
      config = weldSol.config,
    } = {},
  ) => {
    const cache = new Map<SolApi, SolExtension>();

    const updateExtensions = ({ caching = true } = {}) => {
      if (typeof window === "undefined") {
        return;
      }
      const newState = newInitialSolState();
      for (const info of supportedExtensionInfos) {
        const api = get(window, info.path);
        if (!isSolApi(api)) {
          continue;
        }
        let extension: SolExtension;
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

    const initialState: SolExtensionsState & StoreSetupFunctions = {
      ...newInitialSolState(),
      updateExtensions,
      __init,
      __cleanup,
    };

    return initialState as SolExtensionsState;
  },
);
