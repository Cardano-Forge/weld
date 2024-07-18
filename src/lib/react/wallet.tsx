import type { ExtractStoreState } from "@/internal/store";
import { identity } from "@/internal/utils";
import {
  type CreateWalletStoreOpts,
  type WalletStore,
  createWalletStore,
} from "@/lib/main/stores/wallet";
import { createContext, useContext, useRef } from "react";
import { useShallow } from "./shallow";
import { useStore } from "./store";

const defaultWalletStore = createWalletStore();

const WalletContext = createContext<WalletStore | undefined>(undefined);

export function WalletProvider({
  children,
  ...props
}: React.PropsWithChildren<CreateWalletStoreOpts>) {
  const store = useRef(createWalletStore(props)).current;
  return <WalletContext.Provider value={store}> {children} </WalletContext.Provider>;
}

export function useWallet(): ExtractStoreState<WalletStore>;
export function useWallet<TStore extends string | number | boolean | undefined | null>(
  selector: (state: ExtractStoreState<WalletStore>) => TStore,
): TStore;
export function useWallet<TStore>(
  selector: (state: ExtractStoreState<WalletStore>) => TStore = identity,
): TStore {
  const store = useContext(WalletContext) ?? defaultWalletStore;
  return useStore(store, selector);
}

export function useWalletDerived<TStore extends object>(
  selector: (state: ExtractStoreState<WalletStore>) => TStore = identity,
): TStore {
  const store = useContext(WalletContext) ?? defaultWalletStore;
  return useStore(store, useShallow(selector));
}

export function useWalletPick<TKeys extends ReadonlyArray<keyof ExtractStoreState<WalletStore>>>(
  ...keys: [...TKeys]
): { [K in TKeys[number]]: ExtractStoreState<WalletStore>[K] } {
  const store = useContext(WalletContext) ?? defaultWalletStore;
  return useStore(
    store,
    useShallow((s) => {
      const res: Record<string, unknown> = {};
      for (const key in keys) {
        res[key] = s[key as keyof typeof s];
      }
      return res as typeof s;
    }),
  );
}
