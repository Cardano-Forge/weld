import { type InFlightSignal, LifeCycleManager } from "@/internal/lifecycle";
import { type Store, type StoreSetupFunctions, createStoreFactory } from "@/internal/store";

import {
  type EvmApi,
  type EvmExtensionInfo,
  type EvmExtensionKey,
  evmChainIds,
} from "@/internal/evm/types";
import type { PartialWithDiscriminant } from "@/internal/utils/types";
import {
  type DefaultWalletStoreProps,
  WalletStoreManager,
  type WalletStorePersistData,
} from "@/internal/wallet-store";
import type { EvmExtensionsStore } from "@/lib/eth";
import { WalletConnectionAbortedError, WalletConnectionError } from "@/lib/main";
import type { ConfigStore, WalletConfig } from "@/lib/main/stores/config";
import type { STORAGE_KEYS } from "@/lib/server";
import {
  type AddressLike,
  type BigNumberish,
  BrowserProvider,
  type JsonRpcSigner,
  type TransactionResponse,
  ethers,
  formatEther,
  parseEther,
  parseUnits,
} from "ethers";
import abi from "./index";

export type EvmWalletProps = DefaultWalletStoreProps &
  EvmExtensionInfo & {
    isConnected: boolean;
    isConnecting: boolean;
    isConnectingTo: EvmExtensionKey | undefined;
    balanceSmallestUnit: bigint;
    balance: string;
    api: EvmApi;
    provider: BrowserProvider;
    signer: JsonRpcSigner;
    address: AddressLike;
  };

