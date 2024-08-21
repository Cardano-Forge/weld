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

export type SolAdapter = {
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

function isSolAdapter(obj: unknown): obj is SolAdapter {
  return (
    typeof obj === "object" && obj !== null && "connect" in obj && typeof obj.connect === "function"
  );
}

export type SolExtension = {
  key: string;
  adapterPath: string;
  displayName: string;
  isInstalled: boolean;
  adapter?: SolAdapter;
};

const SOL_EXTENSIONS: Omit<SolExtension, "isInstalled" | "adapter">[] = [
  {
    key: "phantom",
    displayName: "Phantom",
    adapterPath: "phantom.solana",
  },
  {
    key: "nufi",
    displayName: "NuFi",
    adapterPath: "nufiSolana",
  },
  {
    key: "coinbase",
    displayName: "CoinBase",
    adapterPath: "coinbaseSolana",
  },
  {
    key: "exodus",
    displayName: "Exodus",
    adapterPath: "exodus.solana",
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
      const adapter = get(window, info.adapterPath);
      const extension = cached ?? { ...info, isInstalled: false };
      if (isSolAdapter(adapter)) {
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
    ...newInitialSolState(),
    init,
    cleanup,
    updateExtensions,
  };
});
