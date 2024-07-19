import type { ExtractStoreState, Store } from "@/internal/store";
import { identity } from "@/internal/utils";
import { createContext, useContext, useEffect, useRef } from "react";
import { useShallow } from "./shallow";
import { useStore } from "./store";

export function createContextFromStore<TStore extends Store, TOpts = unknown>(
  name: string,
  createStore: (opts?: TOpts) => TStore,
) {
  type TState = ExtractStoreState<TStore>;

  const defaultStore = createStore();

  const requiresProvider = "cleanup" in defaultStore.getInitialState();
  console.log(name, "requiresProvider", requiresProvider);

  const Context = createContext<TStore | undefined>(undefined);

  function provider({ children, ...props }: React.PropsWithChildren<TOpts>) {
    const store = useRef(createStore(props as TOpts));
    useEffect(() => {
      return () => {
        const state = store.current.getState() as unknown;
        if (
          typeof state === "object" &&
          state !== null &&
          "cleanup" in state &&
          typeof state.cleanup === "function"
        ) {
          console.log(name, "final cleaning up");
          state.cleanup();
        }
      };
    }, []);
    return <Context.Provider value={store.current}>{children}</Context.Provider>;
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
    const contextStore = useContext(Context);
    if (requiresProvider && !contextStore) {
      throw new Error(`[WELD] ${name} hook cannot be used without a provider`);
    }
    return useStore(
      contextStore ?? defaultStore,
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
