import { memo, useEffect, useState } from "react";

import type { WeldConfig } from "@/lib/main/stores/config";
import type { EvmWalletApi, EvmWalletProps, EvmWalletStoreState } from "@/lib/poly/stores";
import { weldPoly } from "@/lib/poly/stores";
import { createContextFromStore } from "@/lib/react/context";

const walletContext = createContextFromStore(weldPoly.wallet);
const WalletProvider = walletContext.provider;
export const usePolyWallet: {
  (): EvmWalletStoreState;
  <TSlice>(selector: (state: EvmWalletStoreState) => TSlice): TSlice;
  <TKey extends keyof EvmWalletProps | keyof EvmWalletApi>(key: TKey): EvmWalletStoreState[TKey];
  <TKeys extends ReadonlyArray<keyof EvmWalletProps | keyof EvmWalletApi>>(
    ...keys: [...TKeys]
  ): EvmWalletStoreState<TKeys[number]>;
} = walletContext.hook;

const extensionsContext = createContextFromStore(weldPoly.extensions);
const ExtensionsProvider = extensionsContext.provider;
export const usePolyExtensions = extensionsContext.hook;

export type WeldPolyProviderProps = React.PropsWithChildren<Partial<WeldConfig>>;

export const WeldPolyProvider = memo(({ children, ...config }: WeldPolyProviderProps) => {
  // Keep config store in sync with provider props
  useEffect(() => {
    weldPoly.config.update(config);
  });

  useState(() => {
    weldPoly.persist(config);
  });

  useEffect(() => {
    weldPoly.init({
      // Persistence is performed once and only once during hydration
      persist: false,
    });
    return () => {
      weldPoly.cleanup();
    };
  }, []);

  return (
    <WalletProvider>
      <ExtensionsProvider>{children}</ExtensionsProvider>
    </WalletProvider>
  );
});
