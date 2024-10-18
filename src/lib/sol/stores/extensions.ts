import { LifeCycleManager } from "@/internal/lifecycle";
import { type Store, type StoreSetupFunctions, createStoreFactory } from "@/internal/store";

import { setupAutoUpdate } from "@/internal/update";
import { get } from "@/internal/utils/get";
import { SOL_EXTENSIONS, type SolExtension, isSolHandler } from "../types";

export type SolExtensionsProps = {
  supportedArr: SolExtension[];
  supportedMap: Map<string, SolExtension>;
  installedArr: SolExtension[];
  installedMap: Map<string, SolExtension>;
};

export type SolExtensionsApi = {
  updateExtensions(): void;
};

export type SolExtensionsStoreState = SolExtensionsProps & SolExtensionsApi;

export type SolExtensionsStore = Store<SolExtensionsStoreState>;

type ExtendedSolExtensionsStoreState = SolExtensionsStoreState & StoreSetupFunctions;

function newInitialSolState(): SolExtensionsProps {
  return {
    supportedArr: [],
    supportedMap: new Map(),
    installedArr: [],
    installedMap: new Map(),
  };
}

export const createSolExtensionsStore = createStoreFactory<SolExtensionsStoreState>(
  (setState, getState) => {
    const lifecycle = new LifeCycleManager();

    const updateExtensions = () => {
      if (typeof window === "undefined") {
        return;
      }
      const newState = newInitialSolState();
      for (const info of SOL_EXTENSIONS) {
        const cached = getState().supportedMap.get(info.key);
        const handler = get(window, info.handlerPath);
        const extension = cached ?? { ...info, isInstalled: false };
        if (isSolHandler(handler)) {
          extension.isInstalled = true;
          extension.handler = handler;
          newState.installedMap.set(info.key, extension);
          newState.installedArr.push(extension);
        }
        newState.supportedMap.set(info.key, extension);
        newState.supportedArr.push(extension);
      }
      setState(newState);
    };

    const __init = () => {
      updateExtensions();
      setupAutoUpdate(updateExtensions, lifecycle);
    };

    const __cleanup = () => {
      lifecycle.cleanup();
    };

    const initialState: ExtendedSolExtensionsStoreState = {
      ...newInitialSolState(),
      updateExtensions,
      __init,
      __cleanup,
    };

    return initialState;
  },
);
