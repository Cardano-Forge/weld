import { customWallets } from "@/internal/custom";
import { getFailureReason } from "@/internal/utils/errors";
import type { WeldConfig } from "@/lib/main/stores/config";
import { entries } from "../utils/entries";

export async function initCustomWallets(config: Partial<WeldConfig>): Promise<void> {
  if (config.customWallets === false) {
    return;
  }
  await Promise.all(
    entries(customWallets).map(async ([key, wallet]) => {
      if (
        typeof config.customWallets === "object" &&
        "blacklist" in config.customWallets &&
        config.customWallets.blacklist.includes(key)
      ) {
        if (config.debug) {
          console.warn("[WELD] Initialization of", key, "canceled: Wallet is blacklisted");
        }
        return;
      }

      if (
        typeof config.customWallets === "object" &&
        "whitelist" in config.customWallets &&
        !config.customWallets.whitelist.includes(key)
      ) {
        if (config.debug) {
          console.warn("[WELD] Initialization of", key, "canceled: Wallet is not whitelisted");
        }
        return;
      }

      try {
        await wallet.initialize?.();
        if (config.debug) {
          console.info("[WELD] Initialization of", key, "succeeded");
        }
      } catch (error) {
        if (config.debug) {
          console.warn(
            "[WELD] Initialization of",
            key,
            "custom wallet failed:",
            getFailureReason(error),
          );
        }
      }
    }),
  );
}
