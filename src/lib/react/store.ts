import type { ExtractStoreState, ReadonlyStore } from "@/internal/store";
import { identity } from "@/internal/utils";
import { useSyncExternalStoreWithSelector } from "use-sync-external-store/with-selector";

export function useStore<TStore extends ReadonlyStore<unknown>>(
  store: TStore,
): ExtractStoreState<TStore>;
export function useStore<TStore extends ReadonlyStore<unknown>, TSlice>(
  store: TStore,
  selector: (state: ExtractStoreState<TStore>) => TSlice,
): TSlice;
export function useStore<TState, TSlice>(
  store: ReadonlyStore<TState>,
  selector: (state: TState) => TSlice = identity,
) {
  return useSyncExternalStoreWithSelector(
    store.subscribe,
    store.getState,
    store.getInitialState,
    selector,
  );
}
