import { createContextFromStore } from "./context";

import { createExtensionsStore } from "@/lib/main/stores/extensions";
import { createWalletStore } from "@/lib/main/stores/wallet";

const walletContext = createContextFromStore("wallet", createWalletStore);
export const WalletProvider = walletContext.provider;
export const useWallet = walletContext.hook;

const extensionsContext = createContextFromStore("extensions", createExtensionsStore);
export const ExtensionsProvider = extensionsContext.provider;
export const useExtensions = extensionsContext.hook;
