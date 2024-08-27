import { LifeCycleManager } from "@/internal/lifecycle";
import { type Store, type StoreLifeCycleMethods, createStoreFactory } from "@/internal/store";

import { setupAutoUpdate } from "@/internal/update";
import type { PartialWithDiscriminant } from "@/internal/utils/types";
import {
  WalletConnectionAbortedError,
  WalletConnectionError,
  WalletDisconnectAccountError,
} from "@/lib/main";
import type { WalletConfig } from "@/lib/main/stores/config";
import { STORAGE_KEYS } from "@/lib/server";
import { weldEth } from ".";
import type { EthExtensionKey } from "../types";
import { ethers, formatEther } from "ethers";
import type { AddressLike, BrowserProvider, JsonRpcSigner } from "ethers";
import type { EvmHandler, EvmExtensionInfo } from "@/internal/evm/types";

export const ethChainId = "0x1"; // todo centralize chainId

export type EthWalletProps = EvmExtensionInfo & {
  isConnected: boolean;
  isConnecting: boolean;
  isConnectingTo: EthExtensionKey | undefined;
  balanceWei: bigint;
  balanceEth: string;
  handler: EvmHandler;
  provider: BrowserProvider;
  signer: JsonRpcSigner;
  account: AddressLike;
};

export type ConnectedEthWalletState = Extract<EthWalletState, { isConnected: true }>;
export type DiconnectedEthWalletState = Extract<EthWalletState, { isConnected: false }>;

function newInitialEthState(): PartialWithDiscriminant<EthWalletProps, "isConnected"> {
  return {
    key: undefined,
    displayName: undefined,
    isConnected: false,
    isConnecting: false,
    isConnectingTo: undefined,
    balanceWei: undefined,
    balanceEth: undefined,
    handler: undefined,
    provider: undefined,
    signer: undefined,
    account: undefined,
  };
}

export type ConnectEthWalletCallbacks = {
  onSuccess(wallet: ConnectedEthWalletState): void;
  onError(error: unknown): void;
};

export type EthWalletApi = {
  connect(key: EthExtensionKey, config?: Partial<WalletConfig & ConnectEthWalletCallbacks>): void;
  connectAsync: (
    key: EthExtensionKey,
    config?: Partial<WalletConfig>,
  ) => Promise<ConnectedEthWalletState>;
  disconnect(): void;
} & StoreLifeCycleMethods;

export type EthWalletState = PartialWithDiscriminant<EthWalletProps, "isConnected"> & EthWalletApi;

export type ExtendedEthWalletState = EthWalletState & {
  __persist(isConnectingTo?: string): void;
};

export type EthWalletStore = Store<EthWalletState>;

export const createEthWalletStore = createStoreFactory<EthWalletState>((setState, getState) => {
  const lifecycle = new LifeCycleManager();

  const handleUpdateError = (error: unknown) => {
    weldEth.config.getState().onUpdateError?.("wallet", error);
    weldEth.config.getState().wallet.onUpdateError?.(error);
  };

  const disconnect: EthWalletApi["disconnect"] = () => {
    lifecycle.subscriptions.clearAll();
    setState(newInitialEthState());
    if (weldEth.config.getState().enablePersistence) {
      weldEth.config.getState().storage.remove(STORAGE_KEYS.connectedEthWallet);
    }
  };

  const connectAsync: EthWalletApi["connectAsync"] = async (key, configOverrides) => {
    const signal = lifecycle.inFlight.add();

    try {
      lifecycle.subscriptions.clearAll();

      setState({ isConnectingTo: key, isConnecting: true });

      let abortTimeout: NodeJS.Timeout | undefined = undefined;

      const connectTimeout =
        configOverrides?.connectTimeout ?? weldEth.config.getState().wallet?.connectTimeout;

      if (connectTimeout) {
        abortTimeout = setTimeout(() => {
          signal.aborted = true;
          setState({ isConnectingTo: undefined, isConnecting: false });
        }, connectTimeout);
      }

      // Make sure the extensions are loaded
      weldEth.extensions.getState().updateExtensions();
      const extension = weldEth.extensions.getState().installedMap.get(key);

      if (!extension?.handler) {
        throw new WalletConnectionError(`The ${key} extension is not installed`);
      }

      if (signal.aborted) {
        throw new WalletConnectionAbortedError();
      }

      // Create a provider
      const provider = new ethers.BrowserProvider(extension?.handler, "any");

      // Request account & chain access
      await provider.send("wallet_switchEthereumChain", [
        {
          chainId: ethChainId,
        },
      ]);

      // Get the signer (which is the first account connected)
      const signer = await provider.getSigner();
      const account = await signer.getAddress();

      console.log("Connected account:", account);

      const updateState = async () => {
        const balanceWei = await provider.getBalance(signer.address);

        const newState: Partial<ConnectedEthWalletState> = {
          key: extension.key,
          displayName: extension.displayName,
          isConnected: true,
          isConnecting: false,
          isConnectingTo: undefined,
          handler: extension.handler,
          balanceWei: balanceWei,
          balanceEth: formatEther(balanceWei),
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

      if (weldEth.config.getState().enablePersistence) {
        weldEth.config.getState().storage.set(STORAGE_KEYS.connectedEthWallet, newState.key);
      }

      if (abortTimeout) {
        clearTimeout(abortTimeout);
      }

      return newState as ConnectedEthWalletState;
    } catch (error) {
      if (error instanceof WalletDisconnectAccountError) {
        disconnect();
      }
      throw error;
    } finally {
      lifecycle.inFlight.remove(signal);
    }
  };

  const connect: EthWalletApi["connect"] = async (key, { onSuccess, onError, ...config } = {}) => {
    connectAsync(key, config)
      .then((wallet) => {
        onSuccess?.(wallet);
      })
      .catch((error) => {
        onError?.(error);
      });
  };

  const init: EthWalletApi["init"] = () => {
    if (initialState.isConnectingTo) {
      connect(initialState.isConnectingTo);
    }
  };

  const __persist: ExtendedEthWalletState["__persist"] = (serverIsConnectingTo?: string) => {
    let isConnectingTo = serverIsConnectingTo;
    if (
      !isConnectingTo &&
      typeof window !== "undefined" &&
      weldEth.config.getState().enablePersistence
    ) {
      isConnectingTo = weldEth.config.getState().getPersistedValue("connectedWallet");
    }
    initialState.isConnectingTo = isConnectingTo as EthExtensionKey;
    initialState.isConnecting = !!isConnectingTo;
  };

  const cleanup: EthWalletApi["cleanup"] = () => {
    lifecycle.cleanup();
  };

  const initialState: ExtendedEthWalletState = {
    ...newInitialEthState(),
    connect,
    connectAsync,
    disconnect,
    init,
    cleanup,
    __persist,
  };

  return initialState as EthWalletState;
});
