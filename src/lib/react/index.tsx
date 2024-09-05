import { memo, useEffect, useState } from "react";

import type { WalletApi, WalletProps, WalletStoreState } from "@/lib/main/stores";

import { weld } from "../main";
import type { WeldConfig } from "../main/stores/config";
import { createContextFromStore } from "./context";

const walletContext = createContextFromStore("wallet");
const WalletProvider = walletContext.provider;
export const useWallet: {
  (): WalletStoreState;
  <TSlice>(selector: (state: WalletStoreState) => TSlice): TSlice;
  <TKey extends keyof WalletProps | keyof WalletApi>(key: TKey): WalletStoreState[TKey];
  <TKeys extends ReadonlyArray<keyof WalletProps | keyof WalletApi>>(
    ...keys: [...TKeys]
  ): WalletStoreState<TKeys[number]>;
} = walletContext.hook;

const extensionsContext = createContextFromStore("extensions");
const ExtensionsProvider = extensionsContext.provider;
export const useExtensions = extensionsContext.hook;

export type WeldProviderProps = React.PropsWithChildren<Partial<WeldConfig>>;

export const WeldProvider = memo(({ children, ...config }: WeldProviderProps) => {
  // Keep config store in sync with provider props
  useEffect(() => {
    weld.config.getState().update(config);
  });

  useState(() => {
    weld.persist(config);
  });

  useEffect(() => {
    weld.init({
      // Persistence is performed once and only once during hydration
      persist: false,
    });
    return () => {
      weld.cleanup();
    };
  }, []);

  return (
    <WalletProvider>
      <ExtensionsProvider>{children}</ExtensionsProvider>
    </WalletProvider>
  );
});
