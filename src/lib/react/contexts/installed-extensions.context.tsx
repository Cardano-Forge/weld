import { createContext, useContext } from "react";
import {
  type UseInstalledExtensionsReturnType,
  useInstalledExtensions,
} from "../hooks/use-installed-extensions.hook";

const Context = createContext<UseInstalledExtensionsReturnType>(
  {} as UseInstalledExtensionsReturnType,
);

export const InstalledExtensionsProvider = ({ children }: { children: React.ReactNode }) => {
  const value = useInstalledExtensions();
  return <Context.Provider value={value}>{children}</Context.Provider>;
};

export const useInstalledExtensionsContext = () => useContext(Context);
