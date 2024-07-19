export type StoreListener<T> = (state: T, prevState: T) => void;

// biome-ignore lint/suspicious/noExplicitAny: Allow any store for generics
export type Store<TState = any> = {
  getState: () => TState;
  getInitialState: () => TState;
  setState: (
    partial: TState | Partial<TState> | ((state: TState) => TState | Partial<TState>),
  ) => void;
  subscribe: (listener: StoreListener<TState>) => () => void;
};

export type StoreCreator<TState> = (
  setState: Store<TState>["setState"],
  getState: Store<TState>["getState"],
) => TState;

export type ReadonlyStore<TState> = Omit<Store<TState>, "setState">;

export type ExtractStoreState<TStore> = TStore extends { getState: () => infer T } ? T : never;

export function createStore<TState extends object>(
  createState: StoreCreator<TState>,
): Store<TState> {
  let state: TState;
  const listeners = new Set<StoreListener<TState>>();

  const setState: Store<TState>["setState"] = (partial) => {
    const next = typeof partial === "function" ? partial(state) : partial;
    if (!Object.is(next, state)) {
      const prev = state;
      if (typeof next !== "object" || next === null) {
        state = next;
      } else {
        state = Object.assign({}, state, next);
      }
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

  const store = { setState, getState, getInitialState, subscribe };

  const initialState = createState(setState, getState);
  state = initialState;

  return store;
}
