import type { DefaultWalletHandler, WalletHandler } from "@/internal/handler";

import type { WalletKey } from "@/lib/main";
import type { AnyFunction } from "../utils/types";
import { eternl } from "./eternl";
import type { CustomWallet } from "./type";

export const customWallets = {
  eternl,
} satisfies Partial<Record<WalletKey, CustomWallet>>;

export type CustomWallets = typeof customWallets;
export type CustomWalletKey = keyof CustomWallets;

export function hasCustomImplementation(key: string): key is CustomWalletKey {
  return !!customWallets[key as CustomWalletKey];
}

export type CustomHandler<TKey extends CustomWalletKey> =
  CustomWallets[TKey]["connector"] extends AnyFunction
    ? Awaited<ReturnType<CustomWallets[TKey]["connector"]>>
    : DefaultWalletHandler;

export type WalletHandlerByKey = {
  [TKey in CustomWalletKey]: CustomHandler<TKey>;
} & {
  [TKey in Exclude<WalletKey, CustomWalletKey>]: WalletHandler;
};
