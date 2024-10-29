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
import { ethers, formatEther, parseEther, parseUnits } from "ethers";
import type { AddressLike, BrowserProvider, JsonRpcSigner } from "ethers";
import type { BigNumberish } from "ethers";
import type { TransactionResponse } from "ethers";
import abi from "./index";

export type EvmWalletProps = EvmExtensionInfo & {
  isConnected: boolean;
  isConnecting: boolean;
  isConnectingTo: EvmExtensionKey | undefined;
  balanceSmallestUnit: bigint;
  balance: string;
  handler: EvmHandler;
  provider: BrowserProvider;
  signer: JsonRpcSigner;
  address: AddressLike;
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
    address: undefined,
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
  send({
    to,
    amount,
    tokenAddress,
  }: { to: string; amount: string; tokenAddress?: string }): Promise<string>;
  getTokenBalance(tokenAddress: string, options?: { formatted: boolean }): Promise<string>;
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

        const updateState = async () => {
          // Get the signer (which is the first account connected)
          const signer = await provider.getSigner();
          const account = await signer.getAddress();

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
            address: account,
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

    const getTokenBalance = async (tokenAddress: string, options?: { formatted: boolean }) => {
      const { provider, signer } = getState();

      if (!signer) throw new Error("Signer not initialized");
      if (!provider) throw new Error("Provider not initialized");

      await provider.send("wallet_switchEthereumChain", [
        {
          chainId: storeOptions.chainId,
        },
      ]);

      const contract = new ethers.Contract(tokenAddress, abi, signer);

      if (!contract.decimals || !contract.balanceOf)
        throw new Error("Ethers contract implemantation not found");

      const decimals = await contract.decimals();
      const unformattedBalance: number = await contract.balanceOf(signer.address);

      if (options?.formatted) return ethers.formatUnits(unformattedBalance, decimals);
      return String(unformattedBalance);
    };

    const send = async ({
      to,
      amount,
      tokenAddress,
    }: { to: string; amount: string; tokenAddress?: string }) => {
      const { provider, signer } = getState();

      if (!signer) throw new Error("Signer not initialized");
      if (!provider) throw new Error("Provider not initialized");

      await provider.send("wallet_switchEthereumChain", [
        {
          chainId: storeOptions.chainId,
        },
      ]);

      // if the user is trying to send tokens
      if (tokenAddress) {
        const balance = await getTokenBalance(tokenAddress, { formatted: true });
        const contract = new ethers.Contract(tokenAddress, abi, signer);

        if (!contract.decimals || !contract.transfer)
          throw new Error("Evmers contract implemantation not found");

        const decimals = await contract.decimals();
        if (Number(balance) < Number(amount)) {
          throw new Error("Insufficient balance");
        }

        const numberOfTokens = parseUnits(amount, decimals);
        const tx: TransactionResponse = await contract.transfer(to, numberOfTokens);

        return tx.hash;
      }

      // otherwise, it is a simple transfer
      const balanceSmallestUnit = await getState().balanceSmallestUnit;
      const value = parseEther(amount.toString()) as BigNumberish;

      if (Number(balanceSmallestUnit) < Number(value)) {
        throw new Error("Insufficient balance");
      }

      const tx = await signer.sendTransaction({ to, value });

      return tx.hash;
    };

    const __persist: ExtendedEvmWalletState["__persist"] = (serverIsConnectingTo?: string) => {
      let isConnectingTo = serverIsConnectingTo;
      if (
        !isConnectingTo &&
        typeof window !== "undefined" &&
        storeOptions.config.getState().enablePersistence
      ) {
        isConnectingTo = storeOptions.config.getState().getPersistedValue(storeOptions.storageKey);
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
      send,
      getTokenBalance,
      init,
      cleanup,
      __persist,
    };

    return initialState as EvmWalletState;
  });
