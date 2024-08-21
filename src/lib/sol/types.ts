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

export function isSolHandler(obj: unknown): obj is SolHandler {
  return (
    typeof obj === "object" && obj !== null && "connect" in obj && typeof obj.connect === "function"
  );
}

export type SolExtensionInfo = {
  key: string;
  displayName: string;
};

export type SolExtension = SolExtensionInfo & {
  handlerPath: string;
  isInstalled: boolean;
  handler?: SolHandler;
};

export const SOL_EXTENSIONS = [
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
] as const satisfies Omit<SolExtension, "isInstalled" | "handler">[];

export type SolExtensionKey = (typeof SOL_EXTENSIONS)[number]["key"];
