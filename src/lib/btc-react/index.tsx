import { memo, useEffect, useState } from "react";

import {
  type BtcWalletApi,
  type BtcWalletProps,
  type BtcWalletStoreState,
  type WeldBtcInstance,
  createWeldBtcInstance,
} from "@/lib/btc/stores";
import { createContextFromStore } from "@/lib/react/context";
import type { WeldConfig } from "../main";

const walletContext = createContextFromStore<WeldBtcInstance, "wallet">("wallet");
const WalletProvider = walletContext.provider;
export const useBtcWallet: {
  (): BtcWalletStoreState;
  <TSlice>(selector: (state: BtcWalletStoreState) => TSlice): TSlice;
  <TKey extends keyof BtcWalletProps | keyof BtcWalletApi>(key: TKey): BtcWalletStoreState[TKey];
  <TKeys extends ReadonlyArray<keyof BtcWalletProps | keyof BtcWalletApi>>(
    ...keys: [...TKeys]
  ): BtcWalletStoreState<TKeys[number]>;
} = walletContext.hook;

const extensionsContext = createContextFromStore<WeldBtcInstance, "extensions">("extensions");
const ExtensionsProvider = extensionsContext.provider;
export const useBtcExtensions = extensionsContext.hook;

export type WeldBtcProviderProps = React.PropsWithChildren<Partial<WeldConfig>> & {
  instance?: WeldBtcInstance;
};

export const WeldBtcProvider = memo(
  ({ children, instance: instanceProp, ...config }: WeldBtcProviderProps) => {
    const [instance] = useState(() => instanceProp ?? createWeldBtcInstance());

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
