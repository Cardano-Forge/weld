import { LifeCycleManager } from "@/internal/lifecycle";
import { type Store, type StoreLifeCycleMethods, createStoreFactory } from "@/internal/store";

import type {
  EvmChainId,
  EvmExtensionInfo,
  EvmExtensionKey,
  EvmHandler,
} from "@/internal/evm/types";
import { setupAutoUpdate } from "@/internal/update";
import type { PartialWithDiscriminant } from "@/internal/utils/types";
import type { EvmExtensionsStore } from "@/lib/eth";
import {
  WalletConnectionAbortedError,
  WalletConnectionError,
  WalletDisconnectAccountError,
} from "@/lib/main";
import type { ConfigStore, WalletConfig } from "@/lib/main/stores/config";
import type { StorageKeysType } from "@/lib/server";
import { ethers, formatEther } from "ethers";
import type { AddressLike, BrowserProvider, JsonRpcSigner } from "ethers";

export type EvmWalletProps = EvmExtensionInfo & {
  isConnected: boolean;
  isConnecting: boolean;
  isConnectingTo: EvmExtensionKey | undefined;
  balanceSmallestUnit: bigint;
  balance: string;
  handler: EvmHandler;
  provider: BrowserProvider;
  signer: JsonRpcSigner;
  account: AddressLike;
};

export type ConnectedEvmWalletState = Extract<EvmWalletState, { isConnected: true }>;
export type DiconnectedEvmWalletState = Extract<EvmWalletState, { isConnected: false }>;

function newInitialEvmState(): PartialWithDiscriminant<EvmWalletProps, "isConnected"> {
  return {
    key: undefined,
    displayName: undefined,
    isConnected: false,
    isConnecting: false,
    isConnectingTo: undefined,
    balanceSmallestUnit: undefined,
    balance: undefined,
    handler: undefined,
    provider: undefined,
    signer: undefined,
    account: undefined,
  };
}

export type ConnectEvmWalletCallbacks = {
  onSuccess(wallet: ConnectedEvmWalletState): void;
  onError(error: unknown): void;
};

export type EvmWalletApi = {
  connect(key: EvmExtensionKey, config?: Partial<WalletConfig & ConnectEvmWalletCallbacks>): void;
  connectAsync: (
    key: EvmExtensionKey,
    config?: Partial<WalletConfig>,
  ) => Promise<ConnectedEvmWalletState>;
  disconnect(): void;
} & StoreLifeCycleMethods;

export type EvmWalletState = PartialWithDiscriminant<EvmWalletProps, "isConnected"> & EvmWalletApi;

export type ExtendedEvmWalletState = EvmWalletState & {
  __persist(isConnectingTo?: string): void;
};

export type EvmWalletStore = Store<EvmWalletState>;

type StoreOptions = {
  chainId: EvmChainId;
  extensions: EvmExtensionsStore;
  config: ConfigStore;
  storageKey: StorageKeysType;
};

