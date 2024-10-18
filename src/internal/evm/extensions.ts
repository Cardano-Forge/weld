import { LifeCycleManager } from "@/internal/lifecycle";
import { type Store, type StoreSetupFunctions, createStoreFactory } from "@/internal/store";

import { setupAutoUpdate } from "@/internal/update";
import { get } from "@/internal/utils/get";
import { weldEth } from "@/lib/eth";
import { type EvmExtension, type EvmExtensionPath, isEvmHandler } from "./types";

export type EvmExtensionsProps = {
  supportedArr: EvmExtension[];
  supportedMap: Map<string, EvmExtension>;
  installedArr: EvmExtension[];
  installedMap: Map<string, EvmExtension>;
};

export type EvmExtensionsApi = {
  updateExtensions(): void;
} & StoreSetupFunctions;

export type EvmExtensionsState = EvmExtensionsProps & EvmExtensionsApi;

export type EvmExtensionsStore = Store<EvmExtensionsState>;

function newInitialEvmState(): EvmExtensionsProps {
  return {
    supportedArr: [],
    supportedMap: new Map(),
    installedArr: [],
    installedMap: new Map(),
  };
}

export const createEvmExtensionsStore = (extensions: readonly EvmExtensionPath[]) =>
  createStoreFactory<EvmExtensionsState>((setState, getState) => {
    const lifecycle = new LifeCycleManager();

    const updateExtensions = () => {
      if (typeof window === "undefined") {
        return;
      }
      const newState = newInitialEvmState();
      for (const info of extensions) {
        const cached = getState().supportedMap.get(info.key);
        const handler = get(window, info.handlerPath);
        const extension = cached ?? { ...info, isInstalled: false };
        if (isEvmHandler(handler)) {
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
      setupAutoUpdate(updateExtensions, lifecycle, weldEth.config);
    };

    const cleanup = () => {
      lifecycle.cleanup();
    };

    return {
      ...newInitialEvmState(),
      init,
      cleanup,
      updateExtensions,
    };
  });
