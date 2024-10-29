import { memo, useEffect, useState } from "react";

import type { EvmConfig } from "@/internal/evm/types";
import {
  type EvmWalletApi,
  type EvmWalletProps,
  type EvmWalletStoreState,
  type WeldPolyInstance,
  createWeldPolyInstance,
} from "@/lib/poly/stores";
import { createContextFromStore } from "@/lib/react/context";

const walletContext = createContextFromStore<WeldPolyInstance, "wallet">("wallet");
const WalletProvider = walletContext.provider;
export const usePolyWallet: {
  (): EvmWalletStoreState;
  <TSlice>(selector: (state: EvmWalletStoreState) => TSlice): TSlice;
  <TKey extends keyof EvmWalletProps | keyof EvmWalletApi>(key: TKey): EvmWalletStoreState[TKey];
  <TKeys extends ReadonlyArray<keyof EvmWalletProps | keyof EvmWalletApi>>(
    ...keys: [...TKeys]
  ): EvmWalletStoreState<TKeys[number]>;
} = walletContext.hook;

const extensionsContext = createContextFromStore<WeldPolyInstance, "extensions">("extensions");
const ExtensionsProvider = extensionsContext.provider;
export const usePolyExtensions = extensionsContext.hook;

export type WeldPolyProviderProps = React.PropsWithChildren<Partial<EvmConfig>> & {
  instance?: WeldPolyInstance;
};

export const WeldPolyProvider = memo(
  ({ children, instance: instanceProp, ...config }: WeldPolyProviderProps) => {
    const [instance] = useState(() => instanceProp ?? createWeldPolyInstance());

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
