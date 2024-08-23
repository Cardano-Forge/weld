import { LifeCycleManager } from "@/internal/lifecycle";
import { type Store, type StoreLifeCycleMethods, createStoreFactory } from "@/internal/store";

import { setupAutoUpdate } from "@/internal/update";
import { get } from "@/internal/utils/get";
import { ETH_EXTENSIONS, type EthExtension, isEthHandler } from "../types";

export type EthExtensionsProps = {
  supportedArr: EthExtension[];
  supportedMap: Map<string, EthExtension>;
  installedArr: EthExtension[];
  installedMap: Map<string, EthExtension>;
};

export type EthExtensionsApi = {
  updateExtensions(): void;
} & StoreLifeCycleMethods;

export type EthExtensionsState = EthExtensionsProps & EthExtensionsApi;

export type EthExtensionsStore = Store<EthExtensionsState>;

function newInitialEthState(): EthExtensionsProps {
  return {
    supportedArr: [],
    supportedMap: new Map(),
    installedArr: [],
    installedMap: new Map(),
  };
}

export const createEthExtensionsStore = createStoreFactory<EthExtensionsState>(
  (setState, getState) => {
    const lifecycle = new LifeCycleManager();

    const updateExtensions = () => {
      if (typeof window === "undefined") {
        return;
      }
      const newState = newInitialEthState();
      for (const info of ETH_EXTENSIONS) {
        const cached = getState().supportedMap.get(info.key);
        const handler = get(window, info.handlerPath);
        const extension = cached ?? { ...info, isInstalled: false };
        if (isEthHandler(handler)) {
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

    const init = () => {
      updateExtensions();
      setupAutoUpdate(updateExtensions, lifecycle);
    };

    const cleanup = () => {
      lifecycle.cleanup();
    };

    return {
      ...newInitialEthState(),
      init,
      cleanup,
      updateExtensions,
    };
  },
);
