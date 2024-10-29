import { memo, useEffect, useState } from "react";

import { createContextFromStore } from "@/lib/react/context";
import {
  type SolWalletApi,
  type SolWalletProps,
  type SolWalletStoreState,
  type WeldSolInstance,
  createWeldSolInstance,
} from "@/lib/sol/stores";
import type { SolConfig } from "../sol/types";

const walletContext = createContextFromStore<WeldSolInstance, "wallet">("wallet");
const WalletProvider = walletContext.provider;
export const useSolWallet: {
  (): SolWalletStoreState;
  <TSlice>(selector: (state: SolWalletStoreState) => TSlice): TSlice;
  <TKey extends keyof SolWalletProps | keyof SolWalletApi>(key: TKey): SolWalletStoreState[TKey];
  <TKeys extends ReadonlyArray<keyof SolWalletProps | keyof SolWalletApi>>(
    ...keys: [...TKeys]
  ): SolWalletStoreState<TKeys[number]>;
} = walletContext.hook;

const extensionsContext = createContextFromStore<WeldSolInstance, "extensions">("extensions");
const ExtensionsProvider = extensionsContext.provider;
export const useSolExtensions = extensionsContext.hook;

export type WeldSolProviderProps = React.PropsWithChildren<Partial<SolConfig>> & {
  instance?: WeldSolInstance;
};

export const WeldSolProvider = memo(
  ({ children, instance: instanceProp, ...config }: WeldSolProviderProps) => {
    const [instance] = useState(() => instanceProp ?? createWeldSolInstance());

    // Keep config store in sync with provider props
    useEffect(() => {
      instance.config.update(config);
    });

    useState(() => {
      instance.persist(config);
    });

    useEffect(() => {
      instance.init({
        // Persistence is performed once and only once during hydration
        persist: false,
      });
      return () => {
        instance.cleanup();
      };
    }, [instance]);

    return (
      <WalletProvider instance={instance}>
        <ExtensionsProvider instance={instance}>{children}</ExtensionsProvider>
      </WalletProvider>
    );
  },
);
