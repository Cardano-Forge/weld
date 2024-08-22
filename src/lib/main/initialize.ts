import { customWallets } from "@/internal/custom";

export async function initialize(): Promise<void> {
  await Promise.all(
    Object.values(customWallets).map(async (customWallet) => {
      if (customWallet.initialize) {
        await customWallet.initialize();
      }
    }),
  );
}
