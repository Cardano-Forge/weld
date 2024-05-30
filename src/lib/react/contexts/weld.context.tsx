import { InstalledExtensionsProvider } from "./installed-extensions.context";
import { WalletProvider } from "./wallet.context";

export const WeldProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <InstalledExtensionsProvider>
      <WalletProvider>{children}</WalletProvider>
    </InstalledExtensionsProvider>
  );
};
