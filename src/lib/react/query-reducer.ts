import { useReducer } from "react";

export type QueryState<T> = {
  isLoading: boolean;
  isRefreshing: boolean;
  data?: T;
  error?: string;
};

export type QueryActionType = "refresh" | "";

export type QueryAction<T> =
  | {
      type: "startRefresh";
    }
  | {
      type: "startLoading";
    }
  | {
      type: "setData";
      payload: T | undefined;
    }
  | {
      type: "setError";
      payload: string | undefined;
    };

export function getInitialQueryState<T>(initialState?: Partial<QueryState<T>>): QueryState<T> {
  return {
    isLoading: true,
    isRefreshing: false,
    ...initialState,
  };
}

export function queryReducer<T>(state: QueryState<T>, action: QueryAction<T>): QueryState<T> {
  switch (action.type) {
    case "startRefresh":
      return { ...state, isRefreshing: true };
    case "startLoading":
      return { ...state, isRefreshing: true, isLoading: true };
    case "setError":
      return {
        isRefreshing: false,
        isLoading: false,
        data: undefined,
        error: action.payload,
      };
    case "setData":
      return {
        isRefreshing: false,
        isLoading: false,
        data: action.payload,
        error: undefined,
      };
  }
}

export function useQueryReducer<T>(initialState?: Partial<QueryState<T>>) {
  return useReducer(queryReducer<T>, getInitialQueryState(initialState));
}
