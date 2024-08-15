// adapted from https://github.com/pmndrs/zustand/blob/main/src/vanilla.ts

import { compare } from "./compare";

export type StoreListener<T> = (state: T, prevState: T | undefined) => void;

// biome-ignore lint/suspicious/noExplicitAny: Allow any store for generics
export type Store<TState = any> = {
  getState: () => TState;
  getInitialState: () => TState;
  setState: (
    partial: TState | Partial<TState> | ((state: TState) => TState | Partial<TState>),
  ) => void;
  subscribe: (listener: StoreListener<TState>, opts?: { fireImmediately?: boolean }) => () => void;
  subscribeWithSelector: <TSlice>(
    selector: (state: TState) => TSlice,
    listener: StoreListener<TSlice>,
    opts?: { fireImmediately?: boolean },
  ) => () => void;
};

export type StoreHandler<TState, TParams extends ReadonlyArray<unknown> = []> = (
  setState: Store<TState>["setState"],
  getState: Store<TState>["getState"],
  ...params: TParams
) => TState;

export type ReadonlyStore<TState> = Omit<Store<TState>, "setState">;

export type ExtractStoreState<TStore> = TStore extends { getState: () => infer T } ? T : never;

export function createStore<TState extends object>(
  createState: StoreHandler<TState>,
): Store<TState> {
  let state: TState;
  const listeners = new Set<StoreListener<TState>>();

  const setState: Store<TState>["setState"] = (partial) => {
    const partialNext = typeof partial === "function" ? partial(state) : partial;
    const next =
      typeof partialNext !== "object" || partialNext === null
        ? partialNext
        : Object.assign({}, state, partialNext);
    if (!compare(next, state)) {
      const prev = state;
      state = next;
      for (const listener of listeners) {
        listener(state, prev);
      }
    }
  };

  const getState: Store<TState>["getState"] = () => state;

  const getInitialState: Store<TState>["getInitialState"] = () => initialState;

  const subscribe: Store<TState>["subscribe"] = (listener, opts) => {
    listeners.add(listener);
    if (opts?.fireImmediately) {
      listener(state, undefined);
    }
    return () => {
      listeners.delete(listener);
    };
  };

  const subscribeWithSelector: Store<TState>["subscribeWithSelector"] = (
    selector,
    listener,
    opts,
  ) => {
    let currSlice = selector(state);
    const globalListener = (next: TState) => {
      const nextSlice = selector(next);
      if (!compare(currSlice, nextSlice)) {
        const prevSlice = currSlice;
        currSlice = nextSlice;
        listener(currSlice, prevSlice);
      }
    };
    listeners.add(globalListener);
    if (opts?.fireImmediately) {
      listener(currSlice, undefined);
    }
    return () => {
      listeners.delete(globalListener);
    };
  };

  const store = { setState, getState, getInitialState, subscribe, subscribeWithSelector };

  const initialState = createState(setState, getState);
  state = initialState;

  return store;
}

export type StoreFactory<TState extends object, TParams extends ReadonlyArray<unknown>> = (
  ...params: TParams
) => Store<TState>;

export function createStoreFactory<
  TState extends object,
  TParams extends ReadonlyArray<unknown> = [],
>(
  storeHandler: (
    setState: Store<TState>["setState"],
    getState: Store<TState>["getState"],
    ...params: TParams
  ) => TState,
) {
  const factory = (...params: TParams) => {
    return createStore<TState>((s, g) => {
      return storeHandler(s, g, ...params);
    });
  };

  return factory;
}

export type StoreLifeCycleMethods = {
  init?(): void;
  cleanup?(): void;
};

export function hasLifeCycleMethods(store: unknown): store is StoreLifeCycleMethods {
  if (!store || typeof store !== "object" || store === null) return false;
  if ("init" in store && typeof store.init === "function") return true;
  if ("cleanup" in store && typeof store.cleanup === "function") return true;
  return false;
}
