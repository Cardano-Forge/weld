import type { UseWalletOpts } from "../hooks/use-wallet.hook";
import { InstalledExtensionsProvider } from "./installed-extensions.context";
import { WalletProvider } from "./wallet.context";

export type WeldProviderProps = {
  children: React.ReactNode;
  config?: {
    wallet?: UseWalletOpts;
  };
};

export const WeldProvider = ({ children, config }: WeldProviderProps) => {
  return (
    <InstalledExtensionsProvider>
      <WalletProvider config={config?.wallet}>{children}</WalletProvider>
    </InstalledExtensionsProvider>
  );
};
