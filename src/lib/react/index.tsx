import { memo, useEffect, useState } from "react";

import {
  type WalletApi,
  type WalletProps,
  type WalletStoreState,
  type WeldInstance,
  createWeldInstance,
} from "@/lib/main/stores";

import type { WeldConfig } from "../main/stores/config";
import { createContextFromStore } from "./context";

const walletContext = createContextFromStore<WeldInstance, "wallet">("wallet");
const WalletProvider = walletContext.provider;
export const useWallet: {
  (): WalletStoreState;
  <TSlice>(selector: (state: WalletStoreState) => TSlice): TSlice;
  <TKey extends keyof WalletProps | keyof WalletApi>(key: TKey): WalletStoreState[TKey];
  <TKeys extends ReadonlyArray<keyof WalletProps | keyof WalletApi>>(
    ...keys: [...TKeys]
  ): WalletStoreState<TKeys[number]>;
} = walletContext.hook;

const extensionsContext = createContextFromStore<WeldInstance, "extensions">("extensions");
const ExtensionsProvider = extensionsContext.provider;
export const useExtensions = extensionsContext.hook;

export type WeldProviderProps = React.PropsWithChildren<Partial<WeldConfig>> & {
  instance?: WeldInstance;
};

export const WeldProvider = memo(
  ({ children, instance: instanceProp, ...config }: WeldProviderProps) => {
    const [instance] = useState(() => instanceProp ?? createWeldInstance());

    // Keep config store in sync with provider props
    useEffect(() => {
      instance.config.update(config);
    });

    useState(() => {
      instance.persist(config);
    });

    useEffect(() => {
      instance.init({
        persist: false, // Persistence is performed once and only once during hydration
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
