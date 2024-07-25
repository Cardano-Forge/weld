import { customWallets } from "@/internal/custom";

export async function initialize(): Promise<void> {
  for (const customWallet of Object.values(customWallets)) {
    if (customWallet.initialize) {
      await customWallet.initialize();
    }
  }
}
