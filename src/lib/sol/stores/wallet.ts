import { type InFlightSignal, LifeCycleManager } from "@/internal/lifecycle";
import { type Store, type StoreSetupFunctions, createStoreFactory } from "@/internal/store";
import type { PartialWithDiscriminant } from "@/internal/utils/types";
import {
  type DefaultWalletStoreProps,
  WalletStoreManager,
  type WalletStorePersistData,
} from "@/internal/wallet-store";
import { WalletConnectionAbortedError, WalletConnectionError } from "@/lib/main";
import type { WalletConfig } from "@/lib/main/stores/config";
import {
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  getAssociatedTokenAddress,
} from "@solana/spl-token";
import {
  Connection,
  PublicKey,
  type SendOptions,
  SystemProgram,
  Transaction,
  type TransactionInstruction,
} from "@solana/web3.js";
import { weldSol } from ".";
import {
  type SolApi,
  type SolExtensionInfo,
  type SolExtensionKey,
  type SolTokenAddress,
  type SolUnit,
  defaultSolConnectionEndpoint,
  isSolUnit,
} from "../types";
import { lamportToSol, solToLamport } from "../utils";

export type SolWalletProps = DefaultWalletStoreProps &
  SolExtensionInfo & {
    isConnected: boolean;
    isConnecting: boolean;
    isConnectingTo: SolExtensionKey | undefined;
    balanceLamports: bigint;
    balanceSol: bigint;
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
    balanceLamports: undefined,
    balanceSol: undefined,
    api: undefined,
    connection: undefined,
    address: undefined,
  };
}

export type ConnectSolWalletCallbacks = {
  onSuccess(wallet: ConnectedSolWalletState): void;
  onError(error: unknown): void;
};

export type SolSendOpts = {
  to: string;
  amount: number | bigint | string;
  unit?: SolUnit | SolTokenAddress;
};

export type SolWalletApi = {
  connect(key: SolExtensionKey, config?: Partial<WalletConfig & ConnectSolWalletCallbacks>): void;
  connectAsync: (
    key: SolExtensionKey,
    config?: Partial<WalletConfig>,
  ) => Promise<ConnectedSolWalletState>;
  disconnect(): void;
  send(opts: SolSendOpts): Promise<{ transaction: Transaction; signature: string }>;
  getTokenBalance(tokenAddress: string, opts?: { unit?: SolUnit }): Promise<bigint>;
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

export type SolWalletStore = Store<SolWalletStoreState, WalletStorePersistData> &
  SolWalletStoreState;

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

        const endpoint = config.getState().connectionEndpoint ?? defaultSolConnectionEndpoint;
        const connection = new Connection(endpoint);

        const updateState = async () => {
          const balanceSmallestUnit = BigInt(await connection.getBalance(publicKey));

          const newState: Partial<ConnectedSolWalletState> = {
            key: extension.info.key,
            displayName: extension.info.displayName,
            path: extension.info.path,
            isConnected: true,
            isConnecting: false,
            isConnectingTo: undefined,
            api: extension.api,
            balanceLamports: balanceSmallestUnit,
            balanceSol: lamportToSol(balanceSmallestUnit),
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
      "connectedSolWallet",
      config,
      lifecycle,
    ).on("beforeDisconnect", () => {
      getState().api?.disconnect();
    });

    const connectAsync = (async (key, configOverrides, signal?: InFlightSignal) => {
      await walletManager.disconnect();
      return walletManager.connect(key, { configOverrides, signal });
    }) satisfies SolWalletApi["connectAsync"];

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

    const getTokenBalance = async (
      tokenAddress: string,
      { unit = "lamport" }: { unit?: SolUnit } = {},
    ): Promise<bigint> => {
      const { connection, address } = getState();

      if (!connection) throw new Error("Connection not initialized");
      if (!address) throw new Error("Address not initialized");

      const { account } = await getTokenAccount(tokenAddress);
      if (!account) {
        return 0n;
      }

      const balanceLamports = account.data.parsed.info.tokenAmount.amount;

      if (unit === "lamport") {
        return BigInt(balanceLamports);
      }

      return lamportToSol(balanceLamports);
    };

    const prepareTransaction = async (transaction: Transaction, opts: SendOptions = {}) => {
      const { connection, address } = getState();

      if (!connection) throw new Error("Connection not initialized");

      transaction.feePayer = transaction.feePayer || address;

      if (!transaction.recentBlockhash) {
        const { blockhash } = await connection.getLatestBlockhash({
          commitment: opts.preflightCommitment,
          minContextSlot: opts.minContextSlot,
        });

        transaction.recentBlockhash = blockhash;
      }

      return transaction;
    };

    const sendLamports = async (to: string, lamports: bigint) => {
      const { address, api, balanceLamports = 0n } = getState();
      if (!address || !api) {
        throw new Error("Not connected");
      }
      if (lamports > (balanceLamports ?? 0n)) {
        throw new Error("Insufficient funds");
      }

      const instruction = SystemProgram.transfer({
        fromPubkey: address,
        toPubkey: new PublicKey(to),
        lamports,
      });
      const transaction = await prepareTransaction(new Transaction().add(instruction));
      const { signature } = await api.signAndSendTransaction(transaction);

      return { transaction, signature };
    };

    const sendTokens = async (to: string, tokenAddress: string, amount: bigint) => {
      const { connection, api, address } = getState();
      if (!connection || !api || !address) {
        throw new Error("Not connected");
      }

      const tokenAccount = await getTokenAccount(tokenAddress);

      if (!tokenAccount.account || !tokenAccount.publicKey) {
        throw new Error("Token not found");
      }

      const balance = Number(tokenAccount.account.data.parsed.info.tokenAmount.uiAmount);

      if (amount > balance) {
        throw new Error("Insufficient balance");
      }

      const mintToken = new PublicKey(tokenAccount.account.data.parsed.info.mint);
      const decimals = tokenAccount.account.data.parsed.info.tokenAmount.decimals ?? 0;
      const recipientAddress = new PublicKey(to);

      const transactionInstructions: TransactionInstruction[] = [];

      const associatedTokenTo = await getAssociatedTokenAddress(mintToken, recipientAddress);
      const info = await connection.getAccountInfo(associatedTokenTo);
      if (!info) {
        transactionInstructions.push(
          createAssociatedTokenAccountInstruction(
            address,
            associatedTokenTo,
            recipientAddress,
            mintToken,
          ),
        );
      }

      const factor = BigInt(10 ** decimals);
      const realAmount = amount * factor;

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

      return { transaction, signature };
    };

    const send = async (opts: SolSendOpts) => {
      const amount = BigInt(opts.amount);
      const unit = opts.unit ?? "lamports";

      if (isSolUnit(unit)) {
        const amountLamports = unit === "lamport" ? amount : solToLamport(amount);
        return sendLamports(opts.to, amountLamports);
      }

      return sendTokens(opts.to, unit, amount);
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

    const initialState: SolWalletStoreState &
      StoreSetupFunctions & { __mngr: typeof walletManager } = {
      ...newSolWalletState(),
      connect,
      connectAsync,
      disconnect,
      getTokenBalance,
      send,
      __init,
      __cleanup,
      __persist,
      __mngr: walletManager,
    };

    return initialState as SolWalletStoreState;
  },
);
