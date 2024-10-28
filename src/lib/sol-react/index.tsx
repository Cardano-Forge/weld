import { memo, useEffect, useState } from "react";

import { createContextFromStore } from "@/lib/react/context";
import type { SolWalletApi, SolWalletProps, SolWalletStoreState } from "@/lib/sol/stores";
import { weldSol } from "@/lib/sol/stores";
import type { SolConfig } from "../sol/types";

const walletContext = createContextFromStore(weldSol.wallet);
const WalletProvider = walletContext.provider;
export const useSolWallet: {
  (): SolWalletStoreState;
  <TSlice>(selector: (state: SolWalletStoreState) => TSlice): TSlice;
  <TKey extends keyof SolWalletProps | keyof SolWalletApi>(key: TKey): SolWalletStoreState[TKey];
  <TKeys extends ReadonlyArray<keyof SolWalletProps | keyof SolWalletApi>>(
    ...keys: [...TKeys]
  ): SolWalletStoreState<TKeys[number]>;
} = walletContext.hook;

const extensionsContext = createContextFromStore(weldSol.extensions);
const ExtensionsProvider = extensionsContext.provider;
export const useSolExtensions = extensionsContext.hook;

export type WeldSolProviderProps = React.PropsWithChildren<Partial<SolConfig>>;

export const WeldSolProvider = memo(({ children, ...config }: WeldSolProviderProps) => {
  // Keep config store in sync with provider props
  useEffect(() => {
    weldSol.config.update(config);
  });

  useState(() => {
    weldSol.persist(config);
  });

  useEffect(() => {
    weldSol.init({
      // Persistence is performed once and only once during hydration
      persist: false,
    });
    return () => {
      weldSol.cleanup();
    };
  }, []);

  return (
    <WalletProvider>
      <ExtensionsProvider>{children}</ExtensionsProvider>
    </WalletProvider>
  );
});
