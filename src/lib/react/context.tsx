import {
  type ExtractStoreState,
  type Store,
  hasInitialStateMethods,
  hasLifeCycleMethods,
  hasUpdateErrorMethods,
} from "@/internal/store";
import { identity } from "@/internal/utils/identity";
import { createContext, useContext, useEffect, useState } from "react";
import { useCompare } from "./compare";
import { useStore } from "./store";

export function createContextFromStore<TStore extends Store>(vanillaStore: TStore) {
  type TState = ExtractStoreState<TStore>;

  type TInitialState = TState extends { setInitialState: (values: infer TValues) => void }
    ? TValues
    : never;

  type TUpdateErrorHandler = TState extends {
    addUpdateErrorHandler: (handler: (error: unknown) => void) => void;
  }
    ? (error: unknown) => void
    : never;

  type TPropsRestricted = {
    [key in "initialState" as TInitialState extends never ? never : key]?: TInitialState;
  } & {
    [key in "onUpdateError" as TUpdateErrorHandler extends never
      ? never
      : key]?: TUpdateErrorHandler;
  };

  type TProps = {
    initialState?: TInitialState;
    onUpdateError?: TUpdateErrorHandler;
  };

  const Context = createContext<TStore | undefined>(undefined);

  function provider({ children, ...rest }: React.PropsWithChildren<TPropsRestricted>) {
    const props = rest as TProps;

    // Setup store and initial state
    const [store] = useState(() => {
      const state = vanillaStore.getState();
      if (hasInitialStateMethods(state) && props.initialState) {
        state?.setInitialState?.(props.initialState);
      }
      return vanillaStore;
    });

    // Setup lifecycle methods
    useEffect(() => {
      const state = store.getState();
      if (hasLifeCycleMethods(state)) {
        state.init?.();
        return () => {
          state.cleanup?.();
        };
      }
    }, [store]);

    // Setup update error handlers
    useEffect(() => {
      const state = store.getState();
      if (hasUpdateErrorMethods(state) && props.onUpdateError) {
        state.addUpdateErrorHandler(props.onUpdateError);
      }
      return () => {
        if (hasUpdateErrorMethods(state) && props.onUpdateError) {
          state.removeUpdateErrorHandler(props.onUpdateError);
        }
      };
    }, [props.onUpdateError, store]);

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
