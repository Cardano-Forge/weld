import { type UseWalletReturnType, useWallet } from "@/lib/react/hooks/use-wallet.hook";
import { createContext, useContext } from "react";

const Context = createContext<UseWalletReturnType>({} as UseWalletReturnType);

export const WalletProvider = ({ children }: { children: React.ReactNode }) => {
  const value = useWallet();
  return <Context.Provider value={value}>{children}</Context.Provider>;
};

export const useWalletContext = () => useContext(Context);
