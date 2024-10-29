// adapted from https://github.com/pmndrs/zustand/blob/main/src/vanilla.ts

import { compare } from "@/internal/compare";
import type { MaybePromise } from "./utils/types";

export type StoreListener<T> = (state: T, prevState: T | undefined) => void;

export type StoreSetupFunctions = {
  __init?(): MaybePromise<void>;
  __cleanup?(): MaybePromise<void>;
  __persist?(data?: unknown): MaybePromise<void>;
};

export type GetStateFunction<TState> = () => TState;

export type SetStateFunction<TState> = (
  partial: TState | Partial<TState> | ((state: TState) => TState | Partial<TState>),
) => void;

// biome-ignore lint/suspicious/noExplicitAny: Allow any store for generics
export type Store<TState = any, TPersistData = never> = {
  getState: GetStateFunction<TState>;
  getInitialState: () => TState;
  setState: SetStateFunction<TState>;
  subscribe: (listener: StoreListener<TState>, opts?: { fireImmediately?: boolean }) => () => void;
  subscribeWithSelector: <TSlice>(
    selector: (state: TState) => TSlice,
    listener: StoreListener<TSlice>,
    opts?: { fireImmediately?: boolean },
  ) => () => void;
  persist: (persistData?: TPersistData) => MaybePromise<void>;
  init: () => MaybePromise<void>;
  cleanup: () => MaybePromise<void>;
};

export type StoreHandler<
  TState,
  TPersistData = never,
  TParams extends ReadonlyArray<unknown> = [],
> = (
  setState: Store<TState, TPersistData>["setState"],
  getState: Store<TState, TPersistData>["getState"],
  ...params: TParams
) => TState;

export type ReadonlyStore<TState, TPersistData> = Omit<Store<TState, TPersistData>, "setState">;

export type ExtractStoreState<TStore> = TStore extends { getState: () => infer T } ? T : never;

export function createStore<TState extends object, TPersistData = never>(
  createState: StoreHandler<TState>,
): Store<TState, TPersistData> & TState {
  let state: TState;
  const listeners = new Set<StoreListener<TState>>();

  const setState: Store<TState, TPersistData>["setState"] = (partial) => {
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

  const persist = (data?: unknown) => {
    const state = getState() as StoreSetupFunctions | undefined;
    return state?.__persist?.(data);
  };

  const init = () => {
    const state = getState() as StoreSetupFunctions | undefined;
    return state?.__init?.();
  };

  const cleanup = () => {
    const state = getState() as StoreSetupFunctions | undefined;
    listeners.clear();
    return state?.__cleanup?.();
  };

  const store = {
    setState,
    getState,
    getInitialState,
    subscribe,
    subscribeWithSelector,
    persist,
    init,
    cleanup,
  };

  const initialState = createState(setState, getState);
  state = initialState;

  return new Proxy(store, {
    get(target, p, receiver) {
      if (p in store) {
        return Reflect.get(target, p, receiver);
      }
      if (p in state) {
        return state[p as keyof typeof state];
      }
      return undefined;
    },
    // biome-ignore lint/suspicious/noExplicitAny: TODO
  }) as any;
}

export type StoreFactory<
  TState extends object,
  TPersistData = never,
  TParams extends ReadonlyArray<unknown> = [],
> = (...params: TParams) => Store<TState, TPersistData> & TState;

export function createStoreFactory<
  TState extends object,
  TPersistData = never,
  TParams extends ReadonlyArray<unknown> = [],
>(
  storeHandler: (
    setState: Store<TState, TPersistData>["setState"],
    getState: Store<TState, TPersistData>["getState"],
    ...params: TParams
  ) => TState,
) {
  const factory = (...params: TParams) => {
    return createStore<TState, TPersistData>((s, g) => {
      return storeHandler(s, g, ...params);
    });
  };

  return factory;
}
