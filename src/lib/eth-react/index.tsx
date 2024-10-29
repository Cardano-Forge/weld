import { memo, useEffect, useState } from "react";

import {
  type EvmWalletApi,
  type EvmWalletProps,
  type EvmWalletStoreState,
  type WeldEthInstance,
  createWeldEthInstance,
} from "@/lib/eth/stores";
import type { WeldConfig } from "@/lib/main/stores/config";
import { createContextFromStore } from "@/lib/react/context";

const walletContext = createContextFromStore<WeldEthInstance, "wallet">("wallet");
const WalletProvider = walletContext.provider;
export const useEthWallet: {
  (): EvmWalletStoreState;
  <TSlice>(selector: (state: EvmWalletStoreState) => TSlice): TSlice;
  <TKey extends keyof EvmWalletProps | keyof EvmWalletApi>(key: TKey): EvmWalletStoreState[TKey];
  <TKeys extends ReadonlyArray<keyof EvmWalletProps | keyof EvmWalletApi>>(
    ...keys: [...TKeys]
  ): EvmWalletStoreState<TKeys[number]>;
} = walletContext.hook;

const extensionsContext = createContextFromStore<WeldEthInstance, "extensions">("extensions");
const ExtensionsProvider = extensionsContext.provider;
export const useEthExtensions = extensionsContext.hook;

export type WeldEthProviderProps = React.PropsWithChildren<Partial<WeldConfig>> & {
  instance?: WeldEthInstance;
};

export const WeldEthProvider = memo(
  ({ children, instance: instanceProp, ...config }: WeldEthProviderProps) => {
    const [instance] = useState(() => instanceProp ?? createWeldEthInstance());

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
