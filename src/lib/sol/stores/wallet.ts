import { LifeCycleManager } from "@/internal/lifecycle";
import { type Store, type StoreSetupFunctions, createStoreFactory } from "@/internal/store";

import type { PartialWithDiscriminant } from "@/internal/utils/types";
import { WalletConnectionAbortedError, WalletConnectionError } from "@/lib/main";
import type { WalletConfig } from "@/lib/main/stores/config";
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
import type { SolApi, SolExtensionInfo, SolExtensionKey } from "../types";
import { lamportToSol } from "../utils";

import { Buffer } from "buffer";
import {
  type DefaultWalletStoreProps,
  WalletStoreManager,
  type WalletStorePersistData,
} from "@/internal/wallet-store";

export type SolWalletProps = DefaultWalletStoreProps &
  SolExtensionInfo & {
    isConnected: boolean;
    isConnecting: boolean;
    isConnectingTo: SolExtensionKey | undefined;
    balanceSmallestUnit: number;
    balance: number;
    api: SolApi;
    connection: Connection;
    address: PublicKey;
  };

function newSolWalletState(): PartialWithDiscriminant<SolWalletProps, "isConnected"> {
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

export type SolWalletStore = Store<SolWalletStoreState, WalletStorePersistData>;

export type CreateSolWalletStoreOpts = {
  lifecycle?: LifeCycleManager;
  extensions?: typeof weldSol.extensions;
  config?: typeof weldSol.config;
};

export const createSolWalletStore = createStoreFactory<
  SolWalletStoreState,
  WalletStorePersistData,
  [] | [CreateSolWalletStoreOpts]
>(
  (
    setState,
    getState,
    {
      lifecycle = new LifeCycleManager(),
      extensions = weldSol.extensions,
      config = weldSol.config,
    } = {},
  ) => {
    const walletManager = new WalletStoreManager<SolWalletState>(
      setState,
      getState,
      newSolWalletState,
      async (key, opts) => {
        // Make sure the extensions are loaded
        extensions.getState().updateExtensions();
        const extension = extensions.getState().installedMap.get(key);
        const api = extension?.api;

        await api?.connect();

        if (!extension || !api?.publicKey) {
          throw new WalletConnectionError(`The ${key} extension is not installed`);
        }

        if (opts.signal.aborted) {
          throw new WalletConnectionAbortedError();
        }

        const publicKey = new PublicKey(api.publicKey.toBytes());

        const endpoint =
          config.getState().connectionUrl ??
          "https://solana-mainnet.g.alchemy.com/v2/sReIBMwUbvwelgkh1R1ay33uNmAk4Qu-";
        const connection = new Connection(endpoint);

        const updateState = async () => {
          const balanceSmallestUnit = await connection.getBalance(publicKey);

          const newState: Partial<ConnectedSolWalletState> = {
            key: extension.info.key,
            displayName: extension.info.displayName,
            path: extension.info.path,
            isConnected: true,
            isConnecting: false,
            isConnectingTo: undefined,
            api: extension.api,
            balanceSmallestUnit,
            balance: lamportToSol(balanceSmallestUnit),
            connection,
            address: publicKey,
          };

          if (opts.signal.aborted) {
            return;
          }

          setState(newState);
        };

        return {
          updateState,
        };
      },
      "connectedWallet",
      config,
      lifecycle,
    ).on("beforeDisconnect", () => {
      getState().api?.disconnect();
    });

    const connectAsync: SolWalletApi["connectAsync"] = async (key, configOverrides) => {
      await walletManager.disconnect();
      return walletManager.connect(key, { configOverrides });
    };

    const connect: SolWalletApi["connect"] = async (
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
      const { connection, api, address } = getState();

      if (!connection) throw new Error("Connection not initialized");
      if (!api) throw new Error("Api not initialized");
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

          const { signature } = await api.signAndSendTransaction(preparedTransaction);

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

      const { signature } = await api.signAndSendTransaction(transaction);

      return signature;
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

    const initialState: SolWalletStoreState & StoreSetupFunctions = {
      ...newSolWalletState(),
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
  },
);
