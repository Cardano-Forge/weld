import type { ExtractStoreState } from "@/internal/store";
import { identity } from "@/internal/utils";
import { type ExtensionsStore, createExtensionsStore } from "@/lib/main/stores/extensions";
import { createContext, useContext, useRef } from "react";
import { useShallow } from "./shallow";
import { useStore } from "./store";

const defaultExtensionsStore = createExtensionsStore();

const ExtensionsContext = createContext<ExtensionsStore | undefined>(undefined);

export function ExtensionsProvider({ children }: React.PropsWithChildren) {
  const store = useRef(createExtensionsStore()).current;
  return <ExtensionsContext.Provider value={store}> {children} </ExtensionsContext.Provider>;
}

export function useExtensions(): ExtractStoreState<ExtensionsStore>;
export function useExtensions<TStore extends string | number | boolean | undefined | null>(
  selector: (state: ExtractStoreState<ExtensionsStore>) => TStore,
): TStore;
export function useExtensions<TStore>(
  selector: (state: ExtractStoreState<ExtensionsStore>) => TStore = identity,
): TStore {
  const store = useContext(ExtensionsContext) ?? defaultExtensionsStore;
  return useStore(store, selector);
}

export function useExtensionsDerived<TStore extends object | undefined | null>(
  selector: (state: ExtractStoreState<ExtensionsStore>) => TStore = identity,
): TStore {
  const store = useContext(ExtensionsContext) ?? defaultExtensionsStore;
  return useStore(store, useShallow(selector));
}
