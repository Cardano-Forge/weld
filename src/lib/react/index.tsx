import { useEffect } from "react";

import { initialize } from "@/lib/main/initialize";
import { createExtensionsStore } from "@/lib/main/stores/extensions";
import { type CreateWalletStoreOpts, createWalletStore } from "@/lib/main/stores/wallet";

import { createContextFromStore } from "./context";

const walletContext = createContextFromStore("wallet", createWalletStore);
const WalletProvider = walletContext.provider;
export const useWallet = walletContext.hook;

const extensionsContext = createContextFromStore("extensions", createExtensionsStore);
const ExtensionsProvider = extensionsContext.provider;
export const useExtensions = extensionsContext.hook;

export type WeldProviderProps = React.PropsWithChildren<{ wallet?: CreateWalletStoreOpts }>;

export function WeldProvider({ children, wallet }: WeldProviderProps) {
  useEffect(() => {
    initialize();
  }, []);

  return (
    <WalletProvider {...wallet}>
      <ExtensionsProvider>{children}</ExtensionsProvider>
    </WalletProvider>
  );
}
