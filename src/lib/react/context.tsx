import type { ExtractStoreState, Store } from "@/internal/store";
import { identity } from "@/internal/utils/identity";
import { createContext, useContext } from "react";
import { useCompare } from "./compare";
import { useStore } from "./store";

export function createContextFromStore<TStore extends Store>(store: TStore) {
  type TState = ExtractStoreState<TStore>;

  const Context = createContext<TStore | undefined>(undefined);

  function provider({ children }: { children: React.ReactNode }) {
    return <Context.Provider value={store}>{children}</Context.Provider>;
  }

  function hook(): TState;
  function hook<TSlice>(selector: (state: TState) => TSlice): TSlice;
  function hook<TKey extends keyof TState>(key: TKey): TState[TKey];
  function hook<TKeys extends ReadonlyArray<keyof TState>>(
    ...keys: [...TKeys]
  ): { [K in TKeys[number]]: TState[K] };
  function hook(
    selectorOrKey: ((state: TState) => unknown) | keyof TState = identity,
    ...additionalKeys: ReadonlyArray<keyof TState>
  ): unknown {
    const store = useContext(Context);

    if (!store) {
      throw new Error(
        "Weld hooks cannot be used without a provider. \nYou likely forgot to wrap your app in a WeldProvider context provider.",
      );
    }

    return useStore(
      store,
      useCompare((state) => {
        if (typeof selectorOrKey === "function") {
          return selectorOrKey(state);
        }
        if (additionalKeys.length === 0) {
          return state[selectorOrKey as keyof TState];
        }
        const res: Record<string, unknown> = {
          [selectorOrKey]: state[selectorOrKey as keyof TState],
        };
        for (const key of additionalKeys) {
          res[key as string] = state[key as keyof TState];
        }
        return res as TState;
      }),
    );
  }

  return {
    provider,
    hook,
  };
}
