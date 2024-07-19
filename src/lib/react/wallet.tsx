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
export function useWallet<TStore>(
  selector: (state: ExtractStoreState<WalletStore>) => TStore,
): TStore;
export function useWallet<TKeys extends ReadonlyArray<keyof ExtractStoreState<WalletStore>>>(
  ...keys: [...TKeys]
): { [K in TKeys[number]]: ExtractStoreState<WalletStore>[K] };
export function useWallet(
  selectorOrKeys:
    | ((state: ExtractStoreState<WalletStore>) => unknown)
    | keyof ExtractStoreState<WalletStore> = identity,
  ...keys: ReadonlyArray<keyof ExtractStoreState<WalletStore>>
): unknown {
  const store = useContext(WalletContext) ?? defaultWalletStore;
  return useStore(
    store,
    useShallow((state) => {
      if (typeof selectorOrKeys === "function") {
        return selectorOrKeys(state);
      }
      const res: Record<string, unknown> = {
        [selectorOrKeys]: state[selectorOrKeys as keyof typeof state],
      };
      for (const key in keys) {
        res[key] = state[key as keyof typeof state];
      }
      return res as typeof state;
    }),
  );
}
