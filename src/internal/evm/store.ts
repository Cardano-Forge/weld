import type { Eip1193Provider } from "ethers";

import { LifeCycleManager } from "@/internal/lifecycle";
import { type Store, type StoreLifeCycleMethods, createStoreFactory } from "@/internal/store";

import { setupAutoUpdate } from "@/internal/update";
import { get } from "@/internal/utils/get";

export type EvmHandler = Eip1193Provider & {
  isConnected: () => boolean;
};

function isEvmHandler(obj: unknown): obj is EvmHandler {
  return (
    typeof obj === "object" && obj !== null && "connect" in obj && typeof obj.connect === "function"
  );
}

export type EvmExtension = {
  key: string;
  handlerPath: string;
  displayName: string;
  isInstalled: boolean;
  handler?: EvmHandler;
};

const EVM_EXTENSIONS: Omit<EvmExtension, "isInstalled" | "handler">[] = [
  {
    key: "metamask",
    displayName: "Metamask",
    handlerPath: "ethereum",
  },
  {
    key: "phantom",
    displayName: "Phantom",
    handlerPath: "phantom.ethereum",
  },
  {
    key: "exodus",
    displayName: "Exodus",
    handlerPath: "exodus.ethereum",
  },
];

export type EvmState = {
  supportedExtensionsArr: EvmExtension[];
  supportedExtensionsMap: Map<string, EvmExtension>;
  installedExtensionsArr: EvmExtension[];
  installedExtensionsMap: Map<string, EvmExtension>;
};

function newInitialEvmState(): EvmState {
  return {
    supportedExtensionsArr: [],
    supportedExtensionsMap: new Map(),
    installedExtensionsArr: [],
    installedExtensionsMap: new Map(),
  };
}

export type EvmApi = {
  updateExtensions(): void;
} & StoreLifeCycleMethods;

export type EvmStoreState = EvmState & EvmApi;
export type EvmStore = Store<EvmStoreState>;

export const createEvmStore = createStoreFactory<EvmStoreState>((setState, getState) => {
  const lifecycle = new LifeCycleManager();

  const updateExtensions = () => {
    if (typeof window === "undefined") {
      return;
    }
    const newState = newInitialEvmState();
    for (const info of EVM_EXTENSIONS) {
      const cached = getState().supportedExtensionsMap.get(info.key);
      const handler = get(window, info.handlerPath);
      const extension = cached ?? { ...info, isInstalled: false };
      if (isEvmHandler(handler)) {
        extension.isInstalled = true;
        extension.handler = handler;
        newState.installedExtensionsMap.set(info.key, extension);
        newState.installedExtensionsArr.push(extension);
      }
      newState.supportedExtensionsMap.set(info.key, extension);
      newState.supportedExtensionsArr.push(extension);
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
    ...newInitialEvmState(),
    init,
    cleanup,
    updateExtensions,
  };
});
