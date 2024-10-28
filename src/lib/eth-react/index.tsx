import { memo, useEffect, useState } from "react";

import type { EvmWalletApi, EvmWalletProps, EvmWalletStoreState } from "@/lib/eth/stores";
import { weldEth } from "@/lib/eth/stores";
import type { WeldConfig } from "@/lib/main/stores/config";
import { createContextFromStore } from "@/lib/react/context";

const walletContext = createContextFromStore(weldEth.wallet);
const WalletProvider = walletContext.provider;
export const useEthWallet: {
  (): EvmWalletStoreState;
  <TSlice>(selector: (state: EvmWalletStoreState) => TSlice): TSlice;
  <TKey extends keyof EvmWalletProps | keyof EvmWalletApi>(key: TKey): EvmWalletStoreState[TKey];
  <TKeys extends ReadonlyArray<keyof EvmWalletProps | keyof EvmWalletApi>>(
    ...keys: [...TKeys]
  ): EvmWalletStoreState<TKeys[number]>;
} = walletContext.hook;

const extensionsContext = createContextFromStore(weldEth.extensions);
const ExtensionsProvider = extensionsContext.provider;
export const useEthExtensions = extensionsContext.hook;

export type WeldEthProviderProps = React.PropsWithChildren<Partial<WeldConfig>>;

export const WeldEthProvider = memo(({ children, ...config }: WeldEthProviderProps) => {
  // Keep config store in sync with provider props
  useEffect(() => {
    weldEth.config.update(config);
  });

  useState(() => {
    weldEth.persist(config);
  });

  useEffect(() => {
    weldEth.init({
      // Persistence is performed once and only once during hydration
      persist: false,
    });
    return () => {
      weldEth.cleanup();
    };
  }, []);

  return (
    <WalletProvider>
      <ExtensionsProvider>{children}</ExtensionsProvider>
    </WalletProvider>
  );
});
