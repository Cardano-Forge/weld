import type { ExtractStoreState, Store } from "@/internal/store";
import { identity } from "@/internal/utils";
import { createContext, useContext, useRef } from "react";
import { useShallow } from "./shallow";
import { useStore } from "./store";

export function createContextFromStore<TStore extends Store, TOpts = unknown>(
  createStore: (opts?: TOpts) => TStore,
) {
  type TState = ExtractStoreState<TStore>;

  const defaultStore = createStore();

  const Context = createContext<TStore | undefined>(undefined);

  function provider({ children, ...props }: React.PropsWithChildren<TOpts>) {
    const store = useRef(createStore(props as TOpts)).current;
    return <Context.Provider value={store}>{children}</Context.Provider>;
  }

  function hook(): TState;
  function hook<TStore>(selector: (state: TState) => TStore): TStore;
  function hook<TKey extends keyof TState>(key: TKey): TState[TKey];
  function hook<TKeys extends ReadonlyArray<keyof TState>>(
    ...keys: [...TKeys]
  ): { [K in TKeys[number]]: TState[K] };
  function hook(
    selectorOrKey: ((state: TState) => unknown) | keyof TState = identity,
    ...additionalKeys: ReadonlyArray<keyof TState>
  ): unknown {
    const store = useContext(Context) ?? defaultStore;
    return useStore(
      store,
      useShallow((state) => {
        if (typeof selectorOrKey === "function") {
          return selectorOrKey(state);
        }
        if (additionalKeys.length === 0) {
          return state[selectorOrKey as keyof TState];
        }
        const res: Record<string, unknown> = {
          [selectorOrKey]: state[selectorOrKey as keyof TState],
        };
        for (const key in additionalKeys) {
          res[key] = state[key as keyof TState];
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
