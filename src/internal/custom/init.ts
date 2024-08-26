import { customWallets } from "@/internal/custom";
import { getFailureReason } from "@/internal/utils/errors";

export async function initCustomWallets(): Promise<void> {
  await Promise.all(
    Object.entries(customWallets).map(async ([key, wallet]) => {
      try {
        await wallet.initialize?.();
      } catch (error) {
        console.warn("[WELD] Initialization of", key, "wallet failed:", getFailureReason(error));
      }
    }),
  );
}
