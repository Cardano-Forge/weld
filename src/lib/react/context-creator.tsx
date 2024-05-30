import { type ProviderProps, type ReactNode, createContext, useContext } from "react";

export const createContextFromHook = <State, Props>(hook: (props: Props) => State) => {
  const Context = createContext<State>({} as State);

  const Provider = ({ children, value }: ProviderProps<Props>) => {
    const state = hook(value);

    return <Context.Provider value={state}>{children}</Context.Provider>;
  };

  const useContextHook = () => useContext(Context);

  return { Provider, useContextHook };
};

export const createContextFromProplessHook = <State,>(hook: () => State) => {
  const Context = createContext<State>({} as State);

  const Provider = ({ children }: { children: ReactNode }) => {
    const state = hook();

    return <Context.Provider value={state}>{children}</Context.Provider>;
  };

  const useContextHook = () => useContext(Context);

  return { Provider, useContextHook };
};
