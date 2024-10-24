import type {
  SendOptions,
  Transaction,
  TransactionSignature,
  VersionedTransaction,
} from "@solana/web3.js";

export type SolApi = {
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

export function isSolApi(obj: unknown): obj is SolApi {
  return (
    typeof obj === "object" && obj !== null && "connect" in obj && typeof obj.connect === "function"
  );
}

export type SolExtensionInfo = {
  key: string;
  displayName: string;
  path: string;
};

export type SolExtension = {
  info: SolExtensionInfo;
  api?: SolApi;
};

export const SOL_EXTENSIONS = [
  {
    key: "phantom",
    displayName: "Phantom",
    path: "phantom.solana",
  },
  {
    key: "nufi",
    displayName: "NuFi",
    path: "nufiSolana",
  },
  {
    key: "coinbase",
    displayName: "CoinBase",
    path: "coinbaseSolana",
  },
  {
    key: "exodus",
    displayName: "Exodus",
    path: "exodus.solana",
  },
] as const satisfies readonly SolExtensionInfo[];

export type SolExtensionKey = (typeof SOL_EXTENSIONS)[number]["key"];
