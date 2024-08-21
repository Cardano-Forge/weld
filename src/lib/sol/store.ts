import { LifeCycleManager } from "@/internal/lifecycle";
import { type Store, type StoreLifeCycleMethods, createStoreFactory } from "@/internal/store";

import { setupAutoUpdate } from "@/internal/update";
import { get } from "@/internal/utils/get";
import type {
  SendOptions,
  Transaction,
  TransactionSignature,
  VersionedTransaction,
} from "@solana/web3.js";

export type SolHandler = {
  isPhantom?: boolean;
  publicKey?: { toBytes(): Uint8Array };
  isConnected: boolean;
  signTransaction<T extends Transaction | VersionedTransaction>(transaction: T): Promise<T>;
  signAllTransactions<T extends Transaction | VersionedTransaction>(
    transactions: T[],
  ): Promise<T[]>;
  signAndSendTransaction<T extends Transaction | VersionedTransaction>(
    transaction: T,
    options?: SendOptions,
  ): Promise<{ signature: TransactionSignature }>;
  signMessage(message: Uint8Array): Promise<{ signature: Uint8Array }>;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
};

function isSolHandler(obj: unknown): obj is SolHandler {
  return (
    typeof obj === "object" && obj !== null && "connect" in obj && typeof obj.connect === "function"
  );
}

export type SolExtension = {
  key: string;
  handlerPath: string;
  displayName: string;
  isInstalled: boolean;
  handler?: SolHandler;
};

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

export type SolState = {
  supportedExtensionsArr: SolExtension[];
  supportedExtensionsMap: Map<string, SolExtension>;
  installedExtensionsArr: SolExtension[];
  installedExtensionsMap: Map<string, SolExtension>;
};

function newInitialSolState(): SolState {
  return {
    supportedExtensionsArr: [],
    supportedExtensionsMap: new Map(),
    installedExtensionsArr: [],
    installedExtensionsMap: new Map(),
  };
}

export type SolApi = {
  updateExtensions(): void;
} & StoreLifeCycleMethods;

export type SolStoreState = SolState & SolApi;
export type SolStore = Store<SolStoreState>;

export const createSolStore = createStoreFactory<SolStoreState>((setState, getState) => {
  const lifecycle = new LifeCycleManager();


  const updateExtensions = () => {
    if (typeof window === "undefined") {
      return;
    }
    const newState = newInitialSolState();
    for (const info of SOL_EXTENSIONS) {
      const cached = getState().supportedExtensionsMap.get(info.key);
      const handler = get(window, info.handlerPath);
      const extension = cached ?? { ...info, isInstalled: false };
      if (isSolHandler(handler)) {
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
    ...newInitialSolState(),
    init,
    cleanup,
    updateExtensions,
  };
});