export const createEvmWalletStore = (storeOptions: StoreOptions) =>
  createStoreFactory<EvmWalletState>((setState, getState) => {
    const lifecycle = new LifeCycleManager();

    const handleUpdateError = (error: unknown) => {
      storeOptions.config.getState().onUpdateError?.("wallet", error);
      storeOptions.config.getState().wallet.onUpdateError?.(error);
    };

    const disconnect: EvmWalletApi["disconnect"] = () => {
      lifecycle.subscriptions.clearAll();
      setState(newInitialEvmState());
      if (storeOptions.config.getState().enablePersistence) {
        storeOptions.config.getState().storage.remove(storeOptions.storageKey);
      }
    };

    const connectAsync: EvmWalletApi["connectAsync"] = async (key, configOverrides) => {
      const signal = lifecycle.inFlight.add();

      try {
        lifecycle.subscriptions.clearAll();

        setState({ isConnectingTo: key, isConnecting: true });

        let abortTimeout: NodeJS.Timeout | undefined = undefined;

        const connectTimeout =
          configOverrides?.connectTimeout ?? storeOptions.config.getState().wallet?.connectTimeout;

        if (connectTimeout) {
          abortTimeout = setTimeout(() => {
            signal.aborted = true;
            setState({ isConnectingTo: undefined, isConnecting: false });
          }, connectTimeout);
        }

        // Make sure the extensions are loaded
        storeOptions.extensions.getState().updateExtensions();
        const extension = storeOptions.extensions.getState().installedMap.get(key);

        if (!extension?.handler) {
          throw new WalletConnectionError(`The ${key} extension is not installed`);
        }

        if (signal.aborted) {
          throw new WalletConnectionAbortedError();
        }

        // Create a provider
        const provider = new ethers.BrowserProvider(extension?.handler, "any");

        await provider.send("eth_requestAccounts", []);

        // Request account & chain access
        await provider.send("wallet_switchEthereumChain", [
          {
            chainId: storeOptions.chainId,
          },
        ]);

        // Get the signer (which is the first account connected)
        const signer = await provider.getSigner();
        const account = await signer.getAddress();

        console.log("Connected account:", account);

        const updateState = async () => {
          const balanceSmallestUnit = await provider.getBalance(signer.address);

          const newState: Partial<ConnectedEvmWalletState> = {
            key: extension.key,
            displayName: extension.displayName,
            isConnected: true,
            isConnecting: false,
            isConnectingTo: undefined,
            handler: extension.handler,
            balanceSmallestUnit: balanceSmallestUnit,
            balance: formatEther(balanceSmallestUnit),
            provider,
            signer,
            account,
          };

          setState(newState);
        };

        const safeUpdateState = async () => {
          try {
            return await updateState();
          } catch (error) {
            handleUpdateError(error);
            disconnect();
          }
        };

        await updateState();

        const newState = getState();
        if (!newState.isConnected) {
          throw new Error("Connection failed");
        }

        if (signal.aborted) {
          throw new WalletConnectionAbortedError();
        }

        setupAutoUpdate(safeUpdateState, lifecycle, "wallet", configOverrides);

        if (storeOptions.config.getState().enablePersistence) {
          storeOptions.config.getState().storage.set(storeOptions.storageKey, newState.key);
        }

        if (abortTimeout) {
          clearTimeout(abortTimeout);
        }

        return newState as ConnectedEvmWalletState;
      } catch (error) {
        if (error instanceof WalletDisconnectAccountError) {
          disconnect();
        }
        throw error;
      } finally {
        lifecycle.inFlight.remove(signal);
      }
    };

    const connect: EvmWalletApi["connect"] = async (
      key,
      { onSuccess, onError, ...config } = {},
    ) => {
      connectAsync(key, config)
        .then((wallet) => {
          onSuccess?.(wallet);
        })
        .catch((error) => {
          onError?.(error);
        });
    };

    const init: EvmWalletApi["init"] = () => {
      if (initialState.isConnectingTo) {
        connect(initialState.isConnectingTo);
      }
    };

    const __persist: ExtendedEvmWalletState["__persist"] = (serverIsConnectingTo?: string) => {
      let isConnectingTo = serverIsConnectingTo;
      if (
        !isConnectingTo &&
        typeof window !== "undefined" &&
        storeOptions.config.getState().enablePersistence
      ) {
        isConnectingTo = storeOptions.config.getState().getPersistedValue("connectedWallet");
      }
      initialState.isConnectingTo = isConnectingTo as EvmExtensionKey;
      initialState.isConnecting = !!isConnectingTo;
    };

    const cleanup: EvmWalletApi["cleanup"] = () => {
      lifecycle.cleanup();
    };

    const initialState: ExtendedEvmWalletState = {
      ...newInitialEvmState(),
      connect,
      connectAsync,
      disconnect,
      init,
      cleanup,
      __persist,
    };

    return initialState as EvmWalletState;
  });
