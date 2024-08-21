import type { Eip1193Provider } from "ethers";

import { LifeCycleManager } from "@/internal/lifecycle";
import { type Store, type StoreLifeCycleMethods, createStoreFactory } from "@/internal/store";

import { setupAutoUpdate } from "@/internal/update";
import { get } from "@/internal/utils/get";

export type EvmAdapter = Eip1193Provider & {
  isConnected: () => boolean;
};

function isEvmAdapter(obj: unknown): obj is EvmAdapter {
  return (
    typeof obj === "object" && obj !== null && "connect" in obj && typeof obj.connect === "function"
  );
}

export type EvmExtension = {
  key: string;
  adapterPath: string;
  displayName: string;
  isInstalled: boolean;
  adapter?: EvmAdapter;
};

const EVM_EXTENSIONS: Omit<EvmExtension, "isInstalled" | "adapter">[] = [
  {
    key: "metamask",
    displayName: "Metamask",
    adapterPath: "ethereum",
  },
  {
    key: "phantom",
    displayName: "Phantom",
    adapterPath: "phantom.ethereum",
  },
  {
    key: "exodus",
    displayName: "Exodus",
    adapterPath: "exodus.ethereum",
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
      const adapter = get(window, info.adapterPath);
      const extension = cached ?? { ...info, isInstalled: false };
      if (isEvmAdapter(adapter)) {
        extension.isInstalled = true;
        extension.adapter = adapter;
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
