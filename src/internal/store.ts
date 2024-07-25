// adapted from https://github.com/pmndrs/zustand/blob/main/src/vanilla.ts

import { compare } from "./compare";

export type StoreLifeCycleMethods = {
  __init?(): void;
  __cleanup?(): void;
};

export type StoreListener<T> = (state: T, prevState: T) => void;

// biome-ignore lint/suspicious/noExplicitAny: Allow any store for generics
export type Store<TState = any> = {
  getState: () => TState;
  getInitialState: () => TState;
  setState: (
    partial: TState | Partial<TState> | ((state: TState) => TState | Partial<TState>),
  ) => void;
  subscribe: (listener: StoreListener<TState>) => () => void;
  subscribeWithSelector: <TSlice>(
    selector: (state: TState) => TSlice,
    listener: StoreListener<TSlice>,
  ) => () => void;
} & StoreLifeCycleMethods;

export type StoreCreator<TState> = (
  setState: Store<TState>["setState"],
  getState: Store<TState>["getState"],
) => TState & StoreLifeCycleMethods;

export type ReadonlyStore<TState> = Omit<Store<TState>, "setState">;

export type ExtractStoreState<TStore> = TStore extends { getState: () => infer T } ? T : never;

export function createStore<TState extends object>(
  createState: StoreCreator<TState>,
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

  const subscribe: Store<TState>["subscribe"] = (listener) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };

  const subscribeWithSelector: Store<TState>["subscribeWithSelector"] = (selector, listener) => {
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
    return () => {
      listeners.delete(globalListener);
    };
  };

  const store = { setState, getState, getInitialState, subscribe, subscribeWithSelector };

  const initialState = createState(setState, getState);
  state = initialState;

  return store;
}

export function hasLifeCycleMethods(store: unknown): store is StoreLifeCycleMethods {
  if (!store || typeof store !== "object" || store === null) return false;
  if ("__init" in store && typeof store.__init === "function") return true;
  if ("__cleanup" in store && typeof store.__cleanup === "function") return true;
  return false;
}
