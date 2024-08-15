import { useCallback, useEffect, useState } from "react";

import { initialize } from "@/lib/main/initialize";
import type { WalletApi, WalletProps, WalletStoreState } from "@/lib/main/stores/wallet";

import { type WeldConfig, defaults, weld } from "../main";
import { createContextFromStore } from "./context";

const walletContext = createContextFromStore(weld.wallet);
const WalletProvider = walletContext.provider;
export const useWallet: {
  (): WalletStoreState;
  <TSlice>(selector: (state: WalletStoreState) => TSlice): TSlice;
  <TKey extends keyof WalletProps | keyof WalletApi>(key: TKey): WalletStoreState[TKey];
  <TKeys extends ReadonlyArray<keyof WalletProps | keyof WalletApi>>(
    ...keys: [...TKeys]
  ): WalletStoreState<TKeys[number]>;
} = walletContext.hook;

const extensionsContext = createContextFromStore(weld.extensions);
const ExtensionsProvider = extensionsContext.provider;
export const useExtensions = extensionsContext.hook;

export type WeldProviderProps = React.PropsWithChildren<
  Partial<Omit<WeldConfig, "wallet" | "extensions">> & {
    onUpdateError?(store: "wallet" | "extensions", error: unknown): void;
    wallet?: Omit<React.ComponentProps<typeof WalletProvider>, "children">;
    extensions?: Omit<React.ComponentProps<typeof ExtensionsProvider>, "children">;
  }
>;

export function WeldProvider({
  children,
  wallet,
  extensions,
  onUpdateError,
  ...config
}: WeldProviderProps) {
  useState(() => {
    Object.assign(defaults, config);
  });

  useEffect(() => {
    initialize();
  }, []);

  const handleWalletUpdateError = useCallback(
    (error: unknown) => {
      onUpdateError?.("wallet", error);
      wallet?.onUpdateError?.(error);
    },
    [wallet?.onUpdateError, onUpdateError],
  );

  const handleExtensionsUpdateError = useCallback(
    (error: unknown) => {
      onUpdateError?.("extensions", error);
      extensions?.onUpdateError?.(error);
    },
    [extensions?.onUpdateError, onUpdateError],
  );

  return (
    <WalletProvider {...wallet} onUpdateError={handleWalletUpdateError}>
      <ExtensionsProvider {...extensions} onUpdateError={handleExtensionsUpdateError}>
        {children}
      </ExtensionsProvider>
    </WalletProvider>
  );
}
