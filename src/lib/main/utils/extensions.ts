import { deferredPromise } from "@/internal/utils/deferred-promise";

import type { AddressHex, ChangeAddressHex, StakeAddressHex } from "@/lib/server/address";
import type { WalletKey } from "./wallets";

export type BalanceByPolicies = { [key: string]: { [key: string]: number } };

export type Bytes = string;

export type Cbor = string;

export type Hash32 = string;

export type PolicyId = string;

export type Signature = string | { key?: string; signature: string };

export type Lovelace = number;

export type UnspentTxOutput = string;

export type NetworkType = "mainnet" | "preprod";

export type NetworkId = 0 | 1;

export type EnabledWalletApi = {
  getNetworkId(): Promise<NetworkId>;
  getUtxos(amount?: Cbor, paginate?: number): Promise<UnspentTxOutput[] | undefined>;
  getBalance(): Promise<Cbor>;
  getUsedAddresses(paginate?: number): Promise<AddressHex[]>;
  getUnusedAddresses(): Promise<AddressHex[]>;
  getChangeAddress(): Promise<ChangeAddressHex>;
  getRewardAddresses(): Promise<StakeAddressHex[]>;
  signTx(tx: Cbor, partialSign?: boolean): Promise<Cbor>;
  signData(addr: AddressHex, payload: Bytes): Promise<Signature>;
  submitTx(tx: Cbor): Promise<Hash32>;
  experimental?: {
    getCollateral(): Promise<string[]>;
    signTxs?(txs: { cbor: Cbor; partialSign?: boolean }[]): Promise<Cbor[]>;
  };
};

export type DefaultWalletApi = {
  name: string;
  icon: string;
  apiVersion: string;
  enable(): Promise<EnabledWalletApi>;
  isEnabled(): Promise<boolean>;
};

export type FullWalletApi = DefaultWalletApi & EnabledWalletApi;

export function isDefaultWalletApi(obj: unknown): obj is DefaultWalletApi {
  return typeof obj === "object" && obj !== null && "apiVersion" in obj;
}

export type WindowCardano = {
  [TWalletKey in WalletKey]?: DefaultWalletApi;
} & {
  [key: string]: unknown;
};

declare global {
  interface Window {
    cardano: WindowCardano;
  }
}

export type GetWindowCardanoOpts = {
  maxRetryCount?: number;
  retryIntervalMs?: number;
};

/** Tries to retrieve the window.cardano object every `retryIntervalMs` ms.
 * @returns the object when found or undefined when `maxRetryCount` is reached.
 * @param opts.key string
 * When specify, tries to return a specific wallet extension API instead of the entire cardano object
 * @param opts.maxRetryCount number
 * @default 5
 * @param opts.retryIntervalMs number
 * @default 1000
 */
export async function getWindowCardano(
  opts?: GetWindowCardanoOpts,
): Promise<WindowCardano | undefined>;
export async function getWindowCardano(
  opts: { key: string } & GetWindowCardanoOpts,
): Promise<DefaultWalletApi | undefined>;
export async function getWindowCardano({
  key,
  maxRetryCount = 5,
  retryIntervalMs = 1000,
}: { key?: string } & GetWindowCardanoOpts = {}): Promise<
  DefaultWalletApi | WindowCardano | undefined
> {
  const { promise, resolve } = deferredPromise<WindowCardano | undefined>();

  let retryCount = 0;

  function evaluate() {
    let result: DefaultWalletApi | WindowCardano | undefined = undefined;

    if (key && typeof window.cardano === "object" && key in window.cardano) {
      const api = window.cardano[key];
      if (isDefaultWalletApi(api)) {
        result = api;
      }
    } else if (window.cardano) {
      result = window.cardano;
    }

    if (result) {
      resolve(result);
    } else if (++retryCount > maxRetryCount) {
      resolve(undefined);
    } else {
      setTimeout(evaluate, retryIntervalMs);
    }
  }

  evaluate();

  return promise;
}

const walletExtensionBlacklist = ["ccvault"] as const;

export type WalletExtension = {
  key: string;
  defaultApi: DefaultWalletApi;
};

export async function getWalletExtensions(
  opts?: GetWindowCardanoOpts & { blacklist?: string[] },
): Promise<WalletExtension[]> {
  const windowCardano = await getWindowCardano(opts);

  if (!windowCardano) return [];

  const blacklist = opts?.blacklist ?? walletExtensionBlacklist;
  for (const walletKey of blacklist) {
    if (walletKey in windowCardano) {
      delete windowCardano[walletKey];
    }
  }

  return Object.entries(windowCardano)
    .flatMap(([key, defaultApi]) => {
      if (isDefaultWalletApi(defaultApi)) {
        return {
          key,
          defaultApi,
        };
      }
      return [];
    })
    .sort((a, b) => {
      const keyA = a.key.toLowerCase();
      const keyB = b.key.toLowerCase();
      if (keyA < keyB) return -1;
      if (keyB < keyA) return 1;
      return 0;
    });
}

export type EnableWalletOpts = {
  maxRetryCount?: number;
  retryIntervalMs?: number;
};

/** Tries to enable a wallet extension every `retryIntervalMs` ms.
 * @returns the object when found or undefined when `maxRetryCount` is reached.
 * @param opts.maxRetryCount number
 * @default 5
 * @param opts.retryIntervalMs number
 * @default 1000
 */
export async function enableWallet(
  defaultApi: DefaultWalletApi,
  { maxRetryCount = 5, retryIntervalMs = 1000 }: EnableWalletOpts = {},
): Promise<EnabledWalletApi | undefined> {
  const { promise, resolve } = deferredPromise<EnabledWalletApi | undefined>();

  let retryCount = 0;

  async function evaluate() {
    try {
      if ("enable" in defaultApi) {
        const resp = await defaultApi.enable();
        resolve(resp);
        return;
      }

      if (++retryCount > maxRetryCount) {
        throw new Error("API not found");
      }

      setTimeout(evaluate, retryIntervalMs);
    } catch {
      resolve(undefined);
    }
  }

  evaluate();

  return promise;
}