function newEvmWalletState(): PartialWithDiscriminant<EvmWalletProps, "isConnected"> {
  return {
    key: undefined,
    displayName: undefined,
    path: undefined,
    isConnected: false,
    isConnecting: false,
    isConnectingTo: undefined,
    balanceSmallestUnit: undefined,
    balance: undefined,
    api: undefined,
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
  disconnect(): Promise<void>;
  send({
    to,
    amount,
    tokenAddress,
  }: { to: string; amount: string; tokenAddress?: string }): Promise<string>;
  getTokenBalance(tokenAddress: string, options?: { formatted: boolean }): Promise<string>;
};

export type EvmWalletState<TKeys extends keyof EvmWalletProps = keyof EvmWalletProps> =
  PartialWithDiscriminant<EvmWalletProps, "isConnected", TKeys>;

export type ConnectedEvmWalletState = Extract<EvmWalletState, { isConnected: true }>;
export type DiconnectedEvmWalletState = Extract<EvmWalletState, { isConnected: false }>;

export type EvmWalletStoreState<
  TKeys extends keyof EvmWalletProps | keyof EvmWalletApi =
    | keyof EvmWalletProps
    | keyof EvmWalletApi,
> = EvmWalletState<Extract<TKeys, keyof EvmWalletProps>> & {
  [TKey in Extract<TKeys, keyof EvmWalletApi>]: EvmWalletApi[TKey];
};

export type EvmWalletStore = Store<EvmWalletStoreState, WalletStorePersistData>;

export type EvmWalletStoreOptions = {
  chain: keyof typeof evmChainIds;
  extensions: EvmExtensionsStore;
  config: ConfigStore;
  storageKey: keyof typeof STORAGE_KEYS;
};

export const createEvmWalletStore = createStoreFactory<
  EvmWalletStoreState,
  WalletStorePersistData,
  [EvmWalletStoreOptions] | [EvmWalletStoreOptions, { lifecycle?: LifeCycleManager }]
>((setState, getState, storeOptions, { lifecycle = new LifeCycleManager() } = {}) => {
  const chainId = evmChainIds[storeOptions.chain];
  const walletManager = new WalletStoreManager<EvmWalletState>(
    setState,
    getState,
    newEvmWalletState,
    async (key, opts) => {
      // Make sure the extensions are loaded
      storeOptions.extensions.getState().updateExtensions();

      const extension = storeOptions.extensions.getState().installedMap.get(key);
      if (!extension) {
        throw new WalletConnectionError(`The ${key} extension is not installed`);
      }

      if (opts.signal.aborted) {
        throw new WalletConnectionAbortedError();
      }

      // Create a provider
      const provider = new BrowserProvider(extension.api, "any");

      await provider.send("eth_requestAccounts", []);

      // Request account & chain access
      await provider.send("wallet_switchEthereumChain", [{ chainId }]);

      const updateState = async () => {
        // Get the signer (which is the first account connected)
        const signer = await provider.getSigner();
        const address = await signer.getAddress();
        const balanceSmallestUnit = await provider.getBalance(address);

        const newState: Partial<ConnectedEvmWalletState> = {
          ...extension.info,
          isConnected: true,
          isConnecting: false,
          isConnectingTo: undefined,
          api: extension.api,
          balanceSmallestUnit,
          balance: formatEther(balanceSmallestUnit),
          provider,
          signer,
          address,
        };

        setState(newState);
      };

      return {
        updateState,
      };
    },
    storeOptions.storageKey,
    storeOptions.config,
    lifecycle,
  );

  const connectAsync = (async (
    key,
    configOverrides,
    /* For testing purposes */
    signal?: InFlightSignal,
  ) => {
    await walletManager.disconnect();
    return walletManager.connect(key, { configOverrides, signal });
  }) satisfies EvmWalletApi["connectAsync"];

  const connect: EvmWalletApi["connect"] = (
    key,
    { onSuccess, onError, ...config } = {},
    /* For testing purposes */
    signal?: InFlightSignal,
  ) => {
    connectAsync(key, config, signal)
      .then((wallet) => {
        onSuccess?.(wallet);
      })
      .catch((error) => {
        onError?.(error);
      });
  };

  const getTokenBalance = async (tokenAddress: string, options?: { formatted: boolean }) => {
    const { provider, signer } = getState();

    if (!signer) throw new Error("Signer not initialized");
    if (!provider) throw new Error("Provider not initialized");

    await provider.send("wallet_switchEthereumChain", [{ chainId }]);

    const contract = new ethers.Contract(tokenAddress, abi, signer);

    if (!contract.decimals || !contract.balanceOf) {
      throw new Error("Ethers contract implemantation not found");
    }

    const unformattedBalance: number = await contract.balanceOf(signer.address);
    if (!options?.formatted) {
      return String(unformattedBalance);
    }

    const decimals = await contract.decimals();
    return ethers.formatUnits(unformattedBalance, decimals);
  };

  const send = async ({
    to,
    amount,
    tokenAddress,
  }: { to: string; amount: string; tokenAddress?: string }) => {
    const { provider, signer } = getState();

    if (!signer) throw new Error("Signer not initialized");
    if (!provider) throw new Error("Provider not initialized");

    await provider.send("wallet_switchEthereumChain", [{ chainId }]);

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

    const balanceSmallestUnit = getState().balanceSmallestUnit;
    const value = parseEther(amount.toString()) as BigNumberish;
    if (!balanceSmallestUnit || balanceSmallestUnit < BigInt(value)) {
      throw new Error("Insufficient balance");
    }

    const tx = await signer.sendTransaction({ to, value });

    return tx.hash;
  };

  const disconnect = () => {
    return walletManager.disconnect();
  };

  const __init = () => {
    walletManager.init({ initialState });
  };

  const __persist = (data?: WalletStorePersistData) => {
    walletManager.persist({ initialState }, data);
  };

  const __cleanup = () => {
    walletManager.cleanup();
  };

  const initialState: EvmWalletStoreState & StoreSetupFunctions & { __mngr: typeof walletManager } =
    {
      ...newEvmWalletState(),
      connect,
      connectAsync,
      disconnect,
      send,
      getTokenBalance,
      __init,
      __cleanup,
      __persist,
      __mngr: walletManager,
    };

  return initialState as EvmWalletStoreState;
});
