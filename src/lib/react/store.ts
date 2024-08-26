import type { ExtractStoreState, ReadonlyStore } from "@/internal/store";
import { identity } from "@/internal/utils/identity";
import { useSyncExternalStoreWithSelector } from "use-sync-external-store/with-selector";

// biome-ignore lint/suspicious/noExplicitAny: Allow any store for generics
export function useStore<TStore extends ReadonlyStore<unknown, any>>(
  store: TStore,
): ExtractStoreState<TStore>;
// biome-ignore lint/suspicious/noExplicitAny: Allow any store for generics
export function useStore<TStore extends ReadonlyStore<unknown, any>, TSlice>(
  store: TStore,
  selector: (state: ExtractStoreState<TStore>) => TSlice,
): TSlice;
export function useStore<TState, TSlice>(
  store: ReadonlyStore<TState, never>,
  selector: (state: TState) => TSlice = identity,
) {
  return useSyncExternalStoreWithSelector(
    store.subscribe,
    store.getState,
    store.getInitialState,
    selector,
  );
}
