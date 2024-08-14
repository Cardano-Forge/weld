import { useEffect, useState } from "react";

import { initialize } from "@/lib/main/initialize";
import type { CreateExtensionsStoreOpts } from "@/lib/main/stores/extensions";
import type { WalletApi, WalletProps, WalletStoreState } from "@/lib/main/stores/wallet";

import { type WeldConfig, defaults } from "../main";
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
export const useWalletStore = walletContext.storeHook;

const extensionsContext = createContextFromStore("extensions");
const ExtensionsProvider = extensionsContext.provider;
export const useExtensions = extensionsContext.hook;
export const useExtensionsStore = extensionsContext.storeHook;

export type WeldProviderProps = React.PropsWithChildren<
  Partial<Omit<WeldConfig, "wallet" | "extensions">> & {
    onUpdateError?(store: "wallet" | "extensions", error: unknown): void;
    wallet?: {
      initialState?: { isConnectingTo?: string };
      onUpdateError?(error: unknown): void;
    };
    extensions?: CreateExtensionsStoreOpts;
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

  return (
    <WalletProvider
      {...wallet}
      onUpdateError={(error) => {
        onUpdateError?.("wallet", error);
        wallet?.onUpdateError?.(error);
      }}
    >
      <ExtensionsProvider
        {...extensions}
        onUpdateError={(error) => {
          onUpdateError?.("extensions", error);
          extensions?.onUpdateError?.(error);
        }}
      >
        {children}
      </ExtensionsProvider>
    </WalletProvider>
  );
}
