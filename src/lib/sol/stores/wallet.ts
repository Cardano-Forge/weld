import { LifeCycleManager } from "@/internal/lifecycle";
import { type Store, type StoreSetupFunctions, createStoreFactory } from "@/internal/store";

import { setupAutoUpdate } from "@/internal/update";
import type { PartialWithDiscriminant } from "@/internal/utils/types";
import {
  WalletConnectionAbortedError,
  WalletConnectionError,
  WalletDisconnectAccountError,
} from "@/lib/main";
import type { WalletConfig } from "@/lib/main/stores/config";
import { STORAGE_KEYS } from "@/lib/server";
import {
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
  type SendOptions,
  SystemProgram,
  Transaction,
  type TransactionInstruction,
} from "@solana/web3.js";
import { weldSol } from ".";
import type { SolExtensionInfo, SolExtensionKey, SolHandler } from "../types";
import { lamportToSol } from "../utils";

import { Buffer } from "buffer";

export type SolWalletProps = SolExtensionInfo & {
  isConnected: boolean;
  isConnecting: boolean;
  isConnectingTo: SolExtensionKey | undefined;
  balanceSmallestUnit: number;
  balance: number;
  handler: SolHandler;
  connection: Connection;
  address: PublicKey;
};

function newInitialSolState(): PartialWithDiscriminant<SolWalletProps, "isConnected"> {
  return {
    key: undefined,
    displayName: undefined,
    isConnected: false,
    isConnecting: false,
    isConnectingTo: undefined,
    balanceSmallestUnit: undefined,
    balance: undefined,
    handler: undefined,
    connection: undefined,
    address: undefined,
  };
}

export type ConnectSolWalletCallbacks = {
  onSuccess(wallet: ConnectedSolWalletState): void;
  onError(error: unknown): void;
};

export type SolWalletApi = {
  connect(key: SolExtensionKey, config?: Partial<WalletConfig & ConnectSolWalletCallbacks>): void;
  connectAsync: (
    key: SolExtensionKey,
    config?: Partial<WalletConfig>,
  ) => Promise<ConnectedSolWalletState>;
  disconnect(): void;
  send({
    to,
    amount,
    tokenAddress,
  }: { to: string; amount: string; tokenAddress?: string }): Promise<string>;
  getTokenBalance(tokenAddress: string, options?: { formatted: boolean }): Promise<string>;
};

export type SolWalletState<TKeys extends keyof SolWalletProps = keyof SolWalletProps> =
  PartialWithDiscriminant<SolWalletProps, "isConnected", TKeys>;

export type ConnectedSolWalletState = Extract<SolWalletState, { isConnected: true }>;
export type DiconnectedSolWalletState = Extract<SolWalletState, { isConnected: false }>;

export type SolWalletStoreState<
  TKeys extends keyof SolWalletProps | keyof SolWalletApi =
    | keyof SolWalletProps
    | keyof SolWalletApi,
> = SolWalletState<Extract<TKeys, keyof SolWalletProps>> & {
  [TKey in Extract<TKeys, keyof SolWalletApi>]: SolWalletApi[TKey];
};

export type SolWalletStorePersistData = {
  tryToReconnectTo?: string;
};

export type SolWalletStore = Store<SolWalletState, SolWalletStorePersistData>;

export type ExtendedSolWalletStoreState = SolWalletStoreState & StoreSetupFunctions;

export const createSolWalletStore = createStoreFactory<
  SolWalletStoreState,
  SolWalletStorePersistData
