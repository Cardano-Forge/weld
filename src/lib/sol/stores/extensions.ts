import { LifeCycleManager } from "@/internal/lifecycle";
import { type Store, type StoreLifeCycleMethods, createStoreFactory } from "@/internal/store";

import { setupAutoUpdate } from "@/internal/update";
import { get } from "@/internal/utils/get";
import { type SolExtension, isSolHandler } from "../types";

const SOL_EXTENSIONS: Omit<SolExtension, "isInstalled" | "handler">[] = [
  {
    key: "phantom",
    displayName: "Phantom",
    handlerPath: "phantom.solana",
  },
  {
    key: "nufi",
    displayName: "NuFi",
    handlerPath: "nufiSolana",
  },
  {
    key: "coinbase",
    displayName: "CoinBase",
    handlerPath: "coinbaseSolana",
  },
  {
    key: "exodus",
    displayName: "Exodus",
    handlerPath: "exodus.solana",
  },
];

export type SolExtensionsProps = {
  supportedArr: SolExtension[];
  supportedMap: Map<string, SolExtension>;
  installedArr: SolExtension[];
  installedMap: Map<string, SolExtension>;
};

export type SolApi = {
  updateExtensions(): void;
} & StoreLifeCycleMethods;

export type SolExtensionsState = SolExtensionsProps;

export type SolExtensionsStore = Store<SolExtensionsState>;

function newInitialSolState(): SolExtensionsState {
  return {
    supportedArr: [],
    supportedMap: new Map(),
    installedArr: [],
    installedMap: new Map(),
  };
}

export const createSolExtensionsStore = createStoreFactory<SolExtensionsState>(
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

    const init = () => {
      updateExtensions();
      setupAutoUpdate(updateExtensions, lifecycle);
    };

    const cleanup = () => {
      lifecycle.cleanup();
    };

    return {
      ...newInitialSolState(),
      init,
      cleanup,
      updateExtensions,
    };
  },
);
