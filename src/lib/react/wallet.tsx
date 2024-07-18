import type { ExtractStoreState } from "@/internal/store";
import { identity } from "@/internal/utils";
import { createContext, useContext, useRef } from "react";
import { type CreateWalletStoreOpts, type WalletStore, createWalletStore } from "../main/store";
import { useStore } from "./use-store";

const defaultWalletStore = createWalletStore();

const WalletStoreContext = createContext<WalletStore | undefined>(undefined);

export function WalletStoreProvider({
  children,
  ...props
}: React.PropsWithChildren<CreateWalletStoreOpts>) {
  const store = useRef(createWalletStore(props)).current;
  return <WalletStoreContext.Provider value={store}>{children}</WalletStoreContext.Provider>;
}

export function useWalletStore(): ExtractStoreState<WalletStore>;
export function useWalletStore<TSlice>(
  selector: (state: ExtractStoreState<WalletStore>) => TSlice,
): TSlice;
export function useWalletStore<TSlice>(
  selector: (state: ExtractStoreState<WalletStore>) => TSlice = identity,
): TSlice {
  const store = useContext(WalletStoreContext) ?? defaultWalletStore;
  return useStore(store, selector);
}