>((setState, getState) => {
  const lifecycle = new LifeCycleManager();

  const handleUpdateError = (error: unknown) => {
    weldSol.config.getState().onUpdateError?.("wallet", error);
    weldSol.config.getState().wallet.onUpdateError?.(error);
  };

  const disconnect: SolWalletApi["disconnect"] = () => {
    lifecycle.subscriptions.clearAll();
    lifecycle.inFlight.abortAll();
    getState().handler?.disconnect();
    setState(newInitialSolState());
    if (weldSol.config.getState().enablePersistence) {
      weldSol.config.getState().storage.remove(STORAGE_KEYS.connectedSolWallet);
    }
  };

  const connectAsync: SolWalletApi["connectAsync"] = async (key, configOverrides) => {
    disconnect();

    const signal = lifecycle.inFlight.add();

    try {
      lifecycle.subscriptions.clearAll();

      setState({ isConnectingTo: key, isConnecting: true });

      let abortTimeout: NodeJS.Timeout | undefined = undefined;

      const connectTimeout =
        configOverrides?.connectTimeout ?? weldSol.config.getState().wallet?.connectTimeout;

      if (connectTimeout) {
        abortTimeout = setTimeout(() => {
          signal.aborted = true;
          setState({ isConnectingTo: undefined, isConnecting: false });
        }, connectTimeout);
      }

      // Make sure the extensions are loaded
      weldSol.extensions.getState().updateExtensions();
      const extension = weldSol.extensions.getState().installedMap.get(key);
      const handler = extension?.handler;

      await handler?.connect();

      if (!extension || !handler?.publicKey) {
        throw new WalletConnectionError(`The ${key} extension is not installed`);
      }

      if (signal.aborted) {
        throw new WalletConnectionAbortedError();
      }

      const publicKey = new PublicKey(handler.publicKey.toBytes());

      const connection = new Connection(
        "https://solana-mainnet.g.alchemy.com/v2/sReIBMwUbvwelgkh1R1ay33uNmAk4Qu-",
      ); // todo use config url

      const updateState = async () => {
        const balanceSmallestUnit = await connection.getBalance(publicKey);

        const newState: Partial<ConnectedSolWalletState> = {
          key: extension.key,
          displayName: extension.displayName,
          isConnected: true,
          isConnecting: false,
          isConnectingTo: undefined,
          handler: extension.handler,
          balanceSmallestUnit,
          balance: lamportToSol(balanceSmallestUnit),
          connection,
          address: publicKey,
        };

        if (signal.aborted) {
          return;
        }

        setState(newState);
      };

      const safeUpdateState = async (stopUpdates?: () => void) => {
        if (signal.aborted) {
          stopUpdates?.();
          return;
        }
        if (weldSol.config.getState().debug) {
          console.log("[WELD] Wallet state update", key);
        }
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

      if (weldSol.config.getState().enablePersistence) {
        weldSol.config.getState().storage.set(STORAGE_KEYS.connectedSolWallet, newState.key);
      }

      if (abortTimeout) {
        clearTimeout(abortTimeout);
      }

      return newState;
    } catch (error) {
      if (error instanceof WalletDisconnectAccountError) {
        disconnect();
      }
      throw error;
    } finally {
      lifecycle.inFlight.remove(signal);
    }
  };

  const connect: SolWalletApi["connect"] = async (key, { onSuccess, onError, ...config } = {}) => {
    connectAsync(key, config)
      .then((wallet) => {
        onSuccess?.(wallet);
      })
      .catch((error) => {
        onError?.(error);
      });
  };

  const __init = () => {
    if (initialState.isConnectingTo) {
      connect(initialState.isConnectingTo);
    }
  };

  const getTokenAccount = async (tokenAddress: string) => {
    const { connection, address } = getState();

    if (!connection) throw new Error("Connection not initialized");
    if (!address) throw new Error("Address not initialized");

    const accounts = await connection.getParsedTokenAccountsByOwner(address, {
      mint: new PublicKey(tokenAddress),
    });

    return {
      account: accounts.value[0]?.account,
      publicKey: accounts.value[0]?.pubkey.toBase58(),
    };
  };

  const getTokenBalance = async (tokenAddress: string, options?: { formatted: boolean }) => {
    const { connection, address } = getState();

    if (!connection) throw new Error("Connection not initialized");
    if (!address) throw new Error("Address not initialized");

    if (tokenAddress) {
      const { account } = await getTokenAccount(tokenAddress);

      if (!account) return 0;

      if (options?.formatted) return Number(account.data.parsed.info.tokenAmount.uiAmount);

      return account.data.parsed.info.tokenAmount.amount;
    }

    const balance = await connection.getBalance(address);

    if (options?.formatted) return balance / LAMPORTS_PER_SOL;
    return balance;
  };

  const prepareTransaction = async (transaction: Transaction, options: SendOptions = {}) => {
    const { connection, address } = getState();

    if (!connection) throw new Error("Connection not initialized");

    transaction.feePayer = transaction.feePayer || address;

    if (!transaction.recentBlockhash) {
      const { blockhash } = await connection.getLatestBlockhash({
        commitment: options.preflightCommitment,
        minContextSlot: options.minContextSlot,
      });

      transaction.recentBlockhash = blockhash;
    }

    return transaction;
  };

  const send = async ({
    to,
    amount,
    tokenAddress,
  }: { to: string; amount: string; tokenAddress?: string }) => {
    const { connection, handler, address } = getState();

    if (!connection) throw new Error("Connection not initialized");
    if (!handler) throw new Error("Handler not initialized");
    if (!address) throw new Error("Address not initialized");

    if (tokenAddress) {
      const oldBuffer = window.Buffer;
      try {
        window.Buffer = Buffer;

        const {
          getAssociatedTokenAddress,
          createAssociatedTokenAccountInstruction,
          createTransferInstruction,
        } = await import("@solana/spl-token");

        const tokenAccount = await getTokenAccount(tokenAddress);

        if (!tokenAccount.account || !tokenAccount.publicKey) {
          throw new Error("Token not found");
        }

        const balance = Number(tokenAccount.account.data.parsed.info.tokenAmount.uiAmount);

        if (Number(amount) > balance) {
          throw new Error("Insufficient balance");
        }

        const mintToken = new PublicKey(tokenAccount.account.data.parsed.info.mint);
        const decimals = tokenAccount.account.data.parsed.info.tokenAmount.decimals ?? 0;
        const recipientAddress = new PublicKey(to);

        const transactionInstructions: TransactionInstruction[] = [];

        const associatedTokenTo = await getAssociatedTokenAddress(mintToken, recipientAddress);

        if (!(await connection.getAccountInfo(associatedTokenTo))) {
          transactionInstructions.push(
            createAssociatedTokenAccountInstruction(
              address,
              associatedTokenTo,
              recipientAddress,
              mintToken,
            ),
          );
        }

        const multi = 10 ** decimals;
        const realAmount = Number(amount) * multi;

        transactionInstructions.push(
          createTransferInstruction(
            new PublicKey(tokenAccount.publicKey),
            associatedTokenTo,
            address,
            realAmount,
          ),
        );

        const transaction = new Transaction().add(...transactionInstructions);

        const preparedTransaction = await prepareTransaction(transaction);

        const { signature } = await handler.signAndSendTransaction(preparedTransaction);

        return signature;
      } finally {
        window.Buffer = oldBuffer;
      }
    }
    const balance = getState().balance ?? 0;

    if (Number(amount) > balance) {
      throw new Error("Insufficient balance");
    }

    let transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: address,
        toPubkey: new PublicKey(to),
        lamports: Number(amount) * LAMPORTS_PER_SOL,
      }),
    );

    transaction = await prepareTransaction(transaction as Transaction);

    const { signature } = await handler.signAndSendTransaction(transaction);

    return signature;
  };

  const __persist = (data?: SolWalletStorePersistData) => {
    let isConnectingTo = data?.tryToReconnectTo;
    if (
      !isConnectingTo &&
      typeof window !== "undefined" &&
      weldSol.config.getState().enablePersistence
    ) {
      isConnectingTo = weldSol.config.getState().getPersistedValue("weld_connected-sol-wallet");
    }
    initialState.isConnectingTo = isConnectingTo as SolExtensionKey;
    initialState.isConnecting = !!isConnectingTo;
  };

  const __cleanup = () => {
    lifecycle.cleanup();
  };

  const initialState: ExtendedSolWalletStoreState = {
    ...newInitialSolState(),
    connect,
    connectAsync,
    disconnect,
    getTokenBalance,
    send,
    __init,
    __cleanup,
    __persist,
  };

  return initialState as SolWalletStoreState;
});
