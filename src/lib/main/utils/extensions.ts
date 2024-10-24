import { deferredPromise } from "@/internal/utils/deferred-promise";

import { getFailureReason } from "@/internal/utils/errors";
import { startsWithAny } from "@/internal/utils/starts-with-any";
import type { WalletKey } from "./wallets";

const stakeAddressHexLength = 58;
const stakeAddressHexPrefixes = ["e0", "e1"] as const;
type StakeAddressHexPrefix = (typeof stakeAddressHexPrefixes)[number];

const changeAddressHexLength = 116;
const changeAddressHexPrefixes = ["00", "01"] as const;
type ChangeAddressHexPrefix = (typeof changeAddressHexPrefixes)[number];

export function isStakeAddressHex(input: string): input is StakeAddressHex {
  return input.length === stakeAddressHexLength && startsWithAny(input, stakeAddressHexPrefixes);
}

export function isChangeAddressHex(input: string): input is ChangeAddressHex {
  return input.length === changeAddressHexLength && startsWithAny(input, changeAddressHexPrefixes);
}

export type AddressHex = `${ChangeAddressHexPrefix | StakeAddressHexPrefix}${string}`;
export type ChangeAddressHex = `${ChangeAddressHexPrefix}${string}`;
export type StakeAddressHex = `${StakeAddressHexPrefix}${string}`;

const stakeAddressBech32Prefixes = ["stake", "stake_test"] as const;
export type StakeAddressBech32Prefix = (typeof stakeAddressBech32Prefixes)[number];

const changeAddressBech32Prefixes = ["addr", "addr_test"] as const;
export type ChangeAddressBech32Prefix = (typeof changeAddressBech32Prefixes)[number];

export type AddressBech32 = `${StakeAddressBech32Prefix | ChangeAddressBech32Prefix}${string}`;
export type ChangeAddressBech32 = `${ChangeAddressBech32Prefix}${string}`;
export type StakeAddressBech32 = `${StakeAddressBech32Prefix}${string}`;

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

    if (key && key in window.cardano) {
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
      const resp = await defaultApi.enable();
      resolve(resp);
    } catch {
      if (++retryCount > maxRetryCount) {
        resolve(undefined);
      } else {
        setTimeout(evaluate, retryIntervalMs);
      }
    }
  }

  evaluate();

  return promise;
}
