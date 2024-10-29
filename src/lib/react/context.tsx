import type { ExtractStoreState, Store } from "@/internal/store";
import { identity } from "@/internal/utils/identity";
import { createContext, useContext } from "react";
import { useCompare } from "./compare";
import { useStore } from "./store";

type ExtractStores<TInstance extends Record<string, unknown>> = {
  [TKey in keyof TInstance as TInstance[TKey] extends Store ? TKey : never]: TInstance[TKey];
};

export function createContextFromStore<
  TInstance extends Record<string, unknown>,
  TKey extends keyof ExtractStores<TInstance>,
>(key: TKey) {
  type TStore = ExtractStores<TInstance>[TKey];
  type TState = ExtractStoreState<TStore>;

  const Context = createContext<TStore | undefined>(undefined);

  function provider({ children, instance }: { children: React.ReactNode; instance: TInstance }) {
    return <Context.Provider value={instance[key]}>{children}</Context.Provider>;
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
      store as unknown as Store,
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
