import {
  type UseWalletOpts,
  type UseWalletReturnType,
  useWallet,
} from "@/lib/react/hooks/use-wallet.hook";
import { createContext, useContext } from "react";

const Context = createContext<UseWalletReturnType>({} as UseWalletReturnType);

export type WalletProviderProps = {
  children: React.ReactNode;
  config?: UseWalletOpts;
};

export const WalletProvider = ({ children, config }: WalletProviderProps) => {
  const value = useWallet(config);
  return <Context.Provider value={value}>{children}</Context.Provider>;
};

export const useWalletContext = () => useContext(Context);
