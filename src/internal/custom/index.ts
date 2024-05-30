import type { WalletKey } from "@/lib/utils";

import type { WalletConnector } from "@/internal/connector";
import type { WalletHandler } from "@/internal/handler";

import { eternl } from "./eternl";

export const customWalletConnectors = {
  eternl,
} satisfies Partial<Record<WalletKey, WalletConnector>>;

export type CustomWalletConnectors = typeof customWalletConnectors;
export type CustomWalletKey = keyof CustomWalletConnectors;

export function hasCustomConnector(key: string): key is CustomWalletKey {
  return !!customWalletConnectors[key as CustomWalletKey];
}

export type CustomHandler<TKey extends CustomWalletKey> = Awaited<
  ReturnType<CustomWalletConnectors[TKey]>
>;

export type WalletHandlerByKey = {
  [TKey in CustomWalletKey]: CustomHandler<TKey>;
} & {
  [TKey in Exclude<WalletKey, CustomWalletKey>]: WalletHandler;
};
